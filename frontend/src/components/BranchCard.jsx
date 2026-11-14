import { Link } from "react-router-dom";
import { formatOpeningHours } from "../utils/publicBranches";

export default function BranchCard({ branch, isSelected, onSelect }) {
    const snooker = branch.tables.filter((table) => table.type === "snooker").length;
    const billiard = branch.tables.filter((table) => table.type === "billiard").length;
    const fromPrice = branch.tables.length ? Math.min(...branch.tables.map((table) => table.pricePerHour)) : null;

    return (
        <div
            className={`flex flex-col bg-neutral-900 border rounded-xl p-6 transition-all duration-300 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10 ${
                isSelected ? "border-red-500 shadow-lg shadow-red-500/10" : "border-white/10"
            }`}
        >
            <h3 className="text-xl font-bold text-white mb-3">{branch.name}</h3>

            <div className="space-y-2 text-sm text-gray-400 mb-4">
                {branch.address && (
                    <p className="flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">📍</span>
                        {branch.address}
                    </p>
                )}
                <p className="flex items-center gap-2">
                    <span className="text-red-500">🕐</span>
                    {formatOpeningHours(branch)}
                </p>
                {branch.phone && (
                    <p className="flex items-center gap-2">
                        <span className="text-red-500">📞</span>
                        <a href={`tel:${branch.phone.replace(/[\s-]/g, "")}`} className="hover:text-white">{branch.phone}</a>
                    </p>
                )}
            </div>

            <p className="text-gray-400 text-sm leading-relaxed mb-6">
                {branch.tableCount
                    ? <>
                        {[snooker && `${snooker} snooker`, billiard && `${billiard} billiard`].filter(Boolean).join(" and ")} table{branch.tableCount === 1 ? "" : "s"}
                        {" · "}
                        <span className="text-emerald-400">{branch.availableCount} available now</span>
                        {fromPrice != null && <> · from PKR {fromPrice.toLocaleString()}/hr</>}
                    </>
                    : "Tables coming soon."}
            </p>

            <div className="mt-auto flex gap-3">
                <button
                    type="button"
                    onClick={() => onSelect(branch)}
                    aria-expanded={isSelected}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors duration-200"
                >
                    {isSelected ? "Hide Tables" : "View Tables"}
                </button>
                <Link
                    to="/login"
                    className="flex-1 px-4 py-2.5 border border-white/20 hover:border-white/40 hover:bg-white/5 text-white text-sm font-semibold rounded-lg transition-all duration-200 text-center"
                >
                    Book Table
                </Link>
            </div>
        </div>
    );
}
