"use client";

import {
  Input,
  RefreshButton,
  SectionCard,
  Select,
  Skeleton,
  TinyPill,
} from "./manager-ui";

import AsyncButton from "../../../components/AsyncButton";

export default function ManagerInventorySection({
  inventory,
  products,
  loadingInv,
  loadingProd,
  invQ,
  setInvQ,
  prodQ,
  setProdQ,
  showArchivedProducts,
  setShowArchivedProducts,
  loadInventory,
  loadProducts,
  money,
  isArchivedProduct,
  openArchiveProduct,
  openRestoreProduct,
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SectionCard
        title="Inventory"
        hint="Name, SKU, quantity and current selling price."
        right={
          <RefreshButton
            loading={loadingInv || loadingProd}
            onClick={() => {
              loadInventory?.();
              loadProducts?.({ includeInactive: showArchivedProducts });
            }}
          />
        }
      >
        <Input
          placeholder="Search by name or SKU"
          value={invQ}
          onChange={(e) => setInvQ?.(e.target.value)}
        />

        <div className="mt-3">
          {loadingInv || loadingProd ? (
            <div className="grid gap-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="grid gap-3">
              {(Array.isArray(inventory) ? inventory : [])
                .filter((p) => {
                  const qq = String(invQ || "")
                    .trim()
                    .toLowerCase();
                  if (!qq) return true;
                  const name = String(
                    p?.name || p?.productName || p?.product_name || "",
                  ).toLowerCase();
                  const sku = String(p?.sku || "").toLowerCase();
                  return name.includes(qq) || sku.includes(qq);
                })
                .map((p, idx) => {
                  const pid = p?.productId ?? p?.product_id ?? p?.id ?? "—";
                  const name =
                    p?.productName || p?.product_name || p?.name || "—";
                  const sku = p?.sku || "—";
                  const qty =
                    p?.qtyOnHand ??
                    p?.qty_on_hand ??
                    p?.qty ??
                    p?.quantity ??
                    0;

                  const selling = (() => {
                    const prod =
                      (pid != null
                        ? (Array.isArray(products) ? products : []).find(
                            (x) => String(x?.id) === String(pid),
                          )
                        : null) ||
                      (sku
                        ? (Array.isArray(products) ? products : []).find(
                            (x) => String(x?.sku) === String(sku),
                          )
                        : null);

                    const price =
                      prod?.sellingPrice ??
                      prod?.selling_price ??
                      prod?.price ??
                      prod?.unitPrice ??
                      prod?.unit_price ??
                      null;

                    return price == null ? "—" : money(price);
                  })();

                  return (
                    <div
                      key={p?.id || `${pid}-${idx}`}
                      className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-extrabold text-[var(--app-fg)]">
                            {name}
                          </div>
                          <div className="mt-1 text-xs app-muted">
                            SKU: <b>{sku}</b>
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <div className="text-right">
                            <div className="text-xs app-muted">Qty</div>
                            <div className="text-sm font-bold text-[var(--app-fg)]">
                              {Number(qty)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs app-muted">Selling</div>
                            <div className="text-sm font-bold text-[var(--app-fg)]">
                              {selling}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {(Array.isArray(inventory) ? inventory : []).length === 0 ? (
                <div className="text-sm app-muted">No inventory items.</div>
              ) : null}
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title={`Products (${showArchivedProducts ? "Archived" : "Active"})`}
        hint="Archive or restore products."
        right={
          <label className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-sm font-bold text-[var(--app-fg)]">
            <input
              type="checkbox"
              checked={!!showArchivedProducts}
              onChange={(e) => setShowArchivedProducts?.(e.target.checked)}
            />
            Show archived
          </label>
        }
      >
        <div className="grid gap-3">
          <Input
            placeholder="Search products (id, name, sku)"
            value={prodQ}
            onChange={(e) => setProdQ?.(e.target.value)}
          />

          {loadingProd ? (
            <div className="grid gap-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="grid gap-3">
              {(Array.isArray(products) ? products : [])
                .filter((p) => {
                  const qq = String(prodQ || "")
                    .trim()
                    .toLowerCase();
                  const byToggle = showArchivedProducts
                    ? isArchivedProduct?.(p)
                    : !isArchivedProduct?.(p);
                  if (!byToggle) return false;
                  if (!qq) return true;

                  const id = String(p?.id ?? "");
                  const name = String(
                    p?.name || p?.productName || p?.title || "",
                  ).toLowerCase();
                  const sku = String(p?.sku || "").toLowerCase();

                  return (
                    id.includes(qq) || name.includes(qq) || sku.includes(qq)
                  );
                })
                .map((p) => {
                  const archived = isArchivedProduct?.(p);
                  const selling =
                    p?.sellingPrice ??
                    p?.selling_price ??
                    p?.price ??
                    p?.unitPrice ??
                    p?.unit_price ??
                    null;

                  const isUnpriced =
                    selling == null ||
                    !Number.isFinite(Number(selling)) ||
                    Number(selling) <= 0;

                  return (
                    <div
                      key={p?.id}
                      className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-sm font-extrabold text-[var(--app-fg)]">
                              {p?.name || p?.productName || p?.title || "—"}
                            </div>

                            {archived ? (
                              <TinyPill tone="danger">Archived</TinyPill>
                            ) : (
                              <TinyPill tone="success">Active</TinyPill>
                            )}

                            {isUnpriced ? (
                              <TinyPill tone="warn">Unpriced</TinyPill>
                            ) : null}
                          </div>

                          <div className="mt-1 text-xs app-muted">
                            SKU: <b>{p?.sku || "—"}</b> • Selling:{" "}
                            <b>{selling == null ? "—" : money(selling)}</b>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <AsyncButton
                            variant="secondary"
                            size="sm"
                            state="idle"
                            text={archived ? "Restore" : "Archive"}
                            loadingText="Working…"
                            successText="Done"
                            onClick={() =>
                              archived
                                ? openRestoreProduct?.(p)
                                : openArchiveProduct?.(p)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

              {(Array.isArray(products) ? products : []).length === 0 ? (
                <div className="text-sm app-muted">No products.</div>
              ) : null}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
