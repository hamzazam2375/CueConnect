export function LoadingPanel({ label = "Loading" }) {
    return (
        <div className="grid place-items-center py-20">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-red-500" role="status" aria-label={label} />
        </div>
    );
}

export function ErrorPanel({ message, onRetry }) {
    return (
        <section className="dashboard-rise mt-8 rounded-3xl border border-red-500/15 bg-red-500/[0.04] px-6 py-12 text-center" role="alert">
            <h2 className="text-lg font-black">Something went wrong</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-neutral-500">{message}</p>
            {onRetry && <button type="button" onClick={onRetry} className="mt-6 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold transition-colors hover:bg-red-500">Try again</button>}
        </section>
    );
}
