import { useCallback, useEffect, useState } from "react";
import AdminLayout, { Icon } from "../components/AdminLayout";
import api from "../services/api";

const inputClass = "admin-filter-field w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white focus:border-red-500/50 focus:outline-none";
const emptyEvent = { title: "", description: "", type: "tournament", date: "", registrationFee: 0, prize: "", maxParticipants: "" };
const formatDate = (value) => value ? new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—";

function Notice({ message, error = false }) {
    return message && <p className={`rounded-xl px-3 py-2 text-sm ${error ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>{message}</p>;
}

export default function AdminBookingsEvents() {
    const [tab, setTab] = useState("bookings");
    const [bookings, setBookings] = useState([]);
    const [events, setEvents] = useState([]);
    const [registrations, setRegistrations] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [eventForm, setEventForm] = useState(emptyEvent);
    const [editingEvent, setEditingEvent] = useState(null);
    const [eventFormOpen, setEventFormOpen] = useState(false);
    const [proof, setProof] = useState(null);
    const [bookingStatus, setBookingStatus] = useState("");
    const [eventStatus, setEventStatus] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const loadBookings = useCallback(async () => {
        const { data } = await api.get("/admin/bookings", { params: bookingStatus ? { status: bookingStatus } : {} });
        setBookings(data.bookings || []);
    }, [bookingStatus]);
    const loadEvents = useCallback(async () => {
        const { data } = await api.get("/admin/events", { params: eventStatus ? { status: eventStatus } : {} });
        setEvents(data.events || []);
    }, [eventStatus]);
    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(true);
            setError("");
            const load = tab === "bookings" ? loadBookings() : loadEvents();
            load.catch(() => setError(tab === "bookings" ? "Bookings could not be loaded." : "Events could not be loaded."))
                .finally(() => setLoading(false));
        }, 0);
        return () => clearTimeout(timer);
    }, [bookingStatus, eventStatus, tab, loadBookings, loadEvents]);

    const updateBooking = async (booking, status) => {
        const rejectionReason = status === "rejected" ? window.prompt("Reason for rejection") || "" : "";
        setSaving(true);
        try {
            await api.patch(`/admin/bookings/${booking.id}`, { status, rejectionReason });
            await loadBookings();
            setMessage(`Booking ${status}.`);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Booking could not be updated.");
        } finally {
            setSaving(false);
        }
    };

    const openProof = async (path, title) => {
        setError("");
        try {
            const { data } = await api.get(path, { responseType: "blob" });
            setProof({ title, url: URL.createObjectURL(data) });
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Payment proof could not be loaded.");
        }
    };

    const closeProof = () => {
        if (proof) URL.revokeObjectURL(proof.url);
        setProof(null);
    };

    const openEventForm = (event = null) => {
        setEditingEvent(event?.id || null);
        setEventFormOpen(true);
        setEventForm(event ? {
            title: event.title,
            description: event.description,
            type: event.type,
            date: new Date(event.date).toISOString().slice(0, 16),
            registrationFee: event.registrationFee,
            prize: event.prize,
            maxParticipants: event.maxParticipants ?? ""
        } : emptyEvent);
    };

    const saveEvent = async (submitEvent) => {
        submitEvent.preventDefault();
        setSaving(true);
        setError("");
        try {
            const path = editingEvent ? `/admin/events/${editingEvent}` : "/admin/events";
            const { data } = editingEvent ? await api.patch(path, eventForm) : await api.post(path, eventForm);
            setEvents((current) => editingEvent ? current.map((event) => event.id === data.event.id ? data.event : event) : [...current, data.event]);
            setMessage(editingEvent ? "Event updated." : "Event created.");
            setEditingEvent(null);
            setEventFormOpen(false);
            setEventForm(emptyEvent);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Event could not be saved.");
        } finally {
            setSaving(false);
        }
    };

    const changeEventStatus = async (event, status) => {
        try {
            const { data } = await api.patch(`/admin/events/${event.id}/status`, { status });
            setEvents((current) => current.map((item) => item.id === event.id ? data.event : item));
            setMessage("Event status updated.");
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Event status could not be updated.");
        }
    };

    const showRegistrations = async (event) => {
        setSelectedEvent(event);
        try {
            const { data } = await api.get(`/admin/events/${event.id}/registrations`);
            setRegistrations(data.registrations || []);
        } catch {
            setError("Registrations could not be loaded.");
        }
    };

    const updateRegistration = async (registration, status) => {
        try {
            await api.patch(`/admin/event-registrations/${registration.id}`, { status, rejectionReason: status === "rejected" ? window.prompt("Reason for rejection") || "" : "" });
            await showRegistrations(selectedEvent);
            setMessage(`Registration ${status}.`);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Registration could not be updated.");
        }
    };

    return (
        <AdminLayout title="Bookings & Events">
            <section className="dashboard-rise flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500">Branch operations</p>
                    <h1 className="mt-2 text-3xl font-black sm:text-4xl">Bookings & Events</h1>
                    <p className="mt-2 text-sm text-neutral-500">Manage bookings and publish events for your branch.</p>
                </div>
                {tab === "events" && <button type="button" onClick={() => openEventForm()} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold hover:bg-red-500"><Icon name="plus" className="mr-2 inline h-4 w-4" />Add event</button>}
            </section>

            <div className="mt-6 flex gap-2">
                {["bookings", "events"].map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-full px-4 py-2 text-xs font-bold capitalize ${tab === item ? "bg-red-600 text-white" : "border border-white/[0.08] text-neutral-400"}`}>{item}</button>)}
            </div>
            <div className="mt-5 space-y-2"><Notice message={message} /><Notice message={error} error /></div>

            {tab === "bookings" && (
                <>
                    <select value={bookingStatus} onChange={(event) => setBookingStatus(event.target.value)} className={`${inputClass} mt-5 max-w-xs appearance-none`}>
                        <option value="" className="bg-neutral-900">All bookings</option><option value="pending" className="bg-neutral-900">Pending</option><option value="approved" className="bg-neutral-900">Approved</option><option value="completed" className="bg-neutral-900">Completed</option><option value="rejected" className="bg-neutral-900">Rejected</option><option value="cancelled" className="bg-neutral-900">Cancelled</option>
                    </select>
                    <section className="mt-5 overflow-x-auto rounded-2xl border border-white/[0.07]">
                        {loading ? <div className="h-40 animate-pulse bg-neutral-950" /> : <table className="min-w-full text-left text-sm"><thead className="bg-white/[0.03] text-[10px] uppercase tracking-wider text-neutral-500"><tr><th className="px-4 py-3">Booking</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Table / time</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead><tbody>{bookings.map((booking) => <tr key={booking.id} className="border-t border-white/[0.06]"><td className="px-4 py-3 font-bold text-red-400">{booking.reference}<p className="text-xs font-normal text-neutral-500">{formatDate(booking.date)}</p></td><td className="px-4 py-3">{booking.customer?.name}<p className="text-xs text-neutral-500">{booking.customer?.customerId || booking.customer?.phone}</p></td><td className="px-4 py-3">{booking.table?.name}<p className="text-xs text-neutral-500">{booking.startTime}–{booking.endTime}</p></td><td className="px-4 py-3">Rs. {booking.total.toLocaleString()}<p className="text-xs text-neutral-500">Advance: Rs. {booking.advanceAmount.toLocaleString()}</p></td><td className="px-4 py-3 capitalize">{booking.status}</td><td className="px-4 py-3"><div className="flex gap-2">{booking.hasPaymentProof && <button type="button" onClick={() => openProof(`/admin/bookings/${booking.id}/payment-proof`, `Advance payment · ${booking.reference}`)} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300 transition-colors hover:bg-red-500/20">View proof</button>}{booking.status === "pending" && <><button disabled={saving} type="button" onClick={() => updateBooking(booking, "approved")} className="rounded-lg bg-emerald-600/80 px-2 py-1 text-xs">Approve</button><button disabled={saving} type="button" onClick={() => updateBooking(booking, "rejected")} className="rounded-lg bg-red-600/80 px-2 py-1 text-xs">Reject</button></>}</div></td></tr>)}</tbody></table>}
                    </section>
                </>
            )}

            {tab === "events" && (
                <>
                    <select value={eventStatus} onChange={(event) => setEventStatus(event.target.value)} className={`${inputClass} mt-5 max-w-xs appearance-none`}><option value="" className="bg-neutral-900">All events</option><option value="upcoming" className="bg-neutral-900">Upcoming</option><option value="ongoing" className="bg-neutral-900">Ongoing</option><option value="completed" className="bg-neutral-900">Completed</option><option value="cancelled" className="bg-neutral-900">Cancelled</option></select>
                    {eventFormOpen && <EventForm form={eventForm} setForm={setEventForm} onSubmit={saveEvent} onCancel={() => { setEditingEvent(null); setEventFormOpen(false); setEventForm(emptyEvent); }} saving={saving} />}
                    <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{events.map((event) => <article key={event.id} className="rounded-2xl border border-white/[0.08] bg-neutral-950/80 p-5"><div className="flex justify-between gap-3"><span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-red-400">{event.type}</span><span className="text-xs capitalize text-neutral-500">{event.status}</span></div><h2 className="mt-4 text-xl font-black">{event.title}</h2><p className="mt-2 text-sm text-neutral-500">{formatDate(event.date)}</p><p className="mt-3 line-clamp-2 text-sm text-neutral-400">{event.description}</p><p className="mt-4 text-xs text-neutral-500">Fee: {event.registrationFee ? `Rs. ${event.registrationFee.toLocaleString()}` : "Free"} · Participants: {event.participantCount}{event.maxParticipants ? `/${event.maxParticipants}` : ""}</p><div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => openEventForm(event)} className="rounded-lg border border-white/[0.08] px-3 py-2 text-xs font-bold">Edit</button><button type="button" onClick={() => showRegistrations(event)} className="rounded-lg border border-white/[0.08] px-3 py-2 text-xs font-bold">Registrations</button>{event.status !== "cancelled" && <button type="button" onClick={() => changeEventStatus(event, "cancelled")} className="rounded-lg bg-red-600/80 px-3 py-2 text-xs font-bold">Cancel</button>}</div></article>)}</section>
                </>
            )}


            {selectedEvent && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/[0.08] bg-neutral-950 p-6"><div className="flex justify-between"><div><p className="text-xs text-red-400">Registrations</p><h2 className="mt-1 text-2xl font-black">{selectedEvent.title}</h2></div><button type="button" onClick={() => setSelectedEvent(null)} aria-label="Close"><Icon name="x" /></button></div><div className="mt-5 space-y-3">{registrations.map((registration) => <div key={registration.id} className="flex flex-col gap-3 rounded-xl border border-white/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{registration.customer?.name}</p><p className="text-xs text-neutral-500">{registration.customer?.email} · {registration.reference}</p></div><div className="flex items-center gap-2"><span className="text-xs capitalize text-neutral-400">{registration.status}</span>{registration.hasPaymentProof && <button type="button" onClick={() => openProof(`/admin/event-registrations/${registration.id}/payment-proof`, `Event payment · ${registration.reference}`)} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300">View proof</button>}{registration.status === "registered" && <><button type="button" onClick={() => updateRegistration(registration, "confirmed")} className="rounded-lg bg-emerald-600/80 px-2 py-1 text-xs">Confirm</button><button type="button" onClick={() => updateRegistration(registration, "rejected")} className="rounded-lg bg-red-600/80 px-2 py-1 text-xs">Reject</button></>}</div></div>)}</div></div></div>}
            {proof && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={closeProof}><div className="relative max-h-[90vh] max-w-3xl rounded-2xl border border-white/[0.08] bg-neutral-950 p-5" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-center justify-between gap-6"><h2 className="text-lg font-bold">{proof.title}</h2><button type="button" onClick={closeProof} aria-label="Close proof"><Icon name="x" /></button></div><img src={proof.url} alt="Payment proof" className="max-h-[75vh] max-w-full rounded-xl object-contain" /></div></div>}
        </AdminLayout>
    );
}

function EventForm({ form, setForm, onSubmit, onCancel, saving }) {
    const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
    return <form onSubmit={onSubmit} className="mt-5 rounded-2xl border border-white/[0.08] bg-neutral-950/80 p-5"><h2 className="text-lg font-bold">Event details</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><input required value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Title" className={inputClass} /><select value={form.type} onChange={(event) => update("type", event.target.value)} className={`${inputClass} appearance-none`}><option value="tournament" className="bg-neutral-900">Tournament</option><option value="event" className="bg-neutral-900">Club event</option></select><input required type="datetime-local" value={form.date} onChange={(event) => update("date", event.target.value)} className={inputClass} /><input type="number" min="0" value={form.registrationFee} onChange={(event) => update("registrationFee", event.target.value)} placeholder="Registration fee" className={inputClass} /><input value={form.prize} onChange={(event) => update("prize", event.target.value)} placeholder="Prize" className={inputClass} /><input type="number" min="1" value={form.maxParticipants} onChange={(event) => update("maxParticipants", event.target.value)} placeholder="Maximum participants" className={inputClass} /></div><textarea value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Description" rows="3" className={`${inputClass} mt-3`} /><div className="mt-4 flex gap-2"><button disabled={saving} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold">{saving ? "Saving..." : "Save event"}</button><button type="button" onClick={onCancel} className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm font-bold">Cancel</button></div></form>;
}
