"use client";

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

function qtyText(v) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.round(n).toLocaleString() : "0";
}

function inputBase(className = "") {
  return cx(
    "app-focus w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-3 text-sm text-[var(--app-fg)] outline-none transition",
    "placeholder:text-[var(--muted)]",
    "hover:border-[var(--border-strong)] focus:border-[var(--border-strong)]",
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

function StatCard({ label, value, sub, tone = "default" }) {
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
    <div className={cx("rounded-2xl border p-3", toneCls)}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
        {label}
      </div>
      <div className="mt-1 text-lg font-black text-[var(--app-fg)]">
        {value}
      </div>
      {sub ? <div className="mt-1 text-xs app-muted">{sub}</div> : null}
    </div>
  );
}

function InfoPill({ children, tone = "default" }) {
  const toneCls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
        : tone === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
          : tone === "info"
            ? "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]"
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

function ProductQuickCard({ product, selected, onSelect }) {
  const displayName =
    toStr(product?.displayName) ||
    [
      toStr(product?.name),
      toStr(product?.brand),
      toStr(product?.model),
      toStr(product?.size),
      toStr(product?.color),
    ]
      .filter(Boolean)
      .join(" ") ||
    "Unnamed product";

  const qty = toNum(product?.qtyOnHand ?? product?.qty_on_hand ?? 0);
  const sku = toStr(product?.sku);
  const unit = toStr(product?.stockUnit || product?.unit || "pcs");
  const category =
    toStr(product?.category) || toStr(product?.subcategory) || "Hardware";

  const stockTone = qty <= 0 ? "danger" : qty <= 5 ? "warn" : "success";

  return (
    <button
      type="button"
      onClick={() => onSelect?.(String(product?.id ?? ""))}
      className={cx(
        "app-focus w-full rounded-3xl border p-4 text-left transition",
        selected
          ? "border-[var(--app-fg)] bg-[var(--card)] shadow-sm ring-1 ring-[var(--app-fg)]"
          : "border-[var(--border)] bg-[var(--card-2)] hover:bg-[var(--hover)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-2 text-sm font-black leading-6 text-[var(--app-fg)] sm:text-base">
            {displayName}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <InfoPill>#{product?.id ?? "—"}</InfoPill>
            {sku ? <InfoPill>SKU: {sku}</InfoPill> : null}
            <InfoPill tone="info">{category}</InfoPill>
          </div>
        </div>

        {selected ? <InfoPill tone="success">Selected</InfoPill> : null}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        <StatCard
          label="Current stock"
          value={qtyText(qty)}
          sub={unit}
          tone={stockTone}
        />
      </div>
    </button>
  );
}

function FileRow({ file, onRemove }) {
  const sizeKb = Math.max(1, Math.round((Number(file?.size || 0) || 0) / 1024));
  const type = toStr(file?.type) || "file";

  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-[var(--app-fg)]">
          {file?.name || "Unnamed file"}
        </div>
        <div className="mt-1 text-xs app-muted">
          {type} • {sizeKb.toLocaleString()} KB
        </div>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="app-focus shrink-0 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-xs font-bold text-[var(--danger-fg)] transition hover:opacity-90"
      >
        Remove
      </button>
    </div>
  );
}

function ArrivalChecklist({
  arrProductId,
  arrQty,
  arrFiles,
  arrNotes,
  selectedProduct,
}) {
  const qty = toNum(arrQty, 0);
  const currentQty = toNum(
    selectedProduct?.qtyOnHand ?? selectedProduct?.qty_on_hand ?? 0,
  );
  const predictedQty = arrProductId && qty > 0 ? currentQty + qty : currentQty;
  const unit = toStr(
    selectedProduct?.stockUnit || selectedProduct?.unit || "pcs",
  );

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4">
      <div className="text-sm font-black text-[var(--app-fg)]">
        Arrival preview
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Selected product"
          value={arrProductId ? `#${arrProductId}` : "None"}
          sub={
            toStr(selectedProduct?.name || selectedProduct?.displayName) ||
            "Choose a product"
          }
        />
        <StatCard
          label="Current stock"
          value={qtyText(currentQty)}
          sub={unit}
        />
        <StatCard
          label="Incoming qty"
          value={qtyText(qty)}
          sub={unit}
          tone={qty > 0 ? "success" : "default"}
        />
        <StatCard
          label="After save"
          value={qtyText(predictedQty)}
          sub={unit}
          tone={qty > 0 ? "success" : "info"}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <InfoPill tone={arrProductId ? "success" : "default"}>
          {arrProductId ? "Product selected" : "Pick a product"}
        </InfoPill>
        <InfoPill tone={qty > 0 ? "success" : "warn"}>
          {qty > 0 ? "Qty looks valid" : "Enter qty"}
        </InfoPill>
        <InfoPill tone={arrFiles.length > 0 ? "success" : "warn"}>
          {arrFiles.length > 0
            ? `${arrFiles.length} document(s)`
            : "No document yet"}
        </InfoPill>
        <InfoPill>{toStr(arrNotes) ? "With notes" : "No notes"}</InfoPill>
      </div>
    </div>
  );
}

export default function StoreKeeperArrivalsSection({
  products = [],
  productsLoading = false,
  loadProducts,

  inventory = [],
  inventoryLoading = false,
  loadInventory,

  arrProductId,
  setArrProductId,
  arrQty,
  setArrQty,
  arrNotes,
  setArrNotes,
  arrFiles = [],
  setArrFiles,
  createArrival,
  arrivalBtn,
}) {
  const productRows = Array.isArray(products) ? products : [];
  const inventoryRows = Array.isArray(inventory) ? inventory : [];

  const mergedProducts = productRows.map((p) => {
    const inv = inventoryRows.find((x) => Number(x?.id) === Number(p?.id));
    return inv ? { ...p, ...inv } : p;
  });

  const selectedProduct =
    mergedProducts.find((p) => String(p?.id) === String(arrProductId)) || null;

  const totalFiles = arrFiles.length;
  const totalFileBytes = arrFiles.reduce(
    (sum, f) => sum + (Number(f?.size || 0) || 0),
    0,
  );

  const topProducts = mergedProducts.slice(0, 24);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.92fr_1.08fr]">
      <SectionShell
        title="Record stock arrival"
        hint="Receive stock cleanly for one branch at a time, attach supplier proof, and keep hardware inventory traceable."
        right={
          <div className="flex flex-wrap gap-2">
            <AsyncButton
              variant="secondary"
              size="sm"
              state={productsLoading ? "loading" : "idle"}
              text="Refresh products"
              loadingText="Refreshing…"
              successText="Done"
              onClick={loadProducts}
            />
            <AsyncButton
              variant="secondary"
              size="sm"
              state={inventoryLoading ? "loading" : "idle"}
              text="Refresh stock"
              loadingText="Refreshing…"
              successText="Done"
              onClick={loadInventory}
            />
          </div>
        }
      >
        <form onSubmit={createArrival} className="grid gap-4">
          <ArrivalChecklist
            arrProductId={arrProductId}
            arrQty={arrQty}
            arrFiles={arrFiles}
            arrNotes={arrNotes}
            selectedProduct={selectedProduct}
          />

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                  Product
                </div>
                <Select
                  value={arrProductId}
                  onChange={(e) => setArrProductId?.(e.target.value)}
                >
                  <option value="">Select product…</option>
                  {mergedProducts.map((p) => {
                    const displayName =
                      toStr(p?.displayName) ||
                      [
                        toStr(p?.name),
                        toStr(p?.brand),
                        toStr(p?.model),
                        toStr(p?.size),
                      ]
                        .filter(Boolean)
                        .join(" ");
                    const sku = toStr(p?.sku);

                    return (
                      <option key={p?.id} value={p?.id}>
                        #{p?.id} • {displayName || p?.name || "Unnamed"}
                        {sku ? ` • ${sku}` : ""}
                      </option>
                    );
                  })}
                </Select>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                  Qty received
                </div>
                <Input
                  type="number"
                  min="1"
                  placeholder="Example: 20"
                  value={arrQty}
                  onChange={(e) => setArrQty?.(e.target.value)}
                />
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                  Unit reference
                </div>
                <Input
                  value={toStr(
                    selectedProduct?.stockUnit ||
                      selectedProduct?.unit ||
                      "pcs",
                  )}
                  readOnly
                />
              </div>

              <div className="sm:col-span-2">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                  Arrival note
                </div>
                <TextArea
                  rows={3}
                  placeholder="Invoice reference, supplier, delivery note, bundle details, quality observation…"
                  value={arrNotes}
                  onChange={(e) => setArrNotes?.(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-black text-[var(--app-fg)]">
                  Documents
                </div>
                <div className="mt-1 text-sm app-muted">
                  Upload invoice, delivery note, receipt, or arrival photos.
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <InfoPill>{totalFiles} file(s)</InfoPill>
                <InfoPill>
                  {Math.max(
                    0,
                    Math.round(totalFileBytes / 1024),
                  ).toLocaleString()}{" "}
                  KB
                </InfoPill>
              </div>
            </div>

            <input
              id="storekeeper-arrival-files"
              type="file"
              multiple
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setArrFiles?.(files);
              }}
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <label
                htmlFor="storekeeper-arrival-files"
                className="app-focus inline-flex cursor-pointer items-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
              >
                Choose files
              </label>

              <button
                type="button"
                className="app-focus rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
                onClick={() => setArrFiles?.([])}
              >
                Clear files
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              {arrFiles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] p-4 text-sm app-muted">
                  No files selected yet.
                </div>
              ) : (
                arrFiles.map((f, i) => (
                  <FileRow
                    key={`${f?.name || "file"}-${i}`}
                    file={f}
                    onRemove={() =>
                      setArrFiles?.((prev) =>
                        (Array.isArray(prev) ? prev : []).filter(
                          (_, idx) => idx !== i,
                        ),
                      )
                    }
                  />
                ))
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <AsyncButton
              type="submit"
              variant="primary"
              state={arrivalBtn}
              text="Save arrival"
              loadingText="Saving…"
              successText="Saved"
            />

            <button
              type="button"
              className="app-focus rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
              onClick={() => {
                setArrQty?.("");
                setArrNotes?.("");
                setArrFiles?.([]);
              }}
            >
              Clear form
            </button>

            <div className="text-xs app-muted">
              Saving an arrival should increase stock for the selected branch
              product.
            </div>
          </div>
        </form>
      </SectionShell>

      <SectionShell
        title="Quick product picker"
        hint="Choose the exact branch product before receiving stock. Built for fast operational picking."
      >
        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Products loaded"
              value={String(mergedProducts.length)}
              sub="Available for arrivals"
            />
            <StatCard
              label="Selected product"
              value={arrProductId ? `#${arrProductId}` : "None"}
              sub={
                toStr(selectedProduct?.name || selectedProduct?.displayName) ||
                "Pick one below"
              }
              tone={arrProductId ? "success" : "default"}
            />
            <StatCard
              label="Current stock"
              value={qtyText(
                selectedProduct?.qtyOnHand ?? selectedProduct?.qty_on_hand ?? 0,
              )}
              sub={toStr(
                selectedProduct?.stockUnit || selectedProduct?.unit || "pcs",
              )}
            />
            <StatCard
              label="Incoming"
              value={qtyText(arrQty || 0)}
              sub="Planned arrival"
              tone={toNum(arrQty, 0) > 0 ? "success" : "default"}
            />
          </div>

          {productsLoading || inventoryLoading ? (
            <div className="grid gap-3 lg:grid-cols-2">
              <Skeleton className="h-28 w-full rounded-3xl" />
              <Skeleton className="h-28 w-full rounded-3xl" />
              <Skeleton className="h-28 w-full rounded-3xl" />
              <Skeleton className="h-28 w-full rounded-3xl" />
            </div>
          ) : topProducts.length === 0 ? (
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-6 text-sm app-muted">
              No products available yet. Create products first, then record
              arrivals.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {topProducts.map((p) => (
                <ProductQuickCard
                  key={String(p?.id)}
                  product={p}
                  selected={String(arrProductId) === String(p?.id)}
                  onSelect={setArrProductId}
                />
              ))}
            </div>
          )}

          {mergedProducts.length > 24 ? (
            <div className="text-xs app-muted">
              Showing the first 24 products here for fast picking. Use the
              dropdown on the left for the full list.
            </div>
          ) : null}
        </div>
      </SectionShell>
    </div>
  );
}
