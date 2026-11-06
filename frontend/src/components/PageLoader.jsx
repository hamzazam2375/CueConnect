// shown while a page's code is downloading
export default function PageLoader() {
    return (
        <div className="grid min-h-screen place-items-center bg-[#050505]">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-red-500" role="status" aria-label="Loading page" />
        </div>
    );
}
