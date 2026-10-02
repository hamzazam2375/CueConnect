import logo from "../../assets/goodshot.png";

export default function Logo({ className = "h-9", blend = true }) {
    return (
        <img
            src={logo}
            alt="Goodshot Snooker Club"
            className={`block w-auto object-contain object-left select-none ${blend ? "mix-blend-screen" : ""} ${className}`}
        />
    );
}
