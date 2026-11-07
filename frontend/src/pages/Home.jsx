import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import BranchSection from "../components/BranchSection";
import EventCard from "../components/EventCard";
import FeatureCard from "../components/FeatureCard";
import Footer from "../components/Footer";
import branches from "../data/branches";
import { fetchPublicEvents } from "../utils/clientEvents";

const features = [
    {
        icon: "🎱",
        title: "Easy Table Booking",
        description: "Browse available tables across all branches and book your slot online in seconds."
    },
    {
        icon: "🔔",
        title: "Waitlist Alerts",
        description: "Join the waitlist for a booked slot and get notified the moment the table frees up."
    },
    {
        icon: "🏆",
        title: "Tournaments & Events",
        description: "Compete in exciting tournaments, attend special events, and win prizes at your branch."
    },
    {
        icon: "⭐",
        title: "Loyalty Rewards",
        description: "Earn 10 points for every game you play and redeem them for discounts on your bookings."
    }
];

export default function Home() {
    const [events, setEvents] = useState(null);

    useEffect(() => {
        let active = true;
        // the section shows its empty message if events can't be loaded
        fetchPublicEvents()
            .then((data) => active && setEvents(data))
            .catch(() => active && setEvents([]));
        return () => { active = false; };
    }, []);

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

                    {events && !events.length && (
                        <p className="text-center text-gray-500">No upcoming events right now. New tournaments are announced here.</p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events?.map((event) => (
                            <EventCard key={event.id} event={event} branchName={event.branchName.replace("GOODSHOT ", "")} />
                        ))}
                    </div>
                </div>
            </section>

            {/* features */}
            <section id="features" className="py-20 px-4 bg-neutral-950">
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
