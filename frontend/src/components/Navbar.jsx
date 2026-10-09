import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import { logout } from "../store/authSlice";

const navLinks = [
    { label: "Home", href: "#home" },
    { label: "Tables", href: "#branches" },
    { label: "Events", href: "#events" },
    { label: "Membership", href: "#membership" }
];

export default function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const dispatch = useDispatch();
    const { user, isInitializing, isLoading } = useSelector((state) => state.auth);

    const handleLogout = () => {
        dispatch(logout());
        setMenuOpen(false);
    };

    return (
        <nav className="fixed top-0 left-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <a href="#home" className="flex items-center shrink-0" aria-label="Goodshot Snooker Club home">
                        <Logo
                            blend={false}
                            className="h-6 sm:h-7 object-center contrast-125 brightness-110"
                        />
                    </a>
                    {/* desktop nav */}
                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors duration-200"
                            >
                                {link.label}
                            </a>
                        ))}
                        {!isInitializing && (user?.role === "client" ? (
                            <>
                                <Link
                                    to="/client/dashboard"
                                    className="ml-3 px-4 py-2 text-sm font-semibold text-white border border-white/20 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    My Account
                                </Link>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    disabled={isLoading}
                                    className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:bg-red-900 disabled:cursor-not-allowed rounded-lg transition-colors"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <Link
                                to="/register"
                                className="ml-3 px-6 py-2 text-sm font-extrabold uppercase tracking-wide text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-lg shadow-lg shadow-red-600/30 hover:shadow-red-500/40 transition-all duration-300 hover:scale-105 border border-red-500/30"
                            >
                                Sign Up
                            </Link>
                        ))}
                    </div>

                    {/* mobile hamburger */}
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="md:hidden text-gray-300 hover:text-white p-2"
                        aria-label="Toggle menu"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {menuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>

                {/* mobile menu */}
                {menuOpen && (
                    <div className="md:hidden pb-4 border-t border-white/10 mt-2 pt-3">
                        {navLinks.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                onClick={() => setMenuOpen(false)}
                                className="block px-4 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors duration-200"
                            >
                                {link.label}
                            </a>
                        ))}
                        {!isInitializing && (user?.role === "client" ? (
                            <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
                                <Link
                                    to="/client/dashboard"
                                    onClick={() => setMenuOpen(false)}
                                    className="px-4 py-2.5 text-sm font-semibold text-white text-center border border-white/20 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    My Account
                                </Link>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    disabled={isLoading}
                                    className="px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:bg-red-900 disabled:cursor-not-allowed rounded-lg transition-colors"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <Link
                                to="/register"
                                onClick={() => setMenuOpen(false)}
                                className="block mx-4 mt-3 px-6 py-2.5 text-sm font-extrabold uppercase tracking-wide text-white text-center bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-lg shadow-lg shadow-red-600/30 transition-all duration-300 border border-red-500/30"
                            >
                                Sign Up
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </nav>
    );
}
