"use client";

import { Card, SectionCard, Skeleton } from "./storekeeper-ui";
import { money, toStr } from "./storekeeper-utils";

import AsyncButton from "../../../components/AsyncButton";

export default function StoreKeeperDashboardSection({
  productsLoading,
  inventoryLoading,
  salesLoading,
  myAdjLoading,
  totalProducts,
  draftSalesCount,
  myAdjRequests,
  pendingAdjRequests,
  stockSnapshot,
  loadProducts,
  loadInventory,
  loadSales,
  loadUnread,
  setSection,
}) {
  const refreshing =
    productsLoading || inventoryLoading || salesLoading || myAdjLoading;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          label="Products"
          value={productsLoading ? "…" : String(totalProducts)}
          sub="Items in catalog"
        />
        <Card
          label="To release"
          value={salesLoading ? "…" : String(draftSalesCount)}
          sub="Draft sales waiting"
        />
        <Card
          label="My requests"
          value={myAdjLoading ? "…" : String(myAdjRequests.length)}
          sub="Correction requests sent"
        />
        <Card
          label="Pending decisions"
          value={myAdjLoading ? "…" : String(pendingAdjRequests)}
          sub="Waiting approval"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard
          title="Today focus"
          hint="Keep stock accurate and unblock sales fast."
          right={
            <AsyncButton
              variant="secondary"
              size="sm"
              state={refreshing ? "loading" : "idle"}
              text="Refresh"
              loadingText="Refreshing…"
              successText="Done"
              onClick={() => {
                loadProducts();
                loadInventory();
                loadSales();
                loadUnread();
              }}
            />
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setSection("sales")}
              className="app-focus rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-5 text-left transition hover:bg-[var(--hover)]"
            >
              <div className="text-base font-black text-[var(--app-fg)]">
                Release stock
              </div>
              <div className="mt-2 text-sm app-muted">
                Release stock for draft sales.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSection("arrivals")}
              className="app-focus rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-5 text-left transition hover:bg-[var(--hover)]"
            >
              <div className="text-base font-black text-[var(--app-fg)]">
                Record arrivals
              </div>
              <div className="mt-2 text-sm app-muted">
                Add received stock with documents.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSection("adjustments")}
              className="app-focus rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-5 text-left transition hover:bg-[var(--hover)]"
            >
              <div className="text-base font-black text-[var(--app-fg)]">
                Request correction
              </div>
              <div className="mt-2 text-sm app-muted">
                Fix stock discrepancies through approval.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSection("inventory")}
              className="app-focus rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-5 text-left transition hover:bg-[var(--hover)]"
            >
              <div className="text-base font-black text-[var(--app-fg)]">
                Check inventory
              </div>
              <div className="mt-2 text-sm app-muted">
                Search quantities by product.
              </div>
            </button>
          </div>
        </SectionCard>

        <SectionCard
          title="Stock snapshot"
          hint="Top items by quantity on hand."
        >
          {inventoryLoading ? (
            <div className="grid gap-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : stockSnapshot.length === 0 ? (
            <div className="text-sm app-muted">No inventory yet.</div>
          ) : (
            <div className="grid gap-2">
              {stockSnapshot.map((x) => (
                <div
                  key={String(x.id)}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-[var(--app-fg)]">
                      {toStr(x.name) || "—"}
                    </div>
                    <div className="text-xs app-muted">
                      #{x.id}
                      {x.sku ? ` • ${x.sku}` : ""}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-lg font-extrabold text-[var(--app-fg)]">
                      {money(x.qty)}
                    </div>
                    <div className="text-xs app-muted">on hand</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}
