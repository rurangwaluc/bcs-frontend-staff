"use client";

import { Input, SectionCard, Skeleton, TextArea } from "./seller-ui";
import { money, toStr } from "./seller-utils";
import { useEffect, useMemo, useRef, useState } from "react";

import AsyncButton from "../../../components/AsyncButton";

const PRODUCT_PAGE_SIZE = 10;
const MAX_EXTRA_CHARGE_PER_UNIT = 1000000;
const ADD_CONFIRM_MS = 1800;
const CART_HIGHLIGHT_MS = 2200;

function getAvailableQty(productOrItem) {
  return (
    Number(
      productOrItem?.qtyOnHand ??
        productOrItem?.qty_on_hand ??
        productOrItem?.stockAvailable ??
        productOrItem?.stock_available ??
        0,
    ) || 0
  );
}

function isInventoryTracked(productOrItem) {
  return Boolean(
    productOrItem?.trackInventory ?? productOrItem?.track_inventory,
  );
}

function hasValidSellingPrice(productOrItem) {
  const n = Number(
    productOrItem?.sellingPrice ?? productOrItem?.selling_price ?? 0,
  );
  return Number.isFinite(n) && n > 0;
}

function isProductSellable(productOrItem) {
  const tracked = isInventoryTracked(productOrItem);
  const availableQty = getAvailableQty(productOrItem);
  const hasPrice = hasValidSellingPrice(productOrItem);

  if (!hasPrice) return false;
  if (tracked && availableQty <= 0) return false;
  return true;
}

function productPriorityScore(productOrItem) {
  const tracked = isInventoryTracked(productOrItem);
  const availableQty = getAvailableQty(productOrItem);
  const hasPrice = hasValidSellingPrice(productOrItem);

  if (hasPrice && (!tracked || availableQty > 0)) return 0;
  if (!hasPrice && (!tracked || availableQty > 0)) return 1;
  if (hasPrice && tracked && availableQty <= 0) return 2;
  return 3;
}

function compareProductsForSale(a, b) {
  const pa = productPriorityScore(a);
  const pb = productPriorityScore(b);

  if (pa !== pb) return pa - pb;

  const qa = getAvailableQty(a);
  const qb = getAvailableQty(b);
  if (qa !== qb) return qb - qa;

  const na = String(a?.name || "")
    .trim()
    .toLowerCase();
  const nb = String(b?.name || "")
    .trim()
    .toLowerCase();
  if (na !== nb) return na.localeCompare(nb);

  const sa = String(a?.sku || "")
    .trim()
    .toLowerCase();
  const sb = String(b?.sku || "")
    .trim()
    .toLowerCase();
  if (sa !== sb) return sa.localeCompare(sb);

  return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
}

function clampDiscountPercent(value, maxPct) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, Number(maxPct ?? 0) || 0);
}

function clampExtraChargePerUnit(value) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.trunc(n), MAX_EXTRA_CHARGE_PER_UNIT);
}

function hasExtraCharge(item) {
  return (Number(item?.extraChargePerUnit ?? 0) || 0) > 0;
}

function normalizePriceAdjustmentReason(value) {
  const s = String(value ?? "").trim();
  return s.slice(0, 200);
}

function computeLinePreview({
  qty,
  unitPrice,
  discountPercent,
  discountAmount,
  extraChargePerUnit,
}) {
  const q = Math.max(0, Number(qty ?? 0) || 0);
  const officialUnit = Math.max(0, Number(unitPrice ?? 0) || 0);
  const uplift = clampExtraChargePerUnit(extraChargePerUnit);
  const effectiveUnit = officialUnit + uplift;

  const base = effectiveUnit * q;

  const pctRaw = Number(discountPercent ?? 0);
  const pct = Number.isFinite(pctRaw) ? Math.max(0, Math.min(100, pctRaw)) : 0;

  const pctDiscount = Math.round((base * pct) / 100);
  const amtDiscount = Math.max(0, Number(discountAmount ?? 0) || 0);
  const totalDiscount = Math.min(base, pctDiscount + amtDiscount);

  return Math.max(0, base - totalDiscount);
}

