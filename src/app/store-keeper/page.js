"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import RoleBar from "../../components/RoleBar";
import { apiFetch } from "../../lib/api";
import { apiUpload } from "../../lib/apiUpload";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

/**
 * ✅ LOCKED BACKEND ENDPOINTS (only change here)
 *
 * Option B (NEW):
 * - Seller creates sale as DRAFT (POST /sales)
 * - Storekeeper fulfills sale (POST /sales/:id/fulfill)  ✅ must exist in backend
 * - Seller later finalizes (mark PAID/PENDING)
 */
const ENDPOINTS = {
  PRODUCTS_LIST: "/products",
  PRODUCT_CREATE: "/products",
  INVENTORY_LIST: "/inventory",

  INVENTORY_ARRIVALS_CREATE: "/inventory/arrivals",

  INV_ADJ_REQ_CREATE: "/inventory-adjust-requests",
  INV_ADJ_REQ_MINE: "/inventory-adjust-requests/mine",

  // ✅ Option B: sales
  SALES_LIST: "/sales",
  SALE_GET: (id) => `/sales/${id}`,
  SALE_FULFILL: (id) => `/sales/${id}/fulfill`, // ✅ backend must implement
};

export default function StoreKeeperPage() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [msg, setMsg] = useState("");

  const [tab, setTab] = useState("inventory"); // inventory | arrivals | adjustments | sales

  // Products + inventory
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const [inventory, setInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [q, setQ] = useState("");

  // Create product (NO prices in Phase 1 for storekeeper)
  const [pName, setPName] = useState("");
  const [pSku, setPSku] = useState("");
  const [pUnit, setPUnit] = useState("pcs");
  const [pNotes, setPNotes] = useState("");

  // Arrivals form
  const [arrProductId, setArrProductId] = useState("");
  const [arrQty, setArrQty] = useState("");
  const [arrNotes, setArrNotes] = useState("");
  const [arrFiles, setArrFiles] = useState([]);
  const [arrSubmitting, setArrSubmitting] = useState(false);

  // Adjustment request form + list
  const [adjProductId, setAdjProductId] = useState("");
  const [adjQtyChange, setAdjQtyChange] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [adjLoading, setAdjLoading] = useState(false);
  const [myAdjRequests, setMyAdjRequests] = useState([]);
  const [myAdjLoading, setMyAdjLoading] = useState(false);

  // ✅ Option B: Draft sales for fulfillment
  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesQ, setSalesQ] = useState("");
  const [salesStatusFilter, setSalesStatusFilter] = useState("DRAFT"); // default: incoming work
  const [saleActionLoadingId, setSaleActionLoadingId] = useState(null);

  const [viewSale, setViewSale] = useState(null);
  const [viewSaleLoading, setViewSaleLoading] = useState(false);

  // ---------------- ROLE GUARD ----------------
  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        const data = await getMe();
        if (!alive) return;

        const user = data?.user || null;
        setMe(user);

        if (!user?.role) return router.replace("/login");

        if (user.role !== "store_keeper") {
          const map = {
            cashier: "/cashier",
            seller: "/seller",
            manager: "/manager",
            admin: "/admin",
            owner: "/owner",
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

  const isAuthorized = !!me && me.role === "store_keeper";

  // ---------------- LOADERS ----------------
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
      const list = Array.isArray(data?.inventory)
        ? data.inventory
        : data?.items || data?.rows || [];
      setInventory(Array.isArray(list) ? list : []);
    } catch (e) {
      setMsg(e?.data?.error || e.message || "Failed to load inventory");
      setInventory([]);
    } finally {
      setInventoryLoading(false);
    }
  }, []);

  const loadMyAdjustRequests = useCallback(async () => {
    setMyAdjLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.INV_ADJ_REQ_MINE, {
        method: "GET",
      });
      const list = Array.isArray(data?.requests)
        ? data.requests
        : data?.items || data?.rows || [];
      setMyAdjRequests(Array.isArray(list) ? list : []);
    } catch (e) {
      const err =
        e?.data?.error || e.message || "Failed to load adjustment requests";
      setMsg(err);
      setMyAdjRequests([]);
    } finally {
      setMyAdjLoading(false);
    }
  }, []);

  const loadSales = useCallback(async () => {
    setSalesLoading(true);
    setMsg("");
    try {
      // We filter by status via query if your backend supports it; if not, we still filter client-side.
      const qs =
        salesStatusFilter && salesStatusFilter !== "ALL"
          ? `?status=${encodeURIComponent(salesStatusFilter)}`
          : "";
      const data = await apiFetch(`${ENDPOINTS.SALES_LIST}${qs}`, {
        method: "GET",
      });

      const list = Array.isArray(data?.sales)
        ? data.sales
        : data?.items || data?.rows || [];
      setSales(Array.isArray(list) ? list : []);
    } catch (e) {
      setMsg(e?.data?.error || e.message || "Failed to load sales");
      setSales([]);
    } finally {
      setSalesLoading(false);
    }
  }, [salesStatusFilter]);

  async function openSaleDetails(saleId) {
    const id = Number(saleId);
    if (!id) return;

    setViewSaleLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.SALE_GET(id), { method: "GET" });
      setViewSale(data?.sale || null);
    } catch (e) {
      setMsg(e?.data?.error || e.message || "Failed to load sale details");
      setViewSale(null);
    } finally {
      setViewSaleLoading(false);
    }
  }

  // Load base data after login + on tab switch
  useEffect(() => {
    if (!isAuthorized) return;

    loadProducts();
    loadInventory();

    if (tab === "adjustments") loadMyAdjustRequests();
    if (tab === "sales") loadSales();
  }, [
    isAuthorized,
    tab,
    loadProducts,
    loadInventory,
    loadMyAdjustRequests,
    loadSales,
  ]);

  // ---------------- KPIs ----------------
  const filteredInventory = useMemo(() => {
    const qq = String(q || "")
      .trim()
      .toLowerCase();
    if (!qq) return Array.isArray(inventory) ? inventory : [];
    return (Array.isArray(inventory) ? inventory : []).filter((x) => {
      const id = String(x.id || "");
      const name = String(x.name || "").toLowerCase();
      const sku = String(x.sku || "").toLowerCase();
      return id.includes(qq) || name.includes(qq) || sku.includes(qq);
    });
  }, [inventory, q]);

  const totalQty = useMemo(() => {
    return (Array.isArray(inventory) ? inventory : []).reduce(
      (sum, r) => sum + Number(r.qtyOnHand ?? r.qty_on_hand ?? 0),
      0,
    );
  }, [inventory]);

  const pendingAdjRequests = useMemo(() => {
    return (Array.isArray(myAdjRequests) ? myAdjRequests : []).filter(
      (r) => String(r.status || "").toUpperCase() === "PENDING",
    ).length;
  }, [myAdjRequests]);

  const draftSalesCount = useMemo(() => {
    return (Array.isArray(sales) ? sales : []).filter(
      (s) => String(s.status || "").toUpperCase() === "DRAFT",
    ).length;
  }, [sales]);

  // ---------------- SALES FILTERS ----------------
  const filteredSales = useMemo(() => {
    const list = Array.isArray(sales) ? sales : [];
    const qq = String(salesQ || "")
      .trim()
      .toLowerCase();
    if (!qq) return list;

    return list.filter((s) => {
      const id = String(s?.id ?? "").toLowerCase();
      const status = String(s?.status ?? "").toLowerCase();
      const sellerId = String(s?.sellerId ?? s?.seller_id ?? "").toLowerCase();
      const customerName = String(s?.customerName ?? "").toLowerCase();
      const customerPhone = String(s?.customerPhone ?? "").toLowerCase();
      return (
        id.includes(qq) ||
        status.includes(qq) ||
        sellerId.includes(qq) ||
        customerName.includes(qq) ||
        customerPhone.includes(qq)
      );
    });
  }, [sales, salesQ]);

  // ---------------- ACTIONS ----------------
  async function createProduct(e) {
    e.preventDefault();
    setMsg("");

    if (!pName.trim()) return setMsg("Enter product name.");

    try {
      const payload = {
        name: pName.trim(),
        sku: pSku.trim() || undefined,
        unit: pUnit.trim() || "pcs",
        notes: pNotes.trim() || undefined,
        sellingPrice: 0,
        costPrice: 0,
      };

      const data = await apiFetch(ENDPOINTS.PRODUCT_CREATE, {
        method: "POST",
        body: payload,
      });

      setMsg("✅ Product created");
      setPName("");
      setPSku("");
      setPUnit("pcs");
      setPNotes("");

      await loadProducts();
      await loadInventory();

      const createdId = data?.product?.id;
      if (createdId) setArrProductId(String(createdId));
    } catch (e2) {
      setMsg(e2?.data?.error || e2.message || "Create product failed");
    }
  }

  async function createArrival(e) {
    e.preventDefault();
    setMsg("");

    const pid = Number(arrProductId);
    const qty = Number(arrQty);

    if (!pid) return setMsg("Select a product.");
    if (!Number.isFinite(qty) || qty <= 0) return setMsg("Enter a valid qty.");

    setArrSubmitting(true);

    try {
      let documentUrls = [];

      if (arrFiles.length > 0) {
        const up = await apiUpload(arrFiles);
        documentUrls = up.urls || [];
      }

      await apiFetch(ENDPOINTS.INVENTORY_ARRIVALS_CREATE, {
        method: "POST",
        body: {
          productId: pid,
          qtyReceived: qty,
          notes: arrNotes ? String(arrNotes).slice(0, 200) : undefined,
          documentUrls,
        },
      });

      setMsg("✅ Stock arrival recorded");
      setArrQty("");
      setArrNotes("");
      setArrFiles([]);

      await loadInventory();
    } catch (e2) {
      setMsg(e2?.data?.error || e2.message || "Failed to record arrival");
    } finally {
      setArrSubmitting(false);
    }
  }

  async function createAdjustRequest(e) {
    e.preventDefault();
    setMsg("");

    const pid = Number(adjProductId);
    const qtyChange = Number(adjQtyChange);

    if (!pid) return setMsg("Select a product.");
    if (!Number.isFinite(qtyChange) || qtyChange === 0)
      return setMsg("qtyChange must be a non-zero number (e.g. -3 or 5).");
    if (!String(adjReason || "").trim()) return setMsg("Enter a reason.");

    setAdjLoading(true);
    try {
      await apiFetch(ENDPOINTS.INV_ADJ_REQ_CREATE, {
        method: "POST",
        body: {
          productId: pid,
          qtyChange,
          reason: String(adjReason).slice(0, 200),
        },
      });

      setMsg("✅ Adjustment request created (waiting for manager approval)");
      setAdjProductId("");
      setAdjQtyChange("");
      setAdjReason("");

      await loadMyAdjustRequests();
    } catch (e2) {
      setMsg(e2?.data?.error || e2.message || "Failed to create request");
    } finally {
      setAdjLoading(false);
    }
  }

  async function fulfillSale(saleId) {
    const id = Number(saleId);
    if (!id) return setMsg("Invalid sale id.");

    setMsg("");
    setSaleActionLoadingId(id);

    try {
      await apiFetch(ENDPOINTS.SALE_FULFILL(id), {
        method: "POST",
        body: {}, // safe
      });

      setMsg(`✅ Sale #${id} fulfilled`);
      await loadSales();
      await loadInventory();

      // refresh modal if open
      if (viewSale?.id === id) {
        await openSaleDetails(id);
      }
    } catch (e) {
      setMsg(e?.data?.error || e.message || "Fulfill failed");
    } finally {
      setSaleActionLoadingId(null);
    }
  }

  if (!isAuthorized) {
    return <div className="p-6 text-sm text-gray-600">Redirecting...</div>;
  }

  return (
    <div>
      <RoleBar
        title="Store Keeper"
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

        {/* KPI cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card
            label="Products"
            value={productsLoading ? "…" : String(products.length)}
            sub="Catalog items"
          />
          <Card
            label="Total qty on hand"
            value={inventoryLoading ? "…" : String(totalQty)}
            sub="Warehouse stock"
          />
          <Card
            label="Draft sales"
            value={salesLoading ? "…" : String(draftSalesCount)}
            sub="Need fulfillment"
          />
          <Card
            label="Pending adjustment requests"
            value={myAdjLoading ? "…" : String(pendingAdjRequests)}
            sub="Waiting approval"
          />
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-2 text-sm flex-wrap">
          <TabButton
            active={tab === "inventory"}
            onClick={() => setTab("inventory")}
          >
            Inventory
          </TabButton>
          <TabButton
            active={tab === "arrivals"}
            onClick={() => setTab("arrivals")}
          >
            Stock arrivals
          </TabButton>
          <TabButton
            active={tab === "adjustments"}
            onClick={() => setTab("adjustments")}
          >
            Adjustment requests
          </TabButton>
          <TabButton active={tab === "sales"} onClick={() => setTab("sales")}>
            Sales fulfillment
          </TabButton>
        </div>

        {/* INVENTORY TAB */}
        {tab === "inventory" ? (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Products create */}
            <div className="bg-white rounded-xl shadow p-4">
              <div className="font-semibold">Create product (no prices)</div>
              <div className="text-xs text-gray-500 mt-1">
                Phase 1 rule: storekeeper creates item info only. Manager sets
                prices later.
              </div>

              <form onSubmit={createProduct} className="mt-4 grid gap-3">
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Name"
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                />
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="SKU (optional)"
                  value={pSku}
                  onChange={(e) => setPSku(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="border rounded-lg px-3 py-2"
                    placeholder="Unit (e.g. pcs, kg)"
                    value={pUnit}
                    onChange={(e) => setPUnit(e.target.value)}
                  />
                  <button className="px-4 py-2 rounded-lg bg-black text-white text-sm">
                    Create
                  </button>
                </div>
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Notes (optional)"
                  value={pNotes}
                  onChange={(e) => setPNotes(e.target.value)}
                />
              </form>

              <div className="mt-4 text-xs text-gray-500">
                After creating a product, go to <b>Stock arrivals</b> to add
                qty.
              </div>
            </div>

            {/* Inventory list */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">Inventory (qty only)</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Storekeeper does not see prices.
                  </div>
                </div>
                <button
                  onClick={loadInventory}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm"
                >
                  Refresh
                </button>
              </div>

              <div className="p-3 border-b">
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Search id/name/sku"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>

              {inventoryLoading ? (
                <div className="p-4 text-sm text-gray-600">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left p-3">ID</th>
                        <th className="text-left p-3">Name</th>
                        <th className="text-left p-3">SKU</th>
                        <th className="text-right p-3">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventory.map((p) => (
                        <tr key={p.id} className="border-t">
                          <td className="p-3 font-medium">{p.id}</td>
                          <td className="p-3">{p.name}</td>
                          <td className="p-3">{p.sku || "-"}</td>
                          <td className="p-3 text-right">{p.qtyOnHand ?? 0}</td>
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
          </div>
        ) : null}

        {/* ARRIVALS TAB */}
        {tab === "arrivals" ? (
          <div className="mt-4 bg-white rounded-xl shadow p-4">
            <div className="font-semibold">Record stock arrival</div>
            <div className="text-xs text-gray-500 mt-1">
              Adds qty to warehouse inventory and stores document URLs.
            </div>

            <form
              onSubmit={createArrival}
              className="mt-4 grid grid-cols-1 gap-3 max-w-xl"
            >
              <select
                className="border rounded-lg px-3 py-2"
                value={arrProductId}
                onChange={(e) => setArrProductId(e.target.value)}
              >
                <option value="">Select product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.id} • {p.name} {p.sku ? `(${p.sku})` : ""}
                  </option>
                ))}
              </select>

              <input
                className="border rounded-lg px-3 py-2"
                placeholder="Qty received"
                value={arrQty}
                onChange={(e) => setArrQty(e.target.value)}
              />
              <input
                className="border rounded-lg px-3 py-2"
                placeholder="Notes (optional)"
                value={arrNotes}
                onChange={(e) => setArrNotes(e.target.value)}
              />

              <div className="border rounded-lg p-3">
                <label className="block text-sm font-medium mb-2">
                  Attach documents (PDF/images)
                </label>

                <input
                  id="arrival-files"
                  type="file"
                  multiple
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setArrFiles(files);
                  }}
                />

                <label
                  htmlFor="arrival-files"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white text-sm cursor-pointer hover:bg-gray-800 transition"
                >
                  📎 Choose files
                </label>

                {arrFiles.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-sm">
                    {arrFiles.map((file, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between bg-gray-50 border rounded-md px-3 py-1"
                      >
                        <span className="truncate max-w-[220px]">
                          {file.name}
                        </span>
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:underline"
                          onClick={() =>
                            setArrFiles((prev) =>
                              prev.filter((_, idx) => idx !== i),
                            )
                          }
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-2 text-xs text-gray-500">
                    No files selected
                  </div>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  disabled={arrSubmitting}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60"
                >
                  {arrSubmitting ? "Uploading..." : "Save arrival"}
                </button>

                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
                  onClick={() => {
                    setArrQty("");
                    setArrNotes("");
                    setArrFiles([]);
                  }}
                >
                  Clear
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {/* ADJUSTMENTS TAB */}
        {tab === "adjustments" ? (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="font-semibold">Request inventory adjustment</div>
              <div className="text-xs text-gray-500 mt-1">
                Inventory changes ONLY when manager approves the request.
              </div>

              <form
                onSubmit={createAdjustRequest}
                className="mt-4 grid gap-3 max-w-xl"
              >
                <select
                  className="border rounded-lg px-3 py-2"
                  value={adjProductId}
                  onChange={(e) => setAdjProductId(e.target.value)}
                >
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.id} • {p.name} {p.sku ? `(${p.sku})` : ""}
                    </option>
                  ))}
                </select>

                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="qtyChange (e.g. -3 damaged, 5 found stock)"
                  value={adjQtyChange}
                  onChange={(e) => setAdjQtyChange(e.target.value)}
                />

                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Reason"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                />

                <button
                  disabled={adjLoading}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60"
                >
                  {adjLoading ? "Saving..." : "Create request"}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">My adjustment requests</div>
                </div>
                <button
                  onClick={loadMyAdjustRequests}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm"
                >
                  Refresh
                </button>
              </div>

              {myAdjLoading ? (
                <div className="p-4 text-sm text-gray-600">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left p-3">ID</th>
                        <th className="text-left p-3">Product</th>
                        <th className="text-right p-3">Qty change</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(myAdjRequests) &&
                      myAdjRequests.length > 0 ? (
                        myAdjRequests.map((r) => (
                          <tr key={r.id} className="border-t">
                            <td className="p-3 font-medium">{r.id}</td>
                            <td className="p-3">
                              {r.productName ?? "Unknown Product"}
                            </td>
                            <td className="p-3 text-right">
                              {r.qtyChange ?? r.qty_change}
                            </td>
                            <td className="p-3">{r.status}</td>
                            <td className="p-3">
                              {safeDate(r.createdAt ?? r.created_at)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-4 text-sm text-gray-600">
                            No adjustment requests found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* SALES TAB (Option B) */}
        {tab === "sales" ? (
          <div className="mt-4 bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">
                  Sales fulfillment (Option B)
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Sellers create <b>DRAFT</b> sales. You fulfill by deducting
                  warehouse inventory. Seller finalizes later.
                </div>
              </div>
              <button
                onClick={loadSales}
                className="px-4 py-2 rounded-lg bg-black text-white text-sm"
              >
                Refresh
              </button>
            </div>

            <div className="p-3 border-b flex gap-2 flex-wrap">
              <input
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
                placeholder="Search id/status/seller/customer"
                value={salesQ}
                onChange={(e) => setSalesQ(e.target.value)}
              />
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={salesStatusFilter}
                onChange={(e) => setSalesStatusFilter(e.target.value)}
              >
                <option value="ALL">All</option>
                <option value="DRAFT">DRAFT (incoming)</option>
                <option value="FULFILLED">FULFILLED</option>
                <option value="PENDING">PENDING</option>
                <option value="AWAITING_PAYMENT_RECORD">
                  AWAITING_PAYMENT_RECORD
                </option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
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
                      <th className="text-left p-3">Seller</th>
                      <th className="text-left p-3">Customer</th>
                      <th className="text-left p-3">Created</th>
                      <th className="text-right p-3">Action</th>
                      <th className="text-right p-3">View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((s) => {
                      const status = String(s.status || "").toUpperCase();
                      const canFulfill = status === "DRAFT";
                      const loading = saleActionLoadingId === s.id;

                      const sellerLabel = String(
                        s.sellerEmail ||
                          s.sellerName ||
                          s.sellerId ||
                          s.seller_id ||
                          "-",
                      );

                      const customerLabel = [
                        s.customerName || "-",
                        s.customerPhone || "",
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <tr key={s.id} className="border-t">
                          <td className="p-3 font-medium">{s.id}</td>
                          <td className="p-3">{status}</td>
                          <td className="p-3 text-right">
                            {fmtMoney(s.totalAmount ?? 0)}
                          </td>
                          <td className="p-3">{sellerLabel}</td>
                          <td className="p-3">{customerLabel}</td>
                          <td className="p-3">{safeDate(s.createdAt)}</td>
                          <td className="p-3 text-right">
                            <button
                              disabled={!canFulfill || loading}
                              className={`px-3 py-1.5 rounded-lg text-xs ${
                                canFulfill && !loading
                                  ? "bg-green-600 text-white hover:bg-green-700"
                                  : "bg-gray-200 text-gray-500"
                              }`}
                              onClick={() => fulfillSale(s.id)}
                            >
                              {loading ? "..." : "Fulfill"}
                            </button>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              className="px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50"
                              onClick={async () => {
                                await openSaleDetails(s.id);
                              }}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredSales.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-4 text-sm text-gray-600">
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

        <SaleModal
          open={!!viewSale}
          sale={viewSale}
          loading={viewSaleLoading}
          onClose={() => setViewSale(null)}
        />
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

function Card({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub ? <div className="text-sm text-gray-600 mt-1">{sub}</div> : null}
    </div>
  );
}

function safeDate(v) {
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

function SaleModal({ open, sale, loading, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold">
              Sale #{sale?.id ?? "-"} {loading ? "…" : ""}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Status: {String(sale?.status || "-").toUpperCase()} • Seller:{" "}
              {String(sale?.sellerId ?? "-")} • Total:{" "}
              {fmtMoney(sale?.totalAmount ?? 0)}
            </div>
          </div>

          <button
            className="px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-sm text-gray-600">Loading...</div>
          ) : (
            <>
              <div className="text-sm font-semibold">Items</div>
              <div className="mt-3 overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left p-3">Product</th>
                      <th className="text-left p-3">SKU</th>
                      <th className="text-right p-3">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(sale?.items) ? sale.items : []).map(
                      (it, idx) => (
                        <tr key={it.id || idx} className="border-t">
                          <td className="p-3 font-medium">
                            {it.productName ||
                              it.name ||
                              `#${it.productId ?? "-"}`}
                          </td>
                          <td className="p-3 text-gray-600">{it.sku || "-"}</td>
                          <td className="p-3 text-right">{it.qty ?? 0}</td>
                        </tr>
                      ),
                    )}
                    {(Array.isArray(sale?.items) ? sale.items : []).length ===
                    0 ? (
                      <tr>
                        <td colSpan={3} className="p-4 text-sm text-gray-600">
                          No items.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 text-xs text-gray-500">
                Storekeeper action is <b>Fulfill</b> from the list (deducts
                warehouse stock). Seller finalizes after fulfillment.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
