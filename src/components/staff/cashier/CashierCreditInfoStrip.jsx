"use client";

import {
  cashierCollectionScopeLabel,
  cashierCreditModeLabel,
  cashierQuickSummary,
  normMode,
} from "./cashier-credit-utils";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function MiniPill({ children, tone = "neutral" }) {
  const cls =
    tone === "warn"
      ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
      : tone === "success"
        ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
        : tone === "info"
          ? "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]"
          : "border-[var(--border)] bg-[var(--card)] text-[var(--app-fg)]";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold",
        cls,
      )}
    >
      {children}
    </span>
  );
}

export default function CashierCreditInfoStrip({
  currentOpenSession = null,
  detail = null,
}) {
  const hasOpenSession = !!currentOpenSession?.id;
  const mode = normMode(detail?.creditMode ?? detail?.credit_mode);
  const summary = detail ? cashierQuickSummary(detail) : null;

  return (
    <div className="grid gap-3">
      <div className="rounded-2xl border border-[var(--info-border)] bg-[var(--info-bg)] px-4 py-3 text-sm text-[var(--info-fg)]">
        <b>Cashier collection rules:</b> collect only approved credits, keep
        cash collections tied to the active session, and verify whether the
        credit is an open balance or an installment plan before saving the
        payment.
      </div>

      <div className="flex flex-wrap gap-2">
        <MiniPill tone={hasOpenSession ? "success" : "warn"}>
          {hasOpenSession
            ? `Cash session open #${currentOpenSession.id}`
            : "No open cash session"}
        </MiniPill>

        {detail ? (
          <>
            <MiniPill tone="info">
              Mode: {cashierCreditModeLabel(mode)}
            </MiniPill>
            <MiniPill>{cashierCollectionScopeLabel(detail)}</MiniPill>
            {summary?.planLabel ? (
              <MiniPill>{summary.planLabel}</MiniPill>
            ) : null}
          </>
        ) : null}
      </div>

      {detail && summary ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
              Plan
            </div>
            <div className="mt-1 text-sm font-bold text-[var(--app-fg)]">
              {summary.planLabel}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
              Next step
            </div>
            <div className="mt-1 text-sm font-bold text-[var(--app-fg)]">
              {summary.nextDueLabel}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
              Remaining
            </div>
            <div className="mt-1 text-sm font-bold text-[var(--app-fg)]">
              {summary.remainingLabel}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