function ProductAlertPill({ tone = "neutral", children }) {
  const toneCls =
    tone === "danger"
      ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
        : tone === "success"
          ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
          : "border-[var(--border)] bg-[var(--card)] text-[var(--app-fg)]";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em]",
        toneCls,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function SellableOnlyToggle({ checked, onChange }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-2.5 shadow-sm transition hover:bg-[var(--hover)]">
      <span className="text-sm font-semibold text-[var(--app-fg)]">
        Sellable only
      </span>

      <span
        className={[
          "relative inline-flex h-6 w-11 items-center rounded-full transition",
          checked ? "bg-[var(--success-fg)]" : "bg-[var(--border-strong)]",
        ].join(" ")}
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(Boolean(e.target.checked))}
        />
        <span
          className={[
            "inline-block h-5 w-5 transform rounded-full bg-white shadow transition",
            checked ? "translate-x-5" : "translate-x-1",
          ].join(" ")}
        />
      </span>
    </label>
  );
}

function CartCountBadge({ itemCount, unitCount }) {
  return (
    <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border-strong)] bg-[var(--card)] px-3 py-2 shadow-sm">
      <span className="rounded-full border border-[var(--success-border)] bg-[var(--success-bg)] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-[var(--success-fg)]">
        {itemCount} item{itemCount === 1 ? "" : "s"}
      </span>
      <span className="rounded-full border border-[var(--border)] bg-[var(--card-2)] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-[var(--app-fg)]">
        {unitCount} unit{unitCount === 1 ? "" : "s"}
      </span>
    </div>
  );
}

function ProductReadinessBanner({
  blockedByPrice,
  blockedByStock,
  availableQty,
  tracked,
}) {
  if (!blockedByPrice && !blockedByStock) return null;

  return (
    <div
      className={[
        "mt-4 rounded-2xl border px-4 py-3 text-sm",
        "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]",
      ].join(" ")}
    >
      <div className="font-black">Action blocked</div>

      <div className="mt-1">
        {blockedByPrice && blockedByStock
          ? `This product cannot be added because it has no selling price and is out of stock${tracked ? ` (available: ${availableQty})` : ""}.`
          : blockedByPrice
            ? "This product cannot be added because selling price is not set yet."
            : `This product cannot be added because it is out of stock${tracked ? ` (available: ${availableQty})` : ""}.`}
      </div>
    </div>
  );
}

