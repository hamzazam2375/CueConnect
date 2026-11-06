import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import Logo from "../components/Logo";

export default function NotFound() {
    const { user } = useSelector((state) => state.auth);
    const home = user?.role === "admin" ? "/admin/dashboard" : user ? "/client/dashboard" : "/";

    return (
        <div className="grid min-h-screen place-items-center bg-[#050505] px-4 text-center text-white">
            <div>
                <Link to="/" aria-label="Goodshot home" className="inline-block"><Logo blend={false} className="mx-auto h-9 contrast-125 brightness-110" /></Link>
                <p className="mt-10 text-[10px] font-bold uppercase tracking-[0.24em] text-red-500">Error 404</p>
                <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-5xl">This page is off the table.</h1>
                <p className="mx-auto mt-4 max-w-md text-sm text-neutral-500">The link may be old or mistyped. Let&apos;s get you back to the game.</p>
                <Link to={home} className="mt-8 inline-flex rounded-xl bg-red-600 px-6 py-3 text-sm font-bold transition-colors hover:bg-red-500">{user ? "Go to dashboard" : "Back to home"}</Link>
            </div>
        </div>
    );
}
