export default function FeatureCard({ icon, title, description }) {
    return (
        <div className="bg-neutral-900 border border-white/10 rounded-xl p-6 text-center hover:border-red-500/40 hover:shadow-lg hover:shadow-red-500/5 transition-all duration-300">
            <div className="text-4xl mb-4">{icon}</div>
            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
        </div>
    );
}
