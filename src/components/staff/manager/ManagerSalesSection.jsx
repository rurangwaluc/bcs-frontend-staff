"use client";

import {
  EmptyState,
  Input,
  RefreshButton,
  SectionCard,
  Skeleton,
  TinyPill,
} from "./manager-ui";

import AsyncButton from "../../../components/AsyncButton";

function fallbackMoney(n) {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return "0";
  return Math.round(x).toLocaleString();
}

function fallbackFmt(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

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
  if (
    s === "COMPLETED" ||
    s === "PAID" ||
    s === "APPROVED" ||
    s === "FULFILLED"
  ) {
    return "success";
  }
  if (s.includes("AWAIT") || s === "PENDING" || s === "OPEN") return "warn";
  if (s === "CANCELLED" || s === "DECLINED" || s === "VOID") return "danger";
  return "neutral";
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card-2)] p-3">
      <div className="text-[11px] font-black uppercase tracking-[0.08em] text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold text-[var(--app-fg)]">{value}</div>
    </div>
  );
}

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
  const formatMoney = typeof money === "function" ? money : fallbackMoney;
  const formatDate = typeof fmt === "function" ? fmt : fallbackFmt;

  const list = Array.isArray(salesShown) ? salesShown : [];

  return (
    <SectionCard
      title="Sales"
      hint="Review sales, inspect customer details, and load item details when needed."
      right={<RefreshButton loading={loadingSales} onClick={loadSales} />}
    >
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <Input
            placeholder="Search: id, status, customer name, phone, tin, address"
            value={salesQ}
            onChange={(e) => setSalesQ(e.target.value)}
          />

          <div className="rounded-full border border-[var(--border)] bg-[var(--card-2)] px-4 py-2 text-sm font-bold text-[var(--app-fg)]">
            {list.length} shown
          </div>
        </div>

        {loadingSales ? (
          <div className="grid gap-3">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            title="No sales found"
            hint="Try another search or refresh the sales list."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {list.map((s) => {
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
                    className="rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] dark:shadow-[0_12px_28px_rgba(0,0,0,0.18)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-black text-[var(--app-fg)]">
                            Sale #{sid ?? "—"}
                          </div>
                          <TinyPill tone={statusTone(s?.status)}>
                            {String(s?.status || "—")}
                          </TinyPill>
                        </div>

                        <div className="mt-2 text-xs text-[var(--muted)]">
                          Created:{" "}
                          <b className="text-[var(--app-fg)]">
                            {formatDate(s?.createdAt || s?.created_at)}
                          </b>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                          Total
                        </div>
                        <div className="mt-1 text-2xl font-black tracking-[-0.03em] text-[var(--app-fg)]">
                          {formatMoney(s?.totalAmount ?? s?.total ?? 0)}
                        </div>
                        <div className="text-[11px] text-[var(--muted)]">
                          RWF
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <InfoBox
                        label="Top item"
                        value={isItemsLoading ? "Loading…" : top.name}
                      />
                      <InfoBox label="Customer" value={customerName} />
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <InfoBox
                        label="Quantity"
                        value={isItemsLoading ? "…" : String(top.qty || 0)}
                      />
                      <InfoBox label="Phone" value={customerPhone || "—"} />
                      <InfoBox label="TIN" value={customerTin || "—"} />
                    </div>

                    <div className="mt-3 rounded-[18px] border border-[var(--border)] bg-[var(--card-2)] p-3">
                      <div className="text-[11px] font-black uppercase tracking-[0.08em] text-[var(--muted)]">
                        Address
                      </div>
                      <div className="mt-1 text-sm text-[var(--app-fg)]">
                        {customerAddress || "—"}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
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
                        text="Cancel sale"
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

            {canLoadMoreSales ? (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setSalesPage?.((p) => p + 1)}
                  className="rounded-full border border-[var(--border)] bg-[var(--card)] px-5 py-3 text-sm font-bold text-[var(--app-fg)] transition hover:border-[var(--border-strong)] hover:bg-[var(--hover)]"
                >
                  Load more sales
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </SectionCard>
  );
}
