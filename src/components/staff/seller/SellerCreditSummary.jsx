"use client";

import { formatWhen } from "../shared/staff-format";

function money(n) {
  const x = Number(n || 0);
  return Number.isFinite(x) ? Math.round(x).toLocaleString() : "0";
}

function normalizeCreditData(sale) {
  const credit = sale?.credit || sale?.Credit || null;

  const principal =
    Number(
      credit?.principalAmount ??
        credit?.principal_amount ??
        credit?.amount ??
        sale?.creditPrincipalAmount ??
        sale?.creditAmount ??
        sale?.totalAmount ??
        sale?.total ??
        0,
    ) || 0;

  const paid =
    Number(
      credit?.paidAmount ??
        credit?.paid_amount ??
        sale?.creditPaidAmount ??
        sale?.amountPaid ??
        0,
    ) || 0;

  const remaining =
    Number(
      credit?.remainingAmount ??
        credit?.remaining_amount ??
        sale?.creditRemainingAmount ??
        Math.max(0, principal - paid),
    ) || 0;

  const status = String(
    credit?.status ?? sale?.creditStatus ?? sale?.status ?? "",
  ).toUpperCase();

  const issuedAt =
    credit?.createdAt ??
    credit?.created_at ??
    sale?.creditCreatedAt ??
    sale?.createdAt ??
    sale?.created_at ??
    null;

  const settledAt =
    credit?.settledAt ?? credit?.settled_at ?? sale?.creditSettledAt ?? null;

  const dueDate =
    credit?.dueDate ?? credit?.due_date ?? sale?.creditDueDate ?? null;

  const mode = String(
    credit?.creditMode ?? credit?.credit_mode ?? "OPEN_BALANCE",
  ).toUpperCase();

  const installmentCount =
    Number(
      credit?.installmentCount ??
        credit?.installment_count ??
        sale?.creditInstallmentCount ??
        0,
    ) || 0;

  const nextInstallmentDue =
    credit?.nextInstallmentDue ??
    credit?.next_installment_due ??
    sale?.creditNextInstallmentDue ??
    null;

  return {
    principal,
    paid,
    remaining,
    status,
    issuedAt,
    settledAt,
    dueDate,
    mode,
    installmentCount,
    nextInstallmentDue,
  };
}

function creditStatusLabel(summary) {
  if (summary.status === "PENDING" || summary.status === "PENDING_APPROVAL") {
    return "Pending approval";
  }
  if (summary.status === "APPROVED") {
    return summary.mode === "INSTALLMENT_PLAN"
      ? "Approved as installment plan"
      : "Approved as open balance";
  }
  if (summary.status === "PARTIALLY_PAID") {
    return "Partially paid";
  }
  if (summary.status === "SETTLED") {
    return "Settled";
  }
  if (summary.status === "REJECTED") {
    return "Rejected";
  }
  return "Credit";
}

export default function SellerCreditSummary({ sale }) {
  const summary = normalizeCreditData(sale);

  const pillCls =
    summary.status === "SETTLED"
      ? "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
      : summary.status === "PARTIALLY_PAID"
        ? "border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200"
        : summary.status === "APPROVED"
          ? "border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200"
          : summary.status === "REJECTED"
            ? "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
            : "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200";

  const nextDueLabel =
    summary.mode === "INSTALLMENT_PLAN"
      ? summary.nextInstallmentDue
        ? `Next installment due ${formatWhen(summary.nextInstallmentDue)}`
        : "Next installment due —"
      : summary.dueDate
        ? `Due ${formatWhen(summary.dueDate)}`
        : "Due not set";

  const planLabel =
    summary.mode === "INSTALLMENT_PLAN"
      ? `${
          summary.installmentCount > 0 ? summary.installmentCount : "—"
        } installments planned`
      : "Open balance";

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
          {creditStatusLabel(summary)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-amber-100 bg-white p-3 shadow-sm dark:border-[var(--border)] dark:bg-[var(--card)]">
          <div className="text-[11px] font-semibold app-muted">Principal</div>
          <div className="mt-1 text-sm font-extrabold text-[var(--app-fg)]">
            {money(summary.principal)} RWF
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-white p-3 shadow-sm dark:border-[var(--border)] dark:bg-[var(--card)]">
          <div className="text-[11px] font-semibold app-muted">Paid</div>
          <div className="mt-1 text-sm font-extrabold text-[var(--app-fg)]">
            {money(summary.paid)} RWF
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-white p-3 shadow-sm dark:border-[var(--border)] dark:bg-[var(--card)]">
          <div className="text-[11px] font-semibold app-muted">Remaining</div>
          <div className="mt-1 text-sm font-extrabold text-[var(--app-fg)]">
            {money(summary.remaining)} RWF
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-white p-3 shadow-sm dark:border-[var(--border)] dark:bg-[var(--card)]">
          <div className="text-[11px] font-semibold app-muted">Plan</div>
          <div className="mt-1 text-sm font-extrabold text-[var(--app-fg)]">
            {planLabel}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-100 bg-white p-3 shadow-sm dark:border-[var(--border)] dark:bg-[var(--card)]">
          <div className="text-[11px] font-semibold app-muted">Issued</div>
          <div className="mt-1 text-sm font-extrabold text-[var(--app-fg)]">
            {summary.issuedAt ? formatWhen(summary.issuedAt) : "—"}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-white p-3 shadow-sm dark:border-[var(--border)] dark:bg-[var(--card)]">
          <div className="text-[11px] font-semibold app-muted">
            Next due step
          </div>
          <div className="mt-1 text-sm font-extrabold text-[var(--app-fg)]">
            {nextDueLabel}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-white p-3 shadow-sm dark:border-[var(--border)] dark:bg-[var(--card)]">
          <div className="text-[11px] font-semibold app-muted">
            Final payment
          </div>
          <div className="mt-1 text-sm font-extrabold text-[var(--app-fg)]">
            {summary.settledAt ? formatWhen(summary.settledAt) : "Not settled"}
          </div>
        </div>
      </div>

      <div className="mt-3 text-sm text-amber-700 dark:text-amber-300/80">
        Remaining balance: <b>{money(summary.remaining)} RWF</b>
      </div>
    </div>
  );
}
