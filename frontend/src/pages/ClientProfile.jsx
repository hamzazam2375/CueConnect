import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { changeClientPassword, logout, updateClientProfile } from "../store/authSlice";

const phonePattern = /^\+?[0-9][0-9\s-]{8,18}$/;

function Icon({ name, className = "h-5 w-5" }) {
    const paths = {
        back: <path d="M19 12H5m6 6-6-6 6-6" />,
        check: <path d="m5 12 4 4L19 6" />,
        user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
        mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
        phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2.1Z" />,
        lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
        eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12" /><circle cx="12" cy="12" r="2.5" /></>,
        eyeOff: <><path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 5.2A10.5 10.5 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-2.2 3.1M6.6 6.6C3.6 8.4 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 4-.8" /></>,
        logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /></>,
        shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" /></>
    };
    return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Field({ id, label, icon, ...inputProps }) {
    return (
        <div>
            <label htmlFor={id} className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">{label}</label>
            <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600"><Icon name={icon} className="h-4 w-4" /></span>
                <input id={id} {...inputProps} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.035] py-3 pl-10 pr-4 text-sm text-white outline-none transition-all placeholder:text-neutral-700 focus:border-red-500/50 focus:bg-white/[0.055] focus:ring-2 focus:ring-red-500/10 disabled:cursor-not-allowed disabled:text-neutral-500" />
            </div>
        </div>
    );
}

function PasswordField({ id, label, value, onChange, visible, onToggle, autoComplete }) {
    return (
        <div>
            <label htmlFor={id} className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">{label}</label>
            <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600"><Icon name="lock" className="h-4 w-4" /></span>
                <input id={id} type={visible ? "text" : "password"} value={value} onChange={onChange} autoComplete={autoComplete} required minLength={8} maxLength={72} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.035] py-3 pl-10 pr-11 text-sm text-white outline-none transition-all placeholder:text-neutral-700 focus:border-red-500/50 focus:bg-white/[0.055] focus:ring-2 focus:ring-red-500/10" />
                <button type="button" onClick={onToggle} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-600 transition-colors hover:text-white" aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}><Icon name={visible ? "eyeOff" : "eye"} className="h-4 w-4" /></button>
            </div>
        </div>
    );
}

function Notice({ type, children }) {
    const success = type === "success";
    return <div className={`rounded-xl border px-4 py-3 text-xs ${success ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-red-500/20 bg-red-500/10 text-red-400"}`} role={success ? "status" : "alert"}>{children}</div>;
}

