"use client";

import {
  Input,
  Pill,
  SectionCard,
  Skeleton,
  cx,
  money,
  toStr,
} from "./adminShared";

import AsyncButton from "../AsyncButton";

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function rowInventoryValue(row) {
  const explicit =
    row?.inventoryValue ??
    row?.inventory_value ??
    row?.totalValue ??
    row?.total_value ??
    null;

  if (explicit != null && Number.isFinite(Number(explicit))) {
    return Number(explicit);
  }

  const qty = safeNumber(
    row?.qtyOnHand ?? row?.qty_on_hand ?? row?.qty ?? row?.quantity ?? 0,
  );

  const purchasePrice = safeNumber(
    row?.purchasePrice ??
      row?.purchase_price ??
      row?.costPrice ??
      row?.cost_price ??
      0,
  );

  return qty * purchasePrice;
}

function StatTile({ label, value, sub, tone = "neutral" }) {
  const toneCls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)]"
        : tone === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)]"
          : tone === "info"
            ? "border-[var(--info-border)] bg-[var(--info-bg)]"
            : "border-[var(--border)] bg-[var(--card-2)]";

  return (
    <div
      className={cx(
        "rounded-3xl border p-4 sm:p-5 transition",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        toneCls,
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] app-muted sm:text-[11px]">
        {label}
      </div>
      <div className="mt-1.5 text-lg font-black leading-tight text-[var(--app-fg)] sm:text-2xl">
        {value}
      </div>
      {sub ? (
        <div className="mt-1.5 text-xs leading-5 app-muted sm:text-sm">
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function InfoBlock({ label, value, sub, right }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] app-muted">
            {label}
          </div>
          <div className="mt-1.5 truncate text-sm font-bold text-[var(--app-fg)]">
            {value || "—"}
          </div>
          {sub ? (
            <div className="mt-1 truncate text-xs app-muted">{sub}</div>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </div>
  );
}

function SearchPanel({ label, placeholder, value, onChange, extra }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4 sm:p-5">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.08em] app-muted">
          {label}
        </div>
        {extra ? <div>{extra}</div> : null}
      </div>
      <Input placeholder={placeholder} value={value} onChange={onChange} />
    </div>
  );
}

function InventoryCard({ row, sellingPrice, onOpenProof }) {
  const pid = row?.productId ?? row?.product_id ?? row?.id ?? null;

  const name =
    row?.productName ||
    row?.product_name ||
    row?.displayName ||
    row?.name ||
    "—";

  const sku = row?.sku || "—";

  const qty =
    Number(
      row?.qtyOnHand ?? row?.qty_on_hand ?? row?.qty ?? row?.quantity ?? 0,
    ) || 0;

  const unit = toStr(row?.stockUnit || row?.unit || row?.salesUnit) || "PIECE";
  const category = toStr(row?.category) || "—";
  const brand = toStr(row?.brand) || "—";

  const reorderLevel = Number(
    (row?.reorderLevel ?? row?.reorder_level ?? 0) || 0,
  );

  const lowStock = qty <= reorderLevel;
  const inventoryValue = rowInventoryValue(row);

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-sm font-black text-[var(--app-fg)] sm:text-base">
              {name}
            </div>
            {lowStock ? (
              <Pill tone="warn">Low stock</Pill>
            ) : (
              <Pill tone="success">In stock</Pill>
            )}
            {pid != null ? <Pill tone="info">#{pid}</Pill> : null}
          </div>

          <div className="mt-1.5 text-xs app-muted sm:text-sm">
            SKU <span className="font-bold text-[var(--app-fg)]">{sku}</span>
            {category && category !== "—" ? ` • ${category}` : ""}
            {brand && brand !== "—" ? ` • ${brand}` : ""}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] app-muted sm:text-[11px]">
            On hand
          </div>
          <div className="mt-1 text-xl font-black leading-tight text-[var(--app-fg)] sm:text-2xl">
            {qty.toLocaleString()}
          </div>
          <div className="text-[11px] app-muted">{unit}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <InfoBlock
          label="Selling price"
          value={sellingPrice || "—"}
          sub="Current visible sell price"
        />

        <InfoBlock
          label="Inventory value"
          value={`${money(inventoryValue)} RWF`}
          sub="Qty on hand × purchase price"
        />

        <InfoBlock
          label="Stock threshold"
          value={reorderLevel > 0 ? reorderLevel.toLocaleString() : "—"}
          sub={lowStock ? "Needs attention" : "Within acceptable level"}
          right={lowStock ? <Pill tone="warn">Risk</Pill> : null}
        />
      </div>

      <div className="mt-3">
        <InfoBlock
          label="Traceability"
          value={pid != null ? `Product #${pid}` : "No linked product"}
          sub="Audit trail, changes, and supporting evidence"
          right={
            pid != null ? (
              <button
                type="button"
                className="min-h-10 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-xs font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
                onClick={() => onOpenProof?.(row)}
              >
                Open proof
              </button>
            ) : null
          }
        />
      </div>
    </div>
  );
}

function ProductAdminCard({
  product,
  archived,
  isUnpriced,
  onOpenProof,
  onArchive,
  onRestore,
  onDelete,
}) {
  const name =
    product?.displayName ||
    product?.name ||
    product?.productName ||
    product?.title ||
    "—";

  const sku = product?.sku || "—";

  const selling =
    product?.sellingPrice ??
    product?.selling_price ??
    product?.price ??
    product?.unitPrice ??
    product?.unit_price ??
    null;

  const category = toStr(product?.category) || "—";
  const brand = toStr(product?.brand) || "—";

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-sm font-black text-[var(--app-fg)] sm:text-base">
              {name}
            </div>

            {archived ? (
              <Pill tone="danger">Archived</Pill>
            ) : (
              <Pill tone="success">Active</Pill>
            )}

            {isUnpriced ? <Pill tone="warn">Unpriced</Pill> : null}
          </div>

          <div className="mt-1.5 text-xs app-muted sm:text-sm">
            SKU <span className="font-bold text-[var(--app-fg)]">{sku}</span>
            {" • "}
            Product #{product?.id ?? "—"}
            {category && category !== "—" ? ` • ${category}` : ""}
            {brand && brand !== "—" ? ` • ${brand}` : ""}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InfoBlock
          label="Selling price"
          value={selling == null ? "—" : `${money(selling)} RWF`}
          sub={isUnpriced ? "Needs pricing review" : "Current configured price"}
          right={isUnpriced ? <Pill tone="warn">Review</Pill> : null}
        />

        <InfoBlock
          label="Category"
          value={category}
          sub={brand && brand !== "—" ? `Brand: ${brand}` : "No brand set"}
        />
      </div>

      <div className="mt-3">
        <InfoBlock
          label="Traceability"
          value={`Product #${product?.id ?? "—"}`}
          sub="Open proof to investigate changes, pricing, and history"
          right={
            <button
              type="button"
              className="min-h-10 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-xs font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
              onClick={() => onOpenProof?.(product)}
            >
              Open proof
            </button>
          }
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <AsyncButton
          variant="secondary"
          size="sm"
          state="idle"
          text={archived ? "Restore" : "Archive"}
          loadingText="Working…"
          successText="Done"
          onClick={() =>
            archived ? onRestore?.(product) : onArchive?.(product)
          }
        />

        <button
          type="button"
          className="min-h-10 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-2 text-xs font-semibold text-[var(--danger-fg)] transition hover:opacity-90"
          onClick={() => onDelete?.(product)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function InventoryLoadingState() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="mt-2 h-4 w-64 max-w-full" />
            </div>
            <div className="w-24 shrink-0">
              <Skeleton className="ml-auto h-4 w-16" />
              <Skeleton className="mt-2 ml-auto h-8 w-20" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>

          <Skeleton className="mt-3 h-16 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, hint }) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card-2)] p-8 text-center sm:p-10">
      <div className="text-base font-black text-[var(--app-fg)] sm:text-lg">
        {title}
      </div>
      <div className="mt-2 text-sm leading-6 app-muted">{hint}</div>
    </div>
  );
}

export default function AdminInventorySection({
  invLoading = false,
  prodLoading = false,
  inventory = [],
  products = [],
  invQ,
  setInvQ,
  prodQ,
  setProdQ,
  showArchivedProducts,
  setShowArchivedProducts,
  loadInventory,
  loadProducts,
  filteredInventory = [],
  filteredProducts = [],
  unpricedCount = 0,
  sellingPriceForRow,
  isArchivedProduct,
  onOpenInventoryProof,
  onOpenProductProof,
  onOpenArchiveProduct,
  onOpenRestoreProduct,
  onOpenDeleteProduct,
}) {
  const inventoryRows = Array.isArray(filteredInventory)
    ? filteredInventory
    : [];

  const allInventoryRows = Array.isArray(inventory) ? inventory : [];
  const productRows = Array.isArray(filteredProducts) ? filteredProducts : [];

  const totalInventoryValue = allInventoryRows.reduce(
    (sum, row) => sum + rowInventoryValue(row),
    0,
  );

  const filteredInventoryValue = inventoryRows.reduce(
    (sum, row) => sum + rowInventoryValue(row),
    0,
  );

  const totalQtyOnHand = allInventoryRows.reduce((sum, row) => {
    return (
      sum +
      safeNumber(
        row?.qtyOnHand ?? row?.qty_on_hand ?? row?.qty ?? row?.quantity ?? 0,
      )
    );
  }, 0);

  const filteredQtyOnHand = inventoryRows.reduce((sum, row) => {
    return (
      sum +
      safeNumber(
        row?.qtyOnHand ?? row?.qty_on_hand ?? row?.qty ?? row?.quantity ?? 0,
      )
    );
  }, 0);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.02fr_0.98fr] 2xl:grid-cols-[1.02fr_0.98fr]">
      <SectionCard
        title="Inventory command view"
        hint="Operational stock visibility with pricing preview, thresholds, proof access, and clear inventory value."
        right={
          <AsyncButton
            variant="secondary"
            size="sm"
            state={invLoading || prodLoading ? "loading" : "idle"}
            text="Reload"
            loadingText="Loading…"
            successText="Done"
            onClick={() =>
              Promise.all([
                loadInventory?.(),
                loadProducts?.({ includeInactive: showArchivedProducts }),
              ])
            }
          />
        }
      >
        <div className="grid gap-5 sm:gap-6">
          {/* Stats Section (2 columns → 2 rows) */}
          <section className="grid grid-cols-2 gap-3 sm:gap-4">
            <StatTile
              label="Branch Inventory Value"
              value={
                <span className="text-[19px] font-semibold tracking-tight">
                  {money(totalInventoryValue)} RWF
                </span>
              }
              sub={`${totalQtyOnHand.toLocaleString()} total units on hand`}
              tone="info"
            />

            <StatTile
              label="Filtered Inventory Value"
              value={
                <span className="text-[19px] font-semibold tracking-tight">
                  {money(filteredInventoryValue)} RWF
                </span>
              }
              sub={`${filteredQtyOnHand.toLocaleString()} units in result`}
              tone="success"
            />

            <StatTile
              label="Inventory Rows"
              value={
                <span className="text-[19px] font-semibold tracking-tight">
                  {allInventoryRows.length.toLocaleString()}
                </span>
              }
              sub="Total stock records loaded"
            />

            <StatTile
              label="Pricing Gaps"
              value={
                <span className="text-[19px] font-semibold tracking-tight">
                  {unpricedCount.toLocaleString()}
                </span>
              }
              sub="Products missing selling price"
              tone={unpricedCount > 0 ? "warn" : "success"}
            />
          </section>

          {/* Search Section */}
          <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full">
              <SearchPanel
                label="Search Inventory"
                placeholder="Search by product name, SKU, or product number…"
                value={invQ}
                onChange={(e) => setInvQ?.(e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <Pill tone="info" className="whitespace-nowrap">
                {inventoryRows.length.toLocaleString()} visible row
                {inventoryRows.length === 1 ? "" : "s"}
              </Pill>
            </div>
          </section>

          {/* Content Section */}
          <section className="grid gap-4">
            {invLoading || prodLoading ? (
              <InventoryLoadingState />
            ) : inventoryRows.length === 0 ? (
              <EmptyState
                title="No inventory rows found"
                hint="Try a different search term or refresh inventory data."
              />
            ) : (
              <>
                <div className="grid gap-3">
                  {inventoryRows.slice(0, 60).map((row, idx) => (
                    <InventoryCard
                      key={row?.id || `${row?.productId || "row"}-${idx}`}
                      row={row}
                      sellingPrice={sellingPriceForRow?.(row)}
                      onOpenProof={onOpenInventoryProof}
                    />
                  ))}
                </div>

                {inventoryRows.length > 60 && (
                  <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                    Showing first 60 inventory rows. Refine your search for
                    faster results.
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </SectionCard>

      <SectionCard
        title={`Product control (${showArchivedProducts ? "Archived" : "Active"})`}
        hint="Archive, restore, delete, and inspect products with cleaner admin control."
        right={
          <label className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-sm font-semibold text-[var(--app-fg)]">
            <input
              type="checkbox"
              checked={!!showArchivedProducts}
              onChange={(e) => setShowArchivedProducts?.(e.target.checked)}
            />
            Show archived
          </label>
        }
      >
        <div className="grid gap-4 sm:gap-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile
              label="Loaded products"
              value={String(Array.isArray(products) ? products.length : 0)}
              sub="Raw product records"
            />
            <StatTile
              label="Current view"
              value={String(productRows.length)}
              sub={
                showArchivedProducts
                  ? "Archived result set"
                  : "Active result set"
              }
              tone={showArchivedProducts ? "danger" : "success"}
            />
            <StatTile
              label="Unpriced"
              value={String(unpricedCount)}
              sub="Needs pricing review"
              tone={unpricedCount > 0 ? "warn" : "success"}
            />
          </div>

          <SearchPanel
            label="Search products"
            placeholder="Search by id, name, display name, or SKU…"
            value={prodQ}
            onChange={(e) => setProdQ?.(e.target.value)}
            extra={
              <Pill tone={showArchivedProducts ? "danger" : "success"}>
                {showArchivedProducts ? "Archived mode" : "Active mode"}
              </Pill>
            }
          />

          {prodLoading ? (
            <InventoryLoadingState />
          ) : productRows.length === 0 ? (
            <EmptyState
              title="No products in this view"
              hint="Try another search or switch active / archived mode."
            />
          ) : (
            <div className="grid gap-3">
              {productRows.slice(0, 50).map((product) => {
                const archived = isArchivedProduct?.(product);

                const selling =
                  product?.sellingPrice ??
                  product?.selling_price ??
                  product?.price ??
                  product?.unitPrice ??
                  product?.unit_price ??
                  null;

                const isUnpriced =
                  selling == null ||
                  !Number.isFinite(Number(selling)) ||
                  Number(selling) <= 0;

                return (
                  <ProductAdminCard
                    key={String(product?.id)}
                    product={product}
                    archived={archived}
                    isUnpriced={isUnpriced}
                    onOpenProof={onOpenProductProof}
                    onArchive={onOpenArchiveProduct}
                    onRestore={onOpenRestoreProduct}
                    onDelete={onOpenDeleteProduct}
                  />
                );
              })}
            </div>
          )}

          <div className="rounded-2xl border border-[var(--warn-border)] bg-[var(--warn-bg)] px-4 py-3 text-xs leading-6 text-[var(--warn-fg)]">
            Delete is permanent. If delete fails because the product is linked
            to operational history, archive the product instead.
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
