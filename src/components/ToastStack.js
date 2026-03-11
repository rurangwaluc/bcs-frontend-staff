"use client";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function toneClasses(kind, urgent) {
  if (kind === "success") {
    return urgent
      ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
      : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200";
  }

  if (kind === "warn") {
    return urgent
      ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
      : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200";
  }

  if (kind === "danger" || kind === "error") {
    return urgent
      ? "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100"
      : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200";
  }

  return urgent
    ? "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100"
    : "border-[var(--border)] bg-[var(--card)] text-[var(--app-fg)]";
}

export default function ToastStack({ toasts = [], onDismiss }) {
  if (!Array.isArray(toasts) || toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[99999] flex w-[min(380px,calc(100vw-24px))] flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cx(
            "pointer-events-auto overflow-hidden rounded-3xl border shadow-[var(--shadow-float)] backdrop-blur-sm",
            toast.urgent ? "ring-2 ring-white/40 dark:ring-white/10" : "",
            toneClasses(toast.kind, toast.urgent),
          )}
        >
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {toast.title ? (
                  <div className="text-sm font-black uppercase tracking-[0.08em]">
                    {toast.title}
                  </div>
                ) : null}

                <div
                  className={cx(
                    "break-words",
                    toast.title ? "mt-1 text-sm" : "text-sm font-semibold",
                  )}
                >
                  {toast.message}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDismiss?.(toast.id)}
                className="app-focus shrink-0 rounded-2xl border border-current/15 bg-white/50 px-3 py-1.5 text-xs font-bold dark:bg-white/5"
              >
                Close
              </button>
            </div>
          </div>

          {toast.urgent ? <div className="h-1 w-full bg-current/15" /> : null}
        </div>
      ))}
    </div>
  );
}
