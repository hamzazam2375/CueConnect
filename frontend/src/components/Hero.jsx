import Logo from "./Logo";
import heroBg from "../../assets/table.jpg";

export default function Hero() {
    return (
        <section
            id="home"
            className="relative min-h-screen flex items-center justify-center overflow-hidden pt-28 sm:pt-32"
        >
            {/* background image */}
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${heroBg})` }}
            />

            {/* dark overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/90" />

            {/* content */}
            <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
                <p className="text-white font-semibold tracking-[0.35em] text-sm sm:text-base mb-5 uppercase">
                    Welcome To
                </p>

                <Logo
                    blend={false}
                    className="h-11 sm:h-14 lg:h-16 mx-auto object-center contrast-125 brightness-110 drop-shadow-[0_4px_18px_rgba(0,0,0,0.85)]"
                />

                <p className="text-white font-extrabold tracking-[0.4em] text-base sm:text-xl lg:text-2xl mt-5 mb-8 uppercase">
                    Snooker Club
                </p>

                <p className="text-red-500 font-bold tracking-[0.3em] text-sm sm:text-base mb-4 uppercase">
                    Play With Passion
                </p>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
                    Your Game. Your Table.{" "}
                    <span className="text-red-500">Your Time.</span>
                </h1>

                <p className="text-gray-300 text-base sm:text-lg mb-10 max-w-xl mx-auto leading-relaxed">
                    Book your favourite snooker or billiard table online, join tournaments,
                    earn loyalty rewards, and enjoy the best cue sports experience in town.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a
                        href="/login"
                        className="px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg shadow-red-600/25"
                    >
                        Book a Table
                    </a>
                    <a
                        href="#branches"
                        className="px-8 py-3.5 border border-white/30 hover:border-white/60 hover:bg-white/10 text-white font-semibold rounded-lg transition-all duration-200"
                    >
                        View Tables
                    </a>
                </div>
            </div>
        </section>
    );
}
