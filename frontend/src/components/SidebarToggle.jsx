import { useSidebar } from "./sidebarContext";

export default function SidebarToggle() {
    const { isOpen, openSidebar } = useSidebar();

    return (
        <button
            type="button"
            onClick={openSidebar}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-neutral-300 transition-all hover:border-white/15 hover:bg-white/[0.07] hover:text-white"
            aria-label="Open menu"
            aria-expanded={isOpen}
            aria-controls="client-sidebar"
        >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h10" />
            </svg>
        </button>
    );
}
