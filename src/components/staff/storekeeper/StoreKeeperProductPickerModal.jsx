"use client";

import { useMemo, useState } from "react";

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

function Badge({ children, tone = "default" }) {
  const cls =
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
        cls,
      )}
    >
      {children}
    </span>
  );
}

function stockTone(qty) {
  const n = toNum(qty, 0);
  if (n <= 0) return "danger";
  if (n <= 5) return "warn";
  return "success";
}

function productDisplayName(product) {
  return (
    toStr(product?.displayName) ||
    [
      toStr(product?.name),
      toStr(product?.brand),
      toStr(product?.model),
      toStr(product?.size),
      toStr(product?.color),
      toStr(product?.variantLabel || product?.variantSummary),
    ]
      .filter(Boolean)
      .join(" ") ||
    "Unnamed product"
  );
}

function normalizeProductRow(product) {
  return {
    ...product,
    _displayName: productDisplayName(product),
    _sku: toStr(product?.sku),
    _category:
      toStr(product?.category) ||
      toStr(product?.subcategory) ||
      "Uncategorized",
    _brand: toStr(product?.brand),
    _model: toStr(product?.model),
    _barcode: toStr(product?.barcode),
    _unit: toStr(product?.stockUnit || product?.unit || "pcs"),
    _qty: toNum(product?.qtyOnHand ?? product?.qty_on_hand ?? 0, 0),
  };
}

function ProductRow({ product, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(String(product?.id || ""))}
      className={cx(
        "app-focus w-full rounded-3xl border p-4 text-left transition",
        active
          ? "border-[var(--app-fg)] bg-[var(--card)] shadow-sm ring-1 ring-[var(--app-fg)]"
          : "border-[var(--border)] bg-[var(--card-2)] hover:bg-[var(--hover)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-2 text-sm font-black leading-6 text-[var(--app-fg)] sm:text-base">
            {product._displayName}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>#{product?.id ?? "—"}</Badge>
            {product._sku ? <Badge>SKU: {product._sku}</Badge> : null}
            <Badge tone="info">{product._category}</Badge>
            {product._brand ? <Badge>{product._brand}</Badge> : null}
          </div>

          {(product._model || product._barcode) && (
            <div className="mt-2 text-xs app-muted">
              {product._model ? `Model: ${product._model}` : ""}
              {product._model && product._barcode ? " • " : ""}
              {product._barcode ? `Barcode: ${product._barcode}` : ""}
            </div>
          )}
        </div>

        {active ? <Badge tone="success">Selected</Badge> : null}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            Current stock
          </div>
          <div className="mt-1 text-lg font-black text-[var(--app-fg)]">
            {qtyText(product._qty)}
          </div>
          <div className="mt-1 text-xs app-muted">{product._unit}</div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            Stock status
          </div>
          <div className="mt-2">
            <Badge tone={stockTone(product._qty)}>
              {product._qty <= 0
                ? "Out of stock"
                : product._qty <= 5
                  ? "Low stock"
                  : "In stock"}
            </Badge>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function StoreKeeperProductPickerModal({
  open,
  title = "Pick product",
  products = [],
  selectedProductId = "",
  onSelect,
  onClose,
}) {
  const [query, setQuery] = useState("");

  const rows = useMemo(
    () =>
      (Array.isArray(products) ? products : [])
        .map(normalizeProductRow)
        .sort((a, b) => {
          const aName = toStr(a?._displayName).toLowerCase();
          const bName = toStr(b?._displayName).toLowerCase();
          return aName.localeCompare(bName);
        }),
    [products],
  );

  const filteredRows = useMemo(() => {
    const q = toStr(query).toLowerCase();
    if (!q) return rows;

    return rows.filter((p) => {
      const haystack = [
        String(p?.id || ""),
        p?._displayName,
        p?._sku,
        p?._category,
        p?._brand,
        p?._model,
        p?._barcode,
        toStr(p?.subcategory),
        toStr(p?.supplierSku),
        toStr(p?.variantLabel),
        toStr(p?.variantSummary),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [rows, query]);

  const selectedProduct =
    rows.find((p) => String(p?.id) === String(selectedProductId)) || null;

  function handleClose() {
    setQuery("");
    onClose?.();
  }

  function handleSelect(id) {
    onSelect?.(id);
    setQuery("");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
        <div className="border-b border-[var(--border)] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base font-black text-[var(--app-fg)]">
                {title}
              </div>
              <div className="mt-1 text-sm app-muted">
                Search by product name, SKU, brand, model, barcode, category, or
                product ID.
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="app-focus rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-2 text-sm font-bold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
            >
              Close
            </button>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search product, SKU, brand, model, barcode, category, or ID"
              autoFocus
            />

            <div className="flex flex-wrap items-center gap-2">
              <Badge>{filteredRows.length} result(s)</Badge>
              {selectedProduct ? (
                <Badge tone="success">Selected #{selectedProduct.id}</Badge>
              ) : (
                <Badge>Select one product</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="min-h-0 overflow-y-auto border-b border-[var(--border)] p-4 lg:border-b-0 lg:border-r">
            {filteredRows.length === 0 ? (
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-6 text-sm app-muted">
                No products match your search.
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredRows.map((p) => (
                  <ProductRow
                    key={String(p?.id)}
                    product={p}
                    active={String(selectedProductId) === String(p?.id)}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="min-h-0 overflow-y-auto p-4">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4">
              <div className="text-sm font-black text-[var(--app-fg)]">
                Selected product
              </div>

              {!selectedProduct ? (
                <div className="mt-3 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] p-4 text-sm app-muted">
                  Pick a product from the list.
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                    <div className="text-base font-black text-[var(--app-fg)]">
                      {selectedProduct._displayName}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge>#{selectedProduct?.id}</Badge>
                      {selectedProduct._sku ? (
                        <Badge>SKU: {selectedProduct._sku}</Badge>
                      ) : null}
                      <Badge tone="info">{selectedProduct._category}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
                        Current stock
                      </div>
                      <div className="mt-1 text-lg font-black text-[var(--app-fg)]">
                        {qtyText(selectedProduct._qty)}
                      </div>
                      <div className="mt-1 text-xs app-muted">
                        {selectedProduct._unit}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
                        Stock status
                      </div>
                      <div className="mt-2">
                        <Badge tone={stockTone(selectedProduct._qty)}>
                          {selectedProduct._qty <= 0
                            ? "Out of stock"
                            : selectedProduct._qty <= 5
                              ? "Low stock"
                              : "In stock"}
                        </Badge>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
                        Brand
                      </div>
                      <div className="mt-1 text-sm font-semibold text-[var(--app-fg)]">
                        {selectedProduct._brand || "—"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
                        Model
                      </div>
                      <div className="mt-1 text-sm font-semibold text-[var(--app-fg)]">
                        {selectedProduct._model || "—"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:col-span-2">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
                        Barcode
                      </div>
                      <div className="mt-1 break-words text-sm font-semibold text-[var(--app-fg)]">
                        {selectedProduct._barcode || "—"}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="app-focus rounded-2xl bg-[var(--app-fg)] px-4 py-3 text-sm font-bold text-[var(--app-bg)] transition hover:opacity-90"
                  >
                    Use this product
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
