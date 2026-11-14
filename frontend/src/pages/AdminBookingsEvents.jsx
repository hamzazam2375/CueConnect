import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AdminLayout, { Icon } from "../components/AdminLayout";
import { ModalShell, inputClass, labelClass } from "../components/StartGameModal";
import api from "../services/api";
import {
    apiError,
    bookingDateKey,
    formatBookingDay,
    formatClock,
    formatDateTime,
    formatMoney,
    localDateKey,
    toLocalInputValue
} from "../utils/adminFormat";

const emptyEvent = { title: "", description: "", type: "tournament", date: "", registrationFee: "", prize: "", maxParticipants: "" };
const emptyBooking = { userId: "", tableId: "", date: "", startTime: "", duration: "1" };

const BOOKING_STATUS_STYLES = {
    pending: "border-amber-500/20 bg-amber-500/10 text-amber-400",
    approved: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    completed: "border-blue-500/20 bg-blue-500/10 text-blue-400",
    rejected: "border-red-500/20 bg-red-500/10 text-red-400",
    cancelled: "border-neutral-500/20 bg-neutral-500/10 text-neutral-400"
};
const EVENT_STATUS_STYLES = {
    upcoming: "border-blue-500/20 bg-blue-500/10 text-blue-400",
    ongoing: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    completed: "border-neutral-500/20 bg-neutral-500/10 text-neutral-400",
    cancelled: "border-red-500/20 bg-red-500/10 text-red-400"
};
const REGISTRATION_STATUS_STYLES = {
    registered: "border-amber-500/20 bg-amber-500/10 text-amber-400",
    confirmed: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    rejected: "border-red-500/20 bg-red-500/10 text-red-400",
    cancelled: "border-neutral-500/20 bg-neutral-500/10 text-neutral-400"
};
const REGISTRATION_LABELS = { registered: "Awaiting verification" };

function Badge({ status, styles, label }) {
    return (
        <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${styles[status] || styles.pending || "border-white/[0.08] text-neutral-400"}`}>
            {label || status}
        </span>
    );
}

function FilterSelect({ value, onChange, label, children, className = "" }) {
    return (
        <div className={`relative min-w-0 ${className}`}>
            <select value={value} onChange={onChange} aria-label={label} className={`${inputClass} appearance-none pr-10`}>{children}</select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"><Icon name="chevronDown" className="h-4 w-4" /></span>
        </div>
    );
}

function EmptyState({ title, text }) {
    return (
        <div className="rounded-3xl border border-dashed border-white/[0.1] bg-neutral-950/60 px-6 py-14 text-center">
            <p className="font-bold">{title}</p>
            <p className="mt-1 text-sm text-neutral-600">{text}</p>
        </div>
    );
}

function ActionButton({ tone = "neutral", children, ...props }) {
    const tones = {
        neutral: "border border-white/[0.08] text-neutral-300 hover:bg-white/[0.06] hover:text-white",
        green: "bg-emerald-600/80 text-white hover:bg-emerald-600",
        red: "bg-red-600/80 text-white hover:bg-red-600",
        blue: "bg-blue-600/80 text-white hover:bg-blue-600",
        outlineRed: "border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20",
        amber: "border border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
    };
    return (
        <button type="button" {...props} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]}`}>
            {children}
        </button>
    );
}

// asks for an optional reason (or just a confirmation) before a destructive action
function ConfirmDialog({ dialog, onClose, saving }) {
    const [reason, setReason] = useState("");
    return (
        <ModalShell title={dialog.title} onClose={onClose}>
            <form onSubmit={(event) => { event.preventDefault(); dialog.onConfirm(reason.trim()); }} className="space-y-4">
                <p className="text-sm text-neutral-400">{dialog.message}</p>
                {dialog.askReason && (
                    <div>
                        <label htmlFor="confirm-reason" className={labelClass}>Reason (shown to the customer)</label>
                        <textarea id="confirm-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} rows={3} placeholder="Optional" className={inputClass} />
                    </div>
                )}
                <div className="flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-white/[0.08] py-2.5 text-sm font-semibold text-neutral-300">Back</button>
                    <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold hover:bg-red-500 disabled:bg-red-900">{saving ? "Working..." : dialog.confirmLabel}</button>
                </div>
            </form>
        </ModalShell>
    );
}

