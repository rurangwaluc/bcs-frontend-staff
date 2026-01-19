"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import RoleBar from "../../components/RoleBar";
import { apiFetch } from "../../lib/api";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

/**
 * Backend-aligned endpoints (DO NOT change anywhere else)
 */
const ENDPOINTS = {
  // Requests
  REQUESTS_LIST: "/requests",
  REQUEST_APPROVE: (id) => `/requests/${id}/approve`,
  REQUEST_REJECT: (id) => `/requests/${id}/reject`,
  REQUEST_RELEASE: (id) => `/requests/${id}/release`,

  // Products & Inventory
  PRODUCTS_LIST: "/products",
  PRODUCTS_CREATE: "/products",
  INVENTORY_LIST: "/inventory",
  INVENTORY_ADJUST: "/inventory/adjust",
};

export default function StoreKeeperPage() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [msg, setMsg] = useState("");

  const [tab, setTab] = useState("requests"); // requests | inventory

  // --- prevent double-click actions
  const [actionLoading, setActionLoading] = useState(false);

  // ---------------- REQUESTS ----------------
  const [requests, setRequests] = useState([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqQ, setReqQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedReq, setSelectedReq] = useState(null);

  // ---------------- INVENTORY ----------------
  const [inventory, setInventory] = useState([]);
  const [invLoading, setInvLoading] = useState(false);
  const [invQ, setInvQ] = useState("");

  // Products list (for productId lookup & showing price)
  const [products, setProducts] = useState([]);
  const [prodLoading, setProdLoading] = useState(false);

  // Adjust form
  const [selectedProductId, setSelectedProductId] = useState("");
  const [qtyChange, setQtyChange] = useState("");
  const [reason, setReason] = useState("");

  // Create product form
  const [pName, setPName] = useState("");
  const [pSku, setPSku] = useState("");
  const [pUnit, setPUnit] = useState("pcs");
  const [pPrice, setPPrice] = useState("");
  const [pInitialQty, setPInitialQty] = useState("");

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
            seller: "/seller",
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

  const isAuthorized = !!me && me.role === "store_keeper";

  // ---------------- NORMALIZERS ----------------
  function getReqItems(r) {
    const list =
      r?.items ?? r?.requestItems ?? r?.lines ?? r?.details?.items ?? [];
    return Array.isArray(list) ? list : [];
  }
  function getReqStatus(r) {
    return String(r?.status || r?.state || "UNKNOWN");
  }
  function getReqSeller(r) {
    const sellerId =
      r?.sellerId ??
      r?.requestedByUserId ??
      r?.userId ??
      r?.requestedBy ??
      null;
    const sellerEmail =
      r?.sellerEmail ?? r?.userEmail ?? r?.requestedByEmail ?? "";
    return { sellerId, sellerEmail };
  }

  // ---------------- LOADERS ----------------
  const loadRequests = useCallback(async () => {
    setReqLoading(true);
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
      setReqLoading(false);
    }
  }, []);

  const loadInventory = useCallback(async () => {
    setInvLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.INVENTORY_LIST, { method: "GET" });
      const items =
        data?.inventory ??
        data?.items ??
        data?.rows ??
        data?.data ??
        data?.result ??
        [];
      setInventory(Array.isArray(items) ? items : []);
    } catch (e) {
      setMsg(e?.data?.error || e.message || "Failed to load inventory");
    } finally {
      setInvLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setProdLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.PRODUCTS_LIST, { method: "GET" });
      const items =
        data?.products ??
        data?.items ??
        data?.rows ??
        data?.data ??
        data?.result ??
        [];
      setProducts(Array.isArray(items) ? items : []);
    } catch (e) {
      setMsg(e?.data?.error || e.message || "Failed to load products");
    } finally {
      setProdLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;

    if (tab === "requests") loadRequests();
    if (tab === "inventory") {
      loadInventory();
      loadProducts();
    }
  }, [isAuthorized, tab, loadRequests, loadInventory, loadProducts]);

  // ---------------- REQUEST ACTIONS ----------------
  async function approveRequest(id) {
    if (actionLoading) return;
    setActionLoading(true);
    setMsg("");
    try {
      await apiFetch(ENDPOINTS.REQUEST_APPROVE(id), {
        method: "POST",
        body: { decision: "APPROVE" },
      });
      setMsg(`✅ Request #${id} approved`);
      await loadRequests();
      // refresh selectedReq from list (keep UI consistent)
      setSelectedReq((cur) =>
        cur?.id === id ? { ...cur, status: "APPROVED" } : cur,
      );
    } catch (e) {
      setMsg(e?.data?.error || e.message || "Approve failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function rejectRequest(id) {
    if (actionLoading) return;
    setActionLoading(true);
    setMsg("");
    try {
      await apiFetch(ENDPOINTS.REQUEST_REJECT(id), {
        method: "POST",
        body: { decision: "REJECT" },
      });
      setMsg(`✅ Request #${id} rejected`);
      await loadRequests();
      setSelectedReq((cur) =>
        cur?.id === id ? { ...cur, status: "REJECTED" } : cur,
      );
    } catch (e) {
      setMsg(e?.data?.error || e.message || "Reject failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function releaseRequest(id) {
    if (actionLoading) return;
    setActionLoading(true);
    setMsg("");
    try {
      await apiFetch(ENDPOINTS.REQUEST_RELEASE(id), { method: "POST" });
      setMsg(`✅ Request #${id} released to seller holdings`);
      await loadRequests();
      // lock details panel (released is final here)
      setSelectedReq((cur) =>
        cur?.id === id ? { ...cur, status: "RELEASED" } : cur,
      );
    } catch (e) {
      setMsg(e?.data?.error || e.message || "Release failed");
    } finally {
      setActionLoading(false);
    }
  }

  // ---------------- INVENTORY ADJUST ----------------
  async function submitAdjust(e) {
    e.preventDefault();
    setMsg("");

    const pid = Number(selectedProductId);
    const change = Number(qtyChange);

    if (!pid) return setMsg("Select a product first.");
    if (!Number.isFinite(change) || change === 0) {
      return setMsg("Qty change must be a number (example: 10 or -5).");
    }

    const cleanReason =
      reason && reason.trim().length >= 3 ? reason.trim() : "Stock adjustment";

    // ✅ Zod expects: productId, qtyChange, reason (string min 3)
    const payload = {
      productId: pid,
      qtyChange: change,
      reason: cleanReason,
    };

    try {
      await apiFetch(ENDPOINTS.INVENTORY_ADJUST, {
        method: "POST",
        body: payload,
      });
      setMsg("✅ Inventory adjusted");
      setQtyChange("");
      setReason("");
      await loadInventory();
    } catch (e2) {
      setMsg(e2?.data?.error || e2.message || "Adjust failed");
    }
  }

  // ---------------- PRODUCT CREATE + OPTIONAL INITIAL STOCK ----------------
  async function createProduct(e) {
    e.preventDefault();
    setMsg("");

    const name = pName.trim();
    const sku = pSku.trim();
    const unit = (pUnit || "pcs").trim();

    const sellingPrice = Number(pPrice);
    if (!name || !sku) return setMsg("Name and SKU are required.");
    if (!Number.isFinite(sellingPrice) || sellingPrice < 0)
      return setMsg("Selling price must be a valid number.");

    const payload = { name, sku, unit, sellingPrice };

    try {
      const out = await apiFetch(ENDPOINTS.PRODUCTS_CREATE, {
        method: "POST",
        body: payload,
      });

      const createdId = out?.product?.id;
      setMsg(
        createdId
          ? `✅ Product created (ID ${createdId})`
          : "✅ Product created",
      );

      // ✅ If initial qty provided, adjust inventory up
      const init = Number(pInitialQty);
      if (createdId && Number.isFinite(init) && init > 0) {
        await apiFetch(ENDPOINTS.INVENTORY_ADJUST, {
          method: "POST",
          body: {
            productId: Number(createdId),
            qtyChange: Math.trunc(init),
            reason: "Initial stock",
          },
        });
        setMsg(
          `✅ Product created + Initial stock added (${Math.trunc(init)})`,
        );
      }

      setPName("");
      setPSku("");
      setPUnit("pcs");
      setPPrice("");
      setPInitialQty("");

      await loadProducts();
      await loadInventory();
    } catch (e2) {
      setMsg(
        e2?.data?.error || e2.message || "Create product failed (permission?)",
      );
    }
  }

  // ---------------- FILTERS ----------------
  const filteredRequests = useMemo(() => {
    const list = Array.isArray(requests) ? requests : [];
    const qq = String(reqQ || "")
      .trim()
      .toLowerCase();

    return list.filter((r) => {
      const id = String(r?.id ?? "");
      const st = getReqStatus(r).toLowerCase();
      const matchQ = !qq ? true : id.includes(qq) || st.includes(qq);
      const matchStatus =
        statusFilter === "ALL" ? true : st === statusFilter.toLowerCase();
      return matchQ && matchStatus;
    });
  }, [requests, reqQ, statusFilter]);

  const filteredInventory = useMemo(() => {
    const list = Array.isArray(inventory) ? inventory : [];
    const qq = String(invQ || "")
      .trim()
      .toLowerCase();
    if (!qq) return list;

    return list.filter((p) => {
      const name = String(p?.name || p?.productName || "").toLowerCase();
      const sku = String(p?.sku || "").toLowerCase();
      return name.includes(qq) || sku.includes(qq);
    });
  }, [inventory, invQ]);

  if (!isAuthorized) {
    return <div className="p-6 text-sm text-gray-600">Redirecting...</div>;
  }

  const selectedStatus = selectedReq
    ? getReqStatus(selectedReq).toUpperCase()
    : null;
  const canApprove = selectedStatus === "PENDING";
  const canReject = selectedStatus === "PENDING";
  const canRelease = selectedStatus === "APPROVED";

  return (
    <div>
      <RoleBar
        title="Store Keeper"
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
            active={tab === "inventory"}
            onClick={() => setTab("inventory")}
          >
            Inventory
          </TabButton>
        </div>

        {/* ---------------- REQUESTS TAB ---------------- */}
        {tab === "requests" ? (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">Requests</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Approve then Release to move stock into seller holdings.
                  </div>
                </div>

                <button
                  onClick={loadRequests}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm"
                >
                  Refresh
                </button>
              </div>

              <div className="p-3 border-b flex gap-2">
                <input
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  placeholder="Search by request id or status"
                  value={reqQ}
                  onChange={(e) => setReqQ(e.target.value)}
                />
                <select
                  className="border rounded-lg px-3 py-2 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
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
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Created</th>
                        <th className="text-right p-3">Open</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequests.map((r) => (
                        <tr key={r.id} className="border-t">
                          <td className="p-3 font-medium">{r.id}</td>
                          <td className="p-3">{getReqStatus(r)}</td>
                          <td className="p-3">{fmt(r.createdAt)}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setSelectedReq(r)}
                              className="px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredRequests.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-sm text-gray-600">
                            No requests found.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <div className="font-semibold">Request details</div>
              <div className="text-xs text-gray-500 mt-1">
                Select a request on the left.
              </div>

              {!selectedReq ? (
                <div className="mt-4 text-sm text-gray-600">
                  No request selected.
                </div>
              ) : (
                <div className="mt-4">
                  <div className="text-sm">
                    <div>
                      <b>ID:</b> {selectedReq.id}
                    </div>
                    <div>
                      <b>Status:</b> {getReqStatus(selectedReq)}
                    </div>
                    <div>
                      <b>Created:</b> {fmt(selectedReq.createdAt)}
                    </div>
                    {(() => {
                      const s = getReqSeller(selectedReq);
                      return (
                        <div>
                          <b>Seller:</b>{" "}
                          {s.sellerEmail ? s.sellerEmail : (s.sellerId ?? "-")}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="mt-4 border rounded-xl overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50 text-sm font-semibold">
                      Items
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-white text-gray-600">
                          <tr className="border-b">
                            <th className="text-left p-3">Product</th>
                            <th className="text-left p-3">SKU</th>
                            <th className="text-right p-3">Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getReqItems(selectedReq).map((it, idx) => (
                            <tr key={it.id || idx} className="border-b">
                              <td className="p-3 font-medium">
                                {it.productName || it.name || "-"}
                              </td>
                              <td className="p-3 text-gray-600">
                                {it.sku || "-"}
                              </td>
                              <td className="p-3 text-right">
                                {it.qtyRequested ?? it.qty ?? it.quantity ?? 0}
                              </td>
                            </tr>
                          ))}
                          {getReqItems(selectedReq).length === 0 ? (
                            <tr>
                              <td
                                colSpan={3}
                                className="p-4 text-sm text-gray-600"
                              >
                                No items found.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      disabled={!canApprove || actionLoading}
                      onClick={() => approveRequest(selectedReq.id)}
                      className={`px-4 py-2 rounded-lg text-sm ${
                        canApprove && !actionLoading
                          ? "bg-black text-white"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {actionLoading ? "Working..." : "Approve"}
                    </button>

                    <button
                      disabled={!canReject || actionLoading}
                      onClick={() => rejectRequest(selectedReq.id)}
                      className={`px-4 py-2 rounded-lg text-sm ${
                        canReject && !actionLoading
                          ? "border hover:bg-gray-50"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {actionLoading ? "Working..." : "Reject"}
                    </button>

                    <button
                      disabled={
                        !canRelease ||
                        actionLoading ||
                        selectedStatus === "RELEASED"
                      }
                      onClick={() => releaseRequest(selectedReq.id)}
                      className={`px-4 py-2 rounded-lg text-sm ${
                        canRelease &&
                        !actionLoading &&
                        selectedStatus !== "RELEASED"
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {selectedStatus === "RELEASED"
                        ? "Released"
                        : actionLoading
                          ? "Working..."
                          : "Release to Seller"}
                    </button>

                    <button
                      onClick={() => setSelectedReq(null)}
                      className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-3 text-xs text-gray-500">
                    Endpoints: /requests/:id/approve, /reject, /release.
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* ---------------- INVENTORY TAB ---------------- */}
        {tab === "inventory" ? (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">Inventory</div>
                  <div className="text-xs text-gray-500 mt-1">
                    GET /inventory (+ price joined from /products)
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
                  placeholder="Search by name or SKU"
                  value={invQ}
                  onChange={(e) => setInvQ(e.target.value)}
                />
              </div>

              {invLoading ? (
                <div className="p-4 text-sm text-gray-600">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left p-3">ID</th>
                        <th className="text-left p-3">Name</th>
                        <th className="text-left p-3">SKU</th>
                        <th className="text-right p-3">On hand</th>
                        <th className="text-right p-3">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventory.map((p, idx) => {
                        const pid = p.productId ?? p.id;
                        const prod =
                          products.find((x) => String(x.id) === String(pid)) ||
                          products.find((x) => String(x.sku) === String(p.sku));

                        const price =
                          prod?.sellingPrice ??
                          prod?.price ??
                          prod?.unitPrice ??
                          null;

                        return (
                          <tr
                            key={p.id || `${pid}-${idx}`}
                            className="border-t"
                          >
                            <td className="p-3 font-medium">{pid ?? "-"}</td>
                            <td className="p-3">
                              {p.productName || p.name || "-"}
                            </td>
                            <td className="p-3 text-gray-600">
                              {p.sku || "-"}
                            </td>
                            <td className="p-3 text-right">
                              {p.qtyOnHand ?? p.qty ?? p.quantity ?? 0}
                            </td>
                            <td className="p-3 text-right">
                              {price == null
                                ? "-"
                                : Number(price).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredInventory.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-sm text-gray-600">
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
              <div className="font-semibold">Adjust inventory</div>
              <div className="text-xs text-gray-500 mt-1">
                POST /inventory/adjust expects: productId, qtyChange, reason
                (string min 3)
              </div>

              <form
                onSubmit={submitAdjust}
                className="mt-4 grid grid-cols-1 gap-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select
                    className="border rounded-lg px-3 py-2"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                  >
                    <option value="">Select product (from /products)</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.id} — {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={loadProducts}
                    className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
                  >
                    {prodLoading ? "Loading..." : "Reload products"}
                  </button>
                </div>

                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Qty change (e.g. 10 or -5)"
                  value={qtyChange}
                  onChange={(e) => setQtyChange(e.target.value)}
                />

                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Reason (required, min 3 chars)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />

                <button className="w-fit px-4 py-2 rounded-lg bg-black text-white text-sm">
                  Apply adjustment
                </button>
              </form>

              <div className="mt-6 border-t pt-4">
                <div className="font-semibold">
                  Create product + Initial Qty
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Creates product then adds initial stock via /inventory/adjust.
                </div>

                <form
                  onSubmit={createProduct}
                  className="mt-3 grid grid-cols-1 gap-3"
                >
                  <input
                    className="border rounded-lg px-3 py-2"
                    placeholder="Name"
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                  />
                  <input
                    className="border rounded-lg px-3 py-2"
                    placeholder="SKU"
                    value={pSku}
                    onChange={(e) => setPSku(e.target.value)}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      className="border rounded-lg px-3 py-2"
                      placeholder="Unit"
                      value={pUnit}
                      onChange={(e) => setPUnit(e.target.value)}
                    />
                    <input
                      className="border rounded-lg px-3 py-2"
                      placeholder="Selling price"
                      value={pPrice}
                      onChange={(e) => setPPrice(e.target.value)}
                    />
                  </div>

                  <input
                    className="border rounded-lg px-3 py-2"
                    placeholder="Initial qty (optional, e.g. 50)"
                    value={pInitialQty}
                    onChange={(e) => setPInitialQty(e.target.value)}
                  />

                  <button className="w-fit px-4 py-2 rounded-lg border text-sm hover:bg-gray-50">
                    Create product
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : null}
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

function fmt(v) {
  if (!v) return "-";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}
