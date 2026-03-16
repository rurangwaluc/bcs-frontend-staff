"use client";

import CreditsPanel from "../../../components/CreditsPanel";
import { SectionCard } from "./cashier-ui";

export default function CashierCreditsSection() {
  return (
    <SectionCard
      title="Credits (Cashier)"
      hint="Collect approved credits, including partial payments, final settlement, and installment-plan collections."
    >
      <div className="mb-4 rounded-2xl border border-[var(--info-border)] bg-[var(--info-bg)] px-4 py-3 text-sm text-[var(--info-fg)]">
        Use this section only for <b>approved credits</b>. Normal sales waiting
        for cashier confirmation remain in <b>Payments</b>.
      </div>

      <CreditsPanel
        title="Credits (Cashier)"
        capabilities={{
          canView: true,
          canCreate: false,
          canDecide: false,
          canSettle: true,
        }}
      />
    </SectionCard>
  );
}
