import api from "../services/api";
import { fetchProofUrl, postWithProof } from "./payments";

// upcoming events for the website; no login needed
export const fetchPublicEvents = async () => {
    const { data } = await api.get("/events");
    return data.events;
};

// same list with this client's `registration` on each event
export const fetchClientEvents = async () => {
    const { data } = await api.get("/client/events");
    return data.events;
};

// adds `paymentAccounts` and this client's `registration`
export const fetchClientEvent = async (eventId) => {
    const { data } = await api.get(`/client/events/${encodeURIComponent(eventId)}`);
    return data.event;
};

// free events need no payment fields
export const registerForEvent = async (eventId, { paymentAccountId, transactionId, paymentProof } = {}) => {
    const data = await postWithProof(`/client/events/${encodeURIComponent(eventId)}/register`, { paymentAccountId, transactionId }, paymentProof);
    return data.registration;
};

export const fetchEventRegistrations = async () => {
    const { data } = await api.get("/client/event-registrations");
    return data.registrations;
};

export const cancelEventRegistration = async (reference) => {
    const { data } = await api.patch(`/client/event-registrations/${encodeURIComponent(reference)}/cancel`);
    return data.registration;
};

export const fetchEventProofUrl = (reference) => fetchProofUrl(`/client/event-registrations/${encodeURIComponent(reference)}/payment-proof`);

export const eventTypeLabels = { tournament: "Tournament", event: "Club event" };

export const formatEventDate = (value, options = { weekday: "short", month: "short", day: "numeric", year: "numeric" }) => new Date(value).toLocaleDateString("en-US", options);

export const formatEventTime = (value) => new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export const formatFee = (amount) => (amount > 0 ? `PKR ${amount.toLocaleString()}` : "Free");
