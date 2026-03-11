"use client";

import { useEffect, useMemo, useState } from "react";

import AsyncButton from "../../../components/AsyncButton";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function money(n) {
  const x = Number(n ?? 0);
  return Number.isFinite(x) ? Math.round(x).toLocaleString() : "0";
}

function qtyText(v) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.round(n).toLocaleString() : "0";
}

function safeDate(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

function inputBase(className = "") {
  return cx(
    "app-focus w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-3 text-sm text-[var(--app-fg)] outline-none transition",
    "placeholder:text-[var(--muted)]",
    "hover:border-[var(--border-strong)]",
    className,
  );
}

function Input({ className = "", ...props }) {
  return <input {...props} className={inputBase(className)} />;
}

function Select({ className = "", ...props }) {
  return <select {...props} className={inputBase(className)} />;
}

function TextArea({ className = "", ...props }) {
  return <textarea {...props} className={inputBase(className)} />;
}

function Skeleton({ className = "" }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70",
        className,
      )}
    />
  );
}

function SectionShell({ title, hint, right, children, className = "" }) {
  return (
    <section
      className={cx(
        "overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
        <div className="min-w-0">
          <div className="text-base font-black text-[var(--app-fg)]">
            {title}
          </div>
          {hint ? <div className="mt-1 text-sm app-muted">{hint}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function MiniStat({ label, value, sub, tone = "default" }) {
  const toneCls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)]"
        : tone === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)]"
          : "border-[var(--border)] bg-[var(--card-2)]";

  return (
    <div className={cx("rounded-2xl border p-3", toneCls)}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
        {label}
      </div>
      <div className="mt-1 text-xl font-black text-[var(--app-fg)]">
        {value}
      </div>
      {sub ? <div className="mt-1 text-xs app-muted">{sub}</div> : null}
    </div>
  );
}

function Pill({ children, tone = "default" }) {
  const toneCls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
        : tone === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
          : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em]",
        toneCls,
      )}
    >
      {children}
    </span>
  );
}

function Field({ label, hint, children, className = "" }) {
  return (
    <div className={className}>
      <div className="text-[11px] font-black uppercase tracking-[0.08em] text-[var(--app-fg)]">
        {label}
      </div>
      {hint ? <div className="mt-1 text-xs app-muted">{hint}</div> : null}
      <div className="mt-2">{children}</div>
    </div>
  );
}

