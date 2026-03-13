"use client";

import AsyncButton from "../../AsyncButton";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

const CATEGORY_OPTIONS = [
  "GENERAL_HARDWARE",
  "FASTENERS",
  "TOOLS",
  "POWER_TOOLS",
  "ELECTRICAL",
  "PLUMBING",
  "PAINT",
  "BUILDING_MATERIALS",
  "SAFETY",
  "PPE",
  "APPAREL",
  "FOOTWEAR",
  "RAIN_GEAR",
  "ACCESSORIES",
  "OTHER",
];

const UNIT_OPTIONS = [
  "PIECE",
  "PAIR",
  "SET",
  "BOX",
  "PACK",
  "BUNDLE",
  "ROLL",
  "METER",
  "CENTIMETER",
  "MILLIMETER",
  "KILOGRAM",
  "GRAM",
  "LITER",
  "MILLILITER",
  "SHEET",
  "BAG",
  "CARTON",
  "DOZEN",
];

function Skeleton({ className = "" }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-800/70",
        className,
      )}
    />
  );
}

function Field({ label, hint, required = false, children }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <div className="text-[11px] font-black uppercase tracking-[0.1em] text-[var(--muted)]">
          {label}
        </div>
        {required ? (
          <span className="rounded-full border border-[var(--info-border)] bg-[var(--info-bg)] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-[var(--info-fg)]">
            Required
          </span>
        ) : null}
      </div>

      {children}

      {hint ? (
        <div className="mt-1 text-xs text-[var(--muted)]">{hint}</div>
      ) : null}
    </div>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={cx(
        "app-focus w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--app-fg)] outline-none transition",
        "placeholder:text-[var(--muted)] hover:border-[var(--border-strong)] focus:border-[var(--border-strong)]",
        className,
      )}
    />
  );
}

function Select({ className = "", ...props }) {
  return (
    <select
      {...props}
      className={cx(
        "app-focus w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--app-fg)] outline-none transition",
        "hover:border-[var(--border-strong)] focus:border-[var(--border-strong)]",
        className,
      )}
    />
  );
}

function TextArea({ className = "", ...props }) {
  return (
    <textarea
      {...props}
      className={cx(
        "app-focus min-h-[100px] w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--app-fg)] outline-none transition",
        "placeholder:text-[var(--muted)] hover:border-[var(--border-strong)] focus:border-[var(--border-strong)]",
        className,
      )}
    />
  );
}

