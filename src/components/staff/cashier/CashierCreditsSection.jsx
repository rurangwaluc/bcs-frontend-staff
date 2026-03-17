"use client";

import CashierCreditInfoStrip from "./CashierCreditInfoStrip";
import CreditsPanel from "../../../components/CreditsPanel";
import { SectionCard } from "./cashier-ui";

export default function CashierCreditsSection({ currentOpenSession = null }) {
  return (
    <SectionCard
      title="Credits (Cashier)"
      hint="Collect approved credits, including partial payments, final settlement, and installment-plan collections."
    >
      <div className="mb-4">
        <CashierCreditInfoStrip currentOpenSession={currentOpenSession} />
      </div>

      <CreditsPanel
        title="Credits (Cashier)"
        capabilities={{
          canView: true,
          canCreate: false,
          canDecide: false,
          canSettle: true,
        }}
        context="cashier"
        currentOpenSession={currentOpenSession}
      />
    </SectionCard>
  );
}
