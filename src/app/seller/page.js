"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import RoleBar from "../../components/RoleBar";
import { apiFetch } from "../../lib/api";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

/**
 * If any endpoint differs, change ONLY here.
 */
const ENDPOINTS = {
  // For showing prices/discount limits to seller
  PRODUCTS_LIST: "/products",

  INVENTORY_LIST: "/inventory",
  HOLDINGS: "/holdings",
  SALES_LIST: "/sales",
  SALES_CREATE: "/sales",
  SALE_MARK: (id) => `/sales/${id}/mark`,

  REQUESTS_LIST: "/requests",
  REQUESTS_CREATE: "/requests",
};

const MARK_OPTIONS = [
  { value: "PENDING", label: "PENDING (customer will pay later)" },
  { value: "PAID", label: "PAID (customer has paid)" },
];

export default function SellerPage() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [msg, setMsg] = useState("");

  const [tab, setTab] = useState("requests"); // requests | holdings | create | sales

  // products (for selling prices + discount limits)
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // inventory (for requests)
  const [inventory, setInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [invQ, setInvQ] = useState("");

  // holdings
  const [holdings, setHoldings] = useState([]);
  const [holdingsLoading, setHoldingsLoading] = useState(false);

  // requests
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestCart, setRequestCart] = useState([]); // [{productId, productName, sku, maxQty, qty}]
  const [reqQ, setReqQ] = useState("");

  // sales list
  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesQ, setSalesQ] = useState("");

  // create sale
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  const [saleCart, setSaleCart] = useState([]);

  // sale-level discount (combined)
  const [saleDiscountPercent, setSaleDiscountPercent] = useState("");
  const [saleDiscountAmount, setSaleDiscountAmount] = useState("");

  // mark sale
  const [markSaleId, setMarkSaleId] = useState("");
  const [markStatus, setMarkStatus] = useState("PENDING");
  const [selectedSale, setSelectedSale] = useState(null);

  // ---------------- ROLE GUARD (HARD) ----------------
  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        const data = await getMe();
        if (!alive) return;

        const user = data?.user || null;
        setMe(user);

        if (!user?.role) {
          router.replace("/login");
          return;
        }

        if (user.role !== "seller") {
          const map = {
            store_keeper: "/store-keeper",
            cashier: "/cashier",
            manager: "/manager",
            admin: "/admin",
          };
          router.replace(map[user.role] || "/");
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

  const isAuthorized = !!me && me.role === "seller";

  // ---------------- API LOADERS (useCallback to avoid hook warnings) ----------------
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

  const loadInventory = useCallback(async () => {
    setInventoryLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.INVENTORY_LIST, { method: "GET" });
      setInventory(data?.inventory || data?.items || data?.rows || []);
    } catch (e) {
      setMsg(e?.data?.error || e.message);
    } finally {
      setInventoryLoading(false);
    }
  }, []);

  const loadHoldings = useCallback(async () => {
    setHoldingsLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.HOLDINGS, { method: "GET" });
      setHoldings(data?.holdings || data?.items || data?.rows || []);
    } catch (e) {
      setMsg(e?.data?.error || e.message);
    } finally {
      setHoldingsLoading(false);
    }
  }, []);

  const loadSales = useCallback(async () => {
    setSalesLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.SALES_LIST, { method: "GET" });
      setSales(data?.sales || data?.items || data?.rows || []);
    } catch (e) {
      setMsg(e?.data?.error || e.message);
    } finally {
      setSalesLoading(false);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.REQUESTS_LIST, { method: "GET" });
      const items =
        data?.requests ??
        data?.items ??
        data?.rows ??
        data?.data ??
        data?.result ??
        [];
      setRequests(Array.isArray(items) ? items : []);
    } catch (e) {
      setMsg(e?.data?.error || e.message || "Failed to load requests");
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  // Load tab data after login
  useEffect(() => {
    if (!isAuthorized) return;

    async function run() {
      // Prices + discount limits are needed in multiple tabs
      await loadProducts();

      if (tab === "requests") {
        await loadInventory();
        await loadRequests();
      }
      if (tab === "holdings" || tab === "create") {
        await loadHoldings();
      }
      if (tab === "sales") {
        await loadSales();
      }
    }

    run();
  }, [
    tab,
    isAuthorized,
    loadProducts,
    loadInventory,
    loadRequests,
    loadHoldings,
    loadSales,
  ]);

  // productId -> product lookup (prices + discount limits)
  const productMap = useMemo(() => {
    const m = new Map();
    (Array.isArray(products) ? products : []).forEach((p) => {
      m.set(Number(p.id), p);
    });
    return m;
  }, [products]);

  // ---------------- REQUEST CART (FROM INVENTORY) ----------------
  function invToReqItem(p) {
    const productId = p?.id ?? p?.productId ?? p?.product_id;
    return {
      productId,
      productName: p?.name || p?.productName || "-",
      sku: p?.sku || "-",
      maxQty: Number(p?.qtyOnHand ?? p?.qty ?? p?.quantity ?? 0),
      qty: 1,
    };
  }

  function addToRequestCartFromInventory(p) {
    const it = invToReqItem(p);
    if (!it.productId) return setMsg("Missing productId in inventory item.");
    if (it.maxQty <= 0) return setMsg("Cannot request: 0 qty on hand.");
    if (requestCart.some((x) => x.productId === it.productId))
      return setMsg("Already added.");
    setRequestCart([...requestCart, it]);
    setMsg("✅ Added to request cart.");
  }

  function updateRequestQty(productId, qtyStr) {
    const qty = Number(qtyStr);
    setRequestCart(
      requestCart.map((it) => {
        if (it.productId !== productId) return it;
        const safeQty = Number.isFinite(qty) ? qty : it.qty;
        const clamped = Math.max(1, Math.min(safeQty, it.maxQty));
        return { ...it, qty: clamped };
      }),
    );
  }

  function removeFromRequestCart(productId) {
    setRequestCart(requestCart.filter((it) => it.productId !== productId));
  }

  async function submitRequest(e) {
    e.preventDefault();
    setMsg("");

    if (requestCart.length === 0) {
      return setMsg("Cart empty.");
    }

    const payload = {
      items: requestCart.map((it) => ({
        productId: Number(it.productId),
        qtyRequested: Number(it.qty), // ✅ correct field
      })),
    };

    console.log("REQUEST PAYLOAD:", payload);

    try {
      await apiFetch(ENDPOINTS.REQUESTS_CREATE, {
        method: "POST",
        headers: { "Content-Type": "application/json" }, // ✅ required
        body: JSON.stringify(payload), // ✅ must stringify
      });

      setMsg("✅ Request submitted successfully.");
      setRequestCart([]);
      await loadRequests();
    } catch (error) {
      console.error("Submit Request error:", error);
      setMsg(error?.data?.error || error.message || "Failed to submit request");
    }
  }

  // ---------------- SALE CART (FROM HOLDINGS) ----------------
  function holdingToItem(h) {
    const productId = h.productId ?? h.product_id ?? h.id;
    const available = Number(h.qtyOnHand ?? 0);

    const prod = productMap.get(Number(productId));
    const sellingPrice = Number(prod?.sellingPrice ?? prod?.selling_price ?? 0);
    const maxDiscountPercent = Number(
      prod?.maxDiscountPercent ?? prod?.max_discount_percent ?? 0,
    );

    return {
      productId,
      productName: h.productName || h.name || "-",
      sku: h.sku || "-",
      sellingPrice,
      maxDiscountPercent,
      maxQty: available,
      qty: 1,

      // optional per-item pricing/discount (combined discount)
      unitPrice: sellingPrice || undefined, // default: product selling price
      discountPercent: 0,
      discountAmount: 0,
    };
  }

  function addToSaleCartFromHolding(h) {
    const it = holdingToItem(h);
    if (!it.productId) return setMsg("Missing productId in holdings item.");
    if (it.maxQty <= 0)
      return setMsg(
        "Cannot sell: 0 qty in holdings. Ask Store Keeper to release.",
      );
    if (saleCart.some((x) => x.productId === it.productId))
      return setMsg("Already added.");
    setSaleCart([...saleCart, { ...it }]);
    setTab("create");
    setMsg("✅ Added to sale cart. Go to Create Sale.");
  }

  function updateSaleQty(productId, qtyStr) {
    const qty = Number(qtyStr);
    setSaleCart(
      saleCart.map((it) => {
        if (it.productId !== productId) return it;
        const safeQty = Number.isFinite(qty) ? qty : it.qty;
        const clamped = Math.max(1, Math.min(safeQty, it.maxQty));
        return { ...it, qty: clamped };
      }),
    );
  }

  function removeFromSaleCart(productId) {
    setSaleCart(saleCart.filter((it) => it.productId !== productId));
  }

  function updateSaleItem(productId, patch) {
    setSaleCart(
      saleCart.map((it) =>
        it.productId === productId ? { ...it, ...patch } : it,
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

  function previewSaleTotal(subtotal) {
    const sub = Number(subtotal) || 0;
    const pct = Math.max(0, Math.min(100, Number(saleDiscountPercent) || 0));
    const pctDisc = Math.round((sub * pct) / 100);
    const amtDisc = Math.max(0, Number(saleDiscountAmount) || 0);
    const disc = Math.min(sub, pctDisc + amtDisc);
    return Math.max(0, sub - disc);
  }

  async function createSale(e) {
    e.preventDefault();
    setMsg("");

    if (saleCart.length === 0)
      return setMsg("Cart empty. Add items from Holdings first.");

    // Client-side guards (backend still enforces these)
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
          `Item discount exceeds allowed maximum (${maxPct}%) for product #${it.productId}`,
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
          productId: it.productId,
          qty: it.qty,
        };

        // Optional overrides/discounts (send only if set)
        if (Number.isFinite(Number(it.unitPrice)))
          out.unitPrice = Number(it.unitPrice);
        if (
          Number.isFinite(Number(it.discountPercent)) &&
          Number(it.discountPercent) > 0
        )
          out.discountPercent = Number(it.discountPercent);
        if (
          Number.isFinite(Number(it.discountAmount)) &&
          Number(it.discountAmount) > 0
        )
          out.discountAmount = Number(it.discountAmount);
        return out;
      }),
    };

    console.log("CREATE SALE PAYLOAD:", payload); // ✅ keep for testing

    try {
      const data = await apiFetch(ENDPOINTS.SALES_CREATE, {
        method: "POST",
        body: payload,
      });

      const newSaleId = data?.sale?.id || data?.id || null;

      setMsg(
        newSaleId ? `✅ Sale created (ID ${newSaleId})` : "✅ Sale created",
      );
      setCustomerName("");
      setCustomerPhone("");
      setNote("");
      setSaleDiscountPercent("");
      setSaleDiscountAmount("");
      setNote("");
      setSaleCart([]);
      setTab("sales");
      await loadSales();
    } catch (e2) {
      setMsg(e2?.data?.error || e2.message);
    }
  }

  async function markSale(e) {
    e.preventDefault();
    setMsg("");

    const id = Number(markSaleId);
    if (!id) return setMsg("Enter a valid Sale ID to mark.");

    try {
      await apiFetch(ENDPOINTS.SALE_MARK(id), {
        method: "POST",
        body: { status: markStatus },
      });

      setMsg(`✅ Sale #${id} marked as ${markStatus}`);
      setMarkSaleId("");
      await loadSales();
    } catch (e2) {
      setMsg(e2?.data?.error || e2.message || "Failed to mark sale");
    }
  }

  // ---------------- FILTERS ----------------
  const filteredRequests = useMemo(() => {
    const list = Array.isArray(requests) ? requests : [];
    const qq = String(reqQ || "")
      .trim()
      .toLowerCase();
    if (!qq) return list;
    return list.filter((r) => {
      const id = String(r?.id ?? "");
      const status = String(r?.status ?? "").toLowerCase();
      return id.includes(qq) || status.includes(qq);
    });
  }, [requests, reqQ]);

  const filteredInventory = useMemo(() => {
    const list = Array.isArray(inventory) ? inventory : [];
    const qq = String(invQ || "")
      .trim()
      .toLowerCase();
    if (!qq) return list;
    return list.filter((p) => {
      const name = String(p?.name ?? p?.productName ?? "").toLowerCase();
      const sku = String(p?.sku ?? "").toLowerCase();
      return name.includes(qq) || sku.includes(qq);
    });
  }, [inventory, invQ]);

  const filteredSales = useMemo(() => {
    const list = Array.isArray(sales) ? sales : [];
    const qq = String(salesQ || "")
      .trim()
      .toLowerCase();
    if (!qq) return list;
    return list.filter((s) => {
      const id = String(s?.id ?? "");
      const status = String(s?.status ?? "").toLowerCase();
      const name = String(s?.customerName ?? "").toLowerCase();
      const phone = String(s?.customerPhone ?? "").toLowerCase();
      return (
        id.includes(qq) ||
        status.includes(qq) ||
        name.includes(qq) ||
        phone.includes(qq)
      );
    });
  }, [sales, salesQ]);

  // HARD STOP RENDER if not seller (prevents the warning)
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
            {msg.startsWith("✅") ? (
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
            active={tab === "requests"}
            onClick={() => setTab("requests")}
          >
            Requests
          </TabButton>
          <TabButton
            active={tab === "holdings"}
            onClick={() => setTab("holdings")}
          >
            Holdings
          </TabButton>
          <TabButton active={tab === "create"} onClick={() => setTab("create")}>
            Create Sale
          </TabButton>
          <TabButton active={tab === "sales"} onClick={() => setTab("sales")}>
            My Sales
          </TabButton>
        </div>

        {/* REQUESTS */}
        {tab === "requests" ? (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">
                    Inventory (pick items to request)
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Request → Store Keeper approves & releases → appears in your
                    holdings.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadInventory}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm"
                >
                  Refresh
                </button>
              </div>

              <div className="p-3 border-b">
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Search inventory by name or sku"
                  value={invQ}
                  onChange={(e) => setInvQ(e.target.value)}
                />
              </div>

              {inventoryLoading ? (
                <div className="p-4 text-sm text-gray-600">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left p-3">Product</th>
                        <th className="text-left p-3">SKU</th>
                        <th className="text-right p-3">On hand</th>
                        <th className="text-right p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventory.map((p, idx) => (
                        <tr key={p?.id || idx} className="border-t">
                          <td className="p-3 font-medium">
                            {p?.name || p?.productName || "-"}
                          </td>
                          <td className="p-3 text-gray-600">{p?.sku || "-"}</td>
                          <td className="p-3 text-right">
                            {p.qtyOnHand ?? p.qty ?? p.quantity ?? 0}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => addToRequestCartFromInventory(p)}
                              className="px-3 py-1.5 rounded-lg bg-black text-white text-xs"
                            >
                              Add
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredInventory.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-sm text-gray-600">
                            No inventory items.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <div className="font-semibold">Request Cart</div>

              <div className="mt-3 border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left p-3">Product</th>
                      <th className="text-left p-3">SKU</th>
                      <th className="text-right p-3">Max</th>
                      <th className="text-right p-3">Qty</th>
                      <th className="text-right p-3">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requestCart.map((it) => (
                      <tr key={it.productId} className="border-t">
                        <td className="p-3 font-medium">{it.productName}</td>
                        <td className="p-3 text-gray-600">{it.sku}</td>
                        <td className="p-3 text-right">{it.maxQty}</td>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            min="1"
                            max={it.maxQty || undefined}
                            value={it.qty}
                            onChange={(e) =>
                              updateRequestQty(it.productId, e.target.value)
                            }
                            className="w-20 border rounded-lg px-2 py-1 text-right"
                          />
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeFromRequestCart(it.productId)}
                            className="text-xs px-2 py-1 rounded-lg border hover:bg-gray-50"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {requestCart.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-sm text-gray-600">
                          Cart empty. Add items from inventory.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <form onSubmit={submitRequest} className="mt-3">
                <button
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60"
                  disabled={requestCart.length === 0}
                >
                  Submit Request
                </button>
              </form>

              <div className="mt-6 border-t pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">My requests</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Track request statuses.
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      className="border rounded-lg px-3 py-2 text-sm"
                      placeholder="Search (id/status)"
                      value={reqQ}
                      onChange={(e) => setReqQ(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={loadRequests}
                      className="px-4 py-2 rounded-lg bg-black text-white text-sm"
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                {requestsLoading ? (
                  <div className="p-4 text-sm text-gray-600">Loading...</div>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="text-left p-3">ID</th>
                          <th className="text-left p-3">Status</th>
                          <th className="text-left p-3">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRequests.map((r) => (
                          <tr key={r.id} className="border-t">
                            <td className="p-3 font-medium">{r.id}</td>
                            <td className="p-3">{r.status}</td>
                            <td className="p-3">{fmt(r.createdAt)}</td>
                          </tr>
                        ))}
                        {filteredRequests.length === 0 ? (
                          <tr>
                            <td
                              colSpan={3}
                              className="p-4 text-sm text-gray-600"
                            >
                              No requests found.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* HOLDINGS */}
        {tab === "holdings" ? (
          <div className="mt-4 bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <div className="font-semibold">My holdings</div>
                <div className="text-xs text-gray-500 mt-1">
                  After Store Keeper releases approved requests, qty increases
                  here.
                </div>
              </div>
              <button
                type="button"
                onClick={loadHoldings}
                className="px-4 py-2 rounded-lg bg-black text-white text-sm"
              >
                Refresh
              </button>
            </div>

            {holdingsLoading ? (
              <div className="p-4 text-sm text-gray-600">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left p-3">Product</th>
                      <th className="text-left p-3">SKU</th>
                      <th className="text-right p-3">Qty</th>
                      <th className="text-left p-3">Updated</th>
                      <th className="text-right p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((h, idx) => {
                      const qty = Number(h?.qtyOnHand ?? 0);

                      const disabled = qty <= 0;

                      return (
                        <tr
                          key={h?.id || `${h?.productId}-${idx}`}
                          className="border-t"
                        >
                          <td className="p-3 font-medium">
                            {h?.productName || h?.name || "-"}
                          </td>
                          <td className="p-3 text-gray-600">{h?.sku || "-"}</td>
                          <td className="p-3 text-right">{qty}</td>
                          <td className="p-3">
                            {fmt(h?.updatedAt || h?.createdAt)}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => addToSaleCartFromHolding(h)}
                              className={
                                "px-3 py-1.5 rounded-lg text-xs " +
                                (disabled
                                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                  : "bg-black text-white")
                              }
                            >
                              Add to Sale
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {holdings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-sm text-gray-600">
                          No holdings yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {/* CREATE */}
        {tab === "create" ? (
          <div className="mt-4 bg-white rounded-xl shadow p-4">
            <div className="font-semibold">Create Sale</div>
            <div className="text-xs text-gray-500 mt-1">
              If cart empty: go Holdings → Add to Sale.
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
              <div className="text-xs text-gray-500 mt-2">
                Discount rule: your total discount must not exceed the product
                max. If you request more, backend will reject.
              </div>
            </div>

            <div className="mt-4 border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left p-3">Product</th>
                      <th className="text-left p-3">SKU</th>
                      <th className="text-right p-3">Max</th>
                      <th className="text-right p-3">Qty</th>
                      <th className="text-right p-3">Selling</th>
                      <th className="text-right p-3">Unit price</th>
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
                        <td className="p-3 text-right">{it.maxQty}</td>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            min="1"
                            max={it.maxQty || undefined}
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
                        <td colSpan={10} className="p-4 text-sm text-gray-600">
                          Cart is empty.
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
                Create Sale
              </button>
            </form>

            {/* <div className="mt-6 border-t pt-4">
              <div className="font-semibold">
                Mark Sale
                {selectedSale && (
                  <span className="ml-2 text-sm text-gray-500">
                    (Sale #{selectedSale.id})
                  </span>
                )}
              </div>

              <form onSubmit={markSale} className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-sm font-medium">Sale ID</label>
                  <input className="mt-1 w-full border rounded-lg px-3 py-2" placeholder="e.g. 12" value={markSaleId} onChange={(e) => setMarkSaleId(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium">New status</label>
                  <select className="mt-1 w-full border rounded-lg px-3 py-2" value={markStatus} onChange={(e) => setMarkStatus(e.target.value)}>
                    {MARK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <button
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-50"
                  disabled={!markSaleId}
                >
                  Mark
                </button>

              </form>
            </div> */}
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
                  placeholder="Search id/status/name/phone"
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
                      <th className="text-right p-3">Total</th>
                      <th className="text-left p-3">Customer</th>
                      <th className="text-left p-3">Created</th>
                      <th className="text-right p-3">Mark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((s) => {
                      // console.log("SALE ROW:", s);

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

                      return (
                        <tr
                          key={s.id}
                          onClick={() => {
                            setSelectedSale(s);
                            setMarkSaleId(String(s.id));
                            setMarkStatus(s.status);
                            setTab("create");
                          }}
                          className="border-t cursor-pointer hover:bg-gray-50"
                        >
                          <td className="p-3 font-medium">{s.id}</td>
                          <td className="p-3">{s.status}</td>
                          <td className="p-3 text-right">
                            {s.totalAmount ?? s.total ?? "-"}
                          </td>

                          <td className="p-3">
                            <div className="font-medium">{cname || "-"}</div>
                            <div className="text-xs text-gray-500">
                              {cphone || ""}
                            </div>
                          </td>

                          <td className="p-3">{fmt(s.createdAt)}</td>
                          <td className="p-3 text-right">
                            <select
                              value={s.status}
                              onClick={(e) => e.stopPropagation()} // ✅ IMPORTANT
                              onChange={async (e) => {
                                e.stopPropagation(); // ✅ IMPORTANT

                                const newStatus = e.target.value;
                                try {
                                  await apiFetch(ENDPOINTS.SALE_MARK(s.id), {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({ status: newStatus }),
                                  });
                                  setMsg(
                                    `✅ Sale #${s.id} marked as ${newStatus}`,
                                  );
                                  await loadSales();
                                } catch (err) {
                                  setMsg(err?.data?.error || err.message);
                                }
                              }}
                              className="border rounded px-2 py-1 text-sm"
                            >
                              {MARK_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredSales.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-sm text-gray-600">
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
  // RWF formatting (no cents)
  return Math.round(x).toLocaleString();
}
