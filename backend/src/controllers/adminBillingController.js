import mongoose from "mongoose";
import Bill from "../models/bill.js";
import Game from "../models/game.js";
import Payment from "../models/payment.js";
import Membership from "../models/membership.js";
import Discount from "../models/discount.js";
import Loyalty from "../models/loyalty.js";
import { customerCode, reapplyDiscountBreakdown, roundMoney, syncBillTotals } from "../utils/billMath.js";
import { recordReceivedIncome, sourceTypeFromGames } from "../utils/recordIncome.js";
import { buildReceiptPdf } from "../utils/receiptPdf.js";

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);
const STATUS_ORDER = { pending: 0, partial: 1, paid: 2 };

const populateBill = (query) => query
    .populate("payerUser", "firstName lastName email phone")
    .populate({
        path: "games",
        populate: [
            { path: "table", select: "name tableType" },
            { path: "user", select: "firstName lastName" }
        ]
    });

const serializeGameLine = (game) => ({
    id: String(game._id),
    playerName: game.playerName,
    customerId: game.user?._id ? customerCode(game.user._id) : null,
    tableName: game.table?.name || "Unknown table",
    tableType: game.table?.tableType || null,
    type: game.type,
    frameType: game.frameType || null,
    startTime: game.startTime,
    endTime: game.endTime,
    duration: game.duration,
    charge: game.finalAmount || game.totalAmount || 0
});

const serializeBill = (bill, payments = []) => {
    const payerUser = bill.payerUser && bill.payerUser.firstName ? bill.payerUser : null;
    const games = (bill.games || []).filter((game) => game && game.playerName);
    const players = [...new Set(games.map((game) => game.playerName))];
    const tables = [...new Set(games.map((game) => game.table?.name).filter(Boolean))];
    const lastPayment = payments[0] || null;
    syncBillTotals(bill);

    return {
        id: String(bill._id),
        reference: bill.reference || customerCode(bill._id),
        payerName: bill.payerName,
        customerId: payerUser ? customerCode(payerUser._id) : null,
        payerUser: payerUser ? {
            id: String(payerUser._id),
            firstName: payerUser.firstName,
            lastName: payerUser.lastName,
            email: payerUser.email,
            phone: payerUser.phone || ""
        } : null,
        players,
        tables,
        games: games.map(serializeGameLine),
        originalAmount: bill.originalAmount,
        discountAmount: bill.discountAmount,
        discountBreakdown: bill.discountBreakdown || [],
        payableAmount: bill.totalAmount,
        paidAmount: bill.paidAmount,
        remainingBalance: bill.remainingBalance,
        status: bill.status,
        lastPaymentMethod: lastPayment?.method || bill.lastPaymentMethod || null,
        paidAt: bill.paidAt,
        billDate: bill.createdAt,
        payments: payments.map((payment) => ({
            id: String(payment._id),
            amount: payment.amount,
            method: payment.method,
            status: payment.status,
            createdAt: payment.createdAt
        }))
    };
};

const loadPayments = async (billId) => Payment.find({
    type: "bill",
    referenceId: billId,
    status: "completed"
}).sort({ createdAt: -1 });

const weekdayName = () => new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

const inHourWindow = (window) => {
    if (!window || !window.includes("-")) return false;
    const [start, end] = window.split("-");
    const now = new Date();
    const current = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    return current >= start && current <= end;
};

