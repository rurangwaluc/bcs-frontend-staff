"use client";

import { cx } from "./staff-format";

export function Skeleton({ className = "" }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded-2xl bg-stone-200/70 dark:bg-stone-800/70",
        className,
      )}
    />
  );
}

export function PageSkeleton() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--app-bg)] text-[var(--app-fg)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
          <div className="app-card rounded-[24px] p-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-3 h-4 w-52" />
            <div className="mt-6 grid gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>

          <div>
            <Skeleton className="h-12 w-full rounded-[24px]" />
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Skeleton className="h-80 w-full" />
              <Skeleton className="h-80 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Banner({ kind = "info", children }) {
  const styles =
    kind === "success"
      ? "border-emerald-300 bg-emerald-100/70 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
      : kind === "warn"
        ? "border-amber-300 bg-amber-100/70 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
        : kind === "danger"
          ? "border-rose-300 bg-rose-100/70 text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
          : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

  return (
    <div className={cx("rounded-2xl border px-4 py-3 text-sm", styles)}>
      {children}
    </div>
  );
}

export function Card({ label, value, sub }) {
  return (
    <div className="app-card rounded-[24px] p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] app-muted">
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-[var(--app-fg)]">
        {value}
      </div>
      {sub ? <div className="mt-1 text-xs app-muted">{sub}</div> : null}
    </div>
  );
}

export function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={cx(
        "app-focus h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm text-[var(--app-fg)] outline-none transition",
        "placeholder:text-[var(--muted-2)] hover:border-[var(--muted-2)]",
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
        "app-focus w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--app-fg)] outline-none transition",
        "placeholder:text-[var(--muted-2)] hover:border-[var(--muted-2)]",
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
        "app-focus h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm text-[var(--app-fg)] outline-none transition",
        "hover:border-[var(--muted-2)]",
        className,
      )}
    />
  );
}

export function SectionCard({ title, hint, right, children }) {
  return (
    <div className="app-card overflow-hidden rounded-[28px]">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-4 sm:p-5">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--app-fg)]">
            {title}
          </div>
          {hint ? <div className="mt-1 text-xs app-muted">{hint}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

export function NavItem({ active, label, onClick, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "w-full rounded-2xl px-3 py-3 text-left text-sm font-semibold transition",
        "flex items-center justify-between gap-2",
        active
          ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950"
          : "text-[var(--app-fg)] hover:bg-[var(--hover)]",
      )}
    >
      <span className="truncate">{label}</span>

      {badge ? (
        <span
          className={cx(
            "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold",
            active
              ? "bg-white/15 text-white dark:bg-stone-900/10 dark:text-stone-950"
              : "bg-[var(--card-2)] text-[var(--app-fg)]",
          )}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}
