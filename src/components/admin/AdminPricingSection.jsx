"use client";

import {
  AdminEmptyState,
  AdminInfoCard,
  AdminSectionCard,
  AdminSkeletonBlock,
  AdminStatCard,
  cx,
  money,
  toStr,
} from "./adminShared";
import { useMemo, useState } from "react";

import AsyncButton from "../AsyncButton";
import ProductPricingPanel from "../ProductPricingPanel";

function PricingHealthCard({ title, value, sub, tone = "default" }) {
  return <AdminStatCard label={title} value={value} sub={sub} tone={tone} />;
}

export default function AdminPricingSection({
  refreshNonce = 0,
  products = [],
  productsLoading = false,
  unpricedCount = 0,
  refreshProducts,
}) {
  const [panelKey, setPanelKey] = useState(0);

  const pricingStats = useMemo(() => {
    const rows = Array.isArray(products) ? products : [];

    let activeCount = 0;
    let pricedCount = 0;
    let zeroMarginRisk = 0;
    let avgSelling = 0;
    let avgCost = 0;

    for (const p of rows) {
      const isArchived =
        p?.isActive === false ||
        p?.is_active === false ||
        p?.isArchived === true ||
        p?.is_archived === true ||
        p?.archivedAt ||
        p?.archived_at ||
        String(p?.status || "").toUpperCase() === "ARCHIVED";

      if (isArchived) continue;

      activeCount += 1;

      const selling = Number(
        p?.sellingPrice ??
          p?.selling_price ??
          p?.price ??
          p?.unitPrice ??
          p?.unit_price ??
          0,
      );

      const cost = Number(
        p?.purchasePrice ??
          p?.purchase_price ??
          p?.costPrice ??
          p?.cost_price ??
          0,
      );

      avgSelling += Number.isFinite(selling) ? selling : 0;
      avgCost += Number.isFinite(cost) ? cost : 0;

      if (Number.isFinite(selling) && selling > 0) pricedCount += 1;
      if (
        Number.isFinite(selling) &&
        Number.isFinite(cost) &&
        selling > 0 &&
        cost >= selling
      ) {
        zeroMarginRisk += 1;
      }
    }

    return {
      activeCount,
      pricedCount,
      coveragePct:
        activeCount > 0 ? Math.round((pricedCount / activeCount) * 100) : 0,
      zeroMarginRisk,
      avgSelling: activeCount > 0 ? Math.round(avgSelling / activeCount) : 0,
      avgCost: activeCount > 0 ? Math.round(avgCost / activeCount) : 0,
    };
  }, [products]);

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PricingHealthCard
          title="Active products"
          value={productsLoading ? "…" : String(pricingStats.activeCount)}
          sub="Products that should be priced"
        />
        <PricingHealthCard
          title="Priced"
          value={productsLoading ? "…" : String(pricingStats.pricedCount)}
          sub={
            productsLoading
              ? "Loading…"
              : `${pricingStats.coveragePct}% pricing coverage`
          }
          tone={pricingStats.coveragePct >= 90 ? "success" : "warn"}
        />
        <PricingHealthCard
          title="Unpriced"
          value={productsLoading ? "…" : String(unpricedCount)}
          sub="Needs admin action"
          tone={unpricedCount > 0 ? "warn" : "success"}
        />
        <PricingHealthCard
          title="Margin risk"
          value={productsLoading ? "…" : String(pricingStats.zeroMarginRisk)}
          sub="Cost >= selling price"
          tone={pricingStats.zeroMarginRisk > 0 ? "danger" : "success"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <AdminSectionCard
          title="Pricing control"
          hint="Admin controls purchase price, selling price, and allowed discount boundaries."
          right={
            <div className="flex items-center gap-2">
              <AsyncButton
                variant="secondary"
                size="sm"
                state={productsLoading ? "loading" : "idle"}
                text="Refresh products"
                loadingText="Refreshing…"
                successText="Done"
                onClick={refreshProducts}
              />
              <button
                type="button"
                onClick={() => setPanelKey((k) => k + 1)}
                className={cx(
                  "rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-semibold text-[var(--app-fg)] transition",
                  "hover:bg-[var(--hover)]",
                )}
              >
                Reset panel
              </button>
            </div>
          }
        >
          <ProductPricingPanel
            key={`pricing-panel-${refreshNonce}-${panelKey}`}
          />
        </AdminSectionCard>

        <div className="grid gap-4">
          <AdminSectionCard
            title="Pricing intelligence"
            hint="Quick signals to help you spot weak catalog economics."
          >
            {productsLoading ? (
              <div className="grid gap-3">
                <AdminSkeletonBlock className="h-24 w-full rounded-2xl" />
                <AdminSkeletonBlock className="h-24 w-full rounded-2xl" />
                <AdminSkeletonBlock className="h-24 w-full rounded-2xl" />
              </div>
            ) : pricingStats.activeCount === 0 ? (
              <AdminEmptyState
                title="No products to price"
                description="Create products first, then return here to set pricing rules."
              />
            ) : (
              <div className="grid gap-3">
                <AdminInfoCard
                  title="Average selling price"
                  value={`${money(pricingStats.avgSelling)} RWF`}
                  sub="Across active products"
                />
                <AdminInfoCard
                  title="Average purchase price"
                  value={`${money(pricingStats.avgCost)} RWF`}
                  sub="Useful for gross margin calibration"
                />
                <AdminInfoCard
                  title="Pricing coverage"
                  value={`${pricingStats.coveragePct}%`}
                  sub={
                    unpricedCount > 0
                      ? `${unpricedCount} product(s) still missing prices`
                      : "All active products have pricing"
                  }
                  tone={pricingStats.coveragePct >= 90 ? "success" : "warn"}
                />
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                    Admin rule
                  </div>
                  <div className="mt-2 text-sm text-[var(--app-fg)]">
                    Never leave a live product without a selling price. Never
                    accept a selling price below purchase cost unless you are
                    intentionally clearing dead stock.
                  </div>
                </div>
              </div>
            )}
          </AdminSectionCard>

          <AdminSectionCard
            title="Operational notes"
            hint="How this section should be used."
          >
            <div className="grid gap-3 text-sm text-[var(--app-fg)]">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
                Set pricing only from the admin side. Store keeper and cashier
                flows should stay protected from pricing edits.
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
                When you change selling price, check whether open quotations,
                pending credits, and frequent items need communication to staff.
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
                Use max discount as a guardrail, not as your normal discounting
                strategy.
              </div>
            </div>
          </AdminSectionCard>
        </div>
      </div>
    </div>
  );
}
