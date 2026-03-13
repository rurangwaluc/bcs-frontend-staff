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
    <div className={cx("rounded-2xl border p-4", toneCls)}>
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

  const lowStock =
    qty <= Number((row?.reorderLevel ?? row?.reorder_level ?? 0) || 0);

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-sm font-black text-[var(--app-fg)] sm:text-base">
              {name}
            </div>
            {lowStock ? <Pill tone="warn">Low stock</Pill> : null}
            {pid != null ? <Pill tone="info">#{pid}</Pill> : null}
          </div>

          <div className="mt-1 text-xs app-muted">
            SKU <b>{sku}</b> • {category}
            {brand && brand !== "—" ? ` • ${brand}` : ""}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            On hand
          </div>
          <div className="mt-1 text-lg font-black text-[var(--app-fg)]">
            {qty.toLocaleString()}
          </div>
          <div className="text-[11px] app-muted">{unit}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            Selling price
          </div>
          <div className="mt-1 text-sm font-black text-[var(--app-fg)]">
            {sellingPrice}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            Evidence
          </div>
          <div className="mt-2 flex justify-end">
            {pid != null ? (
              <button
                type="button"
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-semibold text-[var(--app-fg)] hover:bg-[var(--hover)]"
                onClick={() => onOpenProof?.(row)}
              >
                Open proof
              </button>
            ) : (
              <span className="text-xs app-muted">—</span>
            )}
          </div>
        </div>
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
  const selling =
    product?.sellingPrice ??
    product?.selling_price ??
    product?.price ??
    product?.unitPrice ??
    product?.unit_price ??
    null;

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-sm font-black text-[var(--app-fg)] sm:text-base">
              {product?.displayName ||
                product?.name ||
                product?.productName ||
                product?.title ||
                "—"}
            </div>

            {archived ? (
              <Pill tone="danger">Archived</Pill>
            ) : (
              <Pill tone="success">Active</Pill>
            )}

            {isUnpriced ? <Pill tone="warn">Unpriced</Pill> : null}
          </div>

          <div className="mt-1 text-xs app-muted">
            SKU <b>{product?.sku || "—"}</b> • Product #{product?.id ?? "—"}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            Selling price
          </div>
          <div className="mt-1 text-sm font-black text-[var(--app-fg)]">
            {selling == null ? "—" : `${money(selling)} RWF`}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            Category
          </div>
          <div className="mt-1 text-sm font-black text-[var(--app-fg)]">
            {toStr(product?.category) || "—"}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-semibold text-[var(--app-fg)] hover:bg-[var(--hover)]"
          onClick={() => onOpenProof?.(product)}
        >
          Proof
        </button>

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
          className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-xs font-semibold text-[var(--danger-fg)] hover:opacity-90"
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
          className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4"
        >
          <Skeleton className="h-5 w-52" />
          <Skeleton className="mt-2 h-4 w-72" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, hint }) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card-2)] p-8 text-center">
      <div className="text-base font-black text-[var(--app-fg)]">{title}</div>
      <div className="mt-2 text-sm app-muted">{hint}</div>
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
  const productRows = Array.isArray(filteredProducts) ? filteredProducts : [];

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.02fr_0.98fr]">
      <SectionCard
        title="Inventory command view"
        hint="Operational stock visibility with pricing preview and proof access."
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
        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile
              label="Inventory rows"
              value={String(Array.isArray(inventory) ? inventory.length : 0)}
              sub="Loaded stock records"
              tone="info"
            />
            <StatTile
              label="Filtered rows"
              value={String(inventoryRows.length)}
              sub="Current search result"
            />
            <StatTile
              label="Pricing gaps"
              value={String(unpricedCount)}
              sub="Products missing selling price"
              tone={unpricedCount > 0 ? "warn" : "success"}
            />
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
              Search inventory
            </div>
            <Input
              placeholder="Search by name, SKU, product number…"
              value={invQ}
              onChange={(e) => setInvQ?.(e.target.value)}
            />
          </div>

          {invLoading || prodLoading ? (
            <InventoryLoadingState />
          ) : inventoryRows.length === 0 ? (
            <EmptyState
              title="No inventory rows"
              hint="Try another search word or reload inventory data."
            />
          ) : (
            <div className="grid gap-3">
              {inventoryRows.slice(0, 60).map((row, idx) => (
                <InventoryCard
                  key={row?.id || `${row?.productId || "row"}-${idx}`}
                  row={row}
                  sellingPrice={sellingPriceForRow?.(row)}
                  onOpenProof={onOpenInventoryProof}
                />
              ))}

              {inventoryRows.length > 60 ? (
                <div className="text-center text-xs app-muted">
                  Showing first 60 inventory rows. Narrow the search to focus
                  faster.
                </div>
              ) : null}
            </div>
          )}
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
        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile
              label="Loaded products"
              value={String(Array.isArray(products) ? products.length : 0)}
              sub="Raw product list"
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

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
              Search products
            </div>
            <Input
              placeholder="Search products by id, name, display name, sku…"
              value={prodQ}
              onChange={(e) => setProdQ?.(e.target.value)}
            />
          </div>

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

          <div className="rounded-2xl border border-[var(--warn-border)] bg-[var(--warn-bg)] px-4 py-3 text-xs text-[var(--warn-fg)]">
            Delete is permanent. If delete fails because of linked operational
            history, archive the product instead.
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
