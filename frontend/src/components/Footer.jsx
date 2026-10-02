import Logo from "./Logo";

const footerLinks = [
    { label: "Home", href: "#home" },
    { label: "Tables", href: "#branches" },
    { label: "Events", href: "#events" },
    { label: "Membership", href: "#membership" },
    { label: "Sign Up", href: "/register" }
];

export default function Footer({ branches }) {
    return (
        <footer className="bg-neutral-950 border-t border-white/10 pt-16 pb-8 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
                    {/* brand */}
                    <div>
                        <Logo className="h-9 mb-4" />
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Goodshot Snooker Club — your premier destination for snooker and billiards.
                            Play with passion, compete with pride.
                        </p>
                        <a
                            href="/admin/login"
                            className="inline-block mt-4 px-3 py-1 text-[11px] font-medium text-gray-500 border border-gray-700/50 rounded hover:text-gray-300 hover:border-gray-600 transition-colors duration-200"
                        >
                            Admin Login
                        </a>
                    </div>

                    {/* nav links */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Quick Links</h4>
                        <ul className="space-y-2">
                            {footerLinks.map((link) => (
                                <li key={link.label}>
                                    <a
                                        href={link.href}
                                        className="text-gray-400 hover:text-red-400 text-sm transition-colors duration-200"
                                    >
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* branches */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Our Branches</h4>
                        <ul className="space-y-3">
                            {branches.map((branch) => (
                                <li key={branch.id}>
                                    <p className="text-gray-300 text-sm font-medium">{branch.name}</p>
                                    <p className="text-gray-500 text-xs">{branch.address}</p>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* contact */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Contact</h4>
                        <ul className="space-y-3">
                            {branches.map((branch) => (
                                <li key={branch.id} className="text-sm">
                                    <p className="text-gray-300 font-medium">{branch.name}</p>
                                    <p className="text-gray-500">{branch.phone}</p>
                                    <p className="text-gray-500">{branch.email}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* bottom bar */}
                <div className="border-t border-white/10 pt-6 text-center">
                    <p className="text-gray-500 text-sm">
                        © {new Date().getFullYear()} Goodshot Snooker Club. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}

