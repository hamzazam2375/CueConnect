import crypto from "crypto";
import Branch from "../models/branch.js";
import Membership from "../models/membership.js";
import { discardUpload } from "../middleware/upload.js";
import { parsePayment, sendPaymentProof, serializePaymentAccount, serializePaymentSnapshot, snapshotPaymentAccount } from "../utils/payments.js";

const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);

const formatBranchName = (branch) => {
    const name = branch.branchName || "";
    return name.toUpperCase().startsWith("GOODSHOT") ? name.toUpperCase() : `GOODSHOT ${name}`.trim();
};

const formatDuration = (months) => `${months} ${months === 1 ? "Month" : "Months"}`;

// active memberships past their expiry date are reported as expired
const effectiveStatus = (membership) => (
    membership.status === "active" && membership.expiryDate && membership.expiryDate <= new Date()
        ? "expired"
        : membership.status
);

const serializePlan = (plan) => ({
    plan: capitalize(plan.plan),
    price: plan.price,
    discount: plan.discount,
    durationMonths: plan.durationMonths,
    duration: formatDuration(plan.durationMonths),
    allBranches: plan.allBranches,
    rules: plan.rules
});

const serializeMembership = (membership) => {
    const branch = membership.branchId;

    return {
        reference: membership.reference,
        branchId: String(branch._id || branch),
        branchName: branch.branchName ? formatBranchName(branch) : "",
        plan: capitalize(membership.plan),
        price: membership.price,
        discount: membership.discount,
        durationMonths: membership.durationMonths,
        duration: formatDuration(membership.durationMonths),
        allBranches: membership.allBranches,
        rules: membership.rules,
        status: effectiveStatus(membership),
        startDate: membership.startDate,
        expiryDate: membership.expiryDate,
        paymentAccount: serializePaymentSnapshot(membership.paymentAccount),
        transactionId: membership.transactionId,
        hasPaymentProof: Boolean(membership.paymentProof),
        paymentSubmittedAt: membership.paymentSubmittedAt,
        rejectionReason: membership.rejectionReason,
        cancelledAt: membership.cancelledAt,
        createdAt: membership.createdAt
    };
};

const createReference = () => {
    const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    return `MEM-${stamp}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
};

// the membership that blocks a new request: one waiting for review or one still running
const findCurrentMembership = (userId) => Membership.findOne({
    user: userId,
    $or: [
        { status: "pending" },
        { status: "active", expiryDate: { $gt: new Date() } }
    ]
});

const loadOwnedMembership = (reference, userId) => Membership.findOne({
    reference: String(reference || "").toUpperCase(),
    user: userId
});

export const listMembershipPlans = async (req, res) => {
    try {
        const branches = await Branch.find().sort({ branchName: 1 });
        res.status(200).json({
            branches: branches.map((branch) => ({
                id: String(branch._id),
                name: formatBranchName(branch),
                code: branch.branchCode,
                plans: branch.membershipPlans.map(serializePlan),
                paymentAccounts: branch.paymentAccounts.map(serializePaymentAccount)
            }))
        });
    } catch (error) {
        console.error("List membership plans error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const listClientMemberships = async (req, res) => {
    try {
        const memberships = await Membership.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .populate("branchId", "branchName branchCode");
        res.status(200).json({ memberships: memberships.map(serializeMembership) });
    } catch (error) {
        console.error("List client memberships error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

// multipart request: `branchId`, `plan`, `paymentAccountId`, `transactionId`, and the `paymentProof` image
export const createClientMembership = async (req, res) => {
    const fail = (status, message) => {
        discardUpload(req.file);
        return res.status(status).json({ message });
    };

    try {
        const branchId = String(req.body.branchId || "");
        const branch = /^[a-f\d]{24}$/i.test(branchId) ? await Branch.findById(branchId) : null;
        if (!branch) {
            return fail(404, "Branch not found");
        }

        const planName = String(req.body.plan || "").trim().toLowerCase();
        const plan = branch.membershipPlans.find((item) => item.plan === planName);
        if (!plan) {
            return fail(400, "Select one of the branch's membership plans");
        }

        const current = await findCurrentMembership(req.user._id);
        if (current) {
            return fail(409, current.status === "pending"
                ? "You already have a membership request waiting for approval"
                : "You already have an active membership");
        }

        const payment = await parsePayment(branch, req.body);
        if (payment.error) {
            return fail(payment.status, payment.error);
        }

        if (!req.file) {
            return fail(400, "Upload a screenshot of your payment as proof");
        }

        let membership;
        for (let attempt = 0; attempt < 5; attempt += 1) {
            try {
                membership = await Membership.create({
                    reference: createReference(),
                    branchId: branch._id,
                    user: req.user._id,
                    plan: plan.plan,
                    price: plan.price,
                    discount: plan.discount,
                    durationMonths: plan.durationMonths,
                    allBranches: plan.allBranches,
                    rules: plan.rules,
                    paymentAccount: snapshotPaymentAccount(payment.account),
                    transactionId: payment.transactionId,
                    paymentProof: req.file.filename,
                    paymentSubmittedAt: new Date(),
                    status: "pending"
                });
                break;
            } catch (error) {
                if (error.code !== 11000 || attempt === 4) throw error;
            }
        }

        await membership.populate("branchId", "branchName branchCode");
        res.status(201).json({ membership: serializeMembership(membership) });
    } catch (error) {
        discardUpload(req.file);
        console.error("Create client membership error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const cancelClientMembership = async (req, res) => {
    try {
        const membership = await loadOwnedMembership(req.params.reference, req.user._id);
        if (!membership) {
            return res.status(404).json({ message: "Membership not found" });
        }

        if (membership.status !== "pending") {
            return res.status(400).json({ message: "Only membership requests waiting for approval can be cancelled" });
        }

        membership.status = "cancelled";
        membership.cancelledAt = new Date();
        await membership.save();
        await membership.populate("branchId", "branchName branchCode");

        res.status(200).json({ membership: serializeMembership(membership) });
    } catch (error) {
        console.error("Cancel client membership error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const getClientMembershipProof = async (req, res) => {
    try {
        const membership = await loadOwnedMembership(req.params.reference, req.user._id).select("paymentProof");
        if (!membership?.paymentProof) {
            return res.status(404).json({ message: "Payment proof not found" });
        }

        sendPaymentProof(res, membership.paymentProof);
    } catch (error) {
        console.error("Get membership proof error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};
