"use client";

import { Skeleton } from "./storekeeper-ui";

export default function StoreKeeperSaleModal({ open, sale, loading, onClose }) {
  if (!open) return null;

  const items = Array.isArray(sale?.items) ? sale.items : [];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] p-4">
          <div className="min-w-0">
            <div className="text-sm font-bold text-[var(--app-fg)]">
              Sale #{sale?.id ?? "—"} {loading ? "…" : ""}
            </div>
            <div className="mt-1 truncate text-xs app-muted">
              Status: {String(sale?.status || "—").toUpperCase()}
            </div>
          </div>

          <button
            type="button"
            className="app-focus rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--app-fg)] hover:bg-[var(--hover)]"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="grid gap-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <>
              <div className="text-sm font-bold text-[var(--app-fg)]">
                Items
              </div>

              <div className="mt-3 grid gap-2">
                {items.map((it, idx) => (
                  <div
                    key={it?.id || idx}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-[var(--app-fg)]">
                        {it?.productName ||
                          it?.name ||
                          `#${it?.productId ?? "—"}`}
                      </div>
                      <div className="text-xs app-muted">
                        {it?.sku ? `SKU: ${it.sku}` : "SKU: —"}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-lg font-extrabold text-[var(--app-fg)]">
                        {Number(it?.qty ?? 0)}
                      </div>
                      <div className="text-xs app-muted">qty</div>
                    </div>
                  </div>
                ))}

                {items.length === 0 ? (
                  <div className="text-sm app-muted">No items.</div>
                ) : null}
              </div>

              <div className="mt-4 text-xs app-muted">
                Store keeper releases stock. Seller completes payment later.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
