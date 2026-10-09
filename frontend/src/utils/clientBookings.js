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
