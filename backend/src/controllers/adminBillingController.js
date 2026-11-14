import mongoose from "mongoose";
import Bill from "../models/bill.js";
import Game from "../models/game.js";
import Payment from "../models/payment.js";
import Loyalty from "../models/loyalty.js";
import { awardPoints, POINT_VALUE, REWARD_THRESHOLD, redeemPoints, restorePoints } from "../services/loyalty.js";
import { customerCode, ensureBillReference, loyaltyDiscountOf, manualDiscountOf, roundMoney, syncBillTotals } from "../utils/billMath.js";
import { recordReceivedIncome, sourceTypeFromGames } from "../utils/recordIncome.js";
import { buildReceiptPdf } from "../utils/receiptPdf.js";
import { displayCustomerCode } from "../utils/customerCode.js";

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);
const STATUS_ORDER = { pending: 0, partial: 1, paid: 2 };

const populateBill = (query) => query
    .populate("payerUser", "firstName lastName email phone customerCode")
    .populate({
        path: "games",
        populate: [
            { path: "table", select: "name tableType" },
            { path: "user", select: "firstName lastName customerCode" }
        ]
    });

const serializeGameLine = (game) => ({
    id: String(game._id),
    playerName: game.playerName,
    customerId: game.user?._id ? displayCustomerCode(game.user) : null,
    tableName: game.table?.name || "Unknown table",
    tableType: game.table?.tableType || null,
    type: game.type,
    frameType: game.frameType || null,
    startTime: game.startTime,
    endTime: game.endTime,
    duration: game.duration,
    charge: game.finalAmount || game.totalAmount || 0
});

