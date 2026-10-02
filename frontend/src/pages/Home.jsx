import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import BranchSection from "../components/BranchSection";
import EventCard from "../components/EventCard";
import FeatureCard from "../components/FeatureCard";
import Footer from "../components/Footer";
import branches from "../data/branches";

const features = [
    {
        icon: "🎱",
        title: "Easy Table Booking",
        description: "Browse available tables across all branches and book your slot online in seconds."
    },
    {
        icon: "💳",
        title: "Membership",
        description: "Unlock exclusive discounts, priority booking, and special perks with our membership plans."
    },
    {
        icon: "🏆",
        title: "Tournaments & Events",
        description: "Compete in exciting tournaments, attend special events, and win prizes at your branch."
    },
    {
        icon: "⭐",
        title: "Loyalty Rewards",
        description: "Earn points with every game, redeem them for discounts, and enjoy being a valued member."
    }
];

// collect all events from all branches with branch name attached
const allEvents = branches.flatMap((branch) =>
    branch.events.map((event) => ({ ...event, branchName: branch.name }))
);

export default function Home() {
    return (
        <div className="bg-black min-h-screen">
            <Navbar />

            <Hero />

            {/* branches */}
            <BranchSection branches={branches} />

            {/* events */}
            <section id="events" className="py-20 px-4 bg-black">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-14">
                        <p className="text-red-500 font-semibold text-sm tracking-wider uppercase mb-2">
                            What&apos;s Coming Up
                        </p>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                            Events & Tournaments
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {allEvents.map((event, i) => (
                            <EventCard key={i} event={event} branchName={event.branchName} />
                        ))}
                    </div>
                </div>
            </section>

            {/* features */}
            <section className="py-20 px-4 bg-neutral-950">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-14">
                        <p className="text-red-500 font-semibold text-sm tracking-wider uppercase mb-2">
                            Why Choose Us
                        </p>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                            What We Offer
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((f, i) => (
                            <FeatureCard key={i} icon={f.icon} title={f.title} description={f.description} />
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-4 bg-black">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
                        Ready to Play?
                    </h2>
                    <p className="text-gray-400 text-lg mb-8">
                        Book your table and enjoy your game.
                    </p>
                    <a
                        href="/register"
                        className="inline-block px-10 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors duration-200 shadow-lg shadow-red-600/25 text-lg"
                    >
                        Book Now
                    </a>
                </div>
            </section>

            <Footer branches={branches} />
        </div>
    );
}
