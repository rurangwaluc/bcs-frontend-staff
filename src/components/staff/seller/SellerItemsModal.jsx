"use client";

import { Skeleton, StatusBadge } from "./seller-ui";

import { money } from "./seller-utils";
import { toInt } from "./seller-utils";

export default function SellerItemsModal({ open, loading, sale, onClose }) {
  if (!open) return null;

  const items = Array.isArray(sale?.items) ? sale.items : [];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="app-overlay absolute inset-0" onClick={onClose} />
      <div className="app-card relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-base font-black text-[var(--app-fg)]">
                Sale #{sale?.id ?? "—"}
              </div>
              {!loading ? <StatusBadge status={sale?.status} /> : null}
            </div>
            <div className="mt-1 truncate text-sm app-muted">
              Items included in this sale
            </div>
          </div>

          <button
            type="button"
            className="app-focus rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="thin-scrollbar max-h-[calc(90vh-88px)] overflow-y-auto p-5">
          {loading ? (
            <div className="grid gap-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-5 text-sm app-muted">
              No items found for this sale.
            </div>
          ) : (
            <div className="grid gap-3">
              {items.map((it, idx) => (
                <div
                  key={it?.id || idx}
                  className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate text-base font-black text-[var(--app-fg)]">
                        {it?.productName ||
                          it?.name ||
                          `Product #${it?.productId ?? "—"}`}
                      </div>
                      <div className="mt-1 text-sm app-muted">
                        SKU:{" "}
                        <b className="text-[var(--app-fg)]">{it?.sku || "—"}</b>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-right">
                      <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
                        Qty
                      </div>
                      <div className="text-xl font-black text-[var(--app-fg)]">
                        {toInt(it?.qty ?? 0)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
                        Unit price
                      </div>
                      <div className="mt-1 text-base font-black text-[var(--app-fg)]">
                        {money(it?.unitPrice ?? 0)} RWF
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
                        Line total
                      </div>
                      <div className="mt-1 text-base font-black text-[var(--app-fg)]">
                        {money(it?.lineTotal ?? 0)} RWF
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 md:block hidden">
                      <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
                        Product ID
                      </div>
                      <div className="mt-1 text-base font-black text-[var(--app-fg)]">
                        #{it?.productId ?? "—"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 text-xs app-muted">
            Released sales can be marked paid or credit from the sales section.
          </div>
        </div>
      </div>
    </div>
  );
}