const serializeBill = (bill, payments = [], loyalty = null) => {
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
        customerId: payerUser ? displayCustomerCode(payerUser) : null,
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
        manualDiscount: manualDiscountOf(bill),
        loyaltyDiscount: loyaltyDiscountOf(bill),
        loyaltyPoints: loyalty?.points || 0,
        loyaltyRedemption: bill.loyaltyRedemption?.reward ? {
            reward: bill.loyaltyRedemption.reward,
            points: bill.loyaltyRedemption.points,
            amount: bill.loyaltyRedemption.amount,
            redeemedAt: bill.loyaltyRedemption.redeemedAt
        } : null,
        loyaltyThreshold: REWARD_THRESHOLD,
        loyaltyDiscountAvailable: Boolean(bill.status !== "paid" && !bill.loyaltyRedemption?.reward && payerUser && (loyalty?.points || 0) > REWARD_THRESHOLD),
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

// one query for every bill in a list instead of one per bill
const loadPaymentsByBill = async (billIds) => {
    const payments = await Payment.find({
        type: "bill",
        referenceId: { $in: billIds },
        status: "completed"
    }).sort({ createdAt: -1 });
    const grouped = new Map();
    payments.forEach((payment) => {
        const key = String(payment.referenceId);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(payment);
    });
    return grouped;
};

const loadLoyalty = (user) => user ? Loyalty.findOne({ user: user._id || user }).select("points") : null;

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
        const paymentsByBill = await loadPaymentsByBill(bills.map((bill) => bill._id));

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
        const loyalty = await loadLoyalty(bill.payerUser?._id);
        res.status(200).json({ bill: serializeBill(bill, payments, loyalty) });
    } catch (error) {
        console.error("Get bill error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const applyBillDiscount = async (req, res) => {
    try {
        const bill = await populateBill(Bill.findOne({ _id: req.params.id, branchId: req.user.branchId }));
        if (!bill) return res.status(404).json({ message: "Bill not found" });
        ensureBillReference(bill);
        if (bill.status === "paid") return res.status(400).json({ message: "Paid bills cannot be discounted" });
        const rawAmount = Number(req.body.amount);
        const amount = roundMoney(rawAmount);
        if (!Number.isFinite(rawAmount) || amount < 0) {
            return res.status(400).json({ message: "Enter a valid discount amount" });
        }
        // the manual discount sits on top of any loyalty discount already redeemed on this bill
        const loyaltyAmount = loyaltyDiscountOf(bill);
        const maximum = roundMoney(Math.max(0, bill.originalAmount - bill.paidAmount - loyaltyAmount));
        if (amount > maximum) {
            return res.status(400).json({ message: "Discount cannot exceed the unpaid bill amount" });
        }
        bill.discountAmount = roundMoney(amount + loyaltyAmount);
        syncBillTotals(bill);
        await bill.save();

        const payments = await loadPayments(bill._id);
        const loyalty = await loadLoyalty(bill.payerUser);
        res.status(200).json({ bill: serializeBill(bill, payments, loyalty) });
    } catch (error) {
        console.error("Apply bill discount error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const recordBillPayment = async (req, res) => {
    try {
        const bill = await populateBill(Bill.findOne({ _id: req.params.id, branchId: req.user.branchId }));
        if (!bill) return res.status(404).json({ message: "Bill not found" });
        ensureBillReference(bill);
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

        await awardPoints({
            user: bill.payerUser,
            branchId: req.user.branchId,
            amount,
            paymentId: payment._id,
            description: `Payment for bill ${bill.reference}`
        });

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
        const loyalty = await loadLoyalty(bill.payerUser);
        res.status(201).json({ bill: serializeBill(bill, payments, loyalty) });
    } catch (error) {
        console.error("Record bill payment error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const redeemBillReward = async (req, res) => {
    try {
        const bill = await populateBill(Bill.findOne({ _id: req.params.id, branchId: req.user.branchId }));
        if (!bill) return res.status(404).json({ message: "Bill not found" });
        ensureBillReference(bill);
        if (bill.status === "paid") return res.status(400).json({ message: "Paid bills cannot receive a loyalty reward" });
        if (!bill.payerUser) return res.status(400).json({ message: "Walk-in customers cannot redeem loyalty points" });
        if (bill.loyaltyRedemption?.reward) return res.status(400).json({ message: "The loyalty discount has already been used for this bill" });

        const loyalty = await loadLoyalty(bill.payerUser);
        const availablePoints = loyalty?.points || 0;
        if (availablePoints <= REWARD_THRESHOLD) {
            return res.status(400).json({ message: `More than ${REWARD_THRESHOLD} loyalty points are required` });
        }

        const existingDiscount = Number(bill.discountAmount || 0);
        const unpaidAmount = roundMoney(Math.max(0, bill.originalAmount - existingDiscount - bill.paidAmount));
        if (!(unpaidAmount > 0)) return res.status(400).json({ message: "There is no remaining amount to discount" });
        // spend only the points the bill needs; anything left over stays on the customer's balance
        const points = Math.min(availablePoints, Math.ceil(unpaidAmount / POINT_VALUE));
        const discountAmount = roundMoney(Math.min(points * POINT_VALUE, unpaidAmount));

        const description = `Loyalty discount redeemed on bill ${bill.reference}`;
        if (!await redeemPoints({ user: bill.payerUser, points, description })) {
            return res.status(400).json({ message: "You do not have enough loyalty points" });
        }

        const updated = await Bill.findOneAndUpdate(
            {
                _id: bill._id,
                $or: [
                    { "loyaltyRedemption.reward": null },
                    { "loyaltyRedemption.reward": { $exists: false } }
                ]
            },
            {
                $set: {
                    loyaltyRedemption: { reward: "loyalty_discount", points, amount: discountAmount, redeemedAt: new Date() },
                    discountAmount: roundMoney(existingDiscount + discountAmount),
                }
            },
            { returnDocument: "after" }
        );
        if (!updated) {
            await restorePoints({ user: bill.payerUser, points, description: `Restored after duplicate reward attempt on bill ${bill.reference}` });
            return res.status(400).json({ message: "A loyalty reward has already been redeemed for this bill" });
        }

        syncBillTotals(updated);
        await updated.save();
        // reload with games and payer populated so the response matches every other bill response
        const refreshed = await populateBill(Bill.findById(updated._id));
        const payments = await loadPayments(refreshed._id);
        const refreshedLoyalty = await loadLoyalty(refreshed.payerUser);
        res.status(200).json({ bill: serializeBill(refreshed, payments, refreshedLoyalty) });
    } catch (error) {
        console.error("Redeem bill reward error:", error.message);
        res.status(500).json({ message: "Loyalty reward could not be redeemed" });
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
            ...(data.manualDiscount ? [`Discount: Rs. ${data.manualDiscount}`] : []),
            ...(data.loyaltyDiscount ? [`Loyalty discount: Rs. ${data.loyaltyDiscount}`] : []),
            `Payable: Rs. ${data.payableAmount}`,
            `Paid: Rs. ${data.paidAmount}`,
            `Balance: Rs. ${data.remainingBalance}`,
            "",
            "Payments",
            ...(data.payments.length ? data.payments.map((payment) => `${new Date(payment.createdAt).toLocaleString()} · ${payment.method} · Rs. ${payment.amount}`) : ["No payments yet"])
        ];

        const pdf = await buildReceiptPdf(lines);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${data.reference}.pdf"`);
        res.send(pdf);
    } catch (error) {
        console.error("Download bill receipt error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};
