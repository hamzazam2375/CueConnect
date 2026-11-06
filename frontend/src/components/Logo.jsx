// sized for its largest use (40px tall) at 2x
import logo from "../../assets/goodshot.webp";

export default function Logo({ className = "h-9", blend = true }) {
    return (
        <img
            src={logo}
            alt="Goodshot Snooker Club"
            width="526"
            height="80"
            decoding="async"
            className={`block w-auto object-contain object-left select-none ${blend ? "mix-blend-screen" : ""} ${className}`}
        />
    );
}
