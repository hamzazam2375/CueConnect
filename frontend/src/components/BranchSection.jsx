import { useState } from "react";
import BranchCard from "./BranchCard";
import { formatOpeningHours } from "../utils/publicBranches";

const STATUS_STYLES = {
    available: { label: "Available", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    occupied: { label: "In play", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    maintenance: { label: "Maintenance", className: "bg-red-500/10 text-red-400 border-red-500/20" }
};

// `branches` is null while loading; `error` is set when the list could not be fetched
export default function BranchSection({ branches, error }) {
    const [selectedId, setSelectedId] = useState(null);
    const selectedBranch = branches?.find((branch) => branch.id === selectedId) || null;

    const handleSelect = (branch) => setSelectedId((current) => current === branch.id ? null : branch.id);

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

                {error ? (
                    <p className="text-center text-gray-500">Branches could not be loaded right now. Please refresh the page.</p>
                ) : !branches ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading branches">
                        {[0, 1].map((item) => <div key={item} className="h-64 rounded-xl border border-white/10 bg-neutral-900 animate-pulse" />)}
                    </div>
                ) : branches.length === 0 ? (
                    <p className="text-center text-gray-500">Our branches will be listed here soon.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {branches.map((branch) => (
                            <BranchCard
                                key={branch.id}
                                branch={branch}
                                isSelected={selectedId === branch.id}
                                onSelect={handleSelect}
                            />
                        ))}
                    </div>
                )}

                {selectedBranch && (
                    <BranchDetail branch={selectedBranch} onClose={() => setSelectedId(null)} />
                )}
            </div>
        </section>
    );
}

function BranchDetail({ branch, onClose }) {
    return (
        <div className="bg-neutral-900 border border-white/10 rounded-xl p-6 sm:p-8 mt-4 animate-fade-in">
            {/* header */}
            <div className="flex items-start justify-between gap-4 mb-8">
                <div>
                    <h3 className="text-2xl font-bold text-white">{branch.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">{formatOpeningHours(branch)}{branch.address ? ` · ${branch.address}` : ""}</p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close branch details"
                    className="text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                    ✕
                </button>
            </div>

            <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                🎱 Tables & Prices
            </h4>
            {branch.tables.length === 0 ? (
                <p className="text-sm text-gray-500">This branch hasn&apos;t listed its tables yet.</p>
            ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {branch.tables.map((table) => {
                        const status = STATUS_STYLES[table.status] || STATUS_STYLES.available;
                        return (
                            <div
                                key={table.id}
                                className="flex items-center justify-between gap-3 bg-black/40 rounded-lg p-3 border border-white/5"
                            >
                                <div className="min-w-0">
                                    <p className="text-white font-medium text-sm">{table.name}</p>
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className="text-gray-500 text-xs capitalize">{table.type}</span>
                                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>{status.label}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-white text-sm font-semibold">
                                        PKR {Number(table.pricePerHour).toLocaleString()}/hr
                                    </p>
                                    <p className="text-gray-500 text-xs">
                                        Frame: {table.frameRate} · Century: {table.centuryRate}/min
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
