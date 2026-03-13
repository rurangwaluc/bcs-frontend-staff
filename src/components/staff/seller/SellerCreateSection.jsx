"use client";

import { Input, SectionCard, Skeleton, TextArea } from "./seller-ui";
import { money, toStr } from "./seller-utils";

import AsyncButton from "../../../components/AsyncButton";

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
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <SectionCard
        title="Products"
        hint="Search products quickly and add them to the current draft sale."
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
            onChange={(e) => setProdQ(e.target.value)}
          />

          {productsLoading ? (
            <div className="grid gap-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-3xl border border-[var(--border-strong)] bg-[var(--card-2)] p-5 text-sm app-muted shadow-sm">
              No products found.
            </div>
          ) : (
            <div className="thin-scrollbar grid max-h-[720px] gap-3 overflow-y-auto pr-1">
              {filteredProducts.slice(0, 40).map((p) => {
                const selling =
                  Number(p?.sellingPrice ?? p?.selling_price ?? 0) || 0;
                const maxp =
                  Number(
                    p?.maxDiscountPercent ?? p?.max_discount_percent ?? 0,
                  ) || 0;
                const availableQty = getAvailableQty(p);
                const tracked = isInventoryTracked(p);
                const outOfStock = tracked && availableQty <= 0;

                return (
                  <div
                    key={String(p?.id)}
                    className="rounded-3xl border border-[var(--border-strong)] bg-[var(--card-2)] p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-base font-black text-[var(--app-fg)]">
                          {p?.name || "—"}
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
                            <div className="mt-1 text-sm font-black text-[var(--app-fg)]">
                              {money(selling)} RWF
                            </div>
                          </div>

                          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
                              Stock available
                            </div>
                            <div className="mt-1 text-sm font-black text-[var(--app-fg)]">
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
                            <div className="mt-1 text-sm font-black text-[var(--app-fg)]">
                              {tracked
                                ? outOfStock
                                  ? "Out of stock"
                                  : "Available"
                                : "Available"}
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="app-focus shrink-0 rounded-2xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] shadow-sm transition hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => addProductToSaleCart(p)}
                        disabled={outOfStock}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredProducts.length > 40 ? (
            <div className="text-xs app-muted">
              Showing the first 40 results. Refine your search for faster
              selection.
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        title="Create sale"
        hint="Attach a customer, prepare the cart, then create a draft sale for release."
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
                <div className="text-base font-black text-[var(--app-fg)]">
                  Cart
                </div>
                <div className="mt-1 text-sm app-muted">
                  Adjust quantity, price and discount before creating the draft.
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

            {saleCart.length === 0 ? (
              <div className="mt-4 rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] p-6 text-sm app-muted">
                Cart is empty. Add products from the left panel.
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {saleCart.map((it) => {
                  const line = previewLineTotal(it);
                  const maxPct = Number(it.maxDiscountPercent ?? 0) || 0;
                  const availableQty = getAvailableQty(it);
                  const tracked = isInventoryTracked(it);
                  const enteredQty = Number(it.qty ?? 0) || 0;
                  const exceedsStock = tracked && enteredQty > availableQty;

                  return (
                    <div
                      key={String(it.productId)}
                      className="rounded-3xl border border-[var(--border-strong)] bg-[var(--card)] p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-base font-black text-[var(--app-fg)]">
                            {it.productName}
                          </div>
                          <div className="mt-1 text-sm app-muted">
                            SKU:{" "}
                            <b className="text-[var(--app-fg)]">{it.sku}</b> •
                            Selling:{" "}
                            <b className="text-[var(--app-fg)]">
                              {money(it.sellingPrice)} RWF
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

                      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
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
                            Unit price
                          </div>
                          <Input
                            type="number"
                            min="0"
                            max={it.sellingPrice || undefined}
                            value={String(it.unitPrice)}
                            onChange={(e) =>
                              updateCart(it.productId, {
                                unitPrice: Number(e.target.value || 0),
                              })
                            }
                          />
                          <div className="mt-1 text-[11px] app-muted">
                            Must be ≤ selling price
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
                            value={String(it.discountPercent || 0)}
                            onChange={(e) =>
                              updateCart(it.productId, {
                                discountPercent: Number(e.target.value || 0),
                              })
                            }
                          />
                          <div className="mt-1 text-[11px] app-muted">
                            Max {maxPct}%
                          </div>
                        </div>

                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                            Discount amount
                          </div>
                          <Input
                            type="number"
                            min="0"
                            value={String(it.discountAmount || 0)}
                            onChange={(e) =>
                              updateCart(it.productId, {
                                discountAmount: Number(e.target.value || 0),
                              })
                            }
                          />
                        </div>
                      </div>

                      {exceedsStock ? (
                        <div className="mt-4 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
                          Entered quantity is higher than stock. Available:{" "}
                          <b>{availableQty}</b>, entered: <b>{enteredQty}</b>.
                        </div>
                      ) : null}

                      <div className="mt-4 flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-3 shadow-sm">
                        <div className="text-sm font-semibold app-muted">
                          Line total
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
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <AsyncButton
              type="submit"
              variant="primary"
              state={createSaleBtn}
              text="Create draft sale"
              loadingText="Creating…"
              successText="Created"
              disabled={saleCart.length === 0}
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