export default function ClientProfile() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user, isLoading, isUpdatingProfile, isChangingPassword } = useSelector((state) => state.auth);
    const [profile, setProfile] = useState({ firstName: user.firstName || "", lastName: user.lastName || "", phone: user.phone || "" });
    const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [visible, setVisible] = useState({ current: false, next: false, confirm: false });
    const [profileMessage, setProfileMessage] = useState(null);
    const [passwordMessage, setPasswordMessage] = useState(null);

    const initials = `${user.firstName?.[0] || "C"}${user.lastName?.[0] || ""}`.toUpperCase();
    const memberSince = user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "CueConnect member";
    const profileChanged = profile.firstName.trim() !== user.firstName || profile.lastName.trim() !== user.lastName || profile.phone.trim() !== (user.phone || "");
    const passwordStrength = useMemo(() => {
        const value = passwords.newPassword;
        return [value.length >= 8, /[A-Z]/.test(value), /[a-z]/.test(value), /\d/.test(value), /[^A-Za-z0-9]/.test(value)].filter(Boolean).length;
    }, [passwords.newPassword]);

    const submitProfile = async (event) => {
        event.preventDefault();
        const firstName = profile.firstName.trim();
        const lastName = profile.lastName.trim();
        const phone = profile.phone.trim();
        setProfileMessage(null);
        if (!firstName || !lastName) return setProfileMessage({ type: "error", text: "First and last name are required." });
        if (phone && !phonePattern.test(phone)) return setProfileMessage({ type: "error", text: "Enter a valid phone number, for example +92 300 1234567." });
        try {
            await dispatch(updateClientProfile({ firstName, lastName, phone })).unwrap();
            setProfile({ firstName, lastName, phone });
            setProfileMessage({ type: "success", text: "Profile updated successfully." });
        } catch (error) {
            setProfileMessage({ type: "error", text: error });
        }
    };

    const submitPassword = async (event) => {
        event.preventDefault();
        setPasswordMessage(null);
        if (passwords.newPassword !== passwords.confirmPassword) return setPasswordMessage({ type: "error", text: "New passwords do not match." });
        if (passwords.newPassword.length < 8) return setPasswordMessage({ type: "error", text: "New password must contain at least 8 characters." });
        if (passwords.currentPassword === passwords.newPassword) return setPasswordMessage({ type: "error", text: "New password must be different from your current password." });
        try {
            await dispatch(changeClientPassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword })).unwrap();
            setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
            setPasswordMessage({ type: "success", text: "Password changed successfully." });
        } catch (error) {
            setPasswordMessage({ type: "error", text: error });
        }
    };

    const handleLogout = async () => {
        try {
            await dispatch(logout()).unwrap();
            navigate("/login", { replace: true });
        } catch (error) {
            setProfileMessage({ type: "error", text: error });
        }
    };

    return (
        <div className="dashboard-shell min-h-screen bg-[#050505] text-white">
            <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true"><div className="absolute left-1/4 top-[-16rem] h-[36rem] w-[36rem] rounded-full bg-red-700/[0.09] blur-[150px]" /><div className="absolute bottom-[-18rem] right-[-10rem] h-[34rem] w-[34rem] rounded-full bg-red-950/20 blur-[150px]" /></div>
            <header className="relative z-20 border-b border-white/[0.07] bg-black/70 backdrop-blur-xl"><div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-7"><Link to="/"><Logo blend={false} className="h-7 contrast-125 brightness-110 sm:h-8" /></Link><Link to="/client/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-neutral-300 transition-colors hover:bg-white/[0.07] hover:text-white"><Icon name="back" className="h-4 w-4" /> Dashboard</Link></div></header>

            <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-7 sm:py-12">
                <section className="dashboard-rise flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-red-500">Account settings</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Your profile.</h1><p className="mt-3 text-sm text-neutral-500 sm:text-base">Keep your personal details and account security up to date.</p></div><div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-neutral-950/80 px-4 py-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-red-800 text-sm font-black shadow-lg shadow-red-950/50">{initials}</div><div><p className="text-sm font-bold">{user.firstName} {user.lastName}</p><p className="text-[10px] text-neutral-600">Member since {memberSince}</p></div></div></section>

                <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                    <section className="dashboard-rise dashboard-card rounded-3xl border border-white/[0.08] bg-neutral-950/85 p-5 sm:p-7" style={{ animationDelay: "80ms" }}>
                        <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-red-500/15 bg-red-500/10 text-red-400"><Icon name="user" /></span><div><h2 className="text-xl font-bold">Personal information</h2><p className="mt-1 text-xs text-neutral-600">Used for your bookings and club communication.</p></div></div>
                        <form onSubmit={submitProfile} className="mt-7 space-y-5">
                            {profileMessage && <Notice type={profileMessage.type}>{profileMessage.text}</Notice>}
                            <div className="grid gap-5 sm:grid-cols-2"><Field id="profile-first-name" label="First name" icon="user" value={profile.firstName} onChange={(event) => { setProfile((current) => ({ ...current, firstName: event.target.value })); setProfileMessage(null); }} required maxLength={50} autoComplete="given-name" /><Field id="profile-last-name" label="Last name" icon="user" value={profile.lastName} onChange={(event) => { setProfile((current) => ({ ...current, lastName: event.target.value })); setProfileMessage(null); }} required maxLength={50} autoComplete="family-name" /></div>
                            <Field id="profile-email" label="Email address" icon="mail" value={user.email} disabled readOnly /><Field id="profile-phone" label="Phone number (optional)" icon="phone" type="tel" value={profile.phone} onChange={(event) => { setProfile((current) => ({ ...current, phone: event.target.value })); setProfileMessage(null); }} maxLength={20} autoComplete="tel" placeholder="+92 300 1234567" />
                            <div className="flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-[10px] leading-relaxed text-neutral-700">Email changes require account verification and are currently locked.</p><button type="submit" disabled={!profileChanged || isUpdatingProfile} className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold transition-all hover:-translate-y-0.5 hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-600">{isUpdatingProfile ? "Saving..." : "Save changes"}</button></div>
                        </form>
                    </section>

                    <div className="space-y-6">
                        <section className="dashboard-rise dashboard-card rounded-3xl border border-white/[0.08] bg-neutral-950/85 p-5 sm:p-7" style={{ animationDelay: "140ms" }}>
                            <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-emerald-500/15 bg-emerald-500/10 text-emerald-400"><Icon name="shield" /></span><div><h2 className="text-xl font-bold">Password & security</h2><p className="mt-1 text-xs text-neutral-600">Confirm your current password before changing it.</p></div></div>
                            <form onSubmit={submitPassword} className="mt-7 space-y-4">
                                {passwordMessage && <Notice type={passwordMessage.type}>{passwordMessage.text}</Notice>}
                                <PasswordField id="current-password" label="Current password" value={passwords.currentPassword} onChange={(event) => { setPasswords((current) => ({ ...current, currentPassword: event.target.value })); setPasswordMessage(null); }} visible={visible.current} onToggle={() => setVisible((current) => ({ ...current, current: !current.current }))} autoComplete="current-password" />
                                <PasswordField id="new-password" label="New password" value={passwords.newPassword} onChange={(event) => { setPasswords((current) => ({ ...current, newPassword: event.target.value })); setPasswordMessage(null); }} visible={visible.next} onToggle={() => setVisible((current) => ({ ...current, next: !current.next }))} autoComplete="new-password" />
                                {passwords.newPassword && <div><div className="grid grid-cols-5 gap-1">{[1, 2, 3, 4, 5].map((level) => <span key={level} className={`h-1 rounded-full ${level <= passwordStrength ? passwordStrength < 3 ? "bg-red-500" : passwordStrength < 5 ? "bg-amber-400" : "bg-emerald-400" : "bg-neutral-800"}`} />)}</div><p className="mt-2 text-[10px] text-neutral-600">Use uppercase, lowercase, a number and a symbol.</p></div>}
                                <PasswordField id="confirm-password" label="Confirm new password" value={passwords.confirmPassword} onChange={(event) => { setPasswords((current) => ({ ...current, confirmPassword: event.target.value })); setPasswordMessage(null); }} visible={visible.confirm} onToggle={() => setVisible((current) => ({ ...current, confirm: !current.confirm }))} autoComplete="new-password" />
                                <button type="submit" disabled={isChangingPassword || !passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword} className="w-full rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-400 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:border-white/[0.06] disabled:bg-neutral-900 disabled:text-neutral-700">{isChangingPassword ? "Updating password..." : "Change password"}</button>
                            </form>
                        </section>

                        <section className="dashboard-rise rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5" style={{ animationDelay: "200ms" }}><div className="flex items-center justify-between gap-4"><div><h2 className="text-sm font-bold">Sign out of CueConnect</h2><p className="mt-1 text-xs text-neutral-600">You can sign back in at any time.</p></div><button type="button" onClick={handleLogout} disabled={isLoading} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-2.5 text-xs font-bold text-neutral-400 transition-colors hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed"><Icon name="logout" className="h-4 w-4" /> {isLoading ? "Signing out..." : "Sign out"}</button></div></section>
                    </div>
                </div>
            </main>
        </div>
    );
}
