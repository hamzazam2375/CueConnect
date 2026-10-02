export default function BranchCard({ branch, isSelected, onSelect }) {
    return (
        <div
            className={`bg-neutral-900 border rounded-xl p-6 transition-all duration-300 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10 ${
                isSelected ? "border-red-500 shadow-lg shadow-red-500/10" : "border-white/10"
            }`}
        >
            <h3 className="text-xl font-bold text-white mb-3">{branch.name}</h3>

            <div className="space-y-2 text-sm text-gray-400 mb-4">
                <p className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">📍</span>
                    {branch.address}
                </p>
                <p className="flex items-center gap-2">
                    <span className="text-red-500">🕐</span>
                    {branch.openingHours}
                </p>
                <p className="flex items-center gap-2">
                    <span className="text-red-500">📞</span>
                    {branch.phone}
                </p>
            </div>

            <p className="text-gray-400 text-sm leading-relaxed mb-6 line-clamp-3">
                {branch.description}
            </p>

            <div className="flex gap-3">
                <button
                    onClick={() => onSelect(branch)}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors duration-200"
                >
                    View Branch
                </button>
                <a
                    href="/login"
                    className="flex-1 px-4 py-2.5 border border-white/20 hover:border-white/40 hover:bg-white/5 text-white text-sm font-semibold rounded-lg transition-all duration-200 text-center"
                >
                    Book Table
                </a>
            </div>
        </div>
    );
}
