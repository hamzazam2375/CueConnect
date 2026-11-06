import { Link } from "react-router-dom";

// `event` comes from GET /api/events
export default function EventCard({ event, branchName }) {
    const formattedDate = new Date(event.date).toLocaleDateString("en-PK", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric"
    });
    const formattedTime = new Date(event.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

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
                <span>{formattedTime}</span>
            </div>

            <p className="text-gray-400 text-sm leading-relaxed mb-4">
                {event.description}
            </p>

            {/* prize & fee */}
            <div className="flex items-center justify-between text-sm">
                {event.prize && (
                    <span className="text-yellow-400 font-semibold">🏅 {event.prize}</span>
                )}
                <span className="text-gray-400">
                    {event.registrationFee > 0 ? `Entry: PKR ${event.registrationFee.toLocaleString()}` : "Free entry"}
                </span>
            </div>

            {event.registrationOpen ? (
                <Link
                    to={`/client/events/${event.id}`}
                    className="mt-5 block rounded-lg bg-red-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-red-500"
                >
                    Register
                </Link>
            ) : (
                <p className="mt-5 rounded-lg border border-white/10 px-4 py-2.5 text-center text-sm text-gray-500">
                    {event.spotsLeft === 0 ? "Fully booked" : "Registration closed"}
                </p>
            )}
        </div>
    );
}
