import path from "path";
import Booking from "../models/booking.js";
import TournamentReg from "../models/tournamentReg.js";
import { PAYMENT_PROOF_DIR } from "../middleware/upload.js";

// shared by every flow where a client pays a branch account and uploads proof
export const TRANSACTION_ID = /^[A-Za-z0-9-]{4,40}$/;

export const serializePaymentAccount = (account) => ({
    id: String(account._id),
    method: account.method,
    provider: account.provider,
    accountTitle: account.accountTitle,
    accountNumber: account.accountNumber
});

// copy of the branch account at payment time, so later edits to the branch don't change history
export const snapshotPaymentAccount = (account) => ({
    method: account.method,
    provider: account.provider,
    accountTitle: account.accountTitle,
    accountNumber: account.accountNumber
});

export const serializePaymentSnapshot = (snapshot) => (snapshot?.method ? {
    method: snapshot.method,
    provider: snapshot.provider,
    accountTitle: snapshot.accountTitle,
    accountNumber: snapshot.accountNumber
} : null);

// validates `paymentAccountId` and `transactionId` from a multipart body against the branch;
// resolves to { account, transactionId } or { error, status }
export const parsePayment = async (branch, body) => {
    const accountId = String(body.paymentAccountId || "");
    const account = /^[a-f\d]{24}$/i.test(accountId) ? branch?.paymentAccounts.id(accountId) : null;
    if (!account) {
        return { status: 400, error: "Select one of the club's payment accounts" };
    }

    const transactionId = String(body.transactionId || "").trim().toUpperCase();
    if (!TRANSACTION_ID.test(transactionId)) {
        return { status: 400, error: "Enter the transaction ID from your payment receipt" };
    }

    // one receipt can only pay for one booking or event registration
    const filter = { transactionId, "paymentAccount.method": account.method };
    if (await Booking.exists(filter) || await TournamentReg.exists(filter)) {
        return { status: 409, error: "This transaction ID has already been used for another payment" };
    }

    return { account, transactionId };
};

export const sendPaymentProof = (res, fileName) => {
    res.sendFile(path.basename(fileName), { root: PAYMENT_PROOF_DIR }, (error) => {
        if (error && !res.headersSent) res.status(404).json({ message: "Payment proof not found" });
    });
};
