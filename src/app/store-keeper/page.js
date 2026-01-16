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
  REQUESTS_LIST: "/requests",

  // These 3 are the only ones that might differ depending on your backend implementation:
   REQUEST_APPROVE: (id) => `/requests/${id}/approve`,
   REQUEST_REJECT: (id) => `/requests/${id}/approve`,
  REQUEST_RELEASE: (id) => `/requests/${id}/release`
};

export default function StoreKeeperPage() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [msg, setMsg] = useState("");

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selected, setSelected] = useState(null);

  // ---------------- ROLE GUARD ----------------
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

        if (user.role !== "store_keeper") {
          const map = {
            seller: "/seller",
            cashier: "/cashier",
            manager: "/manager",
            admin: "/admin"
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

  // ---------------- LOAD REQUESTS ----------------
  const loadRequests = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    loadRequests();
  }, [isAuthorized, loadRequests]);

  // ---------------- NORMALIZE REQUEST SHAPE ----------------
  function getReqItems(r) {
    // Try common shapes
    const a = r?.items;
    const b = r?.requestItems;
    const c = r?.lines;
    const d = r?.details?.items;
    const list = a ?? b ?? c ?? d ?? [];
    return Array.isArray(list) ? list : [];
  }

  function getReqStatus(r) {
    return String(r?.status || r?.state || "UNKNOWN");
  }

  function getReqSeller(r) {
    // common fields
    const sellerId = r?.sellerId ?? r?.requestedByUserId ?? r?.userId ?? r?.requestedBy ?? null;
    const sellerEmail = r?.sellerEmail ?? r?.userEmail ?? r?.requestedByEmail ?? "";
    return { sellerId, sellerEmail };
  }

  // ---------------- ACTIONS ----------------
 async function approveRequest(id) {
  setMsg("");
  try {
    await apiFetch(ENDPOINTS.REQUEST_APPROVE(id), {
      method: "POST",
      body: {
        decision: "APPROVE"
      }
    });
    setMsg(`✅ Request #${id} approved`);
    await loadRequests();
  } catch (e) {
    setMsg(e?.data?.error || e.message || "Approve failed");
  }
}


async function rejectRequest(id) {
  setMsg("");
  try {
    await apiFetch(ENDPOINTS.REQUEST_REJECT(id), {
      method: "POST",
      body: {
        decision: "REJECT"
      }
    });
    setMsg(`✅ Request #${id} rejected`);
    await loadRequests();
  } catch (e) {
    setMsg(e?.data?.error || e.message || "Reject failed");
  }
}


  async function releaseRequest(id) {
    setMsg("");
    try {
      await apiFetch(ENDPOINTS.REQUEST_RELEASE(id), { method: "POST" });
      setMsg(`✅ Request #${id} released to seller holdings`);
      await loadRequests();
    } catch (e) {
      setMsg(e?.data?.error || e.message || "Release failed");
    }
  }

  // ---------------- FILTER ----------------
  const filtered = useMemo(() => {
    const list = Array.isArray(requests) ? requests : [];
    const qq = String(q || "").trim().toLowerCase();

    return list.filter((r) => {
      const id = String(r?.id ?? "");
      const st = getReqStatus(r).toLowerCase();

      const matchQ = !qq ? true : id.includes(qq) || st.includes(qq);
      const matchStatus = statusFilter === "ALL" ? true : st === statusFilter.toLowerCase();

      return matchQ && matchStatus;
    });
  }, [requests, q, statusFilter]);

  // HARD STOP RENDER if wrong role
  if (!isAuthorized) {
    return <div className="p-6 text-sm text-gray-600">Redirecting...</div>;
  }
// 🔒 Normalize selected request status once
const selectedStatus = selected ? getReqStatus(selected).toUpperCase() : null;

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
              <div className="p-3 rounded-lg bg-green-50 text-green-800">{msg}</div>
            ) : (
              <div className="p-3 rounded-lg bg-red-50 text-red-700">{msg}</div>
            )}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Requests list */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">Requests</div>
                <div className="text-xs text-gray-500 mt-1">
                  Approve then Release to move stock into seller holdings.
                </div>
              </div>

              <button
                type="button"
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
                value={q}
                onChange={(e) => setQ(e.target.value)}
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

            {loading ? (
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
                    {filtered.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="p-3 font-medium">{r.id}</td>
                        <td className="p-3">{getReqStatus(r)}</td>
                        <td className="p-3">{fmt(r.createdAt)}</td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelected(r)}
                            className="px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 ? (
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

          {/* Right: Request details + actions */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="font-semibold">Request details</div>
            <div className="text-xs text-gray-500 mt-1">
              Select a request on the left.
            </div>

            {!selected ? (
              
              <div className="mt-4 text-sm text-gray-600">
                No request selected.
              </div>
            ) : (
              <div className="mt-4">
                <div className="text-sm">
                  <div><b>ID:</b> {selected.id}</div>
                  <div><b>Status:</b> {getReqStatus(selected)}</div>
                  <div><b>Created:</b> {fmt(selected.createdAt)}</div>
                  {(() => {
                    const s = getReqSeller(selected);
                    return (
                      <div>
                        <b>Seller:</b> {s.sellerEmail ? s.sellerEmail : (s.sellerId ?? "-")}
                      </div>
                    );
                  })()}
                </div>

                <div className="mt-4 border rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-gray-50 text-sm font-semibold">Items</div>
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
                        {getReqItems(selected).map((it, idx) => (
                          <tr key={it.id || idx} className="border-b">
                            <td className="p-3 font-medium">{it.productName || it.name || "-"}</td>
                            <td className="p-3 text-gray-600">{it.sku || "-"}</td>
                            <td className="p-3 text-right">{it.qtyRequested ?? it.qty ?? it.quantity ?? 0}</td>
                          </tr>
                        ))}
                        {getReqItems(selected).length === 0 ? (
                          <tr>
                            <td colSpan={3} className="p-4 text-sm text-gray-600">
                              No items found on this request (backend may return a different shape).
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!canApprove}
                    onClick={() => approveRequest(selected.id)}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      canApprove
                        ? "bg-black text-white"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    Approve
                  </button>


                  <button
                    type="button"
                    disabled={!canReject}
                    onClick={() => rejectRequest(selected.id)}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      canReject
                        ? "border hover:bg-gray-50"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    Reject
                  </button>


                 <button
                  type="button"
                  disabled={!canRelease}
                  onClick={() => releaseRequest(selected.id)}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    canRelease
                      ? "bg-green-600 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Release to Seller
                </button>


                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-3 text-xs text-gray-500">
                  If Release fails, your backend might use different route names.
                  Update only the ENDPOINTS block at the top.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
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
