const MEMBERSHIPS_KEY = "cueconnect_client_memberships";

export const getClientMemberships = () => {
    try {
        const memberships = JSON.parse(localStorage.getItem(MEMBERSHIPS_KEY) || "[]");
        return Array.isArray(memberships) ? memberships : [];
    } catch {
        return [];
    }
};

export const getMembershipsForUser = (user) => getClientMemberships().filter(
    (membership) => membership.clientId === user.id || membership.clientEmail === user.email
);

export const savePendingMembership = (membership) => {
    if (!membership?.reference || !membership?.clientId || !membership?.paymentMethod) {
        throw new Error("Membership payment details are incomplete.");
    }

    const memberships = getClientMemberships();
    if (memberships.some((item) => item.reference === membership.reference)) {
        throw new Error("This membership request already exists.");
    }

    const pendingMembership = {
        ...membership,
        status: "payment_pending",
        createdAt: new Date().toISOString()
    };
    localStorage.setItem(MEMBERSHIPS_KEY, JSON.stringify([pendingMembership, ...memberships]));
    return pendingMembership;
};
