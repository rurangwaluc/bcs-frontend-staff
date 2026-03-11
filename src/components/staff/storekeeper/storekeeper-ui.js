"use client";

import { cx, statusLabel, statusTone } from "./storekeeper-utils";

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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="mt-3 h-4 w-52" />
            <div className="mt-6 grid gap-3">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          </div>

          <div>
            <Skeleton className="h-14 w-full rounded-3xl" />
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Skeleton className="h-28 w-full rounded-3xl" />
              <Skeleton className="h-28 w-full rounded-3xl" />
              <Skeleton className="h-28 w-full rounded-3xl" />
              <Skeleton className="h-28 w-full rounded-3xl" />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Skeleton className="h-80 w-full rounded-3xl" />
              <Skeleton className="h-80 w-full rounded-3xl" />
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
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
      : kind === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
        : kind === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
          : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

  return (
    <div className={cx("rounded-3xl border px-4 py-3 text-sm", styles)}>
      {children}
    </div>
  );
}

export function Card({ label, value, sub }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition">
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
        "placeholder:text-[var(--muted)]",
        "hover:border-[var(--border-strong)]",
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
        "app-focus w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-3 text-sm text-[var(--app-fg)] outline-none transition",
        "placeholder:text-[var(--muted)]",
        "hover:border-[var(--border-strong)]",
        className,
      )}
    />
  );
}

export function SectionCard({ title, hint, right, children, className = "" }) {
  return (
    <div
      className={cx(
        "overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm",
        className,
      )}
    >
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

export function NavItem({
  active,
  label,
  onClick,
  badge,
  badgeTone = "default",
}) {
  const badgeCls =
    badgeTone === "danger"
      ? active
        ? "border-white/15 bg-white/15 text-white"
        : "border-[var(--danger-fg)] bg-[var(--danger-fg)] text-white"
      : active
        ? "border-white/15 bg-white/15 text-white"
        : "border-[var(--border)] bg-[var(--card)] text-[var(--app-fg)]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "app-focus flex w-full items-center justify-between gap-2 rounded-2xl px-3.5 py-3 text-left text-sm font-semibold transition",
        active
          ? "bg-[var(--app-fg)] text-[var(--app-bg)] shadow-sm"
          : "text-[var(--app-fg)] hover:bg-[var(--hover)]",
      )}
    >
      <span className="truncate">{label}</span>

      {badge ? (
        <span
          className={cx(
            "inline-flex min-w-[24px] items-center justify-center rounded-full border px-2 py-0.5 text-[11px] font-extrabold",
            badgeCls,
          )}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export function PillTabsWithBadges({ value, onChange, tabs = [] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => {
        const active = value === t.value;
        const badge = Number(t.badge || 0);
        const danger = t.badgeTone === "danger";

        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={cx(
              "app-focus inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-extrabold transition",
              active
                ? "border-[var(--app-fg)] bg-[var(--app-fg)] text-[var(--app-bg)]"
                : "border-[var(--border)] bg-[var(--card)] text-[var(--app-fg)] hover:bg-[var(--hover)]",
            )}
          >
            <span>{t.label}</span>
            <span
              className={cx(
                "inline-flex min-w-[24px] items-center justify-center rounded-full px-2 py-0.5 text-xs font-extrabold",
                danger
                  ? "bg-[var(--danger-fg)] text-white"
                  : active
                    ? "bg-white/15 text-white"
                    : "bg-[var(--card-2)] text-[var(--app-fg)]",
              )}
            >
              {badge}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function StatusBadge({ status }) {
  const tone = statusTone(status);
  const label = statusLabel(status);

  const cls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
        : tone === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
          : tone === "info"
            ? "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]"
            : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em]",
        cls,
      )}
    >
      {label}
    </span>
  );
}

export function InfoPill({ children, tone = "default" }) {
  const toneCls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
        : tone === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
          : tone === "info"
            ? "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]"
            : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em]",
        toneCls,
      )}
    >
      {children}
    </span>
  );
}

export function StatCard({ label, value, sub, tone = "default" }) {
  const toneCls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)]"
        : tone === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)]"
          : tone === "info"
            ? "border-[var(--info-border)] bg-[var(--info-bg)]"
            : "border-[var(--border)] bg-[var(--card-2)]";

  return (
    <div className={cx("rounded-2xl border p-3", toneCls)}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
        {label}
      </div>
      <div className="mt-1 text-lg font-black text-[var(--app-fg)]">
        {value}
      </div>
      {sub ? <div className="mt-1 text-xs app-muted">{sub}</div> : null}
    </div>
  );
}

export function ReleaseButton({ state, disabled, onClick }) {
  const s = state || "idle";
  const label =
    s === "loading" ? "Releasing…" : s === "success" ? "Released" : "Release";

  const cls =
    s === "success"
      ? "bg-emerald-600 text-white hover:bg-emerald-700"
      : s === "loading"
        ? "bg-amber-600 text-white"
        : "bg-[var(--app-fg)] text-[var(--app-bg)] hover:opacity-90";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || s === "loading" || s === "success"}
      className={cx(
        "app-focus rounded-2xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
        cls,
      )}
    >
      {label}
    </button>
  );
}
