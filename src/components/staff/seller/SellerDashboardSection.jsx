"use client";

import { Card, SectionCard } from "./seller-ui";

import AsyncButton from "../../../components/AsyncButton";
import { money } from "./seller-utils";

export default function SellerDashboardSection({
  salesLoading,
  todaySalesCount,
  todaySalesTotal,
  draftCount,
  releasedCount,
  loadSales,
  setSection,
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          label="Today sales"
          value={salesLoading ? "…" : String(todaySalesCount)}
          sub="Created today"
        />
        <Card
          label="Today total"
          value={salesLoading ? "…" : money(todaySalesTotal)}
          sub="RWF"
        />
        <Card
          label="Waiting release"
          value={salesLoading ? "…" : String(draftCount)}
          sub="Draft sales"
        />
        <Card
          label="Released"
          value={salesLoading ? "…" : String(releasedCount)}
          sub="Ready to finalize"
        />
      </div>

      <SectionCard
        title="Today focus"
        hint="Prioritize released sales so payment or credit workflow moves fast."
        right={
          <AsyncButton
            variant="secondary"
            size="sm"
            state={salesLoading ? "loading" : "idle"}
            text="Refresh"
            loadingText="Refreshing…"
            successText="Done"
            onClick={loadSales}
          />
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setSection("create")}
            className="app-focus app-transition rounded-3xl border border-[var(--border-strong)] bg-[var(--card-2)] p-5 text-left shadow-sm hover:bg-[var(--hover)]"
          >
            <div className="text-base font-black text-[var(--app-fg)]">
              Create sale
            </div>
            <div className="mt-2 text-sm app-muted">
              Build a draft sale for stock release.
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSection("sales")}
            className="app-focus app-transition rounded-3xl border border-[var(--border-strong)] bg-[var(--card-2)] p-5 text-left shadow-sm hover:bg-[var(--hover)]"
          >
            <div className="text-base font-black text-[var(--app-fg)]">
              Finalize sales
            </div>
            <div className="mt-2 text-sm app-muted">
              Mark released sales as paid or submit a credit request.
            </div>
          </button>
        </div>
      </SectionCard>
    </>
  );
}
