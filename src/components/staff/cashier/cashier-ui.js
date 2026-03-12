"use client";

import AsyncButton from "../../../components/AsyncButton";
import { cx } from "./cashier-utils";

export function Skeleton({ className = "" }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70",
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
          <Skeleton className="h-24 w-full rounded-3xl" />
          <Skeleton className="h-16 w-full rounded-3xl" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-28 w-full rounded-3xl" />
            <Skeleton className="h-28 w-full rounded-3xl" />
            <Skeleton className="h-28 w-full rounded-3xl" />
            <Skeleton className="h-28 w-full rounded-3xl" />
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Skeleton className="h-80 w-full rounded-3xl" />
            <Skeleton className="h-80 w-full rounded-3xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Banner({ kind = "info", children, className = "" }) {
  const styles =
    kind === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
      : kind === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
        : kind === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
          : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

  return (
    <div
      className={cx("rounded-3xl border px-4 py-3 text-sm", styles, className)}
    >
      {children}
    </div>
  );
}

export function Card({ label, value, sub }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.08em] app-muted">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black text-[var(--app-fg)]">
        {value}
      </div>
      {sub ? <div className="mt-1 text-sm app-muted">{sub}</div> : null}
    </div>
  );
}

export function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={cx(
        "app-focus w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-3 text-sm text-[var(--app-fg)] outline-none transition",
        "placeholder:text-[var(--muted)] hover:border-[var(--border-strong)]",
        "disabled:cursor-not-allowed disabled:opacity-60",
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
        "app-focus w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-3 text-sm text-[var(--app-fg)] outline-none transition",
        "hover:border-[var(--border-strong)]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    />
  );
}

export function SectionCard({ title, hint, right, children }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
        <div className="min-w-0">
          <div className="text-base font-black text-[var(--app-fg)]">
            {title}
          </div>
          {hint ? <div className="mt-1 text-sm app-muted">{hint}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

export function TinyPill({ tone = "neutral", children }) {
  const cls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
        : tone === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
          : tone === "info"
            ? "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-200"
            : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em]",
        cls,
      )}
    >
      {children}
    </span>
  );
}

export function RefreshButton({
  loading,
  onClick,
  text = "Refresh",
  loadingText = "Refreshing…",
  successText = "Done",
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
    />
  );
}

export function LockedPanel({
  locked,
  message = "This action is locked.",
  children,
}) {
  return (
    <div className="relative">
      <div
        className={cx(
          "transition",
          locked
            ? "pointer-events-none select-none opacity-50 blur-[0.4px]"
            : "",
        )}
      >
        {children}
      </div>

      {locked ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-3xl">
          <div className="max-w-sm rounded-2xl border border-[var(--warn-border)] bg-[var(--card)] px-4 py-3 text-center text-sm font-semibold text-[var(--app-fg)] shadow-lg">
            {message}
          </div>
        </div>
      ) : null}
    </div>
  );
}
