export default function EventCard({ event, branchName }) {
    const formattedDate = new Date(event.date).toLocaleDateString("en-PK", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric"
    });

    return (
        <div className="bg-neutral-900 border border-white/10 rounded-xl p-6 hover:border-red-500/40 transition-all duration-300">
            {/* badge */}
            <span
                className={`inline-block px-3 py-1 text-xs font-semibold rounded-full mb-4 ${
                    event.type === "tournament"
                        ? "bg-red-600/20 text-red-400"
                        : "bg-white/10 text-gray-300"
                }`}
            >
                {event.type === "tournament" ? "🏆 Tournament" : "🎱 Event"}
            </span>

            <h3 className="text-lg font-bold text-white mb-2">{event.title}</h3>

            <p className="text-sm text-red-400 font-medium mb-1">{branchName}</p>

            <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                <span>{formattedDate}</span>
                <span>{event.time}</span>
            </div>

            <p className="text-gray-400 text-sm leading-relaxed mb-4">
                {event.description}
            </p>

            {/* prize & fee */}
            <div className="flex items-center justify-between text-sm">
                {event.prize && (
                    <span className="text-yellow-400 font-semibold">🏅 {event.prize}</span>
                )}
                {event.fee > 0 && (
                    <span className="text-gray-400">Entry: PKR {event.fee}</span>
                )}
            </div>
        </div>
    );
}
