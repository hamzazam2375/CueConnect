import Table from "../models/table.js";
import Game from "../models/game.js";
import Booking from "../models/booking.js";
import Waitlist from "../models/waitlist.js";

const TABLE_TYPES = ["snooker", "billiard"];
const TABLE_STATUSES = ["available", "occupied", "maintenance"];

const todayUtc = () => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const isRate = (value) => Number.isFinite(value) && value >= 0;

// validates the body for create (every field required) or update (only fields that were sent)
const parseTable = (body, { partial = false } = {}) => {
    const value = {};

    if (body.name != null || !partial) {
        const name = String(body.name || "").trim();
        if (!name) return { error: "Table name is required" };
        if (name.length > 40) return { error: "Table name must be 40 characters or fewer" };
        value.name = name;
    }
    if (body.tableType != null || !partial) {
        if (!TABLE_TYPES.includes(body.tableType)) return { error: "Table type must be snooker or billiard" };
        value.tableType = body.tableType;
    }
    if (body.status != null) {
        if (!TABLE_STATUSES.includes(body.status)) return { error: "Status must be available, occupied, or maintenance" };
        value.status = body.status;
    }

    for (const field of ["frameRate", "centuryRate"]) {
        if (body[field] == null || body[field] === "") {
            if (!partial) return { error: "Frame rate and century rate are required" };
            continue;
        }
        const rate = Number(body[field]);
        if (!isRate(rate)) return { error: "Rates must be numbers of 0 or more" };
        value[field] = rate;
    }

    if (body.pricePerHour != null && body.pricePerHour !== "") {
        const hourly = Number(body.pricePerHour);
        if (!isRate(hourly)) return { error: "Hourly price must be a number of 0 or more" };
        value.pricePerHour = hourly;
    } else if (!partial) {
        // the hour rate defaults to 60 minutes of century play
        value.pricePerHour = value.centuryRate * 60;
    }

    return { value };
};

const loadBranchTable = (id, branchId) => Table.findOne({ _id: id, branchId });

export const listTables = async (req, res) => {
    try {
        const tables = await Table.find({ branchId: req.user.branchId }).sort({ name: 1 });
        res.status(200).json({ tables });
    } catch (error) {
        console.error("Fetch tables error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const createTable = async (req, res) => {
    try {
        const parsed = parseTable(req.body);
        if (parsed.error) return res.status(400).json({ message: parsed.error });

        const existing = await Table.findOne({ branchId: req.user.branchId, name: parsed.value.name });
        if (existing) {
            return res.status(409).json({ message: `A table named "${parsed.value.name}" already exists in your branch` });
        }

        // a new table has no game on it, so it can't start out occupied
        const status = parsed.value.status === "maintenance" ? "maintenance" : "available";
        const table = await Table.create({ ...parsed.value, status, branchId: req.user.branchId });
        res.status(201).json({ message: "Table created successfully", table });
    } catch (error) {
        console.error("Create table error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const updateTable = async (req, res) => {
    try {
        const table = await loadBranchTable(req.params.id, req.user.branchId);
        if (!table) return res.status(404).json({ message: "Table not found" });

        const parsed = parseTable(req.body, { partial: true });
        if (parsed.error) return res.status(400).json({ message: parsed.error });

        const { name, status } = parsed.value;
        if (name && name !== table.name) {
            const duplicate = await Table.findOne({ branchId: req.user.branchId, name, _id: { $ne: table._id } });
            if (duplicate) {
                return res.status(409).json({ message: `A table named "${name}" already exists in your branch` });
            }
        }

        // occupied is driven by live games, so keep the status consistent with what is on the table
        if (status && status !== table.status) {
            const hasActiveGame = await Game.exists({ table: table._id, status: "active" });
            if (hasActiveGame && status !== "occupied") {
                return res.status(400).json({ message: "Stop the active game on this table before changing its status" });
            }
            if (!hasActiveGame && status === "occupied") {
                return res.status(400).json({ message: "A table becomes occupied when a game is started on it" });
            }
        }

        table.set(parsed.value);
        await table.save();
        res.status(200).json({ message: "Table updated successfully", table });
    } catch (error) {
        console.error("Update table error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const deleteTable = async (req, res) => {
    try {
        const table = await loadBranchTable(req.params.id, req.user.branchId);
        if (!table) return res.status(404).json({ message: "Table not found" });

        const [activeGame, upcomingBooking] = await Promise.all([
            Game.exists({ table: table._id, status: "active" }),
            Booking.exists({ table: table._id, status: { $in: ["pending", "approved"] }, date: { $gte: todayUtc() } })
        ]);
        if (activeGame) {
            return res.status(400).json({ message: "Stop the active game on this table before deleting it" });
        }
        if (upcomingBooking) {
            return res.status(400).json({ message: "This table has upcoming bookings. Move or cancel them first, or set the table to maintenance" });
        }

        await table.deleteOne();
        // nobody can be offered a table that no longer exists
        await Waitlist.updateMany({ table: table._id, status: { $in: ["waiting", "notified"] } }, { $set: { status: "cancelled" } });
        res.status(200).json({ message: "Table deleted successfully" });
    } catch (error) {
        console.error("Delete table error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};
