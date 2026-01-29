"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import RoleBar from "../../components/RoleBar";
import { apiFetch } from "../../lib/api";
import { apiUpload } from "../../lib/apiUpload";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

/**
 * ✅ LOCKED BACKEND ENDPOINTS (only change here)
 * Requests flow:
 *  - POST /requests/:id/approve  body: { decision: "APPROVE" | "REJECT" }
 *  - POST /requests/:id/release  body: {} (safe)
 */
const ENDPOINTS = {
  PRODUCTS_LIST: "/products",
  PRODUCT_CREATE: "/products",
  INVENTORY_LIST: "/inventory",

  INVENTORY_ARRIVALS_CREATE: "/inventory/arrivals",

  INV_ADJ_REQ_CREATE: "/inventory-adjust-requests",
  INV_ADJ_REQ_MINE: "/inventory-adjust-requests/mine",

  // ✅ Seller stock requests (correct)
  STOCK_REQUESTS_LIST: "/requests",
  STOCK_REQUEST_DECIDE: (id) => `/requests/${id}/approve`,
  STOCK_REQUEST_RELEASE: (id) => `/requests/${id}/release`,
};

export default function StoreKeeperPage() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [msg, setMsg] = useState("");

  const [tab, setTab] = useState("inventory"); // inventory | arrivals | adjustments | requests

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

  // Seller stock requests (Storekeeper receives, approves, releases)
  const [requests, setRequests] = useState([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqQ, setReqQ] = useState("");
  const [reqStatusFilter, setReqStatusFilter] = useState("ALL");
  const [reqActionLoadingId, setReqActionLoadingId] = useState(null);

  const [viewReq, setViewReq] = useState(null);

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

  const loadRequests = useCallback(async () => {
    setReqLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.STOCK_REQUESTS_LIST, {
        method: "GET",
      });
      const list = Array.isArray(data?.requests)
        ? data.requests
        : data?.items || data?.rows || data?.data || [];
      setRequests(Array.isArray(list) ? list : []);
    } catch (e) {
      setMsg(e?.data?.error || e.message || "Failed to load requests");
      setRequests([]);
    } finally {
      setReqLoading(false);
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

  // Load base data after login + on tab switch
  useEffect(() => {
    if (!isAuthorized) return;

    loadProducts();
    loadInventory();

    if (tab === "requests") loadRequests();
    if (tab === "adjustments") loadMyAdjustRequests();
  }, [
    isAuthorized,
    tab,
    loadProducts,
    loadInventory,
    loadRequests,
    loadMyAdjustRequests,
  ]);

  // ---------------- HELPERS (Requests normalize) ----------------
  function reqStatus(r) {
    return String(r?.status || r?.state || "UNKNOWN").toUpperCase();
  }

  function reqItems(r) {
    const items = r?.items || r?.requestItems || r?.lines || r?.details?.items;
    return Array.isArray(items) ? items : [];
  }

  function reqProductLabel(r) {
    const items = reqItems(r);
    if (items.length === 0) return { title: "-", subtitle: "" };

    if (items.length === 1) {
      const it = items[0];
      const pid = it.productId ?? it.product_id ?? "-";
      const name = it.productName || it.name || "";
      return { title: `#${pid}`, subtitle: name };
    }

    return { title: `${items.length} items`, subtitle: "Multiple products" };
  }

  function reqTotalQty(r) {
    return reqItems(r).reduce((sum, it) => {
      const q = Number(it.qty ?? it.qtyRequested ?? it.quantity ?? 0);
      return sum + (Number.isFinite(q) ? q : 0);
    }, 0);
  }

  function reqSellerLabel(r) {
    return (
      r?.sellerEmail ||
      r?.sellerName ||
      r?.requestedByEmail ||
      String(r?.sellerId ?? r?.seller_id ?? r?.requestedByUserId ?? "-")
    );
  }

  function reqCreatedAt(r) {
    return r?.createdAt || r?.created_at || r?.requestedAt || null;
  }

  // ---------------- FILTERS / KPIs ----------------
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

  const pendingStockRequests = useMemo(() => {
    return (Array.isArray(requests) ? requests : []).filter(
      (r) => reqStatus(r) === "PENDING",
    ).length;
  }, [requests]);

  const pendingAdjRequests = useMemo(() => {
    return (Array.isArray(myAdjRequests) ? myAdjRequests : []).filter(
      (r) => String(r.status || "").toUpperCase() === "PENDING",
    ).length;
  }, [myAdjRequests]);

  const filteredRequests = useMemo(() => {
    const list = Array.isArray(requests) ? requests : [];

    const qq = String(reqQ || "")
      .trim()
      .toLowerCase();

    return list.filter((r) => {
      const st = reqStatus(r).toLowerCase();
      const id = String(r?.id ?? "").toLowerCase();
      const seller = String(reqSellerLabel(r) ?? "").toLowerCase();
      const matchQ = !qq
        ? true
        : id.includes(qq) || st.includes(qq) || seller.includes(qq);

      const matchStatus =
        reqStatusFilter === "ALL"
          ? true
          : st === String(reqStatusFilter).toLowerCase();

      return matchQ && matchStatus;
    });
  }, [requests, reqQ, reqStatusFilter]);

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

  // ✅ DECIDE: sends required body to avoid "expected object, got undefined"
  async function decideStockRequest(id, decision) {
    setMsg("");
    setReqActionLoadingId(id);
    try {
      await apiFetch(ENDPOINTS.STOCK_REQUEST_DECIDE(id), {
        method: "POST",
        body: { decision }, // "APPROVE" | "REJECT"
      });

      setMsg(decision === "APPROVE" ? "✅ Approved" : "✅ Rejected");
      await loadRequests();
    } catch (e) {
      setMsg(e?.data?.error || e.message || "Decision failed");
    } finally {
      setReqActionLoadingId(null);
    }
  }

  // ✅ RELEASE: this is what moves stock (inventory down + seller_holdings up)
  async function releaseStockRequest(id) {
    setMsg("");
    setReqActionLoadingId(id);
    try {
      await apiFetch(ENDPOINTS.STOCK_REQUEST_RELEASE(id), {
        method: "POST",
        body: {}, // safe
      });

      setMsg("✅ Released (stock moved to seller)");
      await loadRequests();
      await loadInventory();
    } catch (e) {
      setMsg(e?.data?.error || e.message || "Release failed");
    } finally {
      setReqActionLoadingId(null);
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
            label="Pending seller requests"
            value={reqLoading ? "…" : String(pendingStockRequests)}
            sub="Need action"
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
          <TabButton
            active={tab === "requests"}
            onClick={() => setTab("requests")}
          >
            Seller requests
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
                  <div className="text-xs text-gray-500 mt-1">
                    If empty, backend may not expose{" "}
                    <code>/inventory-adjust-requests/mine</code>.
                  </div>
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

        {/* SELLER REQUESTS TAB ✅ FIXED (Approve/Reject/Release + Filter) */}
        {tab === "requests" ? (
          <div className="mt-4 bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">Seller stock requests</div>
                <div className="text-xs text-gray-500 mt-1">
                  Approve/Reject first. Then <b>Release</b> to move stock to
                  seller holdings.
                </div>
              </div>
              <button
                onClick={loadRequests}
                className="px-4 py-2 rounded-lg bg-black text-white text-sm"
              >
                Refresh
              </button>
            </div>

            {/* ✅ Filters */}
            <div className="p-3 border-b flex gap-2 flex-wrap">
              <input
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
                placeholder="Search by id / status / seller"
                value={reqQ}
                onChange={(e) => setReqQ(e.target.value)}
              />
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={reqStatusFilter}
                onChange={(e) => setReqStatusFilter(e.target.value)}
              >
                <option value="ALL">All</option>
                <option value="PENDING">PENDING</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="RELEASED">RELEASED</option>
              </select>
            </div>

            {reqLoading ? (
              <div className="p-4 text-sm text-gray-600">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left p-3">ID</th>
                      <th className="text-left p-3">Seller</th>
                      <th className="text-left p-3">Product</th>
                      <th className="text-right p-3">Qty</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Time</th>
                      <th className="text-right p-3">Action</th>
                      <th className="text-right p-3">View</th>
                    </tr>
                  </thead>

                  <tbody>
                    {(Array.isArray(filteredRequests)
                      ? filteredRequests
                      : []
                    ).map((r) => {
                      const status = reqStatus(r);
                      const prod = reqProductLabel(r);
                      const qty = reqTotalQty(r);
                      const seller = reqSellerLabel(r);
                      const created = reqCreatedAt(r);

                      const loading = reqActionLoadingId === r.id;

                      const canApprove = status === "PENDING";
                      const canReject = status === "PENDING";
                      const canRelease = status === "APPROVED";

                      return (
                        <tr key={r.id} className="border-t">
                          <td className="p-3 font-medium">{r.id}</td>

                          <td className="p-3">{seller}</td>

                          <td className="p-3">
                            <div className="font-medium">{prod.title}</div>
                            {prod.subtitle ? (
                              <div className="text-xs text-gray-500">
                                {prod.subtitle}
                              </div>
                            ) : null}
                          </td>

                          <td className="p-3 text-right">{qty}</td>

                          <td className="p-3">{status}</td>

                          <td className="p-3">{safeDate(created)}</td>

                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-2 flex-wrap">
                              <button
                                disabled={!canApprove || loading}
                                className={`px-3 py-1.5 rounded-lg text-xs ${
                                  canApprove && !loading
                                    ? "bg-black text-white"
                                    : "bg-gray-200 text-gray-500"
                                }`}
                                onClick={() =>
                                  decideStockRequest(r.id, "APPROVE")
                                }
                              >
                                {loading ? "..." : "Approve"}
                              </button>

                              <button
                                disabled={!canReject || loading}
                                className={`px-3 py-1.5 rounded-lg text-xs border ${
                                  canReject && !loading
                                    ? "hover:bg-gray-50"
                                    : "bg-gray-100 text-gray-400"
                                }`}
                                onClick={() =>
                                  decideStockRequest(r.id, "REJECT")
                                }
                              >
                                {loading ? "..." : "Reject"}
                              </button>

                              <button
                                disabled={!canRelease || loading}
                                className={`px-3 py-1.5 rounded-lg text-xs ${
                                  canRelease && !loading
                                    ? "bg-green-600 text-white hover:bg-green-700"
                                    : "bg-gray-200 text-gray-500"
                                }`}
                                onClick={() => releaseStockRequest(r.id)}
                              >
                                {loading ? "..." : "Release"}
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              className="px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50"
                              onClick={() => setViewReq(r)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {(Array.isArray(filteredRequests) ? filteredRequests : [])
                      .length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-sm text-gray-600">
                          No requests found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
        <RequestModal
          open={!!viewReq}
          request={viewReq}
          loadingId={reqActionLoadingId}
          onClose={() => setViewReq(null)}
          onApprove={(id) => decideStockRequest(id, "APPROVE")}
          onReject={(id) => decideStockRequest(id, "REJECT")}
          onRelease={(id) => releaseStockRequest(id)}
        />
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
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

function RequestModal({
  open,
  onClose,
  request,
  onApprove,
  onReject,
  onRelease,
  loadingId,
}) {
  if (!open || !request) return null;

  const status = String(request?.status || "UNKNOWN").toUpperCase();
  const items =
    request?.items ||
    request?.requestItems ||
    request?.lines ||
    request?.details?.items ||
    [];

  const safeItems = Array.isArray(items) ? items : [];
  const totalQty = safeItems.reduce(
    (sum, it) => sum + Number(it.qty ?? it.qtyRequested ?? it.quantity ?? 0),
    0,
  );

  const seller =
    request?.sellerEmail ||
    request?.sellerName ||
    request?.requestedByEmail ||
    String(
      request?.sellerId ??
        request?.seller_id ??
        request?.requestedByUserId ??
        "-",
    );

  const createdAt =
    request?.createdAt || request?.created_at || request?.requestedAt || null;

  const canApprove = status === "PENDING";
  const canReject = status === "PENDING";
  const canRelease = status === "APPROVED";
  const loading = loadingId === request.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold">Request #{request.id}</div>
            <div className="text-xs text-gray-500 mt-1">
              Seller: {seller} • Status: {status} • Time: {safeDate(createdAt)}
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
          <div className="text-sm font-semibold">Items</div>
          <div className="text-xs text-gray-500 mt-1">
            Total qty: {totalQty}
          </div>

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
                {safeItems.map((it, idx) => (
                  <tr key={it.id || idx} className="border-t">
                    <td className="p-3 font-medium">
                      {it.productName ||
                        it.name ||
                        `#${it.productId ?? it.product_id ?? "-"}`}
                    </td>
                    <td className="p-3 text-gray-600">{it.sku || "-"}</td>
                    <td className="p-3 text-right">
                      {it.qty ?? it.qtyRequested ?? it.quantity ?? 0}
                    </td>
                  </tr>
                ))}
                {safeItems.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-sm text-gray-600">
                      No items found in this request.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex gap-2 flex-wrap justify-end">
            <button
              disabled={!canApprove || loading}
              className={`px-4 py-2 rounded-lg text-sm ${
                canApprove && !loading
                  ? "bg-black text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
              onClick={() => onApprove(request.id)}
            >
              {loading ? "Working..." : "Approve"}
            </button>

            <button
              disabled={!canReject || loading}
              className={`px-4 py-2 rounded-lg text-sm border ${
                canReject && !loading
                  ? "hover:bg-gray-50"
                  : "bg-gray-100 text-gray-400"
              }`}
              onClick={() => onReject(request.id)}
            >
              {loading ? "Working..." : "Reject"}
            </button>

            <button
              disabled={!canRelease || loading}
              className={`px-4 py-2 rounded-lg text-sm ${
                canRelease && !loading
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-gray-200 text-gray-500"
              }`}
              onClick={() => onRelease(request.id)}
            >
              {loading ? "Working..." : "Release"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
