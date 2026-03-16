"use client";

import { Pill, SectionCard } from "./adminShared";

import CashierPaymentsSection from "../staff/cashier/CashierPaymentsSection";
import CashierSessionsSection from "../staff/cashier/CashierSessionsSection";

function prettyRole(role) {
  return String(role || "")
    .trim()
    .split("_")
    .filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

export default function AdminCashierCoverageSection({
  coverage,
  sessionsProps,
  paymentsProps,
}) {
  const coverageActive =
    !!coverage?.active &&
    String(coverage?.actingAsRole || "")
      .trim()
      .toLowerCase() === "cashier";

  if (!coverageActive) return null;

  return (
    <div className="grid gap-4">
      <SectionCard
        title="Cashier operator workspace"
        hint="Admin is temporarily covering cashier responsibilities with full collection workflow access."
        right={
          <div className="flex flex-wrap gap-2">
            <Pill tone="warn">Coverage active</Pill>
            <Pill tone="info">{prettyRole(coverage?.actingAsRole)}</Pill>
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="rounded-3xl border border-[var(--warn-border)] bg-[var(--warn-bg)] p-4 sm:p-5">
            <div className="text-sm font-black text-[var(--app-fg)]">
              Cashier coverage mode
            </div>
            <div className="mt-2 text-sm leading-6 text-[var(--app-fg)]">
              You are operating as cashier. Open a session, collect against
              awaiting sales, verify payment method, and keep sale-to-payment
              traceability clean.
            </div>
            <div className="mt-2 text-xs leading-6 app-muted">
              All actions remain attributable to admin with active coverage
              metadata.
            </div>
          </div>

          <CashierSessionsSection {...(sessionsProps || {})} />

          <CashierPaymentsSection {...(paymentsProps || {})} />
        </div>
      </SectionCard>
    </div>
  );
}
