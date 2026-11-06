import api from "../services/api";
import { fetchProofUrl, postWithProof } from "./payments";

// plan picked on the plans page and carried through review and payment
export const SELECTION_KEY = "cueconnect_membership_selection";

// resolves to branches, each with { id, name, code, plans, paymentAccounts }
export const fetchMembershipPlans = async () => {
    const { data } = await api.get("/client/membership-plans");
    return data.branches;
};

export const fetchClientMemberships = async () => {
    const { data } = await api.get("/client/memberships");
    return data.memberships;
};

export const createClientMembership = async ({ branchId, plan, paymentAccountId, transactionId, paymentProof }) => {
    const data = await postWithProof("/client/memberships", { branchId, plan, paymentAccountId, transactionId }, paymentProof);
    return data.membership;
};

export const cancelClientMembership = async (reference) => {
    const { data } = await api.patch(`/client/memberships/${encodeURIComponent(reference)}/cancel`);
    return data.membership;
};

export const fetchMembershipProofUrl = (reference) => fetchProofUrl(`/client/memberships/${encodeURIComponent(reference)}/payment-proof`);

// the membership that stops a new request, if any
export const findCurrentMembership = (memberships) => memberships.find((membership) => ["pending", "active"].includes(membership.status));

// reads the saved plan choice and matches it against the live plan list
export const loadSelection = (branches) => {
    try {
        const selection = JSON.parse(sessionStorage.getItem(SELECTION_KEY));
        const branch = branches.find((item) => item.id === selection?.branchId);
        const membership = branch?.plans.find((item) => item.plan === selection?.plan);
        if (branch && membership) return { branch, membership, termsAccepted: Boolean(selection.termsAccepted) };
    } catch {
        // Invalid browser data is treated as no selection.
    }
    return null;
};

export const saveSelection = (selection) => sessionStorage.setItem(SELECTION_KEY, JSON.stringify(selection));
export const clearSelection = () => sessionStorage.removeItem(SELECTION_KEY);
