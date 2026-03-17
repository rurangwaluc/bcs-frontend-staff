"use client";

import { managerCreditHint, managerDecisionHelp } from "./manager-credit-utils";

import CreditsPanel from "../../../components/CreditsPanel";
import { SectionCard } from "./manager-ui";

export default function ManagerCreditsSection() {
  const help = managerDecisionHelp();

  return (
    <SectionCard title="Credits" hint={managerCreditHint()}>
      <div className="grid gap-4">
        <div className="rounded-2xl border border-[var(--info-border)] bg-[var(--info-bg)] px-4 py-3 text-sm text-[var(--info-fg)]">
          <b>Manager responsibility:</b> review seller credit requests and
          decide whether they should move forward as <b>open balance</b> or as
          an <b>installment plan</b>. Collection is handled later by
          cashier/admin.
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="text-sm font-black text-[var(--app-fg)]">
              Open balance approval
            </div>
            <div className="mt-1 text-sm app-muted">{help.openBalance}</div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="text-sm font-black text-[var(--app-fg)]">
              Installment approval
            </div>
            <div className="mt-1 text-sm app-muted">{help.installmentPlan}</div>
          </div>
        </div>

        <CreditsPanel
          title="Credits (Manager)"
          capabilities={{
            canView: true,
            canCreate: false,
            canDecide: true,
            canSettle: false,
          }}
        />
      </div>
    </SectionCard>
  );
}