export default function AdminBookingsEvents() {
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = searchParams.get("tab") === "events" ? "events" : "bookings";
    const setTab = (next) => setSearchParams(next === "events" ? { tab: "events" } : {}, { replace: true });

    const [bookings, setBookings] = useState([]);
    const [bookingFilters, setBookingFilters] = useState({ status: "", from: "", to: "" });
    const [events, setEvents] = useState([]);
    const [eventStatus, setEventStatus] = useState("");
    const [showArchived, setShowArchived] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const [customers, setCustomers] = useState([]);
    const [tables, setTables] = useState([]);
    const [hours, setHours] = useState({ openingTime: 12 * 60, closingTime: 26 * 60 });
    const [bookingForm, setBookingForm] = useState(emptyBooking);
    const [editingBooking, setEditingBooking] = useState(null);
    const [bookingFormOpen, setBookingFormOpen] = useState(false);
    const [formError, setFormError] = useState("");

    const [eventForm, setEventForm] = useState(emptyEvent);
    const [editingEvent, setEditingEvent] = useState(null);
    const [eventFormOpen, setEventFormOpen] = useState(false);

    const [selectedEvent, setSelectedEvent] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [registrationsLoading, setRegistrationsLoading] = useState(false);
    const [proof, setProof] = useState(null);
    const [dialog, setDialog] = useState(null);

    useEffect(() => {
        if (!message) return undefined;
        const timer = setTimeout(() => setMessage(""), 3500);
        return () => clearTimeout(timer);
    }, [message]);

    const loadBookings = useCallback(async () => {
        const params = Object.fromEntries(Object.entries(bookingFilters).filter(([, value]) => value));
        const { data } = await api.get("/admin/bookings", { params });
        setBookings(data.bookings || []);
    }, [bookingFilters]);

    const loadEvents = useCallback(async () => {
        const { data } = await api.get("/admin/events", { params: { ...(eventStatus ? { status: eventStatus } : {}), archived: showArchived } });
        setEvents(data.events || []);
    }, [eventStatus, showArchived]);

    useEffect(() => {
        let cancelled = false;
        // deferred so the loading state is set outside the effect body
        const timer = setTimeout(() => {
            setLoading(true);
            setError("");
            (tab === "bookings" ? loadBookings() : loadEvents())
                .catch(() => { if (!cancelled) setError(tab === "bookings" ? "Bookings could not be loaded." : "Events could not be loaded."); })
                .finally(() => { if (!cancelled) setLoading(false); });
        }, 0);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [tab, loadBookings, loadEvents]);

    // ── booking form ──

    const startOptions = useMemo(() => {
        const options = [];
        for (let minutes = hours.openingTime; minutes + 60 <= hours.closingTime; minutes += 60) options.push(minutes);
        return options;
    }, [hours]);

    const formTable = tables.find((table) => table._id === bookingForm.tableId);
    const formPrice = formTable ? formTable.pricePerHour * Number(bookingForm.duration || 0) : 0;
    const editingRecord = bookings.find((booking) => booking.id === editingBooking);
    const formLoyaltyDiscount = editingRecord?.loyaltyPointsUsed || 0;

    const openBookingForm = async (booking = null) => {
        setError("");
        setFormError("");
        try {
            const [{ data: customerData }, { data: tableData }, { data: settingsData }] = await Promise.all([
                api.get("/admin/customers"),
                api.get("/admin/tables"),
                api.get("/admin/settings")
            ]);
            setCustomers((customerData.customers || []).filter((customer) => customer.isActive !== false || customer.id === booking?.customer?.id));
            setTables(tableData.tables || []);
            setHours({ openingTime: settingsData.branch.openingTime, closingTime: settingsData.branch.closingTime });
            setEditingBooking(booking?.id || null);
            setBookingForm(booking ? {
                userId: booking.customer?.id || "",
                tableId: booking.table?.id || "",
                date: bookingDateKey(booking.date),
                startTime: String(booking.startTime),
                duration: String(booking.duration)
            } : { ...emptyBooking, date: localDateKey(), startTime: String(settingsData.branch.openingTime) });
            setBookingFormOpen(true);
        } catch {
            setError("Booking form data could not be loaded.");
        }
    };

    const closeBookingForm = () => {
        setBookingFormOpen(false);
        setEditingBooking(null);
        setFormError("");
    };

    const saveBooking = async (submitEvent) => {
        submitEvent.preventDefault();
        setSaving(true);
        setFormError("");
        try {
            const payload = { ...bookingForm, startTime: Number(bookingForm.startTime), duration: Number(bookingForm.duration) };
            if (editingBooking) await api.patch(`/admin/bookings/${editingBooking}/edit`, payload);
            else await api.post("/admin/bookings", payload);
            await loadBookings();
            setMessage(editingBooking ? "Booking updated." : "Booking created and approved. The customer has been notified.");
            closeBookingForm();
        } catch (requestError) {
            setFormError(apiError(requestError, "Booking could not be saved."));
        } finally {
            setSaving(false);
        }
    };

    const updateBooking = async (booking, status, reason = "") => {
        setSaving(true);
        setError("");
        try {
            await api.patch(`/admin/bookings/${booking.id}`, { status, reason });
            await loadBookings();
            setMessage(`Booking ${booking.reference} ${status}.`);
            setDialog(null);
        } catch (requestError) {
            setError(apiError(requestError, "Booking could not be updated."));
            setDialog(null);
        } finally {
            setSaving(false);
        }
    };

    const askBookingReason = (booking, status) => setDialog({
        title: status === "rejected" ? "Reject booking" : "Cancel booking",
        message: `${booking.reference} · ${booking.customer?.name || "Customer"}. Any loyalty points spent on it are returned to the customer.`,
        askReason: true,
        confirmLabel: status === "rejected" ? "Reject booking" : "Cancel booking",
        onConfirm: (reason) => updateBooking(booking, status, reason)
    });

    // ── payment proofs ──

    const openProof = async (path, title) => {
        setError("");
        try {
            const { data } = await api.get(path, { responseType: "blob" });
            setProof({ title, url: URL.createObjectURL(data) });
        } catch (requestError) {
            setError(apiError(requestError, "Payment proof could not be loaded."));
        }
    };

    const closeProof = () => {
        if (proof) URL.revokeObjectURL(proof.url);
        setProof(null);
    };

    // ── events ──

    const openEventForm = (event = null) => {
        setFormError("");
        setEditingEvent(event?.id || null);
        setEventForm(event ? {
            title: event.title,
            description: event.description || "",
            type: event.type,
            date: toLocalInputValue(event.date),
            registrationFee: event.registrationFee || "",
            prize: event.prize || "",
            maxParticipants: event.maxParticipants ?? ""
        } : emptyEvent);
        setEventFormOpen(true);
    };

    const closeEventForm = () => {
        setEventFormOpen(false);
        setEditingEvent(null);
        setFormError("");
    };

    const saveEvent = async (submitEvent) => {
        submitEvent.preventDefault();
        setSaving(true);
        setFormError("");
        try {
            // datetime-local is the admin's local time; send it as an exact instant
            const payload = { ...eventForm, date: new Date(eventForm.date).toISOString() };
            if (editingEvent) await api.patch(`/admin/events/${editingEvent}`, payload);
            else await api.post("/admin/events", payload);
            await loadEvents();
            setMessage(editingEvent ? "Event updated." : "Event published.");
            closeEventForm();
        } catch (requestError) {
            setFormError(apiError(requestError, "Event could not be saved."));
        } finally {
            setSaving(false);
        }
    };

    const eventAction = async (request, success) => {
        setSaving(true);
        setError("");
        try {
            await request();
            await loadEvents();
            setMessage(success);
        } catch (requestError) {
            setError(apiError(requestError, "Event could not be updated."));
        } finally {
            setSaving(false);
            setDialog(null);
        }
    };

    const changeEventStatus = (event, status) => {
        const run = () => eventAction(() => api.patch(`/admin/events/${event.id}/status`, { status }), `${event.title} marked ${status}.`);
        if (status === "cancelled") {
            setDialog({
                title: "Cancel event",
                message: `Cancel ${event.title}? Everyone registered will be notified.`,
                confirmLabel: "Cancel event",
                onConfirm: run
            });
        } else {
            run();
        }
    };

    const showRegistrations = async (event) => {
        setSelectedEvent(event);
        setRegistrations([]);
        setRegistrationsLoading(true);
        try {
            const { data } = await api.get(`/admin/events/${event.id}/registrations`);
            setRegistrations(data.registrations || []);
        } catch {
            setError("Registrations could not be loaded.");
            setSelectedEvent(null);
        } finally {
            setRegistrationsLoading(false);
        }
    };

    const updateRegistration = async (registration, status, reason = "") => {
        setSaving(true);
        setError("");
        try {
            await api.patch(`/admin/event-registrations/${registration.id}`, { status, reason });
            const { data } = await api.get(`/admin/events/${selectedEvent.id}/registrations`);
            setRegistrations(data.registrations || []);
            await loadEvents();
            setMessage(`Registration ${registration.reference} ${status}.`);
        } catch (requestError) {
            setError(apiError(requestError, "Registration could not be updated."));
        } finally {
            setSaving(false);
            setDialog(null);
        }
    };

    const visibleEventCount = events.length;

    return (
        <AdminLayout title="Bookings & Events">
            {bookingFormOpen && (
                <ModalShell title={editingBooking ? "Edit booking" : "Create booking"} onClose={closeBookingForm}>
                    <form onSubmit={saveBooking} className="space-y-4">
                        <div>
                            <label htmlFor="booking-customer" className={labelClass}>Customer</label>
                            <select id="booking-customer" required value={bookingForm.userId} onChange={(event) => setBookingForm((form) => ({ ...form, userId: event.target.value }))} className={`${inputClass} appearance-none`}>
                                <option value="" className="bg-neutral-900">Select customer</option>
                                {customers.map((customer) => <option key={customer.id} value={customer.id} className="bg-neutral-900">{customer.name} · {customer.customerId}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="booking-table" className={labelClass}>Table</label>
                            <select id="booking-table" required value={bookingForm.tableId} onChange={(event) => setBookingForm((form) => ({ ...form, tableId: event.target.value }))} className={`${inputClass} appearance-none`}>
                                <option value="" className="bg-neutral-900">Select table</option>
                                {tables.map((table) => (
                                    <option key={table._id} value={table._id} disabled={table.status === "maintenance"} className="bg-neutral-900">
                                        {table.name} · {table.tableType} · {formatMoney(table.pricePerHour)}/hr{table.status === "maintenance" ? " (maintenance)" : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div>
                                <label htmlFor="booking-date" className={labelClass}>Date</label>
                                <input id="booking-date" required type="date" min={editingBooking ? undefined : localDateKey()} value={bookingForm.date} onChange={(event) => setBookingForm((form) => ({ ...form, date: event.target.value }))} className={`${inputClass} admin-date-field`} />
                            </div>
                            <div>
                                <label htmlFor="booking-start" className={labelClass}>Start</label>
                                <select id="booking-start" required value={bookingForm.startTime} onChange={(event) => setBookingForm((form) => ({ ...form, startTime: event.target.value }))} className={`${inputClass} appearance-none`}>
                                    {startOptions.map((minutes) => <option key={minutes} value={minutes} className="bg-neutral-900">{formatClock(minutes)}{minutes >= 1440 ? " (next day)" : ""}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="booking-duration" className={labelClass}>Hours</label>
                                <select id="booking-duration" value={bookingForm.duration} onChange={(event) => setBookingForm((form) => ({ ...form, duration: event.target.value }))} className={`${inputClass} appearance-none`}>
                                    {["1", "2", "3"].map((value) => <option key={value} value={value} className="bg-neutral-900">{value} hour{value === "1" ? "" : "s"}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-xs text-neutral-400">
                            Club hours {formatClock(hours.openingTime)} – {formatClock(hours.closingTime)}.
                            {formTable && <> Total <span className="font-bold text-white">{formatMoney(Math.max(formPrice - formLoyaltyDiscount, 0))}</span>{formLoyaltyDiscount ? ` (after ${formLoyaltyDiscount} loyalty points)` : ""}.</>}
                            {!editingBooking && " Admin bookings are approved straight away and paid at the club."}
                        </div>
                        {formError && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-400" role="alert">{formError}</p>}
                        <div className="flex gap-3">
                            <button type="button" onClick={closeBookingForm} className="flex-1 rounded-xl border border-white/[0.08] py-2.5 text-sm font-semibold text-neutral-300">Cancel</button>
                            <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold hover:bg-red-500 disabled:bg-red-900">{saving ? "Saving..." : "Save booking"}</button>
                        </div>
                    </form>
                </ModalShell>
            )}

            {eventFormOpen && (
                <ModalShell title={editingEvent ? "Edit event" : "Add event"} onClose={closeEventForm}>
                    <EventForm form={eventForm} setForm={setEventForm} onSubmit={saveEvent} onCancel={closeEventForm} saving={saving} error={formError} isNew={!editingEvent} />
                </ModalShell>
            )}

            {selectedEvent && (
                <ModalShell size="lg" eyebrow="Registrations" title={selectedEvent.title} onClose={() => setSelectedEvent(null)}>
                    <p className="-mt-4 text-sm text-neutral-500">
                        {formatDateTime(selectedEvent.date)} · {selectedEvent.registrationFee ? `${formatMoney(selectedEvent.registrationFee)} entry` : "Free entry"}
                    </p>
                    {error && <p className="mt-4 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-400" role="alert">{error}</p>}
                    <div className="mt-5 space-y-3">
                        {registrationsLoading ? (
                            <div className="h-24 animate-pulse rounded-xl bg-white/[0.03]" />
                        ) : registrations.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-white/[0.08] py-10 text-center text-sm text-neutral-500">No one has registered yet.</p>
                        ) : registrations.map((registration) => (
                            <div key={registration.id} className="flex flex-col gap-3 rounded-xl border border-white/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="font-bold">{registration.customer?.name || "Unknown customer"} <span className="text-xs font-normal text-neutral-500">{registration.customer?.customerId}</span></p>
                                    <p className="truncate text-xs text-neutral-500">{registration.customer?.email} · {registration.reference}</p>
                                    {registration.feePaid > 0 && (
                                        <p className="mt-1 text-xs text-neutral-500">
                                            Fee {formatMoney(registration.feePaid)}{registration.transactionId ? ` · Txn ${registration.transactionId}` : ""}
                                        </p>
                                    )}
                                    {registration.rejectionReason && <p className="mt-1 text-xs text-red-400/80">Reason: {registration.rejectionReason}</p>}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge status={registration.status} styles={REGISTRATION_STATUS_STYLES} label={REGISTRATION_LABELS[registration.status]} />
                                    {registration.hasPaymentProof && <ActionButton tone="outlineRed" onClick={() => openProof(`/admin/event-registrations/${registration.id}/payment-proof`, `Event payment · ${registration.reference}`)}>View proof</ActionButton>}
                                    {["registered", "rejected"].includes(registration.status) && <ActionButton tone="green" disabled={saving} onClick={() => updateRegistration(registration, "confirmed")}>Confirm</ActionButton>}
                                    {["registered", "confirmed"].includes(registration.status) && (
                                        <ActionButton tone="red" disabled={saving} onClick={() => setDialog({
                                            title: "Reject registration",
                                            message: `${registration.reference} · ${registration.customer?.name || "Customer"}. Their spot is released${registration.status === "confirmed" && registration.feePaid ? " and the fee is removed from income" : ""}.`,
                                            askReason: true,
                                            confirmLabel: "Reject registration",
                                            onConfirm: (reason) => updateRegistration(registration, "rejected", reason)
                                        })}>Reject</ActionButton>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </ModalShell>
            )}

            {dialog && <ConfirmDialog dialog={dialog} onClose={() => setDialog(null)} saving={saving} />}

            {proof && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" onClick={closeProof} role="dialog" aria-modal="true" aria-label={proof.title}>
                    <div className="relative max-h-[90vh] max-w-3xl rounded-2xl border border-white/[0.08] bg-neutral-950 p-5" onClick={(event) => event.stopPropagation()}>
                        <div className="mb-4 flex items-center justify-between gap-6">
                            <h2 className="text-lg font-bold">{proof.title}</h2>
                            <button type="button" onClick={closeProof} className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] text-neutral-500 hover:text-white" aria-label="Close proof"><Icon name="x" className="h-4 w-4" /></button>
                        </div>
                        <img src={proof.url} alt="Payment proof" className="max-h-[75vh] max-w-full rounded-xl object-contain" />
                    </div>
                </div>
            )}

            <section className="dashboard-rise flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-red-500/15 bg-red-500/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">
                        <Icon name="calendar" className="h-3.5 w-3.5" /> Branch operations
                    </div>
                    <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Bookings & Events</h1>
                    <p className="mt-2 text-sm text-neutral-500">Review booking requests and payment proofs, and publish events for your branch.</p>
                </div>
                {tab === "bookings" ? (
                    <button type="button" onClick={() => openBookingForm()} className="inline-flex w-fit items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold hover:bg-red-500"><Icon name="plus" className="h-4 w-4" />Create booking</button>
                ) : (
                    <button type="button" onClick={() => openEventForm()} className="inline-flex w-fit items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold hover:bg-red-500"><Icon name="plus" className="h-4 w-4" />Add event</button>
                )}
            </section>

            <div className="mt-6 flex gap-2" role="tablist">
                {["bookings", "events"].map((item) => (
                    <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`rounded-full px-4 py-2 text-xs font-bold capitalize ${tab === item ? "bg-red-600 text-white" : "border border-white/[0.08] text-neutral-400 hover:text-white"}`}>{item}</button>
                ))}
            </div>

            {(message || (error && !selectedEvent)) && (
                <div className="mt-5 space-y-2">
                    {message && <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400" role="status">{message}</p>}
                    {error && !selectedEvent && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">{error}</p>}
                </div>
            )}

            {tab === "bookings" && (
                <>
                    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <FilterSelect label="Booking status" value={bookingFilters.status} onChange={(event) => setBookingFilters((filters) => ({ ...filters, status: event.target.value }))} className="col-span-2 sm:col-span-1">
                            <option value="" className="bg-neutral-900">All bookings</option>
                            {Object.keys(BOOKING_STATUS_STYLES).map((status) => <option key={status} value={status} className="bg-neutral-900 capitalize">{status[0].toUpperCase() + status.slice(1)}</option>)}
                        </FilterSelect>
                        <input type="date" value={bookingFilters.from} onChange={(event) => setBookingFilters((filters) => ({ ...filters, from: event.target.value }))} className={`${inputClass} admin-date-field`} aria-label="From date" />
                        <input type="date" value={bookingFilters.to} onChange={(event) => setBookingFilters((filters) => ({ ...filters, to: event.target.value }))} className={`${inputClass} admin-date-field`} aria-label="To date" />
                        <button type="button" onClick={() => setBookingFilters({ status: "", from: "", to: "" })} className="col-span-2 rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm font-semibold text-neutral-400 hover:text-white sm:col-span-1">Clear filters</button>
                    </div>

                    <section className="mt-5">
                        {loading ? (
                            <div className="h-40 animate-pulse rounded-2xl border border-white/[0.07] bg-neutral-950/80" />
                        ) : bookings.length === 0 ? (
                            <EmptyState title="No bookings found" text="Client requests and bookings you create will appear here." />
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-white/[0.07]">
                                <table className="min-w-full text-left text-sm">
                                    <thead className="bg-white/[0.03] text-[10px] uppercase tracking-wider text-neutral-500">
                                        <tr>
                                            <th className="px-4 py-3">Booking</th>
                                            <th className="px-4 py-3">Customer</th>
                                            <th className="px-4 py-3">Table & time</th>
                                            <th className="px-4 py-3">Amount</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bookings.map((booking) => (
                                            <tr key={booking.id} className="border-t border-white/[0.06] align-top">
                                                <td className="px-4 py-3">
                                                    <p className="whitespace-nowrap font-bold text-red-400">{booking.reference}</p>
                                                    <p className="whitespace-nowrap text-xs text-neutral-500">{formatBookingDay(booking.date)}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-semibold">{booking.customer?.name || "—"}</p>
                                                    <p className="text-xs text-neutral-500">{booking.customer?.customerId || booking.customer?.phone}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p>{booking.table?.name || "Removed table"}</p>
                                                    <p className="whitespace-nowrap text-xs text-neutral-500">{formatClock(booking.startTime)} – {formatClock(booking.endTime)} · {booking.duration}h</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="whitespace-nowrap font-semibold">{formatMoney(booking.total)}</p>
                                                    <p className="whitespace-nowrap text-xs text-neutral-500">Advance {formatMoney(booking.advanceAmount)}</p>
                                                    {booking.transactionId && <p className="whitespace-nowrap text-xs text-neutral-600">Txn {booking.transactionId}</p>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge status={booking.status} styles={BOOKING_STATUS_STYLES} />
                                                    {(booking.rejectionReason || booking.cancellationReason) && (
                                                        <p className="mt-1 max-w-[12rem] text-xs text-neutral-500">{booking.rejectionReason || booking.cancellationReason}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex min-w-[10rem] flex-wrap gap-2">
                                                        {booking.hasPaymentProof && <ActionButton tone="outlineRed" onClick={() => openProof(`/admin/bookings/${booking.id}/payment-proof`, `Advance payment · ${booking.reference}`)}>View proof</ActionButton>}
                                                        {booking.status === "pending" && (
                                                            <>
                                                                <ActionButton tone="green" disabled={saving} onClick={() => updateBooking(booking, "approved")}>Approve</ActionButton>
                                                                <ActionButton tone="red" disabled={saving} onClick={() => askBookingReason(booking, "rejected")}>Reject</ActionButton>
                                                            </>
                                                        )}
                                                        {booking.status === "approved" && <ActionButton tone="blue" disabled={saving} onClick={() => updateBooking(booking, "completed")}>Complete</ActionButton>}
                                                        {["pending", "approved"].includes(booking.status) && (
                                                            <>
                                                                <ActionButton onClick={() => openBookingForm(booking)}>Edit</ActionButton>
                                                                {booking.status === "approved" && <ActionButton tone="amber" disabled={saving} onClick={() => askBookingReason(booking, "cancelled")}>Cancel</ActionButton>}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </>
            )}

            {tab === "events" && (
                <>
                    <div className="mt-5 flex flex-wrap gap-2">
                        <FilterSelect label="Event status" value={eventStatus} onChange={(event) => setEventStatus(event.target.value)} className="w-full sm:w-56">
                            <option value="" className="bg-neutral-900">All statuses</option>
                            {Object.keys(EVENT_STATUS_STYLES).map((status) => <option key={status} value={status} className="bg-neutral-900">{status[0].toUpperCase() + status.slice(1)}</option>)}
                        </FilterSelect>
                        <button type="button" onClick={() => setShowArchived((value) => !value)} className={`rounded-xl border px-4 py-2.5 text-sm font-bold ${showArchived ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-white/[0.08] text-neutral-300 hover:text-white"}`}>
                            {showArchived ? "Showing archived · back to active" : "Show archived"}
                        </button>
                    </div>

                    <section className="mt-5">
                        {loading ? (
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-56 animate-pulse rounded-2xl border border-white/[0.07] bg-neutral-950/80" />)}</div>
                        ) : visibleEventCount === 0 ? (
                            <EmptyState title={showArchived ? "No archived events" : "No events yet"} text={showArchived ? "Archived events are hidden from clients." : "Add a tournament or club event for clients to register."} />
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {events.map((event) => (
                                    <article key={event.id} className="dashboard-card flex flex-col rounded-2xl border border-white/[0.08] bg-neutral-950/80 p-5">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-red-400">{event.type === "event" ? "Club event" : "Tournament"}</span>
                                            <Badge status={event.status} styles={EVENT_STATUS_STYLES} />
                                        </div>
                                        <h2 className="mt-4 break-words text-xl font-black">{event.title}</h2>
                                        <p className="mt-1 text-sm text-neutral-500">{formatDateTime(event.date)}</p>
                                        {event.description && <p className="mt-3 line-clamp-2 text-sm text-neutral-400">{event.description}</p>}
                                        <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
                                            <div className="rounded-lg bg-white/[0.03] p-2"><dt className="text-neutral-600">Fee</dt><dd className="font-bold">{event.registrationFee ? formatMoney(event.registrationFee) : "Free"}</dd></div>
                                            <div className="rounded-lg bg-white/[0.03] p-2"><dt className="text-neutral-600">Players</dt><dd className="font-bold">{event.participantCount}{event.maxParticipants ? `/${event.maxParticipants}` : ""}</dd></div>
                                            <div className="rounded-lg bg-white/[0.03] p-2"><dt className="text-neutral-600">Prize</dt><dd className="truncate font-bold" title={event.prize}>{event.prize || "—"}</dd></div>
                                        </dl>
                                        <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                                            {!showArchived ? (
                                                <>
                                                    <ActionButton onClick={() => showRegistrations(event)}>Registrations</ActionButton>
                                                    <ActionButton onClick={() => openEventForm(event)}>Edit</ActionButton>
                                                    <select
                                                        value={event.status}
                                                        disabled={saving}
                                                        onChange={(change) => changeEventStatus(event, change.target.value)}
                                                        aria-label={`Status of ${event.title}`}
                                                        className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1.5 text-xs font-bold text-neutral-300 focus:outline-none"
                                                    >
                                                        {Object.keys(EVENT_STATUS_STYLES).map((status) => <option key={status} value={status} className="bg-neutral-900">{status[0].toUpperCase() + status.slice(1)}</option>)}
                                                    </select>
                                                    <ActionButton tone="amber" disabled={saving} onClick={() => setDialog({
                                                        title: "Archive event",
                                                        message: `Archive ${event.title}? It will be hidden from clients. You can restore it later.`,
                                                        confirmLabel: "Archive",
                                                        onConfirm: () => eventAction(() => api.patch(`/admin/events/${event.id}/archive`, { archived: true }), "Event archived.")
                                                    })}>Archive</ActionButton>
                                                </>
                                            ) : (
                                                <>
                                                    <ActionButton disabled={saving} onClick={() => eventAction(() => api.patch(`/admin/events/${event.id}/archive`, { archived: false }), "Event restored.")}>Restore</ActionButton>
                                                    <ActionButton onClick={() => showRegistrations(event)}>Registrations</ActionButton>
                                                    {event.participantCount === 0 && (
                                                        <ActionButton tone="outlineRed" disabled={saving} onClick={() => setDialog({
                                                            title: "Delete event",
                                                            message: `Permanently delete ${event.title}? This cannot be undone. Events with registrations can only be archived.`,
                                                            confirmLabel: "Delete",
                                                            onConfirm: () => eventAction(() => api.delete(`/admin/events/${event.id}`), "Event deleted.")
                                                        })}>Delete</ActionButton>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}
        </AdminLayout>
    );
}

function EventForm({ form, setForm, onSubmit, onCancel, saving, error, isNew }) {
    const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div>
                <label htmlFor="event-title" className={labelClass}>Title</label>
                <input id="event-title" required maxLength={120} value={form.title} onChange={update("title")} placeholder="e.g. Winter Snooker Cup" className={inputClass} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <div>
                    <label htmlFor="event-type" className={labelClass}>Type</label>
                    <select id="event-type" value={form.type} onChange={update("type")} className={`${inputClass} appearance-none`}>
                        <option value="tournament" className="bg-neutral-900">Tournament</option>
                        <option value="event" className="bg-neutral-900">Club event</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="event-date" className={labelClass}>Date & time</label>
                    <input id="event-date" required type="datetime-local" min={isNew ? `${localDateKey()}T00:00` : undefined} value={form.date} onChange={update("date")} className={`${inputClass} admin-date-field`} />
                </div>
                <div>
                    <label htmlFor="event-fee" className={labelClass}>Entry fee (Rs.)</label>
                    <input id="event-fee" type="number" min="0" step="any" value={form.registrationFee} onChange={update("registrationFee")} placeholder="0 = free" className={inputClass} />
                </div>
                <div>
                    <label htmlFor="event-max" className={labelClass}>Max participants</label>
                    <input id="event-max" type="number" min="1" step="1" value={form.maxParticipants} onChange={update("maxParticipants")} placeholder="No limit" className={inputClass} />
                </div>
            </div>
            <div>
                <label htmlFor="event-prize" className={labelClass}>Prize</label>
                <input id="event-prize" value={form.prize} onChange={update("prize")} placeholder="e.g. Trophy + Rs. 25,000" className={inputClass} />
            </div>
            <div>
                <label htmlFor="event-description" className={labelClass}>Description</label>
                <textarea id="event-description" value={form.description} onChange={update("description")} rows={3} className={inputClass} />
            </div>
            {!isNew && <p className="text-xs text-neutral-600">The entry fee can&apos;t change once customers have registered.</p>}
            {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-400" role="alert">{error}</p>}
            <div className="flex gap-3">
                <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-white/[0.08] py-2.5 text-sm font-semibold text-neutral-300">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold hover:bg-red-500 disabled:bg-red-900">{saving ? "Saving..." : isNew ? "Publish event" : "Save changes"}</button>
            </div>
        </form>
    );
}
