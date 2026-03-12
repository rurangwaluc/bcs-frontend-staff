"use client";

import {
  Input,
  RefreshButton,
  SectionCard,
  Skeleton,
  TinyPill,
} from "./manager-ui";

import AsyncButton from "../../../components/AsyncButton";

export default function ManagerSalesSection({
  loadingSales,
  loadSales,
  salesQ,
  setSalesQ,
  salesShown,
  canLoadMoreSales,
  setSalesPage,
  saleDetailsById,
  saleDetailsLoadingById,
  ensureSaleDetails,
  fmt,
  money,
  getCustomerTin,
  getCustomerAddress,
  canCancelSale,
  openCancel,
}) {
  function firstItemLabel(items) {
    const list = Array.isArray(items) ? items : [];
    if (!list.length) return { name: "—", qty: 0 };

    const first = list[0];
    return {
      name:
        first?.productName ||
        first?.name ||
        first?.product?.name ||
        first?.title ||
        "Item",
      qty: Number(first?.qty ?? first?.quantity ?? first?.count ?? 0) || 0,
    };
  }

  function statusTone(status) {
    const s = String(status || "").toUpperCase();
    if (s === "COMPLETED" || s === "PAID" || s === "APPROVED") return "success";
    if (s.includes("AWAIT") || s === "PENDING" || s === "OPEN") return "warn";
    if (s === "CANCELLED" || s === "DECLINED" || s === "VOID") return "danger";
    return "neutral";
  }

  return (
    <SectionCard
      title="Sales"
      hint="Shows 10 sales. Load more adds 10. Search is instant."
      right={<RefreshButton loading={loadingSales} onClick={loadSales} />}
    >
      <div className="grid gap-3">
        <Input
          placeholder="Search: id, status, customer name, phone, tin, address"
          value={salesQ}
          onChange={(e) => setSalesQ(e.target.value)}
        />

        {loadingSales ? (
          <div className="grid gap-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {(Array.isArray(salesShown) ? salesShown : []).map((s) => {
                const sid = s?.id;
                const details = sid ? saleDetailsById?.[sid] : null;
                const items = details?.items || s?.items || [];
                const isItemsLoading = sid
                  ? !!saleDetailsLoadingById?.[sid]
                  : false;
                const top = firstItemLabel(items);

                const customerName =
                  (s?.customerName || s?.customer_name || "").trim() || "—";
                const customerPhone =
                  s?.customerPhone || s?.customer_phone || "";
                const customerTin = getCustomerTin?.(s);
                const customerAddress = getCustomerAddress?.(s);

                return (
                  <div
                    key={sid}
                    className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-extrabold text-[var(--app-fg)]">
                            Sale #{sid ?? "—"}
                          </div>
                          <TinyPill tone={statusTone(s?.status)}>
                            {String(s?.status || "—")}
                          </TinyPill>
                        </div>

                        <div className="mt-1 text-xs app-muted">
                          Time: <b>{fmt(s?.createdAt || s?.created_at)}</b>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs app-muted">Total</div>
                        <div className="text-lg font-extrabold text-[var(--app-fg)]">
                          {money(s?.totalAmount ?? s?.total ?? 0)}
                        </div>
                        <div className="text-[11px] app-muted">RWF</div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
                          Top item
                        </div>
                        <div className="mt-1 truncate text-sm font-bold text-[var(--app-fg)]">
                          {isItemsLoading ? "Loading…" : top.name}
                        </div>
                        <div className="mt-1 text-xs app-muted">
                          Qty: <b>{isItemsLoading ? "…" : top.qty || 0}</b>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
                          Customer
                        </div>
                        <div className="mt-1 truncate text-sm font-bold text-[var(--app-fg)]">
                          {customerName}
                        </div>
                        <div className="mt-1 text-xs app-muted">
                          Phone: <b>{customerPhone || "—"}</b>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
                      <div className="grid grid-cols-1 gap-2 text-xs text-[var(--app-fg)] sm:grid-cols-2">
                        <div>
                          TIN: <b>{customerTin || "—"}</b>
                        </div>
                        <div className="truncate">
                          Address: <b>{customerAddress || "—"}</b>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex gap-2">
                        {sid && !details && !isItemsLoading ? (
                          <AsyncButton
                            variant="secondary"
                            size="sm"
                            state="idle"
                            text="Load items"
                            loadingText="Loading…"
                            successText="Done"
                            onClick={() => ensureSaleDetails?.(sid)}
                          />
                        ) : null}
                      </div>

                      <AsyncButton
                        variant="danger"
                        size="sm"
                        state="idle"
                        text="Cancel"
                        loadingText="Cancelling…"
                        successText="Done"
                        disabled={!canCancelSale?.(s)}
                        onClick={() => openCancel?.(sid)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {(Array.isArray(salesShown) ? salesShown : []).length === 0 ? (
              <div className="text-sm app-muted">No sales found.</div>
            ) : null}

            {canLoadMoreSales ? (
              <button
                type="button"
                onClick={() => setSalesPage?.((p) => p + 1)}
                className="rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
              >
                Load more
              </button>
            ) : null}
          </>
        )}
      </div>
    </SectionCard>
  );
}