function DetailCell({ label, value, strong = false }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] app-muted">
        {label}
      </div>
      <div
        className={cx(
          "mt-1 break-words text-sm text-[var(--app-fg)]",
          strong ? "font-black" : "font-semibold",
        )}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function ProductCard({ row }) {
  const [open, setOpen] = useState(false);

  const name =
    toStr(row?.displayName) ||
    [
      toStr(row?.name),
      toStr(row?.brand),
      toStr(row?.model),
      toStr(row?.size),
      toStr(row?.color),
    ]
      .filter(Boolean)
      .join(" ") ||
    "Unnamed product";

  const qty = toNum(row?.qtyOnHand ?? row?.qty_on_hand ?? 0);
  const reorderLevel = toNum(row?.reorderLevel ?? row?.reorder_level ?? 0);
  const low = reorderLevel > 0 && qty <= reorderLevel;
  const zero = qty <= 0;
  const active = row?.isActive !== false;

  const tone = !active ? "danger" : zero ? "danger" : low ? "warn" : "success";
  const status = !active
    ? "Archived"
    : zero
      ? "Out of stock"
      : low
        ? "Low stock"
        : "In stock";

  const category =
    toStr(row?.category) || toStr(row?.subcategory) || "General hardware";

  const sku = toStr(row?.sku);
  const brand = toStr(row?.brand);
  const unit = toStr(row?.stockUnit || row?.unit || "pcs");
  const sellingPrice = `${money(row?.sellingPrice ?? 0)} RWF`;
  const costPrice = `${money(row?.costPrice ?? row?.purchasePrice ?? 0)} RWF`;
  const reorderText = reorderLevel > 0 ? qtyText(reorderLevel) : "Not set";

  const stockPanelCls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)]"
        : "border-[var(--danger-border)] bg-[var(--danger-bg)]";

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-black tracking-[-0.02em] text-[var(--app-fg)] sm:text-xl">
                  {name}
                </h3>
                <Pill tone={tone}>{status}</Pill>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Pill>#{row?.id ?? "—"}</Pill>
                {sku ? <Pill>SKU: {sku}</Pill> : null}
                <Pill>{category}</Pill>
                {brand ? <Pill>{brand}</Pill> : null}
              </div>
            </div>

            <div className="shrink-0">
              <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="app-focus rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-2.5 text-sm font-bold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
              >
                {open ? "Hide details" : "View details"}
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            <div className={cx("rounded-3xl border p-4 sm:p-5", stockPanelCls)}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
                Stock on hand
              </div>

              <div className="mt-3 flex items-end gap-3">
                <div className="text-4xl font-black leading-none text-[var(--app-fg)] sm:text-5xl">
                  {qtyText(qty)}
                </div>
                <div className="pb-1 text-sm font-bold uppercase text-[var(--app-fg)]/80 sm:text-base">
                  {unit}
                </div>
              </div>

              <div className="mt-3 text-sm app-muted">
                {zero
                  ? "Stock is empty and should be replenished."
                  : low
                    ? "Stock is near the alert level."
                    : "Stock level is healthy."}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
                  Selling price
                </div>
                <div className="mt-2 text-lg font-black text-[var(--app-fg)]">
                  {sellingPrice}
                </div>
                <div className="mt-1 text-xs app-muted">Current price</div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
                  Cost price
                </div>
                <div className="mt-2 text-lg font-black text-[var(--app-fg)]">
                  {costPrice}
                </div>
                <div className="mt-1 text-xs app-muted">Latest cost</div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
                  Reorder level
                </div>
                <div className="mt-2 text-lg font-black text-[var(--app-fg)]">
                  {reorderText}
                </div>
                <div className="mt-1 text-xs app-muted">Alert level</div>
              </div>
            </div>
          </div>

          {open ? (
            <div className="border-t border-[var(--border)] pt-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <DetailCell
                  label="Subcategory"
                  value={toStr(row?.subcategory)}
                />
                <DetailCell label="Brand" value={toStr(row?.brand)} />
                <DetailCell label="Model / Series" value={toStr(row?.model)} />
                <DetailCell label="Size / Dimension" value={toStr(row?.size)} />
                <DetailCell label="Color / Finish" value={toStr(row?.color)} />
                <DetailCell label="Material" value={toStr(row?.material)} />
                <DetailCell label="Barcode" value={toStr(row?.barcode)} />
                <DetailCell
                  label="Supplier SKU / Ref"
                  value={toStr(row?.supplierSku)}
                />
                <DetailCell
                  label="Variant summary"
                  value={toStr(row?.variantSummary)}
                />
                <DetailCell
                  label="Stock unit"
                  value={toStr(row?.stockUnit || row?.unit || "pcs")}
                />
                <DetailCell
                  label="Sales unit"
                  value={toStr(row?.salesUnit || row?.unit || "pcs")}
                />
                <DetailCell
                  label="Purchase unit"
                  value={toStr(row?.purchaseUnit || row?.unit || "pcs")}
                />
                <DetailCell
                  label="Purchase factor"
                  value={String(toNum(row?.purchaseUnitFactor ?? 1, 1))}
                />
                <DetailCell
                  label="Max discount"
                  value={`${toNum(row?.maxDiscountPercent ?? 0)}%`}
                />
                <DetailCell
                  label="Track inventory"
                  value={row?.trackInventory === false ? "No" : "Yes"}
                />
                <DetailCell
                  label="Updated"
                  value={safeDate(row?.updatedAt || row?.productUpdatedAt)}
                />
              </div>

              {toStr(row?.notes) ? (
                <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.08em] app-muted">
                    Notes
                  </div>
                  <div className="mt-2 whitespace-pre-wrap break-words text-sm text-[var(--app-fg)]">
                    {row.notes}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InventoryCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <Skeleton className="h-7 w-56 rounded-2xl" />
      <div className="mt-3 flex flex-wrap gap-2">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default function StoreKeeperInventorySection({
  productsLoading,
  inventoryLoading,
  loadProducts,
  loadInventory,

  pName,
  setPName,
  pSku,
  setPSku,
  pUnit,
  setPUnit,
  pNotes,
  setPNotes,
  pInitialQty,
  setPInitialQty,
  createProduct,
  createProductBtn,

  invQ,
  setInvQ,
  filteredInventory,

  pCategory,
  setPCategory,
  pSubcategory,
  setPSubcategory,
  pBrand,
  setPBrand,
  pModel,
  setPModel,
  pSize,
  setPSize,
  pColor,
  setPColor,
  pMaterial,
  setPMaterial,
  pVariantSummary,
  setPVariantSummary,
  pBarcode,
  setPBarcode,
  pSupplierSku,
  setPSupplierSku,
  pStockUnit,
  setPStockUnit,
  pSalesUnit,
  setPSalesUnit,
  pPurchaseUnit,
  setPPurchaseUnit,
  pReorderLevel,
  setPReorderLevel,
  pTrackInventory,
  setPTrackInventory,
}) {
  const rows = Array.isArray(filteredInventory) ? filteredInventory : [];

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    setVisibleCount(10);
  }, [invQ, rows.length]);

  const visibleRows = useMemo(
    () => rows.slice(0, visibleCount),
    [rows, visibleCount],
  );

  const canLoadMore = visibleCount < rows.length;

  const totalProducts = rows.length;
  const totalQtyOnHand = rows.reduce(
    (sum, r) => sum + toNum(r?.qtyOnHand ?? r?.qty_on_hand ?? 0),
    0,
  );
  const zeroStockCount = rows.filter(
    (r) => toNum(r?.qtyOnHand ?? r?.qty_on_hand ?? 0) <= 0,
  ).length;
  const lowStockCount = rows.filter((r) => {
    const qty = toNum(r?.qtyOnHand ?? r?.qty_on_hand ?? 0);
    const reorder = toNum(r?.reorderLevel ?? r?.reorder_level ?? 0);
    return reorder > 0 && qty <= reorder;
  }).length;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
      <SectionShell
        title="Register product"
        hint="Create one product at a time. Keep the required fields fast and open more only when useful."
        right={
          <AsyncButton
            variant="secondary"
            size="sm"
            state={productsLoading ? "loading" : "idle"}
            text="Refresh products"
            loadingText="Refreshing…"
            successText="Done"
            onClick={loadProducts}
          />
        }
      >
        <form onSubmit={createProduct} className="grid gap-5">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4 sm:p-5">
            <div className="rounded-2xl border border-[var(--info-border)] bg-[var(--info-bg)] px-4 py-3 text-sm text-[var(--info-fg)]">
              Quick entry: fill the main fields first. Use advanced details only
              when they help staff identify or handle the item better.
            </div>

            <div className="mt-4 grid gap-4">
              <Field
                label="Product name"
                hint="Use one clean product name only."
              >
                <Input
                  placeholder="Example: Hammer 500g"
                  value={pName}
                  onChange={(e) => setPName?.(e.target.value)}
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Category" hint="Main product family">
                  <Input
                    placeholder="Example: Hand tools"
                    value={pCategory ?? ""}
                    onChange={(e) => setPCategory?.(e.target.value)}
                  />
                </Field>

                <Field label="Stock unit" hint="How the branch counts it">
                  <Input
                    placeholder="Example: pcs"
                    value={pStockUnit ?? pUnit ?? ""}
                    onChange={(e) => {
                      setPStockUnit?.(e.target.value);
                      setPUnit?.(e.target.value);
                    }}
                  />
                </Field>

                <Field label="Initial quantity" hint="Opening stock">
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={pInitialQty}
                    onChange={(e) => setPInitialQty?.(e.target.value)}
                  />
                </Field>

                <Field label="Reorder level" hint="Low-stock threshold">
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={pReorderLevel ?? ""}
                    onChange={(e) => setPReorderLevel?.(e.target.value)}
                  />
                </Field>

                <Field label="SKU" hint="Internal code">
                  <Input
                    placeholder="Example: HAM-500G"
                    value={pSku}
                    onChange={(e) => setPSku?.(e.target.value)}
                  />
                </Field>

                <Field label="Barcode" hint="Package barcode if available">
                  <Input
                    placeholder="Example: 1234567890123"
                    value={pBarcode ?? ""}
                    onChange={(e) => setPBarcode?.(e.target.value)}
                  />
                </Field>
              </div>

              <div className="border-t border-[var(--border)] pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((prev) => !prev)}
                  className="app-focus inline-flex items-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-bold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
                >
                  {showAdvanced
                    ? "Hide advanced details"
                    : "Show advanced details"}
                </button>

                {showAdvanced ? (
                  <div className="mt-4 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
                    <div className="mb-4 text-sm app-muted">
                      Optional fields. Use them only when they improve
                      operational clarity.
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Subcategory" hint="More specific grouping">
                        <Input
                          placeholder="Example: Hammers"
                          value={pSubcategory ?? ""}
                          onChange={(e) => setPSubcategory?.(e.target.value)}
                        />
                      </Field>

                      <Field label="Brand" hint="Manufacturer or label">
                        <Input
                          placeholder="Example: Ingco"
                          value={pBrand ?? ""}
                          onChange={(e) => setPBrand?.(e.target.value)}
                        />
                      </Field>

                      <Field
                        label="Model / Series"
                        hint="Exact identifier when relevant"
                      >
                        <Input
                          placeholder="Example: HMH88050"
                          value={pModel ?? ""}
                          onChange={(e) => setPModel?.(e.target.value)}
                        />
                      </Field>

                      <Field
                        label="Size / Dimension"
                        hint="Weight, length, diameter or thickness"
                      >
                        <Input
                          placeholder={`Example: 500g or 1/2"`}
                          value={pSize ?? ""}
                          onChange={(e) => setPSize?.(e.target.value)}
                        />
                      </Field>

                      <Field
                        label="Color / Finish"
                        hint="Only if useful for operations"
                      >
                        <Input
                          placeholder="Example: Black"
                          value={pColor ?? ""}
                          onChange={(e) => setPColor?.(e.target.value)}
                        />
                      </Field>

                      <Field
                        label="Material"
                        hint="Useful for hardware distinction"
                      >
                        <Input
                          placeholder="Example: Forged steel"
                          value={pMaterial ?? ""}
                          onChange={(e) => setPMaterial?.(e.target.value)}
                        />
                      </Field>

                      <Field
                        label="Supplier SKU / Ref"
                        hint="Supplier-side reference"
                      >
                        <Input
                          placeholder="Example: SUP-HAM-500"
                          value={pSupplierSku ?? ""}
                          onChange={(e) => setPSupplierSku?.(e.target.value)}
                        />
                      </Field>

                      <Field
                        label="Variant summary"
                        hint="Short internal differentiator"
                      >
                        <Input
                          placeholder="Example: Steel claw hammer"
                          value={pVariantSummary ?? ""}
                          onChange={(e) => setPVariantSummary?.(e.target.value)}
                        />
                      </Field>

                      <Field label="Sales unit" hint="How it is sold">
                        <Input
                          placeholder="Example: pcs"
                          value={pSalesUnit ?? ""}
                          onChange={(e) => setPSalesUnit?.(e.target.value)}
                        />
                      </Field>

                      <Field label="Purchase unit" hint="How supplier sells it">
                        <Input
                          placeholder="Example: carton"
                          value={pPurchaseUnit ?? ""}
                          onChange={(e) => setPPurchaseUnit?.(e.target.value)}
                        />
                      </Field>

                      <Field
                        label="Track inventory"
                        hint="Usually yes for stocked items"
                      >
                        <Select
                          value={String(
                            pTrackInventory === undefined
                              ? true
                              : pTrackInventory,
                          )}
                          onChange={(e) =>
                            setPTrackInventory?.(e.target.value === "true")
                          }
                        >
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </Select>
                      </Field>

                      <Field label="Default unit" hint="Fallback unit">
                        <Input
                          placeholder="Example: pcs"
                          value={pUnit ?? ""}
                          onChange={(e) => setPUnit?.(e.target.value)}
                        />
                      </Field>

                      <Field
                        label="Notes"
                        hint="Storage, handling or packaging instructions"
                        className="sm:col-span-2"
                      >
                        <TextArea
                          rows={3}
                          placeholder="Example: Keep dry. Stack flat. Fragile package."
                          value={pNotes}
                          onChange={(e) => setPNotes?.(e.target.value)}
                        />
                      </Field>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <AsyncButton
              type="submit"
              variant="primary"
              state={createProductBtn}
              text="Create product"
              loadingText="Creating…"
              successText="Created"
            />
            <div className="text-xs app-muted">
              Fast entry first. Extra detail only when it adds real value.
            </div>
          </div>
        </form>
      </SectionShell>

      <SectionShell
        title="Inventory catalog"
        hint="Built for large inventories. Review products in batches and open details only when needed."
        right={
          <AsyncButton
            variant="secondary"
            size="sm"
            state={inventoryLoading ? "loading" : "idle"}
            text="Refresh inventory"
            loadingText="Refreshing…"
            successText="Done"
            onClick={loadInventory}
          />
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MiniStat
              label="Products"
              value={String(totalProducts)}
              sub="Matching search"
            />
            <MiniStat
              label="Qty on hand"
              value={qtyText(totalQtyOnHand)}
              sub="Visible records"
            />
            <MiniStat
              label="Low stock"
              value={String(lowStockCount)}
              sub="Need attention"
              tone={lowStockCount > 0 ? "warn" : "default"}
            />
            <MiniStat
              label="Out of stock"
              value={String(zeroStockCount)}
              sub="Need replenishment"
              tone={zeroStockCount > 0 ? "danger" : "default"}
            />
          </div>

          <div className="flex justify-center">
            <div className="w-full max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-3 sm:p-4 shadow-sm">
              <Input
                placeholder="Search by name, SKU, barcode, brand, model or category"
                value={invQ}
                onChange={(e) => setInvQ?.(e.target.value)}
              />
            </div>
          </div>

          {inventoryLoading ? (
            <div className="grid gap-4">
              <InventoryCardSkeleton />
              <InventoryCardSkeleton />
              <InventoryCardSkeleton />
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-8 text-center text-sm app-muted">
              No inventory items found.
            </div>
          ) : (
            <>
              <div className="grid gap-3">
                {visibleRows.map((row) => (
                  <ProductCard key={String(row?.id)} row={row} />
                ))}
              </div>

              <div className="flex flex-col items-center gap-4 pt-3 sm:flex-row sm:justify-between">
                <div className="text-xs app-muted">
                  Showing <b>{visibleRows.length}</b> of <b>{rows.length}</b>{" "}
                  products
                </div>

                {canLoadMore ? (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 10)}
                    className="app-focus rounded-2xl border border-[var(--border)] bg-[var(--card)] px-6 py-3 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
                  >
                    Load 10 more
                  </button>
                ) : (
                  <div className="text-xs app-muted">
                    All matching products are displayed.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </SectionShell>
    </div>
  );
}
