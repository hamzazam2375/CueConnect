import { useState } from "react";
import BranchCard from "./BranchCard";

export default function BranchSection({ branches }) {
    const [selectedBranch, setSelectedBranch] = useState(null);

    const handleSelect = (branch) => {
        setSelectedBranch(selectedBranch?.id === branch.id ? null : branch);
    };

    return (
        <section id="branches" className="py-20 px-4 bg-neutral-950">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-14">
                    <p className="text-red-500 font-semibold text-sm tracking-wider uppercase mb-2">
                        Our Locations
                    </p>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                        Our Branches
                    </h2>
                </div>

                {/* branch cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {branches.map((branch) => (
                        <BranchCard
                            key={branch.id}
                            branch={branch}
                            isSelected={selectedBranch?.id === branch.id}
                            onSelect={handleSelect}
                        />
                    ))}
                </div>

                {/* branch detail panel */}
                {selectedBranch && (
                    <BranchDetail branch={selectedBranch} onClose={() => setSelectedBranch(null)} />
                )}
            </div>
        </section>
    );
}

function BranchDetail({ branch, onClose }) {
    return (
        <div className="bg-neutral-900 border border-white/10 rounded-xl p-6 sm:p-8 mt-4 animate-fade-in">
            {/* header */}
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-white">{branch.name}</h3>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                    ✕
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* tables */}
                <div>
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        🎱 Tables & Prices
                    </h4>
                    <div className="space-y-3">
                        {branch.tables.map((table, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between bg-black/40 rounded-lg p-3 border border-white/5"
                            >
                                <div>
                                    <p className="text-white font-medium text-sm">{table.name}</p>
                                    <p className="text-gray-500 text-xs capitalize">{table.type}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-white text-sm font-semibold">
                                        PKR {table.pricePerHour}/hr
                                    </p>
                                    <p className="text-gray-500 text-xs">
                                        Frame: {table.frameRate} · Century: {table.centuryRate}
                                    </p>
                                </div>

                            </div>
                        ))}
                    </div>
                </div>

                {/* memberships */}
                <div>
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2" id="membership">
                        💳 Memberships
                    </h4>
                    <div className="space-y-3">
                        {branch.memberships.map((m, i) => (
                            <div
                                key={i}
                                className="bg-black/40 rounded-lg p-4 border border-white/5"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-white font-semibold">{m.plan}</span>
                                    <span className="text-red-400 font-bold">PKR {m.price}/{m.duration}</span>
                                </div>
                                <p className="text-gray-400 text-xs">{m.rules}</p>
                                <p className="text-green-400 text-xs mt-1 font-medium">{m.discount}% discount on rates</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* discounts */}
                <div>
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        🏷️ Active Discounts
                    </h4>
                    <div className="space-y-3">
                        {branch.discounts.map((d, i) => (
                            <div
                                key={i}
                                className="bg-black/40 rounded-lg p-3 border border-white/5 flex items-center justify-between"
                            >
                                <div>
                                    <p className="text-white font-medium text-sm">{d.name}</p>
                                    <p className="text-gray-500 text-xs">{d.description}</p>
                                </div>
                                <span className="text-red-400 font-bold text-lg">{d.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* contact */}
                <div>
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        📞 Contact & Location
                    </h4>
                    <div className="bg-black/40 rounded-lg p-4 border border-white/5 space-y-3">
                        <p className="text-gray-400 text-sm flex items-start gap-2">
                            <span className="text-red-500">📍</span> {branch.address}
                        </p>
                        <p className="text-gray-400 text-sm flex items-center gap-2">
                            <span className="text-red-500">📞</span> {branch.phone}
                        </p>
                        <p className="text-gray-400 text-sm flex items-center gap-2">
                            <span className="text-red-500">✉️</span> {branch.email}
                        </p>
                        <p className="text-gray-400 text-sm flex items-center gap-2">
                            <span className="text-red-500">🕐</span> {branch.openingHours}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