function SectionCard({ title, hint, right, children }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
        <div className="min-w-0">
          <div className="text-base font-black text-[var(--app-fg)]">
            {title}
          </div>
          {hint ? (
            <div className="mt-1 text-sm text-[var(--muted)]">{hint}</div>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function QtyBadge({ qty }) {
  const n = Number(qty ?? 0) || 0;

  const toneCls =
    n <= 0
      ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
      : n <= 5
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
        : "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em]",
        toneCls,
      )}
    >
      {Math.round(n).toLocaleString()} in stock
    </span>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
      <div className="text-[11px] font-black uppercase tracking-[0.08em] text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-black text-[var(--app-fg)]">
        {value}
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
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.02fr_1.18fr]">
      <SectionCard
        title="Add inventory item"
        hint="Store keeper captures operational stock details only. No price fields are shown here."
        right={
          <AsyncButton
            variant="secondary"
            size="sm"
            state={productsLoading || inventoryLoading ? "loading" : "idle"}
            text="Refresh"
            loadingText="Refreshing…"
            successText="Done"
            onClick={() => {
              loadProducts?.();
              loadInventory?.();
            }}
          />
        }
      >
        <form onSubmit={createProduct} className="grid gap-5">
          <div className="rounded-3xl border border-[var(--info-border)] bg-[var(--info-bg)] p-4">
            <div className="text-sm font-black text-[var(--info-fg)]">
              Core product setup
            </div>
            <div className="mt-1 text-sm text-[var(--info-fg)]/90">
              Fill the main 6 fields first. Everything below is optional support
              data.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Product name" required>
              <Input
                placeholder="Example: PVC Pipe 1/2 inch"
                value={pName}
                onChange={(e) => setPName?.(e.target.value)}
              />
            </Field>

            <Field label="SKU" required hint="Internal stock code">
              <Input
                placeholder="Example: PVC-12MM-3M"
                value={pSku}
                onChange={(e) => setPSku?.(e.target.value)}
              />
            </Field>

            <Field label="Category" required>
              <Select
                value={pCategory || "GENERAL_HARDWARE"}
                onChange={(e) => setPCategory?.(e.target.value)}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Stock unit" required>
              <Select
                value={pStockUnit || pUnit || "PIECE"}
                onChange={(e) => {
                  setPStockUnit?.(e.target.value);
                  setPUnit?.(e.target.value);
                }}
              >
                {UNIT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Opening quantity" required>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={pInitialQty}
                onChange={(e) => setPInitialQty?.(e.target.value)}
              />
            </Field>

            <Field
              label="Reorder level"
              required
              hint="Warn when stock drops below this number"
            >
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={pReorderLevel}
                onChange={(e) => setPReorderLevel?.(e.target.value)}
              />
            </Field>
          </div>

          <details className="group rounded-3xl border border-[var(--border)] bg-[var(--card-2)]">
            <summary className="cursor-pointer list-none px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-[var(--app-fg)]">
                    Optional details
                  </div>
                  <div className="mt-1 text-sm text-[var(--muted)]">
                    Add richer product information only when needed.
                  </div>
                </div>

                <span className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-[var(--app-fg)]">
                  Expand
                </span>
              </div>
            </summary>

            <div className="border-t border-[var(--border)] p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Subcategory">
                  <Input
                    value={pSubcategory}
                    onChange={(e) => setPSubcategory?.(e.target.value)}
                  />
                </Field>

                <Field label="Brand">
                  <Input
                    value={pBrand}
                    onChange={(e) => setPBrand?.(e.target.value)}
                  />
                </Field>

                <Field label="Model">
                  <Input
                    value={pModel}
                    onChange={(e) => setPModel?.(e.target.value)}
                  />
                </Field>

                <Field label="Size">
                  <Input
                    value={pSize}
                    onChange={(e) => setPSize?.(e.target.value)}
                  />
                </Field>

                <Field label="Color">
                  <Input
                    value={pColor}
                    onChange={(e) => setPColor?.(e.target.value)}
                  />
                </Field>

                <Field label="Material">
                  <Input
                    value={pMaterial}
                    onChange={(e) => setPMaterial?.(e.target.value)}
                  />
                </Field>

                <Field label="Variant summary">
                  <Input
                    value={pVariantSummary}
                    onChange={(e) => setPVariantSummary?.(e.target.value)}
                  />
                </Field>

                <Field label="Barcode">
                  <Input
                    value={pBarcode}
                    onChange={(e) => setPBarcode?.(e.target.value)}
                  />
                </Field>

                <Field label="Supplier SKU">
                  <Input
                    value={pSupplierSku}
                    onChange={(e) => setPSupplierSku?.(e.target.value)}
                  />
                </Field>

                <Field label="Sales unit">
                  <Select
                    value={pSalesUnit || ""}
                    onChange={(e) => setPSalesUnit?.(e.target.value)}
                  >
                    <option value="">Use stock unit</option>
                    {UNIT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Purchase unit">
                  <Select
                    value={pPurchaseUnit || ""}
                    onChange={(e) => setPPurchaseUnit?.(e.target.value)}
                  >
                    <option value="">Use stock unit</option>
                    {UNIT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Track inventory">
                  <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--app-fg)]">
                    <input
                      type="checkbox"
                      checked={!!pTrackInventory}
                      onChange={(e) => setPTrackInventory?.(e.target.checked)}
                    />
                    Enable stock tracking
                  </label>
                </Field>

                <div className="md:col-span-2">
                  <Field label="Notes">
                    <TextArea
                      placeholder="Storage note, rack note, handling instruction..."
                      value={pNotes}
                      onChange={(e) => setPNotes?.(e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            </div>
          </details>

          <div className="flex flex-wrap items-center gap-3">
            <AsyncButton
              type="submit"
              variant="primary"
              size="md"
              state={createProductBtn}
              text="Create inventory item"
              loadingText="Creating…"
              successText="Created"
            />

            <div className="text-xs text-[var(--muted)]">
              Price stays hidden for store keeper and is controlled elsewhere.
            </div>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Inventory list"
        hint="Operational stock view only — quantity, identity, and movement readiness."
      >
        <div className="grid gap-4">
          <Input
            placeholder="Search by id, name, SKU, category, brand, barcode or model"
            value={invQ}
            onChange={(e) => setInvQ?.(e.target.value)}
          />

          {inventoryLoading ? (
            <div className="grid gap-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : !Array.isArray(filteredInventory) ||
            filteredInventory.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card-2)] p-6 text-sm text-[var(--muted)]">
              No inventory items found.
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredInventory.map((item, idx) => {
                const id = item?.id ?? idx;
                const qty =
                  Number(item?.qtyOnHand ?? item?.qty_on_hand ?? 0) || 0;
                const name =
                  item?.displayName || item?.name || `Product #${id}`;
                const sku = item?.sku || "—";
                const category = item?.category || "—";
                const brand = item?.brand || "—";
                const unit =
                  item?.stockUnit || item?.stock_unit || item?.unit || "—";
                const reorder =
                  Number(item?.reorderLevel ?? item?.reorder_level ?? 0) || 0;

                return (
                  <div
                    key={String(id)}
                    className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_6px_20px_rgba(15,23,42,0.04)] dark:shadow-none"
                  >
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="break-words text-base font-black leading-6 text-[var(--app-fg)]">
                            {name}
                          </div>
                          <QtyBadge qty={qty} />
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-[var(--muted)] sm:grid-cols-2">
                          <div>
                            <b className="text-[var(--app-fg)]">ID:</b> {id}
                          </div>
                          <div>
                            <b className="text-[var(--app-fg)]">SKU:</b> {sku}
                          </div>
                          <div>
                            <b className="text-[var(--app-fg)]">Category:</b>{" "}
                            {category}
                          </div>
                          <div>
                            <b className="text-[var(--app-fg)]">Brand:</b>{" "}
                            {brand}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                        <MiniStat label="Unit" value={unit} />
                        <MiniStat
                          label="Reorder level"
                          value={Math.round(reorder).toLocaleString()}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
