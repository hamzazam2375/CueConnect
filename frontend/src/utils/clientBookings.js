const BOOKINGS_KEY = "cueconnect_client_bookings";

export const getClientBookings = () => {
    try {
        const bookings = JSON.parse(localStorage.getItem(BOOKINGS_KEY) || "[]");
        return Array.isArray(bookings) ? bookings : [];
    } catch {
        return [];
    }
};

export const saveClientBooking = (booking) => {
    const bookings = getClientBookings();
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify([booking, ...bookings]));
};

export const getBookingsForUser = (user) => getClientBookings().filter(
    (booking) => booking.clientId === user.id || booking.clientEmail === user.email
);

export const cancelClientBooking = (reference, reason = "") => {
    const bookings = getClientBookings();
    const booking = bookings.find((item) => item.reference === reference);

    if (!booking || !["pending", "approved"].includes(booking.status)) {
        throw new Error("This booking can no longer be cancelled.");
    }

    const updatedBooking = {
        ...booking,
        status: "cancelled",
        cancellationReason: reason.trim() || null,
        cancelledAt: new Date().toISOString()
    };

    const updatedBookings = bookings.map((item) => (
        item.reference === reference ? updatedBooking : item
    ));
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(updatedBookings));
    return updatedBooking;
};
