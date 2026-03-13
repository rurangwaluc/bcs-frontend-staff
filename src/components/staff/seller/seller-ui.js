"use client";

import { cx, formatWhen, money, statusUi } from "./seller-utils";

function toneClass(tone = "neutral") {
  if (tone === "success") {
    return "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:shadow-none";
  }

  if (tone === "warn") {
    return "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] dark:shadow-none";
  }

  if (tone === "danger") {
    return "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] dark:shadow-none";
  }

  if (tone === "info") {
    return "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] dark:shadow-none";
  }

  return "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";
}

export function Skeleton({ className = "" }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-800/70",
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
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)] dark:shadow-sm">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-3 h-4 w-52" />
            <div className="mt-6 grid gap-3">
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

export function Card({ label, value, sub }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[0_10px_28px_rgba(15,23,42,0.08)] transition dark:shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.1em] text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black text-[var(--app-fg)]">
        {value}
      </div>
      {sub ? (
        <div className="mt-1 text-sm text-[var(--muted)]">{sub}</div>
      ) : null}
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
        "focus:border-[var(--border-strong)]",
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
        "focus:border-[var(--border-strong)]",
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
        "focus:border-[var(--border-strong)]",
        className,
      )}
    />
  );
}

export function SectionCard({ title, hint, right, children, className = "" }) {
  return (
    <div
      className={cx(
        "overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-[0_12px_32px_rgba(15,23,42,0.08)] dark:shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
        <div className="min-w-0">
          <div className="text-base font-black text-[var(--app-fg)]">
            {title}
          </div>
          {hint ? (
            <div className="mt-1 text-sm text-[var(--muted)]">{hint}</div>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function NavItem({ active, label, onClick, badge }) {
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
            "inline-flex min-w-[24px] items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-extrabold",
            active
              ? "bg-white/15 text-white"
              : "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)] border",
          )}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export function StatusBadge({ status }) {
  const { label, tone } = statusUi(status);

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] shadow-sm",
        toneClass(tone),
      )}
    >
      {label}
    </span>
  );
}

export function CreditSummary({ sale }) {
  const credit = sale?.credit || null;
  const status = String(credit?.status || sale?.status || "").toUpperCase();

  const total = Number(credit?.amount ?? sale?.totalAmount ?? 0) || 0;
  const paid = Number(sale?.amountPaid ?? credit?.paidAmount ?? 0) || 0;
  const remaining = Math.max(0, total - paid);

  const issuedAt = credit?.createdAt || null;
  const settledAt = credit?.settledAt || null;

  const issuedText = issuedAt ? formatWhen(issuedAt) : "—";
  const paidText = settledAt ? formatWhen(settledAt) : "Not paid yet";

  const pillTone = status === "PENDING" ? "warn" : "success";

  return (
    <div className="mt-4 rounded-3xl border border-[var(--warn-border)] bg-[var(--warn-bg)] p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)] dark:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-black text-[var(--app-fg)]">
            Credit summary
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            Sale #{sale?.id ?? "—"} • Customer:{" "}
            <b className="text-[var(--app-fg)]">{sale?.customerName || "—"}</b>
          </div>
        </div>

        <span
          className={cx(
            "inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.1em]",
            toneClass(pillTone),
          )}
        >
          {status === "PENDING" ? "Credit • Pending" : "Credit • Settled"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-[var(--warn-border)] bg-[var(--card)] p-3 shadow-sm dark:shadow-none">
          <div className="text-[11px] font-black uppercase tracking-[0.08em] text-[var(--muted)]">
            Paid / Total
          </div>
          <div className="mt-1 text-base font-black text-[var(--app-fg)]">
            {money(paid)} / {money(total)} RWF
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            Remaining:{" "}
            <b className="text-[var(--app-fg)]">{money(remaining)}</b> RWF
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--warn-border)] bg-[var(--card)] p-3 shadow-sm dark:shadow-none">
          <div className="text-[11px] font-black uppercase tracking-[0.08em] text-[var(--muted)]">
            Issued
          </div>
          <div className="mt-1 text-base font-black text-[var(--app-fg)]">
            {issuedText}
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            By:{" "}
            <b className="text-[var(--app-fg)]">{sale?.sellerName || "—"}</b>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--warn-border)] bg-[var(--card)] p-3 shadow-sm dark:shadow-none">
          <div className="text-[11px] font-black uppercase tracking-[0.08em] text-[var(--muted)]">
            Paid date
          </div>
          <div className="mt-1 text-base font-black text-[var(--app-fg)]">
            {paidText}
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            Status: <b className="text-[var(--app-fg)]">{status || "—"}</b>
          </div>
        </div>
      </div>

      <div className="mt-3 text-[11px] font-medium text-[var(--warn-fg)]/90">
        Installments are not enabled yet because payments has a unique index per
        sale.
      </div>
    </div>
  );
}
