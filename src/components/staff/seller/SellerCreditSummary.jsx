"use client";

import { formatWhen } from "../shared/staff-format";
import { summarizeCredit } from "./seller-utils";

export default function SellerCreditSummary({ sale }) {
  const summary = summarizeCredit(sale);

  const pillCls =
    summary.status === "PENDING"
      ? "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
      : "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200";

  return (
    <div className="mt-4 rounded-3xl border border-amber-200 bg-[#fffaf0] p-4 shadow-sm dark:border-amber-900 dark:bg-amber-950/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-black text-[var(--app-fg)]">
            Credit summary
          </div>
          <div className="mt-1 text-xs app-muted">
            Sale #{sale?.id ?? "—"} • Customer:{" "}
            <b className="text-[var(--app-fg)]">{sale?.customerName || "—"}</b>
          </div>
        </div>

        <span
          className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] ${pillCls}`}
        >
          {summary.status === "PENDING"
            ? "Credit • Pending"
            : "Credit • Settled"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-100 bg-white p-3 shadow-sm dark:border-[var(--border)] dark:bg-[var(--card)]">
          <div className="text-[11px] font-semibold app-muted">
            Paid / Total
          </div>
          <div className="mt-1 text-sm font-extrabold text-[var(--app-fg)]">
            {summary.paidText} / {summary.totalText} RWF
          </div>
          <div className="mt-1 text-[11px] app-muted">
            Remaining:{" "}
            <b className="text-[var(--app-fg)]">{summary.remainingText}</b> RWF
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-white p-3 shadow-sm dark:border-[var(--border)] dark:bg-[var(--card)]">
          <div className="text-[11px] font-semibold app-muted">Issued</div>
          <div className="mt-1 text-sm font-extrabold text-[var(--app-fg)]">
            {summary.issuedAt ? formatWhen(summary.issuedAt) : "—"}
          </div>
          <div className="mt-1 text-[11px] app-muted">
            By:{" "}
            <b className="text-[var(--app-fg)]">{sale?.sellerName || "—"}</b>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-white p-3 shadow-sm dark:border-[var(--border)] dark:bg-[var(--card)]">
          <div className="text-[11px] font-semibold app-muted">Paid date</div>
          <div className="mt-1 text-sm font-extrabold text-[var(--app-fg)]">
            {summary.settledAt ? formatWhen(summary.settledAt) : "Not paid yet"}
          </div>
          <div className="mt-1 text-[11px] app-muted">
            Status:{" "}
            <b className="text-[var(--app-fg)]">{summary.status || "—"}</b>
          </div>
        </div>
      </div>

      <div className="mt-3 text-[110px] text-amber-700 dark:text-amber-300/80">
        Installments are not enabled yet because payments currently allow one
        payment record per sale.
      </div>
    </div>
  );
}