function ExtraChargeBlock({
  item,
  maxPct,
  lockedSellingPrice,
  updateCart,
  lineTotal,
}) {
  const extraChargePerUnit = clampExtraChargePerUnit(item?.extraChargePerUnit);
  const priceAdjustmentReason = normalizePriceAdjustmentReason(
    item?.priceAdjustmentReason,
  );
  const priceAdjustmentType = hasExtraCharge(item) ? "MANUAL_UPLIFT" : null;
  const effectiveUnitPrice = lockedSellingPrice + extraChargePerUnit;

  const missingReason = extraChargePerUnit > 0 && !priceAdjustmentReason;

  return (
    <div className="mt-4 rounded-3xl border border-[var(--warn-border)] bg-[var(--warn-bg)] p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-black text-[var(--warn-fg)]">
            Seller controlled extra charge
          </div>
          <div className="mt-1 text-sm text-[var(--warn-fg)]/90">
            Use this only when the customer agrees to pay above the official
            system price. The official price stays visible, and the extra amount
            is recorded separately.
          </div>
        </div>

        {extraChargePerUnit > 0 ? (
          <ProductAlertPill tone="warn">Extra charge active</ProductAlertPill>
        ) : (
          <ProductAlertPill>Official price only</ProductAlertPill>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
            Official unit price
          </div>
          <Input
            type="number"
            value={String(lockedSellingPrice)}
            readOnly
            disabled
            className="cursor-not-allowed opacity-80"
          />
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
            Extra charge / unit
          </div>
          <Input
            type="number"
            min="0"
            max={String(MAX_EXTRA_CHARGE_PER_UNIT)}
            value={String(extraChargePerUnit)}
            onChange={(e) =>
              updateCart(item.productId, {
                unitPrice: lockedSellingPrice,
                discountPercent: clampDiscountPercent(
                  item.discountPercent,
                  maxPct,
                ),
                discountAmount: 0,
                extraChargePerUnit: clampExtraChargePerUnit(e.target.value),
                priceAdjustmentType:
                  clampExtraChargePerUnit(e.target.value) > 0
                    ? "MANUAL_UPLIFT"
                    : null,
              })
            }
          />
          <div className="mt-1 text-[11px] app-muted">
            This adds on top of the official system price.
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
            Final unit price
          </div>
          <Input
            type="number"
            value={String(effectiveUnitPrice)}
            readOnly
            disabled
            className="cursor-not-allowed opacity-80"
          />
          <div className="mt-1 text-[11px] app-muted">
            Official + extra charge
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
          Reason for extra charge
        </div>
        <TextArea
          rows={3}
          placeholder="Why is the customer paying above the official system price?"
          value={priceAdjustmentReason}
          onChange={(e) =>
            updateCart(item.productId, {
              unitPrice: lockedSellingPrice,
              discountPercent: clampDiscountPercent(
                item.discountPercent,
                maxPct,
              ),
              discountAmount: 0,
              extraChargePerUnit,
              priceAdjustmentType,
              priceAdjustmentReason: normalizePriceAdjustmentReason(
                e.target.value,
              ),
            })
          }
        />
        <div className="mt-1 text-[11px] app-muted">
          Required when extra charge is greater than zero.
        </div>
      </div>

      {missingReason ? (
        <div className="mt-4 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
          Enter a reason for the extra charge before creating the sale.
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm">
        <div className="text-sm font-semibold app-muted">
          Adjusted line total
        </div>
        <div className="text-lg font-black text-[var(--app-fg)]">
          {money(lineTotal)} RWF
        </div>
      </div>
    </div>
  );
}

export default function SellerCreateSection({
  productsLoading,
  loadProducts,
  prodQ,
  setProdQ,
  filteredProducts,
  addProductToSaleCart,

  customerQ,
  setCustomerQ,
  selectedCustomer,
  customerLoading,
  customerResults,
  setSelectedCustomer,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerTin,
  setCustomerTin,
  customerAddress,
  setCustomerAddress,
  createCustomerBtn,
  createCustomerFromInputs,

  note,
  setNote,

  saleCart,
  cartSubtotal,
  updateCart,
  removeFromCart,
  previewLineTotal,

  createSale,
  createSaleBtn,
}) {
  const [visibleProductCount, setVisibleProductCount] =
    useState(PRODUCT_PAGE_SIZE);
  const [sellableOnly, setSellableOnly] = useState(false);
  const [justAddedProductId, setJustAddedProductId] = useState(null);
  const [justAddedProductName, setJustAddedProductName] = useState("");
  const [highlightedCartProductId, setHighlightedCartProductId] =
    useState(null);

  const cartItemRefs = useRef({});

  const safeFilteredProducts = Array.isArray(filteredProducts)
    ? filteredProducts
    : [];

  const safeSaleCart = Array.isArray(saleCart) ? saleCart : [];

  const prioritizedProducts = useMemo(() => {
    return safeFilteredProducts.slice().sort(compareProductsForSale);
  }, [safeFilteredProducts]);

  const finalProductList = useMemo(() => {
    if (!sellableOnly) return prioritizedProducts;
    return prioritizedProducts.filter(isProductSellable);
  }, [prioritizedProducts, sellableOnly]);

  const sellableCount = useMemo(() => {
    return prioritizedProducts.filter(isProductSellable).length;
  }, [prioritizedProducts]);

  const blockedCount = Math.max(0, prioritizedProducts.length - sellableCount);

  const visibleProducts = useMemo(() => {
    return finalProductList.slice(0, visibleProductCount);
  }, [finalProductList, visibleProductCount]);

  const canLoadMoreProducts = visibleProducts.length < finalProductList.length;

  const cartItemCount = safeSaleCart.length;
  const cartUnitCount = useMemo(() => {
    return safeSaleCart.reduce((sum, it) => {
      const qty = Number(it?.qty ?? 0) || 0;
      return sum + Math.max(0, qty);
    }, 0);
  }, [safeSaleCart]);

  useEffect(() => {
    if (!justAddedProductId) return;
    const t = setTimeout(() => {
      setJustAddedProductId(null);
      setJustAddedProductName("");
    }, ADD_CONFIRM_MS);

    return () => clearTimeout(t);
  }, [justAddedProductId]);

  useEffect(() => {
    if (!justAddedProductId) return;

    const existsInCart = safeSaleCart.some(
      (it) => String(it?.productId ?? "") === String(justAddedProductId),
    );
    if (!existsInCart) return;

    const node = cartItemRefs.current[String(justAddedProductId)];
    if (!node) return;

    try {
      node.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    } catch {}

    setHighlightedCartProductId(justAddedProductId);
  }, [justAddedProductId, safeSaleCart]);

  useEffect(() => {
    if (!highlightedCartProductId) return;
    const t = setTimeout(() => {
      setHighlightedCartProductId(null);
    }, CART_HIGHLIGHT_MS);

    return () => clearTimeout(t);
  }, [highlightedCartProductId]);

  function handleAddProductToSaleCart(product) {
    addProductToSaleCart(product);
    setJustAddedProductId(product?.id ?? null);
    setJustAddedProductName(product?.name || product?.productName || "Product");
  }

  const hasCartValidationError = useMemo(() => {
    return safeSaleCart.some((it) => {
      const tracked = isInventoryTracked(it);
      const availableQty = getAvailableQty(it);
      const enteredQty = Number(it?.qty ?? 0) || 0;
      const exceedsStock = tracked && enteredQty > availableQty;

      const extraChargePerUnit = clampExtraChargePerUnit(
        it?.extraChargePerUnit,
      );
      const reason = normalizePriceAdjustmentReason(it?.priceAdjustmentReason);

      if (enteredQty <= 0) return true;
      if (exceedsStock) return true;
      if (extraChargePerUnit > 0 && !reason) return true;

      return false;
    });
  }, [safeSaleCart]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <SectionCard
        title="Products"
        hint="Choose products for the sale. Sellable products appear first. For a negotiated higher selling price, add the product first, then use the controlled extra charge field inside the cart."
        right={
          <AsyncButton
            variant="secondary"
            size="sm"
            state={productsLoading ? "loading" : "idle"}
            text="Refresh"
            loadingText="Refreshing…"
            successText="Done"
            onClick={loadProducts}
          />
        }
      >
        <div className="grid gap-4">
          <Input
            placeholder="Search by product name or SKU"
            value={prodQ}
            onChange={(e) => {
              setProdQ(e.target.value);
              setVisibleProductCount(PRODUCT_PAGE_SIZE);
            }}
          />

          {justAddedProductId ? (
            <div className="rounded-2xl border border-[var(--success-border)] bg-[var(--success-bg)] px-4 py-3 text-sm text-[var(--success-fg)] shadow-sm">
              Added to cart: <b>{justAddedProductName}</b>
            </div>
          ) : null}

          {!productsLoading && prioritizedProducts.length > 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              <SellableOnlyToggle
                checked={sellableOnly}
                onChange={(checked) => {
                  setSellableOnly(checked);
                  setVisibleProductCount(PRODUCT_PAGE_SIZE);
                }}
              />

              <ProductAlertPill tone="success">
                {sellableCount} sellable
              </ProductAlertPill>

              {!sellableOnly && blockedCount > 0 ? (
                <ProductAlertPill tone="warn">
                  {blockedCount} blocked shown later
                </ProductAlertPill>
              ) : null}

              {sellableOnly ? (
                <ProductAlertPill>Blocked hidden</ProductAlertPill>
              ) : null}
            </div>
          ) : null}

          {productsLoading ? (
            <div className="grid gap-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : finalProductList.length === 0 ? (
            <div className="rounded-3xl border border-[var(--border-strong)] bg-[var(--card-2)] p-5 text-sm app-muted shadow-sm">
              {sellableOnly
                ? "No sellable products found."
                : "No products found."}
            </div>
          ) : (
            <div className="grid gap-3">
              {visibleProducts.map((p) => {
                const selling =
                  Number(p?.sellingPrice ?? p?.selling_price ?? 0) || 0;
                const maxp =
                  Number(
                    p?.maxDiscountPercent ?? p?.max_discount_percent ?? 0,
                  ) || 0;
                const availableQty = getAvailableQty(p);
                const tracked = isInventoryTracked(p);
                const outOfStock = tracked && availableQty <= 0;
                const missingPrice = !hasValidSellingPrice(p);
                const addBlocked = outOfStock || missingPrice;
                const justAdded =
                  String(justAddedProductId ?? "") === String(p?.id ?? "");

                const cardTone = addBlocked
                  ? "border-[var(--danger-border)] bg-[var(--danger-bg)]"
                  : justAdded
                    ? "border-[var(--success-border)] bg-[var(--success-bg)]"
                    : "border-[var(--border-strong)] bg-[var(--card-2)]";

                const statusText = missingPrice
                  ? "Price missing"
                  : tracked
                    ? outOfStock
                      ? "Out of stock"
                      : "Ready"
                    : "Ready";

                return (
                  <div
                    key={String(p?.id)}
                    className={[
                      "rounded-3xl border p-4 shadow-sm",
                      cardTone,
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-base font-black text-[var(--app-fg)]">
                            {p?.name || "—"}
                          </div>

                          {justAdded ? (
                            <ProductAlertPill tone="success">
                              Added
                            </ProductAlertPill>
                          ) : !addBlocked ? (
                            <ProductAlertPill tone="success">
                              Sellable
                            </ProductAlertPill>
                          ) : null}

                          {missingPrice ? (
                            <ProductAlertPill tone="danger">
                              No price
                            </ProductAlertPill>
                          ) : null}

                          {outOfStock ? (
                            <ProductAlertPill tone="danger">
                              Out of stock
                            </ProductAlertPill>
                          ) : null}
                        </div>

                        <div className="mt-1 text-sm app-muted">
                          SKU:{" "}
                          <b className="text-[var(--app-fg)]">
                            {p?.sku || "—"}
                          </b>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
                              Selling price
                            </div>
                            <div
                              className={[
                                "mt-1 text-sm font-black",
                                missingPrice
                                  ? "text-[var(--danger-fg)]"
                                  : "text-[var(--app-fg)]",
                              ].join(" ")}
                            >
                              {missingPrice
                                ? "Not set"
                                : `${money(selling)} RWF`}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
                              Stock available
                            </div>
                            <div
                              className={[
                                "mt-1 text-sm font-black",
                                outOfStock
                                  ? "text-[var(--danger-fg)]"
                                  : "text-[var(--app-fg)]",
                              ].join(" ")}
                            >
                              {tracked ? availableQty : "Not tracked"}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
                              Max discount
                            </div>
                            <div className="mt-1 text-sm font-black text-[var(--app-fg)]">
                              {maxp}%
                            </div>
                          </div>

                          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
                              Status
                            </div>
                            <div
                              className={[
                                "mt-1 text-sm font-black",
                                addBlocked
                                  ? "text-[var(--danger-fg)]"
                                  : justAdded
                                    ? "text-[var(--success-fg)]"
                                    : "text-[var(--success-fg)]",
                              ].join(" ")}
                            >
                              {justAdded ? "Added to cart" : statusText}
                            </div>
                          </div>
                        </div>

                        <ProductReadinessBanner
                          blockedByPrice={missingPrice}
                          blockedByStock={outOfStock}
                          availableQty={availableQty}
                          tracked={tracked}
                        />
                      </div>

                      <button
                        type="button"
                        className={[
                          "app-focus shrink-0 rounded-2xl border px-4 py-2.5 text-sm font-semibold shadow-sm transition",
                          addBlocked
                            ? "cursor-not-allowed border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)] opacity-80"
                            : justAdded
                              ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
                              : "border-[var(--border-strong)] bg-[var(--card)] text-[var(--app-fg)] hover:bg-[var(--hover)]",
                        ].join(" ")}
                        onClick={() => handleAddProductToSaleCart(p)}
                        disabled={addBlocked}
                      >
                        {addBlocked ? "Blocked" : justAdded ? "Added" : "Add"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {canLoadMoreProducts ? (
            <div className="flex justify-center">
              <button
                type="button"
                className="app-focus rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-black text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
                onClick={() =>
                  setVisibleProductCount((prev) => prev + PRODUCT_PAGE_SIZE)
                }
              >
                Load more products
              </button>
            </div>
          ) : null}

          {finalProductList.length > PRODUCT_PAGE_SIZE ? (
            <div className="text-xs app-muted">
              Showing{" "}
              {Math.min(visibleProducts.length, finalProductList.length)} of{" "}
              {finalProductList.length} product
              {finalProductList.length === 1 ? "" : "s"}.
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        title="Create sale"
        hint="Choose products, attach a customer, then create a draft sale for stock release."
      >
        <form onSubmit={createSale} className="grid gap-4">
          <div className="rounded-3xl border border-[var(--border-strong)] bg-[var(--card-2)] p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-black text-[var(--app-fg)]">
                  Customer
                </div>
                <div className="mt-1 text-sm app-muted">
                  Search an existing customer or create a new one before saving
                  the sale.
                </div>
              </div>

              {selectedCustomer?.id ? (
                <span className="app-pill app-success px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em]">
                  Selected
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3">
              <Input
                placeholder="Search customer (name, phone, TIN)"
                value={customerQ}
                onChange={(e) => setCustomerQ(e.target.value)}
              />

              {toStr(customerQ) && !selectedCustomer ? (
                <div className="overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--card)] shadow-sm">
                  <div className="thin-scrollbar max-h-64 overflow-auto">
                    {customerLoading ? (
                      <div className="p-4 text-sm app-muted">Searching…</div>
                    ) : customerResults.length ? (
                      <div className="divide-y divide-[var(--border)]">
                        {customerResults.map((c) => (
                          <div key={c.id} className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-black text-[var(--app-fg)]">
                                  {c.name || "—"}
                                </div>

                                <div className="mt-1 flex flex-wrap gap-2 text-xs app-muted">
                                  <span className="font-semibold text-[var(--app-fg)]">
                                    {c.phone || "—"}
                                  </span>
                                  {c.tin ? (
                                    <span className="app-pill rounded-full border border-[var(--border)] bg-[var(--card-2)] px-2 py-0.5 text-[11px] font-bold text-[var(--app-fg)]">
                                      TIN: {c.tin}
                                    </span>
                                  ) : null}
                                </div>

                                {c.address ? (
                                  <div className="mt-2 text-xs app-muted">
                                    {c.address}
                                  </div>
                                ) : null}
                              </div>

                              <button
                                type="button"
                                className="app-focus shrink-0 rounded-2xl border border-[var(--border-strong)] bg-[var(--card-2)] px-4 py-2 text-sm font-semibold text-[var(--app-fg)] shadow-sm transition hover:bg-[var(--hover)]"
                                onClick={() => {
                                  const name = c?.name ?? c?.customerName ?? "";
                                  const phone =
                                    c?.phone ?? c?.customerPhone ?? "";
                                  const tin =
                                    c?.tin ?? c?.tinNumber ?? c?.taxId ?? "";
                                  const address =
                                    c?.address ??
                                    c?.location ??
                                    c?.customerAddress ??
                                    "";

                                  setSelectedCustomer(c);
                                  setCustomerName(name);
                                  setCustomerPhone(phone);
                                  setCustomerTin(tin);
                                  setCustomerAddress(address);
                                  setCustomerQ(`${name} ${phone}`.trim());
                                }}
                              >
                                Select
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4">
                        <div className="text-sm font-black text-[var(--app-fg)]">
                          No customer found
                        </div>
                        <div className="mt-1 text-xs app-muted">
                          Use the search value to prefill a new customer.
                        </div>

                        <button
                          type="button"
                          className="app-focus mt-3 w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--card-2)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] shadow-sm transition hover:bg-[var(--hover)]"
                          onClick={() => {
                            const q = toStr(customerQ);
                            const digits = q.replace(/\D/g, "");
                            const looksLikePhone = digits.length >= 8;

                            setSelectedCustomer(null);

                            if (looksLikePhone) {
                              setCustomerPhone(digits);
                              if (!toStr(customerName)) setCustomerName("");
                            } else {
                              setCustomerName(q);
                              if (!toStr(customerPhone)) setCustomerPhone("");
                            }

                            setCustomerTin("");
                            setCustomerAddress("");
                          }}
                        >
                          Use search value
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                    Name
                  </div>
                  <Input
                    placeholder="Customer name"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setSelectedCustomer(null);
                    }}
                  />
                </div>

                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                    Phone
                  </div>
                  <Input
                    placeholder="Customer phone"
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value);
                      setSelectedCustomer(null);
                    }}
                  />
                </div>

                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                    TIN
                  </div>
                  <Input
                    placeholder="TIN (optional)"
                    value={customerTin}
                    onChange={(e) => {
                      setCustomerTin(e.target.value);
                      setSelectedCustomer(null);
                    }}
                  />
                </div>

                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                    Address
                  </div>
                  <Input
                    placeholder="Address / location (optional)"
                    value={customerAddress}
                    onChange={(e) => {
                      setCustomerAddress(e.target.value);
                      setSelectedCustomer(null);
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <AsyncButton
                  type="button"
                  variant="primary"
                  state={createCustomerBtn}
                  text="Create customer"
                  loadingText="Creating…"
                  successText="Created"
                  onClick={createCustomerFromInputs}
                  disabled={!toStr(customerName) || !toStr(customerPhone)}
                />

                <button
                  type="button"
                  className="app-focus rounded-2xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] shadow-sm transition hover:bg-[var(--hover)]"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerQ("");
                    setCustomerName("");
                    setCustomerPhone("");
                    setCustomerTin("");
                    setCustomerAddress("");
                  }}
                >
                  Clear
                </button>
              </div>

              {selectedCustomer?.id ? (
                <div className="rounded-2xl border border-[var(--success-border)] bg-[var(--success-bg)] p-3 text-sm text-[var(--success-fg)]">
                  Selected: <b>{selectedCustomer.name}</b> •{" "}
                  {selectedCustomer.phone}
                  {selectedCustomer.tin
                    ? ` • TIN: ${selectedCustomer.tin}`
                    : ""}
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border-strong)] bg-[var(--card-2)] p-4 shadow-sm">
            <div className="text-base font-black text-[var(--app-fg)]">
              Note
            </div>
            <div className="mt-3">
              <TextArea
                rows={3}
                placeholder="Optional note (delivery, special request, internal detail)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border-strong)] bg-[var(--card-2)] p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-base font-black text-[var(--app-fg)]">
                    Cart
                  </div>
                  <CartCountBadge
                    itemCount={cartItemCount}
                    unitCount={cartUnitCount}
                  />
                </div>
                <div className="mt-1 text-sm app-muted">
                  Adjust quantity, discount, and — when necessary — a controlled
                  extra charge per unit before creating the draft.
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-3 text-right shadow-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
                  Subtotal
                </div>
                <div className="text-lg font-black text-[var(--app-fg)]">
                  {money(cartSubtotal)} RWF
                </div>
              </div>
            </div>

            {safeSaleCart.length === 0 ? (
              <div className="mt-4 rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] p-6 text-sm app-muted">
                Cart is empty. Add products from the left panel.
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {safeSaleCart.map((it) => {
                  const maxPct = Number(it.maxDiscountPercent ?? 0) || 0;
                  const availableQty = getAvailableQty(it);
                  const tracked = isInventoryTracked(it);
                  const enteredQty = Number(it.qty ?? 0) || 0;
                  const exceedsStock = tracked && enteredQty > availableQty;
                  const lockedSellingPrice = Number(it.sellingPrice ?? 0) || 0;
                  const safeDiscountPercent = clampDiscountPercent(
                    it.discountPercent,
                    maxPct,
                  );
                  const extraChargePerUnit = clampExtraChargePerUnit(
                    it.extraChargePerUnit,
                  );
                  const isHighlighted =
                    String(highlightedCartProductId ?? "") ===
                    String(it.productId ?? "");

                  const line =
                    typeof previewLineTotal === "function"
                      ? computeLinePreview({
                          ...it,
                          qty: enteredQty,
                          unitPrice: lockedSellingPrice,
                          discountPercent: safeDiscountPercent,
                          discountAmount: 0,
                          extraChargePerUnit,
                        })
                      : computeLinePreview({
                          ...it,
                          qty: enteredQty,
                          unitPrice: lockedSellingPrice,
                          discountPercent: safeDiscountPercent,
                          discountAmount: 0,
                          extraChargePerUnit,
                        });

                  return (
                    <div
                      key={String(it.productId)}
                      ref={(node) => {
                        cartItemRefs.current[String(it.productId)] = node;
                      }}
                      className={[
                        "rounded-3xl border p-4 shadow-sm transition-all duration-300",
                        isHighlighted
                          ? "border-[var(--success-border)] bg-[var(--success-bg)] ring-2 ring-[var(--success-border)]"
                          : "border-[var(--border-strong)] bg-[var(--card)]",
                      ].join(" ")}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-base font-black text-[var(--app-fg)]">
                              {it.productName}
                            </div>
                            {isHighlighted ? (
                              <ProductAlertPill tone="success">
                                Just added
                              </ProductAlertPill>
                            ) : null}
                          </div>

                          <div className="mt-1 text-sm app-muted">
                            SKU:{" "}
                            <b className="text-[var(--app-fg)]">{it.sku}</b> •
                            Official selling:{" "}
                            <b className="text-[var(--app-fg)]">
                              {money(lockedSellingPrice)} RWF
                            </b>
                          </div>
                          <div className="mt-2 text-sm app-muted">
                            Stock available:{" "}
                            <b className="text-[var(--app-fg)]">
                              {tracked ? availableQty : "Not tracked"}
                            </b>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(it.productId)}
                          className="app-focus rounded-2xl border border-[var(--border-strong)] bg-[var(--card-2)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] shadow-sm transition hover:bg-[var(--hover)]"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                            Qty
                          </div>
                          <Input
                            type="number"
                            min="1"
                            max={tracked ? String(availableQty) : undefined}
                            value={String(it.qty)}
                            onChange={(e) =>
                              updateCart(it.productId, {
                                qty: Number(e.target.value || 1),
                                unitPrice: lockedSellingPrice,
                                discountPercent: safeDiscountPercent,
                                discountAmount: 0,
                                extraChargePerUnit,
                              })
                            }
                          />
                          {tracked ? (
                            <div className="mt-1 text-[11px] app-muted">
                              Max allowed: {availableQty}
                            </div>
                          ) : null}
                        </div>

                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                            Official unit price
                          </div>
                          <Input
                            type="number"
                            value={String(lockedSellingPrice)}
                            readOnly
                            disabled
                            className="cursor-not-allowed opacity-80"
                          />
                          <div className="mt-1 text-[11px] app-muted">
                            Fixed by the business.
                          </div>
                        </div>

                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                            Discount %
                          </div>
                          <Input
                            type="number"
                            min="0"
                            max={maxPct}
                            value={String(safeDiscountPercent)}
                            onChange={(e) =>
                              updateCart(it.productId, {
                                discountPercent: clampDiscountPercent(
                                  e.target.value,
                                  maxPct,
                                ),
                                unitPrice: lockedSellingPrice,
                                discountAmount: 0,
                                extraChargePerUnit,
                              })
                            }
                          />
                          <div className="mt-1 text-[11px] app-muted">
                            Max allowed by manager: {maxPct}%
                          </div>
                        </div>
                      </div>

                      {exceedsStock ? (
                        <div className="mt-4 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
                          Entered quantity is higher than stock. Available:{" "}
                          <b>{availableQty}</b>, entered: <b>{enteredQty}</b>.
                        </div>
                      ) : null}

                      <ExtraChargeBlock
                        item={it}
                        maxPct={maxPct}
                        lockedSellingPrice={lockedSellingPrice}
                        updateCart={updateCart}
                        lineTotal={line}
                      />

                      <div className="mt-4 flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-3 shadow-sm">
                        <div className="text-sm font-semibold app-muted">
                          Final line total
                        </div>
                        <div className="text-lg font-black text-[var(--app-fg)]">
                          {money(line)} RWF
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {hasCartValidationError ? (
              <div className="mt-4 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
                Fix the cart before creating the sale. Every extra charge needs
                a reason, quantity must stay valid, and tracked products must
                not exceed stock.
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <AsyncButton
              type="submit"
              variant="primary"
              state={createSaleBtn}
              text="Create draft sale"
              loadingText="Creating…"
              successText="Created"
              disabled={safeSaleCart.length === 0 || hasCartValidationError}
            />
            <div className="text-xs app-muted">
              Store keeper must release stock before the sale can be finalized.
            </div>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
