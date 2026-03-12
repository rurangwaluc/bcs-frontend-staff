"use client";

import AsyncButton from "../../../components/AsyncButton";

export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function managerSurface(base = "") {
  return cx(
    "border border-[var(--border)] bg-[var(--card)] text-[var(--app-fg)]",
    base,
  );
}

export function managerMutedSurface(base = "") {
  return cx(
    "border border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]",
    base,
  );
}

export function Skeleton({ className = "" }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded-3xl bg-slate-200/70 dark:bg-slate-800/70",
        className,
      )}
    />
  );
}

export function PageSkeleton() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--app-bg)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-5">
        <div className="grid gap-4">
          <Skeleton className="h-24 w-full rounded-[28px]" />
          <Skeleton className="h-20 w-full rounded-[28px]" />
          <Skeleton className="h-56 w-full rounded-[32px]" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-32 w-full rounded-[28px]" />
            <Skeleton className="h-32 w-full rounded-[28px]" />
            <Skeleton className="h-32 w-full rounded-[28px]" />
            <Skeleton className="h-32 w-full rounded-[28px]" />
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Skeleton className="h-[340px] w-full rounded-[32px]" />
            <Skeleton className="h-[340px] w-full rounded-[32px]" />
          </div>
          <Skeleton className="h-[520px] w-full rounded-[32px]" />
        </div>
      </div>
    </div>
  );
}

export function Banner({ kind = "info", children }) {
  const cls =
    kind === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
      : kind === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
        : kind === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
          : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

  return (
    <div
      className={cx(
        "rounded-[24px] border px-4 py-3 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
        cls,
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
  className = "",
}) {
  const toneCls =
    tone === "success"
      ? "from-emerald-500/8 to-transparent"
      : tone === "warn"
        ? "from-amber-500/10 to-transparent"
        : tone === "danger"
          ? "from-rose-500/10 to-transparent"
          : tone === "info"
            ? "from-sky-500/10 to-transparent"
            : "from-slate-500/5 to-transparent";

  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-5",
        "shadow-[0_6px_20px_rgba(2,6,23,0.03)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.18)]",
        className,
      )}
    >
      <div
        className={cx(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-100",
          toneCls,
        )}
      />
      <div className="relative">
        <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
          {label}
        </div>
        <div className="mt-3 text-4xl font-black tracking-[-0.04em] text-[var(--app-fg)]">
          {value}
        </div>
        {sub ? (
          <div className="mt-2 text-sm text-[var(--muted)]">{sub}</div>
        ) : null}
      </div>
    </div>
  );
}

export function Card({ label, value, sub, className = "" }) {
  return (
    <div
      className={cx(
        "rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-4",
        "shadow-[0_4px_18px_rgba(2,6,23,0.03)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.16)]",
        className,
      )}
    >
      <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black tracking-[-0.03em] text-[var(--app-fg)]">
        {value}
      </div>
      {sub ? (
        <div className="mt-2 text-sm text-[var(--muted)]">{sub}</div>
      ) : null}
    </div>
  );
}

export function MetricCard({
  eyebrow,
  title,
  value,
  sub,
  tone = "neutral",
  children,
}) {
  return (
    <div className="rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-5">
      {eyebrow ? (
        <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
          {eyebrow}
        </div>
      ) : null}

      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {title ? (
            <div className="text-sm font-bold text-[var(--app-fg)]">
              {title}
            </div>
          ) : null}
          {value != null ? (
            <div className="mt-2 text-3xl font-black tracking-[-0.03em] text-[var(--app-fg)]">
              {value}
            </div>
          ) : null}
          {sub ? (
            <div className="mt-1 text-sm text-[var(--muted)]">{sub}</div>
          ) : null}
        </div>

        <TinyPill tone={tone}>{tone}</TinyPill>
      </div>

      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

export function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={cx(
        "app-focus w-full rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--app-fg)] outline-none transition",
        "placeholder:text-[var(--muted)] hover:border-[var(--border-strong)]",
        className,
      )}
    />
  );
}

export function Select({ className = "", ...props }) {
  return (
    <select
      {...props}
      className={cx(
        "app-focus w-full rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--app-fg)] outline-none transition",
        "hover:border-[var(--border-strong)]",
        className,
      )}
    />
  );
}

export function TextArea({ className = "", ...props }) {
  return (
    <textarea
      {...props}
      className={cx(
        "app-focus min-h-[112px] w-full rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--app-fg)] outline-none transition",
        "placeholder:text-[var(--muted)] hover:border-[var(--border-strong)]",
        className,
      )}
    />
  );
}

export function SectionCard({
  title,
  hint,
  right,
  children,
  className = "",
  bodyClassName = "",
  headerClassName = "",
}) {
  return (
    <section
      className={cx(
        "overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--card)]",
        "shadow-[0_10px_30px_rgba(2,6,23,0.04)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.22)]",
        className,
      )}
    >
      <div
        className={cx(
          "flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4 sm:px-6",
          headerClassName,
        )}
      >
        <div className="min-w-0">
          <div className="text-base font-black tracking-[-0.02em] text-[var(--app-fg)]">
            {title}
          </div>
          {hint ? (
            <div className="mt-1 text-sm leading-6 text-[var(--muted)]">
              {hint}
            </div>
          ) : null}
        </div>

        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      <div className={cx("p-4 sm:p-5 lg:p-6", bodyClassName)}>{children}</div>
    </section>
  );
}

export function TinyPill({ tone = "neutral", children, className = "" }) {
  const styles = {
    success:
      "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-700",

    warn: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-900/30 dark:border-amber-700",

    danger:
      "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-900/30 dark:border-rose-700",

    info: "text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-300 dark:bg-sky-900/30 dark:border-sky-700",

    neutral:
      "text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide",
        styles[tone] || styles.neutral,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function NavPill({ active, label, badge, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "group flex min-h-[56px] items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-left transition",
        active
          ? "border-transparent bg-[var(--app-fg)] text-[var(--app-bg)] shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
          : "border-[var(--border)] bg-[var(--card)] text-[var(--app-fg)] hover:border-[var(--border-strong)] hover:bg-[var(--hover)]",
      )}
    >
      <span className="truncate text-sm font-bold">{label}</span>

      {badge != null ? (
        <span
          className={cx(
            "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black",
            active
              ? "border-white/20 bg-white/12 text-white"
              : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]",
          )}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export function RefreshButton({
  loading,
  onClick,
  text = "Refresh",
  loadingText = "Refreshing…",
  successText = "Done",
  className = "",
}) {
  return (
    <AsyncButton
      variant="secondary"
      size="sm"
      state={loading ? "loading" : "idle"}
      text={text}
      loadingText={loadingText}
      successText={successText}
      onClick={onClick}
      className={className}
    />
  );
}

export function EmptyState({
  title = "Nothing here yet",
  hint = "There is no data to show right now.",
  action = null,
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--card-2)] px-5 py-8 text-center">
      <div className="text-base font-black text-[var(--app-fg)]">{title}</div>
      <div className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
        {hint}
      </div>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function SurfaceRow({ children, className = "" }) {
  return (
    <div
      className={cx(
        "rounded-[22px] border border-[var(--border)] bg-[var(--card)] p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
