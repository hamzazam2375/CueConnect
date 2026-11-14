import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import AdminLayout, { Icon } from "../components/AdminLayout";
import { inputClass, labelClass } from "../components/StartGameModal";
import api from "../services/api";
import { fetchCurrentUser } from "../store/authSlice";
import { apiError, formatClock } from "../utils/adminFormat";

const emptyAccount = { method: "jazzcash", provider: "", accountTitle: "", accountNumber: "" };
const METHOD_LABELS = { jazzcash: "JazzCash", easypaisa: "Easypaisa", bank: "Bank" };

// bookings are sold by the hour, so the club opens and closes on the hour
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour * 60);
// stored hours can run past midnight (e.g. 1560 = 2:00 AM); fold them back onto one day's clock
const minutesToInput = (mins) => {
    const ofDay = ((Number(mins) % 1440) + 1440) % 1440;
    return String(ofDay - (ofDay % 60));
};
const inputToMinutes = (value) => Number(value) || 0;

// same rules the server applies to admin passwords
const ADMIN_PASSWORD_RULES = [
    { label: "8+ characters", test: (value) => value.length >= 8 },
    { label: "Uppercase", test: (value) => /[A-Z]/.test(value) },
    { label: "Lowercase", test: (value) => /[a-z]/.test(value) },
    { label: "Digit", test: (value) => /\d/.test(value) },
    { label: "Special character", test: (value) => /[^A-Za-z0-9]/.test(value) }
];

