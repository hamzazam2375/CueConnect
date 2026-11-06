import crypto from "crypto";

export const OPEN_BILL_STATUSES = ["pending", "partial"];

export const customerCode = (id) => (id ? `CC${String(id).slice(-6).toUpperCase()}` : null);

export const createBillReference = () => {
    const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    return `BILL-${stamp}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
};

export const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const syncBillTotals = (bill) => {
    const gameTotal = Array.isArray(bill.games)
        ? bill.games.reduce((sum, game) => sum + Number(game?.finalAmount || game?.totalAmount || 0), 0)
        : 0;
    const original = roundMoney(bill.originalAmount || bill.totalAmount || gameTotal);
    const breakdown = Array.isArray(bill.discountBreakdown) ? bill.discountBreakdown : [];
    const discount = roundMoney(Math.min(
        breakdown.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || bill.discountAmount || 0,
        original
    ));
    const payable = roundMoney(Math.max(0, original - discount));
    const paid = roundMoney(bill.paidAmount || 0);

    bill.originalAmount = original;
    bill.discountAmount = discount;
    bill.totalAmount = payable;
    bill.paidAmount = paid;
    bill.remainingBalance = roundMoney(Math.max(0, payable - paid));

    if (bill.remainingBalance <= 0 && paid > 0) {
        bill.status = "paid";
        bill.paidAt = bill.paidAt || new Date();
    } else if (paid > 0) {
        bill.status = "partial";
        bill.paidAt = null;
    } else {
        bill.status = "pending";
        bill.paidAt = null;
    }

    return bill;
};

export const reapplyDiscountBreakdown = (bill) => {
    const original = roundMoney(bill.originalAmount || 0);
    bill.discountBreakdown = (bill.discountBreakdown || []).map((item) => ({
        ...item,
        amount: roundMoney(original * (Number(item.percent) || 0) / 100)
    }));
    bill.discountAmount = roundMoney(bill.discountBreakdown.reduce((sum, item) => sum + item.amount, 0));
    return syncBillTotals(bill);
};
