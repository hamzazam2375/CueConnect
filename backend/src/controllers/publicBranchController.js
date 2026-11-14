import Branch from "../models/branch.js";
import Table from "../models/table.js";
import { formatBranchName } from "../utils/branchName.js";

const DEFAULT_OPENING_TIME = 12 * 60;
const DEFAULT_CLOSING_TIME = 26 * 60;

const TABLE_ORDER = { snooker: 0, billiard: 1 };

// only what a visitor to the website should see: no payment accounts, ids of admins, or internal data
const serializePublicBranch = (branch, tables) => ({
    id: String(branch._id),
    name: formatBranchName(branch),
    code: branch.branchCode,
    address: branch.address || "",
    phone: branch.phone || "",
    openingTime: Number.isFinite(branch.openingTime) ? branch.openingTime : DEFAULT_OPENING_TIME,
    closingTime: Number.isFinite(branch.closingTime) ? branch.closingTime : DEFAULT_CLOSING_TIME,
    tableCount: tables.length,
    availableCount: tables.filter((table) => table.status === "available").length,
    tables: tables
        .sort((first, second) => (TABLE_ORDER[first.tableType] ?? 9) - (TABLE_ORDER[second.tableType] ?? 9)
            || first.name.localeCompare(second.name, undefined, { numeric: true }))
        .map((table) => ({
            id: String(table._id),
            name: table.name,
            type: table.tableType,
            status: table.status,
            pricePerHour: table.pricePerHour,
            frameRate: table.frameRate,
            centuryRate: table.centuryRate
        }))
});

// GET /api/branches — public list of branches with their tables and prices for the homepage
export const listPublicBranches = async (req, res) => {
    try {
        const [branches, tables] = await Promise.all([
            Branch.find().select("branchName branchCode address phone openingTime closingTime").sort({ branchName: 1 }).lean(),
            Table.find().select("branchId name tableType status pricePerHour frameRate centuryRate").lean()
        ]);

        const tablesByBranch = new Map();
        tables.forEach((table) => {
            const key = String(table.branchId);
            if (!tablesByBranch.has(key)) tablesByBranch.set(key, []);
            tablesByBranch.get(key).push(table);
        });

        res.status(200).json({
            branches: branches.map((branch) => serializePublicBranch(branch, tablesByBranch.get(String(branch._id)) || []))
        });
    } catch (error) {
        console.error("List public branches error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};
