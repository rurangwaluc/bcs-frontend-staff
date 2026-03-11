"use client";

import { cx, formatWhen, money, statusUi } from "./seller-utils";

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
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition">
      <div className="text-xs font-semibold uppercase tracking-wide app-muted">
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
          <div className="text-base font-bold text-[var(--app-fg)]">
            {title}
          </div>
          {hint ? <div className="mt-1 text-sm app-muted">{hint}</div> : null}
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
              : "bg-[var(--card-2)] text-[var(--app-fg)]",
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

  const cls =
    tone === "success"
      ? "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
      : tone === "warn"
        ? "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
        : tone === "danger"
          ? "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
          : tone === "info"
            ? "border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200"
            : "border-[var(--border-strong)] bg-[var(--card-2)] text-[var(--app-fg)]";

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

  const pillCls =
    status === "PENDING"
      ? "border-amber-400 bg-amber-200 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
      : "border-emerald-400 bg-emerald-200 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200";

  return (
    <div className="mt-4 rounded-3xl border border-amber-300 bg-amber-50 p-4 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-black text-slate-950 dark:text-[var(--app-fg)]">
            Credit summary
          </div>
          <div className="mt-1 text-xs text-slate-700 dark:text-[var(--muted)]">
            Sale #{sale?.id ?? "—"} • Customer:{" "}
            <b className="text-slate-950 dark:text-[var(--app-fg)]">
              {sale?.customerName || "—"}
            </b>
          </div>
        </div>

        <span
          className={cx(
            "inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] shadow-sm",
            pillCls,
          )}
        >
          {status === "PENDING" ? "Credit • Pending" : "Credit • Settled"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-amber-200 bg-white p-3 shadow-sm dark:border-[var(--border)] dark:bg-[var(--card)]">
          <div className="text-[11px] font-semibold text-slate-600 dark:text-[var(--muted)]">
            Paid / Total
          </div>
          <div className="mt-1 text-base font-black text-slate-950 dark:text-[var(--app-fg)]">
            {money(paid)} / {money(total)} RWF
          </div>
          <div className="mt-1 text-xs text-slate-700 dark:text-[var(--muted)]">
            Remaining:{" "}
            <b className="text-slate-950 dark:text-[var(--app-fg)]">
              {money(remaining)}
            </b>{" "}
            RWF
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-white p-3 shadow-sm dark:border-[var(--border)] dark:bg-[var(--card)]">
          <div className="text-[11px] font-semibold text-slate-600 dark:text-[var(--muted)]">
            Issued
          </div>
          <div className="mt-1 text-base font-black text-slate-950 dark:text-[var(--app-fg)]">
            {issuedText}
          </div>
          <div className="mt-1 text-xs text-slate-700 dark:text-[var(--muted)]">
            By:{" "}
            <b className="text-slate-950 dark:text-[var(--app-fg)]">
              {sale?.sellerName || "—"}
            </b>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-white p-3 shadow-sm dark:border-[var(--border)] dark:bg-[var(--card)]">
          <div className="text-[11px] font-semibold text-slate-600 dark:text-[var(--muted)]">
            Paid date
          </div>
          <div className="mt-1 text-base font-black text-slate-950 dark:text-[var(--app-fg)]">
            {paidText}
          </div>
          <div className="mt-1 text-xs text-slate-700 dark:text-[var(--muted)]">
            Status:{" "}
            <b className="text-slate-950 dark:text-[var(--app-fg)]">
              {status || "—"}
            </b>
          </div>
        </div>
      </div>

      <div className="mt-3 text-[11px] text-amber-900 dark:text-black-200/80">
        Installments are not enabled yet because payments has a unique index per
        sale.
      </div>
    </div>
  );
}