export const listBills = async (req, res) => {
    try {
        const { from, to, customerId, payer, status, method } = req.query;
        const filter = { branchId: req.user.branchId };

        if (from || to) {
            filter.createdAt = {};
            if (from) filter.createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
            if (to) filter.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
        }
        if (status && ["pending", "partial", "paid"].includes(status)) filter.status = status;
        if (customerId && isObjectId(customerId)) filter.payerUser = customerId;
        if (payer) filter.payerName = new RegExp(payer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

        let bills = await populateBill(Bill.find(filter));
        const paymentsByBill = new Map();
        await Promise.all(bills.map(async (bill) => {
            const payments = await loadPayments(bill._id);
            paymentsByBill.set(String(bill._id), payments);
        }));

        if (method && ["cash", "online", "card"].includes(method)) {
            bills = bills.filter((bill) => (paymentsByBill.get(String(bill._id)) || []).some((payment) => payment.method === method));
        }

        bills.sort((first, second) => {
            const byStatus = (STATUS_ORDER[first.status] ?? 9) - (STATUS_ORDER[second.status] ?? 9);
            return byStatus || new Date(second.createdAt) - new Date(first.createdAt);
        });

        res.status(200).json({
            bills: bills.map((bill) => serializeBill(bill, paymentsByBill.get(String(bill._id)) || []))
        });
    } catch (error) {
        console.error("List bills error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const getBill = async (req, res) => {
    try {
        const bill = await populateBill(Bill.findOne({ _id: req.params.id, branchId: req.user.branchId }));
        if (!bill) return res.status(404).json({ message: "Bill not found" });
        const payments = await loadPayments(bill._id);
        res.status(200).json({ bill: serializeBill(bill, payments) });
    } catch (error) {
        console.error("Get bill error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const listBillDiscounts = async (req, res) => {
    try {
        const bill = await Bill.findOne({ _id: req.params.id, branchId: req.user.branchId });
        if (!bill) return res.status(404).json({ message: "Bill not found" });
        if (bill.status === "paid") return res.status(400).json({ message: "Paid bills cannot receive new discounts" });
        if (!bill.payerUser) return res.status(200).json({ discounts: [] });

        const now = new Date();
        const today = weekdayName();
        const [membership, discounts, loyalty] = await Promise.all([
            Membership.findOne({ branchId: req.user.branchId, user: bill.payerUser, status: "active", expiryDate: { $gte: now } }),
            Discount.find({ branchId: req.user.branchId, isActive: true }),
            Loyalty.findOne({ branchId: req.user.branchId, user: bill.payerUser })
        ]);

        const eligible = [];
        if (membership) {
            eligible.push({
                type: "membership",
                key: `membership:${membership.plan}`,
                name: `${membership.plan} membership`,
                percent: membership.discount
            });
        }

        discounts.forEach((discount) => {
            if (discount.type === "weekly" && !(discount.applicableDays || []).map((day) => day.toLowerCase()).includes(today)) return;
            if (discount.type === "hourly" && !inHourWindow(discount.applicableHours)) return;
            if (discount.type === "loyalty" && (loyalty?.points || 0) < (discount.minPoints || 0)) return;
            eligible.push({
                type: discount.type,
                key: String(discount._id),
                name: discount.name,
                percent: discount.value
            });
        });

        res.status(200).json({ discounts: eligible });
    } catch (error) {
        console.error("List bill discounts error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const applyBillDiscount = async (req, res) => {
    try {
        const bill = await populateBill(Bill.findOne({ _id: req.params.id, branchId: req.user.branchId }));
        if (!bill) return res.status(404).json({ message: "Bill not found" });
        if (bill.status === "paid") return res.status(400).json({ message: "Paid bills cannot be discounted" });
        if (!bill.payerUser) return res.status(400).json({ message: "Discounts are only available for registered customers" });

        const { type, name, percent } = req.body;
        const value = Number(percent);
        if (!type || !name || Number.isNaN(value) || value < 0 || value > 100) {
            return res.status(400).json({ message: "A valid discount type, name, and percent are required" });
        }

        bill.discountBreakdown = [{ type, name, percent: value, amount: 0 }];
        reapplyDiscountBreakdown(bill);
        if (bill.totalAmount < bill.paidAmount) {
            return res.status(400).json({ message: "Discount would make the bill lower than the amount already paid" });
        }
        await bill.save();

        const payments = await loadPayments(bill._id);
        res.status(200).json({ bill: serializeBill(bill, payments) });
    } catch (error) {
        console.error("Apply bill discount error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const recordBillPayment = async (req, res) => {
    try {
        const bill = await populateBill(Bill.findOne({ _id: req.params.id, branchId: req.user.branchId }));
        if (!bill) return res.status(404).json({ message: "Bill not found" });
        syncBillTotals(bill);
        if (bill.status === "paid") return res.status(400).json({ message: "This bill is already paid" });

        const amount = roundMoney(req.body.amount);
        const method = req.body.method;
        if (!["cash", "online", "card"].includes(method)) {
            return res.status(400).json({ message: "Payment method must be cash, online, or card" });
        }
        if (!(amount > 0) || amount > bill.remainingBalance) {
            return res.status(400).json({ message: "Enter an amount greater than 0 and not more than the remaining balance" });
        }

        const payment = await Payment.create({
            branchId: req.user.branchId,
            user: bill.payerUser || null,
            type: "bill",
            referenceId: bill._id,
            amount,
            method,
            status: "completed"
        });

        bill.paidAmount = roundMoney(bill.paidAmount + amount);
        bill.lastPaymentMethod = method;
        syncBillTotals(bill);
        await bill.save();

        await recordReceivedIncome({
            branchId: req.user.branchId,
            paymentId: payment._id,
            amount,
            method,
            sourceType: sourceTypeFromGames(bill.games),
            description: `Payment for bill ${bill.reference}`,
            source: `${bill.reference} · ${method}`,
            notes: `Payment for bill ${bill.reference}`
        });

        const payments = await loadPayments(bill._id);
        res.status(201).json({ bill: serializeBill(bill, payments) });
    } catch (error) {
        console.error("Record bill payment error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const downloadBillReceipt = async (req, res) => {
    try {
        const bill = await populateBill(Bill.findOne({ _id: req.params.id, branchId: req.user.branchId }));
        if (!bill) return res.status(404).json({ message: "Bill not found" });
        const payments = await loadPayments(bill._id);
        const data = serializeBill(bill, payments);
        const lines = [
            `Bill: ${data.reference}`,
            `Date: ${new Date(data.billDate).toLocaleString()}`,
            `Payer: ${data.payerName}${data.customerId ? ` (${data.customerId})` : ""}`,
            `Status: ${data.status}`,
            "",
            "Games",
            ...data.games.map((game) => `${game.playerName} · ${game.tableName} · ${game.type} · Rs. ${game.charge}`),
            "",
            `Original: Rs. ${data.originalAmount}`,
            `Discount: Rs. ${data.discountAmount}`,
            `Payable: Rs. ${data.payableAmount}`,
            `Paid: Rs. ${data.paidAmount}`,
            `Balance: Rs. ${data.remainingBalance}`,
            "",
            "Payments",
            ...(data.payments.length ? data.payments.map((payment) => `${new Date(payment.createdAt).toLocaleString()} · ${payment.method} · Rs. ${payment.amount}`) : ["No payments yet"])
        ];

        const pdf = buildReceiptPdf(lines);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${data.reference}.pdf"`);
        res.send(pdf);
    } catch (error) {
        console.error("Download bill receipt error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};
