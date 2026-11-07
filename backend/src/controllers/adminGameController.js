import mongoose from "mongoose";
import Game from "../models/game.js";
import Bill from "../models/bill.js";
import Table from "../models/table.js";
import User from "../models/user.js";
import { OPEN_BILL_STATUSES, createBillReference, reapplyDiscountBreakdown, roundMoney } from "../utils/billMath.js";
import { displayCustomerCode } from "../utils/customerCode.js";
import { awardGamePoints } from "../services/loyalty.js";

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const playerLabel = (user) => user ? `${user.firstName} ${user.lastName}`.trim() : "";

const serializeGame = (game) => {
    const table = game.table && typeof game.table === "object" ? game.table : null;
    const player = game.user && typeof game.user === "object" && game.user.firstName ? game.user : null;
    const payerUser = game.payerUser && typeof game.payerUser === "object" && game.payerUser.firstName ? game.payerUser : null;
    const bill = game.bill && typeof game.bill === "object" && game.bill.status ? game.bill : null;

    return {
        id: String(game._id),
        playerName: game.playerName || playerLabel(player),
        customerId: player ? displayCustomerCode(player) : null,
        customer: player ? {
            id: String(player._id),
            firstName: player.firstName,
            lastName: player.lastName,
            email: player.email,
            phone: player.phone || ""
        } : null,
        table: table ? {
            id: String(table._id),
            name: table.name,
            tableType: table.tableType,
            pricePerHour: table.pricePerHour,
            frameRate: table.frameRate,
            centuryRate: table.centuryRate,
            status: table.status
        } : null,
        type: game.type,
        frameType: game.frameType || null,
        startTime: game.startTime,
        endTime: game.endTime,
        duration: game.duration,
        rateApplied: game.rateApplied || 0,
        totalAmount: game.totalAmount,
        finalAmount: game.finalAmount,
        payerName: game.payer,
        payerCustomerId: payerUser ? displayCustomerCode(payerUser) : null,
        payerUser: payerUser ? {
            id: String(payerUser._id),
            firstName: payerUser.firstName,
            lastName: payerUser.lastName
        } : null,
        status: game.status,
        paymentStatus: bill?.status || (game.status === "active" ? null : "pending"),
        bill: bill ? {
            id: String(bill._id),
            payerName: bill.payerName,
            totalAmount: bill.totalAmount,
            status: bill.status,
            gameCount: Array.isArray(bill.games) ? bill.games.length : 0
        } : null
    };
};

const populateGame = (query) => query
    .populate("table", "name tableType status pricePerHour frameRate centuryRate")
    .populate("user", "firstName lastName email phone customerCode")
    .populate("payerUser", "firstName lastName email phone customerCode")
    .populate("bill", "payerName totalAmount status games");

const calculateCharges = (game, table, endTime) => {
    const duration = Math.max(1, Math.ceil((endTime - game.startTime) / 60000));
    let rateApplied = 0;
    let totalAmount = 0;

    if (game.type === "frame") {
        rateApplied = table.frameRate * (game.frameType === "double" ? 2 : 1);
        totalAmount = rateApplied;
    } else {
        rateApplied = table.centuryRate;
        totalAmount = rateApplied * duration;
    }

    return { duration, rateApplied, totalAmount, finalAmount: totalAmount };
};

