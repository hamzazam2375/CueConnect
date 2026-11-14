import crypto from "crypto";

export const OPEN_BILL_STATUSES = ["pending", "partial"];

export const customerCode = (id) => (id ? `CC${String(id).slice(-6).toUpperCase()}` : null);

export const createBillReference = () => {
    const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    return `BILL-${stamp}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
};

export const ensureBillReference = (bill) => {
    if (!bill.reference) bill.reference = createBillReference();
    return bill.reference;
};

export const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const syncBillTotals = (bill) => {
    const gameTotal = Array.isArray(bill.games)
        ? bill.games.reduce((sum, game) => sum + Number(game?.finalAmount || game?.totalAmount || 0), 0)
        : 0;
    const original = roundMoney(bill.originalAmount || bill.totalAmount || gameTotal);
    const discount = roundMoney(Math.min(
        bill.discountAmount || 0,
        original
    ));
    const payable = roundMoney(Math.max(0, original - discount));
    const paid = roundMoney(bill.paidAmount || 0);

    bill.originalAmount = original;
    bill.discountAmount = discount;
    bill.totalAmount = payable;
    bill.paidAmount = paid;
    bill.remainingBalance = roundMoney(Math.max(0, payable - paid));

    // a bill is settled once nothing is owed, whether by payments or by a full discount
    if (bill.remainingBalance <= 0 && (paid > 0 || discount > 0)) {
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

// the part of the bill's discount that came from loyalty points (the rest is the admin's manual discount)
export const loyaltyDiscountOf = (bill) => roundMoney(bill.loyaltyRedemption?.reward ? bill.loyaltyRedemption.amount : 0);
export const manualDiscountOf = (bill) => roundMoney(Math.max(0, (bill.discountAmount || 0) - loyaltyDiscountOf(bill)));
