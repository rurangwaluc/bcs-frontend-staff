// frontend-staff/src/app/seller/page.js
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import RoleBar from "../../components/RoleBar";
import { apiFetch } from "../../lib/api";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

/**
 * Backend contract:
 * POST /sales/:id/mark
 * body: { status: "PAID" | "PENDING", paymentMethod?: "CASH"|"MOMO"|"BANK" }
 *
 * UI rules:
 * - DISPLAY "PENDING" as "CREDIT"
 * - SEND "PENDING" to backend
 *
 * Dashboard rules:
 * - "Today's sales/total/credit" = based on createdAt
 * - "Paid by Cash/MoMo/Bank today" = based on updatedAt (when seller marked PAID)
 *   This avoids zeros when sale was created yesterday but paid today.
 */
const ENDPOINTS = {
  PRODUCTS_LIST: "/products",
  SALES_LIST: "/sales",
  SALES_CREATE: "/sales",
  SALE_MARK: (id) => `/sales/${id}/mark`,
};

const MARK_OPTIONS = [
  { value: "PENDING", label: "CREDIT (customer will pay later)" },
  { value: "PAID", label: "PAID (customer has paid)" },
];

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "MOMO", label: "MoMo" },
  { value: "BANK", label: "Bank" },
];

export default function SellerPage() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [msg, setMsg] = useState("");

  const [tab, setTab] = useState("dashboard"); // dashboard | create | sales

  // products
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [prodQ, setProdQ] = useState("");

  // sales list
  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesQ, setSalesQ] = useState("");

  // create sale
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  const [saleCart, setSaleCart] = useState([]);

  // sale-level discount
  const [saleDiscountPercent, setSaleDiscountPercent] = useState("");
  const [saleDiscountAmount, setSaleDiscountAmount] = useState("");

  // per sale chosen pay method (used when marking PAID)
  const [salePayMethod, setSalePayMethod] = useState({}); // { [saleId]: "CASH" }

  // ---------------- ROLE GUARD ----------------
  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        const data = await getMe();
        if (!alive) return;

        const user = data?.user || null;
        setMe(user);

        const role = String(user?.role || "").toLowerCase();

        if (!role) {
          router.replace("/login");
          return;
        }

        if (role !== "seller") {
          const map = {
            store_keeper: "/store-keeper",
            cashier: "/cashier",
            manager: "/manager",
            admin: "/admin",
            owner: "/owner",
          };
          router.replace(map[role] || "/");
        }
      } catch {
        if (!alive) return;
        router.replace("/login");
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [router]);

  const isAuthorized = !!me && String(me.role || "").toLowerCase() === "seller";

  // ---------------- API LOADERS ----------------
  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.PRODUCTS_LIST, { method: "GET" });
      const list = Array.isArray(data?.products)
        ? data.products
        : data?.items || data?.rows || [];
      setProducts(Array.isArray(list) ? list : []);
    } catch (e) {
      setMsg(e?.data?.error || e.message || "Failed to load products");
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const loadSales = useCallback(async () => {
    setSalesLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.SALES_LIST, { method: "GET" });
      setSales(data?.sales || data?.items || data?.rows || []);
    } catch (e) {
      setMsg(e?.data?.error || e.message || "Failed to load sales");
      setSales([]);
    } finally {
      setSalesLoading(false);
    }
  }, []);

  // Load tab data after login
  useEffect(() => {
    if (!isAuthorized) return;

    async function run() {
      await loadProducts();

      if (tab === "dashboard") await loadSales();
      if (tab === "sales") await loadSales();
    }

    run();
  }, [tab, isAuthorized, loadProducts, loadSales]);

  // ---------------- PRODUCTS HELPERS ----------------
  const filteredProducts = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    const qq = String(prodQ || "")
      .trim()
      .toLowerCase();
    if (!qq) return list;

    return list.filter((p) => {
      const name = String(p?.name ?? "").toLowerCase();
      const sku = String(p?.sku ?? "").toLowerCase();
      return name.includes(qq) || sku.includes(qq);
    });
  }, [products, prodQ]);

  function productToCartItem(p) {
    const productId = Number(p?.id);
    const sellingPrice = Number(p?.sellingPrice ?? p?.selling_price ?? 0);
    const maxDiscountPercent = Number(
      p?.maxDiscountPercent ?? p?.max_discount_percent ?? 0,
    );

    const sp = Number.isFinite(sellingPrice) ? sellingPrice : 0;
    const md = Number.isFinite(maxDiscountPercent) ? maxDiscountPercent : 0;

    return {
      productId,
      productName: p?.name || "-",
      sku: p?.sku || "-",
      sellingPrice: sp,
      maxDiscountPercent: md,
      qty: 1,
      unitPrice: sp,
      discountPercent: 0,
      discountAmount: 0,
    };
  }

  function addProductToSaleCart(p) {
    const productId = Number(p?.id);
    if (!productId) return setMsg("Missing product id.");

    if (saleCart.some((x) => Number(x.productId) === productId)) {
      return setMsg("Already added.");
    }

    setSaleCart([...saleCart, productToCartItem(p)]);
    setMsg("✅ Added to sale cart.");
  }

  function updateSaleQty(productId, qtyStr) {
    const qty = Number(qtyStr);
    setSaleCart(
      saleCart.map((it) => {
        if (Number(it.productId) !== Number(productId)) return it;
        const safe = Number.isFinite(qty) ? qty : it.qty;
        const clamped = Math.max(1, Math.floor(safe));
        return { ...it, qty: clamped };
      }),
    );
  }

  function removeFromSaleCart(productId) {
    setSaleCart(
      saleCart.filter((it) => Number(it.productId) !== Number(productId)),
    );
  }

  function updateSaleItem(productId, patch) {
    setSaleCart(
      saleCart.map((it) =>
        Number(it.productId) === Number(productId) ? { ...it, ...patch } : it,
      ),
    );
  }

  function previewLineTotal(it) {
    const qty = Number(it.qty) || 0;
    const unitPrice = Number(it.unitPrice) || 0;
    const base = qty * unitPrice;

    const pct = Math.max(0, Math.min(100, Number(it.discountPercent) || 0));
    const pctDisc = Math.round((base * pct) / 100);

    const amtDisc = Math.max(0, Number(it.discountAmount) || 0);
    const disc = Math.min(base, pctDisc + amtDisc);

    return Math.max(0, base - disc);
  }

  // ---------------- CREATE SALE ----------------
  async function createSale(e) {
    e.preventDefault();
    setMsg("");

    if (saleCart.length === 0) {
      return setMsg("Cart empty. Add items from Products first.");
    }

    const strictMax = saleCart.reduce((min, it) => {
      const v = Number(it.maxDiscountPercent ?? 0);
      return Math.min(min, Number.isFinite(v) ? v : 0);
    }, 100);

    const reqSaleDiscPct = Number(saleDiscountPercent ?? 0);
    const reqSaleDiscAmt = Number(saleDiscountAmount ?? 0);

    if (Number.isFinite(reqSaleDiscPct) && reqSaleDiscPct > strictMax) {
      return setMsg(
        `Sale discount percent exceeds allowed maximum (${strictMax}%)`,
      );
    }

    for (const it of saleCart) {
      const itemPct = Number(it.discountPercent ?? 0);
      const maxPct = Number(it.maxDiscountPercent ?? 0);
      if (Number.isFinite(itemPct) && itemPct > maxPct) {
        return setMsg(
          `Item discount exceeds allowed maximum (${maxPct}%) for ${it.productName}`,
        );
      }

      const unitPrice = Number(it.unitPrice ?? 0);
      const selling = Number(it.sellingPrice ?? 0);
      if (
        Number.isFinite(unitPrice) &&
        Number.isFinite(selling) &&
        unitPrice > selling
      ) {
        return setMsg(
          `Unit price cannot be above selling price for ${it.productName}`,
        );
      }
    }

    const payload = {
      customerName: customerName ? String(customerName).trim() : null,
      customerPhone: customerPhone ? String(customerPhone).trim() : null,
      note: note ? String(note).slice(0, 200) : null,

      discountPercent: reqSaleDiscPct || undefined,
      discountAmount: reqSaleDiscAmt > 0 ? reqSaleDiscAmt : undefined,

      items: saleCart.map((it) => {
        const out = {
          productId: Number(it.productId),
          qty: Number(it.qty),
        };

        if (Number.isFinite(Number(it.unitPrice)))
          out.unitPrice = Number(it.unitPrice);

        if (
          Number.isFinite(Number(it.discountPercent)) &&
          Number(it.discountPercent) > 0
        ) {
          out.discountPercent = Number(it.discountPercent);
        }

        if (
          Number.isFinite(Number(it.discountAmount)) &&
          Number(it.discountAmount) > 0
        ) {
          out.discountAmount = Number(it.discountAmount);
        }

        return out;
      }),
    };

    try {
      const data = await apiFetch(ENDPOINTS.SALES_CREATE, {
        method: "POST",
        body: payload,
      });

      const newSaleId = data?.sale?.id || data?.id || null;

      setMsg(
        newSaleId
          ? `✅ Sale created as DRAFT (ID ${newSaleId})`
          : "✅ Sale created as DRAFT",
      );

      setCustomerName("");
      setCustomerPhone("");
      setNote("");
      setSaleDiscountPercent("");
      setSaleDiscountAmount("");
      setSaleCart([]);

      setTab("sales");
      await loadSales();
    } catch (err) {
      setMsg(err?.data?.error || err.message || "Failed to create sale");
    }
  }

  // ---------------- SALES: MARK ----------------
  async function markSale(saleId, newStatus, paymentMethod) {
    setMsg("");

    try {
      // ✅ Strict body to avoid contract mismatch:
      // - PAID => include paymentMethod
      // - PENDING => DO NOT include paymentMethod
      const upper = String(newStatus || "").toUpperCase();
      const body =
        upper === "PAID"
          ? { status: "PAID", paymentMethod }
          : { status: "PENDING" };

      await apiFetch(ENDPOINTS.SALE_MARK(saleId), {
        method: "POST",
        body,
      });

      const uiLabel = upper === "PENDING" ? "CREDIT" : "PAID";
      const pm = upper === "PAID" ? ` (${paymentMethod || "-"})` : "";
      setMsg(`✅ Sale #${saleId} marked as ${uiLabel}${pm}`);
      await loadSales();
    } catch (err) {
      const debug = err?.data?.debug
        ? ` (${JSON.stringify(err.data.debug)})`
        : "";
      setMsg(
        (err?.data?.error || err.message || "Failed to mark sale") + debug,
      );
    }
  }

  // ---------------- DASHBOARD HELPERS ----------------
  function isSameLocalDay(a, b) {
    const da = new Date(a);
    const db = new Date(b);
    if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
    return (
      da.getFullYear() === db.getFullYear() &&
      da.getMonth() === db.getMonth() &&
      da.getDate() === db.getDate()
    );
  }

  function isToday(dateLike) {
    if (!dateLike) return false;
    const now = new Date();
    return isSameLocalDay(dateLike, now);
  }

  // backend returns either paymentMethod or payment_method
  function getPaymentMethodFromSale(s) {
    const raw = s?.paymentMethod ?? s?.payment_method ?? null;
    return raw ? String(raw).toUpperCase() : null;
  }

  // "Paid-like" statuses (money already received, cashier may still record)
  const paidStatuses = useMemo(
    () => new Set(["AWAITING_PAYMENT_RECORD", "COMPLETED"]),
    [],
  );

  // ---------------- CREATED TODAY (for "Today's sales/total/credit") ----------------
  const salesToday = useMemo(() => {
    const list = Array.isArray(sales) ? sales : [];
    return list.filter((s) => isToday(s?.createdAt || s?.created_at));
  }, [sales]);

  const todaySalesCount = useMemo(() => {
    return salesToday.filter(
      (s) => String(s?.status || "").toUpperCase() !== "CANCELLED",
    ).length;
  }, [salesToday]);

  const todaySalesTotal = useMemo(() => {
    return salesToday.reduce((sum, s) => {
      const st = String(s?.status || "").toUpperCase();
      if (st === "CANCELLED") return sum;
      const v = Number(s?.totalAmount ?? s?.total ?? 0);
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);
  }, [salesToday]);

  const todayCreditTotal = useMemo(() => {
    return salesToday.reduce((sum, s) => {
      const st = String(s?.status || "").toUpperCase();
      if (st !== "PENDING") return sum; // PENDING == CREDIT
      const v = Number(s?.totalAmount ?? s?.total ?? 0);
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);
  }, [salesToday]);

  const todayCreditCount = useMemo(() => {
    return salesToday.filter(
      (s) => String(s?.status || "").toUpperCase() === "PENDING",
    ).length;
  }, [salesToday]);

  // ---------------- PAID TODAY (for breakdown) ----------------
  // Use updatedAt because seller marking PAID updates updatedAt in your backend service.
  const paidLikeToday = useMemo(() => {
    const list = Array.isArray(sales) ? sales : [];
    return list.filter((s) => {
      const st = String(s?.status || "").toUpperCase();
      if (!paidStatuses.has(st)) return false;
      const paidMoment = s?.updatedAt || s?.updated_at || null;
      return isToday(paidMoment);
    });
  }, [sales, paidStatuses]);

  const todayMoneyPaidLike = useMemo(() => {
    return paidLikeToday.reduce((sum, s) => {
      const v = Number(s?.totalAmount ?? s?.total ?? 0);
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);
  }, [paidLikeToday]);

  const todayPaidCash = useMemo(() => {
    return paidLikeToday.reduce((sum, s) => {
      const pm = getPaymentMethodFromSale(s);
      if (pm !== "CASH") return sum;
      const v = Number(s?.totalAmount ?? s?.total ?? 0);
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);
  }, [paidLikeToday]);

  const todayPaidMoMo = useMemo(() => {
    return paidLikeToday.reduce((sum, s) => {
      const pm = getPaymentMethodFromSale(s);
      if (pm !== "MOMO") return sum;
      const v = Number(s?.totalAmount ?? s?.total ?? 0);
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);
  }, [paidLikeToday]);

  const todayPaidBank = useMemo(() => {
    return paidLikeToday.reduce((sum, s) => {
      const pm = getPaymentMethodFromSale(s);
      if (pm !== "BANK") return sum;
      const v = Number(s?.totalAmount ?? s?.total ?? 0);
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);
  }, [paidLikeToday]);

  const todayPaidUnknown = useMemo(() => {
    return paidLikeToday.reduce((sum, s) => {
      const pm = getPaymentMethodFromSale(s);
      if (pm === "CASH" || pm === "MOMO" || pm === "BANK") return sum;
      const v = Number(s?.totalAmount ?? s?.total ?? 0);
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);
  }, [paidLikeToday]);

  // ---------------- FILTERS ----------------
  const filteredSales = useMemo(() => {
    const list = Array.isArray(sales) ? sales : [];
    const qq = String(salesQ || "")
      .trim()
      .toLowerCase();
    if (!qq) return list;

    return list.filter((s) => {
      const id = String(s?.id ?? "");
      const st = String(s?.status ?? "");
      const statusReadable = st.toUpperCase() === "PENDING" ? "CREDIT" : st;

      const name = String(
        s?.customerName ?? s?.customer_name ?? "",
      ).toLowerCase();
      const phone = String(
        s?.customerPhone ?? s?.customer_phone ?? "",
      ).toLowerCase();

      const pm = String(getPaymentMethodFromSale(s) || "").toLowerCase();

      return (
        id.includes(qq) ||
        String(statusReadable).toLowerCase().includes(qq) ||
        name.includes(qq) ||
        phone.includes(qq) ||
        pm.includes(qq)
      );
    });
  }, [sales, salesQ]);

  if (!isAuthorized) {
    return <div className="p-6 text-sm text-gray-600">Redirecting...</div>;
  }

  return (
    <div>
      <RoleBar
        title="Seller"
        subtitle={`User: ${me.email} • Location: ${me.locationId}`}
      />

      <div className="max-w-6xl mx-auto p-6">
        {msg ? (
          <div className="mt-4 text-sm">
            {String(msg).startsWith("✅") ? (
              <div className="p-3 rounded-lg bg-green-50 text-green-800">
                {msg}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-red-50 text-red-700">{msg}</div>
            )}
          </div>
        ) : null}

        <div className="mt-6 flex gap-2 text-sm flex-wrap">
          <TabButton
            active={tab === "dashboard"}
            onClick={() => setTab("dashboard")}
          >
            Dashboard
          </TabButton>

          <TabButton active={tab === "create"} onClick={() => setTab("create")}>
            Create Sale (Draft)
          </TabButton>

          <TabButton active={tab === "sales"} onClick={() => setTab("sales")}>
            My Sales
          </TabButton>
        </div>

        {/* DASHBOARD */}
        {tab === "dashboard" ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="Today's sales"
              value={String(todaySalesCount)}
              hint="Sales created today (not cancelled)"
              loading={salesLoading}
            />

            <StatCard
              title="Today's total"
              value={`${fmtMoney(todaySalesTotal)} RWF`}
              hint="Sum of today’s non-cancelled sales (created today)"
              loading={salesLoading}
            />

            <StatCard
              title="Today's credit"
              value={`${fmtMoney(todayCreditTotal)} RWF`}
              hint={`Credit sales created today: ${todayCreditCount}`}
              loading={salesLoading}
            />

            <StatCard
              title="Money received today"
              value={`${fmtMoney(todayMoneyPaidLike)} RWF`}
              hint="Paid-like sales where updatedAt is today"
              loading={salesLoading}
            />

            {/* Breakdown of money received today */}
            <StatCard
              title="Paid by cash (today)"
              value={`${fmtMoney(todayPaidCash)} RWF`}
              hint="Paid-like sales updated today with method=CASH"
              loading={salesLoading}
            />
            <StatCard
              title="Paid by MoMo (today)"
              value={`${fmtMoney(todayPaidMoMo)} RWF`}
              hint="Paid-like sales updated today with method=MOMO"
              loading={salesLoading}
            />
            <StatCard
              title="Paid by bank (today)"
              value={`${fmtMoney(todayPaidBank)} RWF`}
              hint="Paid-like sales updated today with method=BANK"
              loading={salesLoading}
            />
            <StatCard
              title="Paid (method missing)"
              value={`${fmtMoney(todayPaidUnknown)} RWF`}
              hint="Paid-like sales updated today but paymentMethod is empty"
              loading={salesLoading}
            />

            <div className="md:col-span-4 bg-white rounded-xl shadow p-4 mt-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Quick actions</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Create draft → Store Keeper fulfills → you finalize (Paid or
                    Credit).
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setMsg("");
                    await loadSales();
                    setMsg("✅ Refreshed.");
                  }}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm"
                >
                  Refresh
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTab("create")}
                  className="px-4 py-3 rounded-lg border text-left hover:bg-gray-50"
                >
                  <div className="font-medium">Create sale draft</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Pick products, set discounts, save as DRAFT.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTab("sales")}
                  className="px-4 py-3 rounded-lg border text-left hover:bg-gray-50"
                >
                  <div className="font-medium">Check my sales</div>
                  <div className="text-xs text-gray-500 mt-1">
                    When fulfilled, mark PAID or CREDIT.
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* CREATE SALE */}
        {tab === "create" ? (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">Products</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Add items to draft.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadProducts}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm"
                >
                  Refresh
                </button>
              </div>

              <div className="p-3 border-b">
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Search products by name or sku"
                  value={prodQ}
                  onChange={(e) => setProdQ(e.target.value)}
                />
              </div>

              {productsLoading ? (
                <div className="p-4 text-sm text-gray-600">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left p-3">Product</th>
                        <th className="text-left p-3">SKU</th>
                        <th className="text-right p-3">Selling</th>
                        <th className="text-right p-3">Max %</th>
                        <th className="text-right p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((p, idx) => (
                        <tr key={p?.id || idx} className="border-t">
                          <td className="p-3 font-medium">{p?.name || "-"}</td>
                          <td className="p-3 text-gray-600">{p?.sku || "-"}</td>
                          <td className="p-3 text-right">
                            {fmtMoney(p?.sellingPrice ?? p?.selling_price ?? 0)}
                          </td>
                          <td className="p-3 text-right">
                            {Number(
                              p?.maxDiscountPercent ??
                                p?.max_discount_percent ??
                                0,
                            ) || 0}
                            %
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => addProductToSaleCart(p)}
                              className="px-3 py-1.5 rounded-lg bg-black text-white text-xs"
                            >
                              Add
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-sm text-gray-600">
                            No products.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <div className="font-semibold">Create Sale (Draft)</div>
              <div className="text-xs text-gray-500 mt-1">
                Draft first → Store Keeper fulfills → then you mark Paid/Credit.
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Customer name (optional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Customer phone (optional)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Sale discount % (optional)"
                  value={saleDiscountPercent}
                  onChange={(e) => setSaleDiscountPercent(e.target.value)}
                />
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Sale discount amount (optional)"
                  value={saleDiscountAmount}
                  onChange={(e) => setSaleDiscountAmount(e.target.value)}
                />
              </div>

              <div className="mt-3">
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Note (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div className="mt-4 border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left p-3">Product</th>
                        <th className="text-left p-3">SKU</th>
                        <th className="text-right p-3">Qty</th>
                        <th className="text-right p-3">Selling</th>
                        <th className="text-right p-3">Unit</th>
                        <th className="text-right p-3">Item %</th>
                        <th className="text-right p-3">Item amt</th>
                        <th className="text-right p-3">Line total</th>
                        <th className="text-right p-3">Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saleCart.map((it) => (
                        <tr key={it.productId} className="border-t">
                          <td className="p-3 font-medium">{it.productName}</td>
                          <td className="p-3 text-gray-600">{it.sku}</td>

                          <td className="p-3 text-right">
                            <input
                              type="number"
                              min="1"
                              value={it.qty}
                              onChange={(e) =>
                                updateSaleQty(it.productId, e.target.value)
                              }
                              className="w-20 border rounded-lg px-2 py-1 text-right"
                            />
                          </td>

                          <td className="p-3 text-right">
                            {fmtMoney(it.sellingPrice)}
                          </td>

                          <td className="p-3 text-right">
                            <input
                              type="number"
                              min="0"
                              max={it.sellingPrice || undefined}
                              value={it.unitPrice}
                              onChange={(e) =>
                                updateSaleItem(it.productId, {
                                  unitPrice: Number(e.target.value || 0),
                                })
                              }
                              className="w-24 border rounded-lg px-2 py-1 text-right"
                            />
                          </td>

                          <td className="p-3 text-right">
                            <input
                              type="number"
                              min="0"
                              max={it.maxDiscountPercent ?? 0}
                              value={it.discountPercent}
                              onChange={(e) =>
                                updateSaleItem(it.productId, {
                                  discountPercent: Number(e.target.value || 0),
                                })
                              }
                              className="w-20 border rounded-lg px-2 py-1 text-right"
                            />
                            <div className="text-[10px] text-gray-500 mt-1">
                              max {it.maxDiscountPercent}%
                            </div>
                          </td>

                          <td className="p-3 text-right">
                            <input
                              type="number"
                              min="0"
                              value={it.discountAmount}
                              onChange={(e) =>
                                updateSaleItem(it.productId, {
                                  discountAmount: Number(e.target.value || 0),
                                })
                              }
                              className="w-24 border rounded-lg px-2 py-1 text-right"
                            />
                          </td>

                          <td className="p-3 text-right font-medium">
                            {fmtMoney(previewLineTotal(it))}
                          </td>

                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeFromSaleCart(it.productId)}
                              className="text-xs px-2 py-1 rounded-lg border hover:bg-gray-50"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}

                      {saleCart.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-4 text-sm text-gray-600">
                            Cart is empty. Add products from the left table.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>

              <form onSubmit={createSale} className="mt-4">
                <button
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60"
                  disabled={saleCart.length === 0}
                >
                  Create Draft Sale
                </button>
              </form>
            </div>
          </div>
        ) : null}

        {/* SALES */}
        {tab === "sales" ? (
          <div className="mt-4 bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between gap-3">
              <div className="font-semibold">My sales</div>
              <div className="flex gap-2 items-center">
                <input
                  className="border rounded-lg px-3 py-2 text-sm"
                  placeholder="Search id/status/name/phone (try: credit, momo)"
                  value={salesQ}
                  onChange={(e) => setSalesQ(e.target.value)}
                />
                <button
                  type="button"
                  onClick={loadSales}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm"
                >
                  Refresh
                </button>
              </div>
            </div>

            {salesLoading ? (
              <div className="p-4 text-sm text-gray-600">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left p-3">ID</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Payment</th>
                      <th className="text-right p-3">Total</th>
                      <th className="text-left p-3">Customer</th>
                      <th className="text-left p-3">Created</th>
                      <th className="text-right p-3">Finalize</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((s) => {
                      const st = String(s?.status || "").toUpperCase();

                      const cname =
                        s.customerName ??
                        s.customer_name ??
                        s.customer?.name ??
                        s.customer?.customerName ??
                        null;

                      const cphone =
                        s.customerPhone ??
                        s.customer_phone ??
                        s.customer?.phone ??
                        s.customer?.customerPhone ??
                        null;

                      const total = s.totalAmount ?? s.total ?? 0;

                      const canMark = st === "FULFILLED" || st === "PENDING";
                      const options =
                        st === "FULFILLED"
                          ? MARK_OPTIONS
                          : st === "PENDING"
                            ? [
                                {
                                  value: "PAID",
                                  label: "PAID (customer has paid)",
                                },
                              ]
                            : [];

                      const statusUi = st === "PENDING" ? "CREDIT" : st;

                      // show method if backend returned it
                      const pm = getPaymentMethodFromSale(s);
                      const pmLabel =
                        pm === "CASH"
                          ? "Cash"
                          : pm === "MOMO"
                            ? "MoMo"
                            : pm === "BANK"
                              ? "Bank"
                              : null;

                      const paymentUi =
                        st === "PENDING"
                          ? "Credit"
                          : st === "AWAITING_PAYMENT_RECORD"
                            ? `Paid${pmLabel ? ` (${pmLabel})` : ""} • waiting cashier`
                            : st === "COMPLETED"
                              ? `Paid${pmLabel ? ` (${pmLabel})` : ""} • recorded`
                              : "-";

                      const selectedMethod = salePayMethod[s.id] || "CASH";

                      return (
                        <tr key={s.id} className="border-t hover:bg-gray-50">
                          <td className="p-3 font-medium">{s.id}</td>
                          <td className="p-3">{statusUi}</td>
                          <td className="p-3">{paymentUi}</td>
                          <td className="p-3 text-right">{fmtMoney(total)}</td>

                          <td className="p-3">
                            <div className="font-medium">{cname || "-"}</div>
                            <div className="text-xs text-gray-500">
                              {cphone || ""}
                            </div>
                          </td>

                          <td className="p-3">
                            {fmt(s.createdAt || s.created_at)}
                          </td>

                          <td className="p-3 text-right">
                            {!canMark ? (
                              <StatusHint status={st} />
                            ) : (
                              <>
                                {/* payment method picker (used for PAID) */}
                                <select
                                  value={selectedMethod}
                                  onChange={(e) =>
                                    setSalePayMethod((prev) => ({
                                      ...prev,
                                      [s.id]: e.target.value,
                                    }))
                                  }
                                  className="border rounded px-2 py-1 text-sm mr-2"
                                >
                                  {PAYMENT_METHODS.map((m) => (
                                    <option key={m.value} value={m.value}>
                                      {m.label}
                                    </option>
                                  ))}
                                </select>

                                {/* status picker */}
                                <select
                                  defaultValue=""
                                  onChange={async (e) => {
                                    const newStatus = e.target.value;
                                    if (!newStatus) return;

                                    const pmToSend =
                                      String(newStatus).toUpperCase() === "PAID"
                                        ? selectedMethod
                                        : undefined;

                                    await markSale(s.id, newStatus, pmToSend);
                                    e.target.value = "";
                                  }}
                                  className="border rounded px-2 py-1 text-sm"
                                >
                                  <option value="">
                                    {st === "FULFILLED"
                                      ? "Finalize…"
                                      : "Mark paid…"}
                                  </option>
                                  {options.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>

                                <div className="text-[10px] text-gray-500 mt-1">
                                  {st === "FULFILLED"
                                    ? "Choose Paid or Credit"
                                    : "Mark Paid when customer pays"}
                                </div>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredSales.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-sm text-gray-600">
                          No sales found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatusHint({ status }) {
  if (status === "DRAFT") {
    return (
      <div className="text-xs text-gray-600">
        Waiting for Storekeeper
        <div className="text-[10px] text-gray-500 mt-1">
          Storekeeper must fulfill first
        </div>
      </div>
    );
  }

  if (status === "AWAITING_PAYMENT_RECORD") {
    return (
      <div className="text-xs text-gray-600">
        Paid
        <div className="text-[10px] text-gray-500 mt-1">
          Waiting cashier record
        </div>
      </div>
    );
  }

  if (status === "COMPLETED") {
    return <div className="text-xs text-gray-600">Completed</div>;
  }

  if (status === "CANCELLED") {
    return <div className="text-xs text-red-600">Cancelled</div>;
  }

  return <div className="text-xs text-gray-600">No action</div>;
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-3 py-2 rounded-lg border text-sm " +
        (active
          ? "bg-black text-white border-black"
          : "bg-white text-gray-700 hover:bg-gray-100")
      }
    >
      {children}
    </button>
  );
}

function StatCard({ title, value, hint, loading }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{loading ? "…" : value}</div>
      <div className="mt-2 text-xs text-gray-500">{hint}</div>
    </div>
  );
}

function fmt(v) {
  if (!v) return "-";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

function fmtMoney(n) {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return "0";
  return Math.round(x).toLocaleString();
}