const findOrCreateBill = async ({ branchId, payerUser, payerName, amount, gameId }) => {
    const filter = {
        branchId,
        status: { $in: OPEN_BILL_STATUSES },
        ...(payerUser
            ? { payerUser }
            : { payerUser: null, payerName: new RegExp(`^${payerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") })
    };

    let bill = await Bill.findOne(filter);
    if (bill && !bill.reference) bill.reference = createBillReference();
    if (!bill) {
        bill = await Bill.create({
            branchId,
            reference: createBillReference(),
            payerUser: payerUser || null,
            payerName,
            games: [gameId],
            originalAmount: roundMoney(amount),
            discountAmount: 0,
            discountBreakdown: [],
            totalAmount: roundMoney(amount),
            paidAmount: 0,
            remainingBalance: roundMoney(amount),
            status: "pending"
        });
        return bill;
    }

    bill.games.push(gameId);
    bill.originalAmount = roundMoney((bill.originalAmount || bill.totalAmount || 0) + amount);
    reapplyDiscountBreakdown(bill);
    await bill.save();
    return bill;
};

export const listActiveGames = async (req, res) => {
    try {
        const games = await populateGame(Game.find({
            branchId: req.user.branchId,
            status: "active"
        }).sort({ startTime: 1 }));

        res.status(200).json({ games: games.map(serializeGame) });
    } catch (error) {
        console.error("List active games error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const listGameHistory = async (req, res) => {
    try {
        const { from, to, tableId, customerId, type, paymentStatus } = req.query;
        const filter = { branchId: req.user.branchId, status: "completed" };

        if (from || to) {
            filter.endTime = {};
            if (from) filter.endTime.$gte = new Date(`${from}T00:00:00.000Z`);
            if (to) filter.endTime.$lte = new Date(`${to}T23:59:59.999Z`);
        }
        if (tableId && isObjectId(tableId)) filter.table = tableId;
        if (customerId && isObjectId(customerId)) filter.user = customerId;
        if (type && ["frame", "century"].includes(type)) filter.type = type;

        let games = await populateGame(Game.find(filter).sort({ endTime: -1 }));
        if (paymentStatus && ["pending", "paid"].includes(paymentStatus)) {
            games = games.filter((game) => (game.bill?.status || "pending") === paymentStatus);
        }

        res.status(200).json({ games: games.map(serializeGame) });
    } catch (error) {
        console.error("List game history error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const getGame = async (req, res) => {
    try {
        const game = await populateGame(Game.findOne({
            _id: req.params.id,
            branchId: req.user.branchId
        }));
        if (!game) {
            return res.status(404).json({ message: "Game not found" });
        }

        res.status(200).json({ game: serializeGame(game) });
    } catch (error) {
        console.error("Get game error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const startGame = async (req, res) => {
    try {
        const { tableId, type, frameType, playerUserId, playerName } = req.body;
        const table = isObjectId(tableId) ? await Table.findById(tableId) : null;

        if (!table || String(table.branchId) !== String(req.user.branchId)) {
            return res.status(404).json({ message: "Table not found" });
        }
        if (table.status === "maintenance") {
            return res.status(400).json({ message: "This table is under maintenance" });
        }
        if (!["frame", "century"].includes(type)) {
            return res.status(400).json({ message: "Game type must be frame or century" });
        }
        if (type === "frame" && !["single", "double"].includes(frameType)) {
            return res.status(400).json({ message: "Frame type must be single or double" });
        }

        const activeOnTable = await Game.findOne({ table: table._id, status: "active" });
        if (activeOnTable) {
            return res.status(409).json({ message: "This table already has an active game" });
        }

        let player = null;
        if (playerUserId) {
            if (!isObjectId(playerUserId)) {
                return res.status(400).json({ message: "Invalid customer" });
            }
            player = await User.findOne({ _id: playerUserId, role: "client" });
            if (!player) {
                return res.status(404).json({ message: "Registered customer not found" });
            }
            if (player.isActive === false) {
                return res.status(400).json({ message: "This customer account is inactive" });
            }
        }

        const name = player ? playerLabel(player) : String(playerName || "").trim();
        if (!name) {
            return res.status(400).json({ message: "Select a registered customer or enter a walk-in name" });
        }

        const game = await Game.create({
            branchId: req.user.branchId,
            table: table._id,
            user: player?._id || null,
            playerName: name,
            type,
            ...(type === "frame" ? { frameType } : {}),
            payer: name,
            startTime: new Date(),
            status: "active"
        });

        table.status = "occupied";
        await table.save();

        const created = await populateGame(Game.findById(game._id));
        res.status(201).json({ game: serializeGame(created) });
    } catch (error) {
        console.error("Start game error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const stopGame = async (req, res) => {
    try {
        const game = await Game.findOne({
            _id: req.params.id,
            branchId: req.user.branchId
        }).populate("table");

        if (!game) {
            return res.status(404).json({ message: "Game not found" });
        }
        if (game.status !== "active") {
            return res.status(400).json({ message: "Only active games can be stopped" });
        }

        const payerUserId = req.body.payerUserId;
        let payerUser = null;
        if (payerUserId) {
            if (!isObjectId(payerUserId)) {
                return res.status(400).json({ message: "Invalid payer" });
            }
            payerUser = await User.findOne({ _id: payerUserId, role: "client" });
            if (!payerUser) {
                return res.status(404).json({ message: "Registered payer not found" });
            }
            if (payerUser.isActive === false) {
                return res.status(400).json({ message: "This customer account is inactive" });
            }
        }

        const payerName = payerUser ? playerLabel(payerUser) : String(req.body.payerName || "").trim();
        if (!payerName) {
            return res.status(400).json({ message: "Enter the payer name or select a registered customer" });
        }

        const endTime = new Date();
        const charges = calculateCharges(game, game.table, endTime);

        game.endTime = endTime;
        game.duration = charges.duration;
        game.rateApplied = charges.rateApplied;
        game.totalAmount = charges.totalAmount;
        game.discountApplied = 0;
        game.finalAmount = charges.finalAmount;
        game.status = "completed";
        game.payer = payerName;
        game.payerUser = payerUser?._id || null;

        const bill = await findOrCreateBill({
            branchId: req.user.branchId,
            payerUser: payerUser?._id || null,
            payerName,
            amount: charges.finalAmount,
            gameId: game._id
        });

        game.bill = bill._id;
        await game.save();

        const stillActive = await Game.exists({ table: game.table._id, status: "active" });
        if (!stillActive && game.table.status === "occupied") {
            game.table.status = "available";
            await game.table.save();
        }

        const updated = await populateGame(Game.findById(game._id));
        res.status(200).json({ game: serializeGame(updated) });
        awardGamePoints(game, game.table.name);
    } catch (error) {
        console.error("Stop game error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};
