"use client";

import CreditsPanel from "../../../components/CreditsPanel";
import { SectionCard } from "./cashier-ui";

export default function CashierCreditsSection() {
  return (
    <SectionCard title="Credits (Cashier)" hint="Settle approved credits.">
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