function Notice({ type, children }) {
    const ok = type === "success";
    return <p className={`rounded-xl px-3 py-2 text-xs ${ok ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>{children}</p>;
}

function Section({ eyebrow, title, description, children }) {
    return (
        <section className="mt-8 rounded-2xl border border-white/[0.07] bg-neutral-950/80 p-5 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500">{eyebrow}</p>
            <h2 className="mt-1 text-xl font-black">{title}</h2>
            {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
            <div className="mt-5">{children}</div>
        </section>
    );
}

export default function AdminSettings() {
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [branch, setBranch] = useState(null);
    const [branchForm, setBranchForm] = useState({ branchName: "", address: "", phone: "", opening: "720", closing: "120" });
    const [branchMsg, setBranchMsg] = useState(null);
    const [branchSaving, setBranchSaving] = useState(false);

    const [accountForm, setAccountForm] = useState(emptyAccount);
    const [editingId, setEditingId] = useState(null);
    const [accountMsg, setAccountMsg] = useState(null);
    const [accountSaving, setAccountSaving] = useState(false);

    const [profile, setProfile] = useState({ firstName: "", lastName: "", email: "", phone: "" });
    const [profileMsg, setProfileMsg] = useState(null);
    const [profileSaving, setProfileSaving] = useState(false);

    const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [passwordMsg, setPasswordMsg] = useState(null);
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    const applyBranch = (next) => {
        setBranch(next);
        setBranchForm({
            branchName: next.branchName || "",
            address: next.address || "",
            phone: next.phone || "",
            opening: minutesToInput(next.openingTime),
            closing: minutesToInput(next.closingTime)
        });
    };

    useEffect(() => {
        api.get("/admin/settings")
            .then(({ data }) => {
                applyBranch(data.branch);
                setProfile({
                    firstName: data.admin.firstName || "",
                    lastName: data.admin.lastName || "",
                    email: data.admin.email || "",
                    phone: data.admin.phone || ""
                });
            })
            .catch(() => setError("Settings could not be loaded."))
            .finally(() => setLoading(false));
    }, []);

    const saveBranch = async (event) => {
        event.preventDefault();
        setBranchSaving(true);
        setBranchMsg(null);
        try {
            const { data } = await api.patch("/admin/settings/branch", {
                branchName: branchForm.branchName,
                address: branchForm.address,
                phone: branchForm.phone,
                openingTime: inputToMinutes(branchForm.opening),
                closingTime: inputToMinutes(branchForm.closing)
            });
            applyBranch(data.branch);
            setBranchMsg({ type: "success", text: "Branch settings saved." });
        } catch (err) {
            setBranchMsg({ type: "error", text: apiError(err, "Branch settings could not be saved.") });
        } finally {
            setBranchSaving(false);
        }
    };

    const saveAccount = async (event) => {
        event.preventDefault();
        setAccountSaving(true);
        setAccountMsg(null);
        try {
            const path = editingId ? `/admin/settings/accounts/${editingId}` : "/admin/settings/accounts";
            const { data } = editingId ? await api.patch(path, accountForm) : await api.post(path, accountForm);
            applyBranch(data.branch);
            setAccountForm(emptyAccount);
            setEditingId(null);
            setAccountMsg({ type: "success", text: editingId ? "Payment account updated." : "Payment account added." });
        } catch (err) {
            setAccountMsg({ type: "error", text: apiError(err, "Payment account could not be saved.") });
        } finally {
            setAccountSaving(false);
        }
    };

    const removeAccount = async (account) => {
        const { id } = account;
        if (!window.confirm(`Remove the ${METHOD_LABELS[account.method] || account.method} account "${account.accountTitle}"? Clients will no longer see it.`)) return;
        setAccountMsg(null);
        try {
            const { data } = await api.delete(`/admin/settings/accounts/${id}`);
            applyBranch(data.branch);
            if (editingId === id) {
                setEditingId(null);
                setAccountForm(emptyAccount);
            }
            setAccountMsg({ type: "success", text: "Payment account removed." });
        } catch (err) {
            setAccountMsg({ type: "error", text: apiError(err, "Payment account could not be removed.") });
        }
    };

    const saveProfile = async (event) => {
        event.preventDefault();
        setProfileSaving(true);
        setProfileMsg(null);
        try {
            const { data } = await api.patch("/admin/settings/profile", profile);
            setProfile({
                firstName: data.admin.firstName || "",
                lastName: data.admin.lastName || "",
                email: data.admin.email || "",
                phone: data.admin.phone || ""
            });
            setProfileMsg({ type: "success", text: "Profile updated." });
            dispatch(fetchCurrentUser());
        } catch (err) {
            setProfileMsg({ type: "error", text: apiError(err, "Profile could not be updated.") });
        } finally {
            setProfileSaving(false);
        }
    };

    const savePassword = async (event) => {
        event.preventDefault();
        setPasswordMsg(null);
        if (ADMIN_PASSWORD_RULES.some((rule) => !rule.test(passwords.newPassword))) {
            setPasswordMsg({ type: "error", text: "The new password does not meet all the rules below." });
            return;
        }
        if (passwords.newPassword !== passwords.confirmPassword) {
            setPasswordMsg({ type: "error", text: "New passwords do not match." });
            return;
        }
        setPasswordSaving(true);
        try {
            await api.patch("/admin/settings/password", {
                currentPassword: passwords.currentPassword,
                newPassword: passwords.newPassword
            });
            setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
            setPasswordMsg({ type: "success", text: "Password changed." });
        } catch (err) {
            setPasswordMsg({ type: "error", text: apiError(err, "Password could not be changed.") });
        } finally {
            setPasswordSaving(false);
        }
    };

    const copyCode = async () => {
        if (!branch?.branchCode) return;
        try {
            await navigator.clipboard.writeText(branch.branchCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    return (
        <AdminLayout title="Settings">
            {error && <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

            <section className="dashboard-rise">
                <div className="inline-flex items-center gap-2 rounded-full border border-red-500/15 bg-red-500/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">
                    <Icon name="settings" className="h-3.5 w-3.5" /> Settings
                </div>
                <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Club settings</h1>
                <p className="mt-2 text-sm text-neutral-500">Branch details, hours, payment accounts, and your admin login.</p>
            </section>

            {loading ? (
                <section className="mt-6 h-48 animate-pulse rounded-2xl border border-white/[0.07] bg-neutral-950/80" />
            ) : (
                <>
                    <Section eyebrow="Branch" title="Branch profile" description="Clients see this name on bookings. The branch code is used when another admin joins this club.">
                        <form onSubmit={saveBranch} className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className={labelClass}>Branch name</label>
                                    <input required value={branchForm.branchName} onChange={(e) => setBranchForm((f) => ({ ...f, branchName: e.target.value }))} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Branch code</label>
                                    <div className="flex gap-2">
                                        <input value={branch?.branchCode || ""} disabled className={`${inputClass} opacity-70`} />
                                        <button type="button" onClick={copyCode} className="shrink-0 rounded-xl border border-white/[0.08] px-3 text-xs font-bold">{copied ? "Copied" : "Copy"}</button>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Address</label>
                                <input value={branchForm.address} onChange={(e) => setBranchForm((f) => ({ ...f, address: e.target.value }))} placeholder="Street, city" className={inputClass} />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div>
                                    <label className={labelClass}>Phone</label>
                                    <input value={branchForm.phone} onChange={(e) => setBranchForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+92 300 1234567" className={inputClass} />
                                </div>
                                <div>
                                    <label htmlFor="branch-opens" className={labelClass}>Opens</label>
                                    <select id="branch-opens" value={branchForm.opening} onChange={(e) => setBranchForm((f) => ({ ...f, opening: e.target.value }))} className={`${inputClass} appearance-none`}>
                                        {HOUR_OPTIONS.map((minutes) => <option key={minutes} value={minutes} className="bg-neutral-900">{formatClock(minutes)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="branch-closes" className={labelClass}>Closes</label>
                                    <select id="branch-closes" value={branchForm.closing} onChange={(e) => setBranchForm((f) => ({ ...f, closing: e.target.value }))} className={`${inputClass} appearance-none`}>
                                        {HOUR_OPTIONS.map((minutes) => <option key={minutes} value={minutes} className="bg-neutral-900">{formatClock(minutes)}</option>)}
                                    </select>
                                </div>
                            </div>
                            <p className="text-xs text-neutral-600">If closing is earlier than opening, it is treated as the next morning (for example 12:00 PM – 2:00 AM). Clients can book any whole hour inside these times.</p>
                            {branchMsg && <Notice type={branchMsg.type}>{branchMsg.text}</Notice>}
                            <button type="submit" disabled={branchSaving} className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold hover:bg-red-500 disabled:bg-red-900">{branchSaving ? "Saving..." : "Save branch"}</button>
                        </form>
                    </Section>

                    <Section eyebrow="Payments" title="Payment accounts" description="Clients send booking and event payments to these accounts.">
                        {(branch?.paymentAccounts || []).length === 0 && <p className="mb-4 text-sm text-amber-400">No accounts yet. Clients cannot pay until you add at least one.</p>}
                        <div className="space-y-2">
                            {(branch?.paymentAccounts || []).map((account) => (
                                <div key={account.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.07] px-4 py-3">
                                    <div>
                                        <p className="text-sm font-bold">{METHOD_LABELS[account.method] || account.method}{account.provider ? ` · ${account.provider}` : ""}</p>
                                        <p className="text-xs text-neutral-500">{account.accountTitle} · {account.accountNumber}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => { setEditingId(account.id); setAccountForm({ method: account.method, provider: account.provider || "", accountTitle: account.accountTitle, accountNumber: account.accountNumber }); }} className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-bold">Edit</button>
                                        <button type="button" onClick={() => removeAccount(account)} className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-bold text-rose-400">Remove</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={saveAccount} className="mt-5 grid gap-3 sm:grid-cols-2">
                            <div>
                                <label className={labelClass}>Method</label>
                                <select value={accountForm.method} onChange={(e) => setAccountForm((f) => ({ ...f, method: e.target.value }))} className={`${inputClass} appearance-none`}>
                                    <option value="jazzcash" className="bg-neutral-900">JazzCash</option>
                                    <option value="easypaisa" className="bg-neutral-900">Easypaisa</option>
                                    <option value="bank" className="bg-neutral-900">Bank</option>
                                </select>
                            </div>
                            {accountForm.method === "bank" && (
                                <div>
                                    <label className={labelClass}>Bank name</label>
                                    <input required value={accountForm.provider} onChange={(e) => setAccountForm((f) => ({ ...f, provider: e.target.value }))} className={inputClass} />
                                </div>
                            )}
                            <div>
                                <label className={labelClass}>Account title</label>
                                <input required value={accountForm.accountTitle} onChange={(e) => setAccountForm((f) => ({ ...f, accountTitle: e.target.value }))} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Account number</label>
                                <input required value={accountForm.accountNumber} onChange={(e) => setAccountForm((f) => ({ ...f, accountNumber: e.target.value }))} className={inputClass} />
                            </div>
                            <div className="flex items-end gap-2 sm:col-span-2">
                                <button type="submit" disabled={accountSaving} className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold hover:bg-red-500 disabled:bg-red-900">{accountSaving ? "Saving..." : editingId ? "Update account" : "Add account"}</button>
                                {editingId && <button type="button" onClick={() => { setEditingId(null); setAccountForm(emptyAccount); }} className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm font-bold">Cancel</button>}
                            </div>
                        </form>
                        {accountMsg && <div className="mt-3"><Notice type={accountMsg.type}>{accountMsg.text}</Notice></div>}
                    </Section>

                    <Section eyebrow="Account" title="Your profile" description="This is the admin signed in to this branch.">
                        <form onSubmit={saveProfile} className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <label className={labelClass}>First name</label>
                                <input required value={profile.firstName} onChange={(e) => setProfile((f) => ({ ...f, firstName: e.target.value }))} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Last name</label>
                                <input required value={profile.lastName} onChange={(e) => setProfile((f) => ({ ...f, lastName: e.target.value }))} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Email</label>
                                <input required type="email" value={profile.email} onChange={(e) => setProfile((f) => ({ ...f, email: e.target.value }))} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Phone</label>
                                <input value={profile.phone} onChange={(e) => setProfile((f) => ({ ...f, phone: e.target.value }))} className={inputClass} />
                            </div>
                            <div className="sm:col-span-2 space-y-3">
                                {profileMsg && <Notice type={profileMsg.type}>{profileMsg.text}</Notice>}
                                <button type="submit" disabled={profileSaving} className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold hover:bg-red-500 disabled:bg-red-900">{profileSaving ? "Saving..." : "Save profile"}</button>
                            </div>
                        </form>
                    </Section>

                    <Section eyebrow="Security" title="Change password">
                        <form onSubmit={savePassword} className="grid max-w-xl gap-3">
                            <div>
                                <label className={labelClass}>Current password</label>
                                <input required type="password" autoComplete="current-password" value={passwords.currentPassword} onChange={(e) => setPasswords((f) => ({ ...f, currentPassword: e.target.value }))} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>New password</label>
                                <input required type="password" autoComplete="new-password" minLength={8} value={passwords.newPassword} onChange={(e) => setPasswords((f) => ({ ...f, newPassword: e.target.value }))} className={inputClass} />
                                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                                    {ADMIN_PASSWORD_RULES.map((rule) => (
                                        <li key={rule.label} className={rule.test(passwords.newPassword) ? "text-emerald-400" : "text-neutral-600"}>{rule.test(passwords.newPassword) ? "✓" : "•"} {rule.label}</li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <label className={labelClass}>Confirm new password</label>
                                <input required type="password" minLength={8} value={passwords.confirmPassword} onChange={(e) => setPasswords((f) => ({ ...f, confirmPassword: e.target.value }))} className={inputClass} />
                            </div>
                            {passwordMsg && <Notice type={passwordMsg.type}>{passwordMsg.text}</Notice>}
                            <button type="submit" disabled={passwordSaving} className="w-fit rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold hover:bg-red-500 disabled:bg-red-900">{passwordSaving ? "Saving..." : "Update password"}</button>
                        </form>
                    </Section>
                </>
            )}
        </AdminLayout>
    );
}
