"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiFetch } from "../lib/api";

const ENDPOINTS = {
  LIST: "/inventory-adjust-requests",
  APPROVE: (id) => `/inventory-adjust-requests/${id}/approve`,
  DECLINE: (id) => `/inventory-adjust-requests/${id}/decline`,
};

function fmt(v) {
  if (!v) return "-";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

export default function InventoryAdjustRequestsPanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("PENDING"); // ALL | PENDING | APPROVED | DECLINED

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const qs = new URLSearchParams();
      if (status !== "ALL") qs.set("status", status);

      const data = await apiFetch(`${ENDPOINTS.LIST}?${qs.toString()}`, {
        method: "GET",
      });

      const list =
        (Array.isArray(data?.requests) ? data.requests : null) ??
        (Array.isArray(data?.items) ? data.items : null) ??
        (Array.isArray(data?.rows) ? data.rows : null) ??
        [];

      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setRows([]);
      setMsg(e?.data?.error || e?.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const qq = String(q || "")
      .trim()
      .toLowerCase();
    if (!qq) return rows;

    return rows.filter((r) => {
      const id = String(r?.id ?? "");
      const pid = String(r?.productId ?? "");
      const name = String(r?.productName || "").toLowerCase();
      const reason = String(r?.reason || "").toLowerCase();
      const st = String(r?.status || "").toLowerCase();
      return (
        id.includes(qq) ||
        pid.includes(qq) ||
        name.includes(qq) ||
        reason.includes(qq) ||
        st.includes(qq)
      );
    });
  }, [rows, q]);

  async function act(id, decision) {
    setMsg("");
    try {
      await apiFetch(
        decision === "approve" ? ENDPOINTS.APPROVE(id) : ENDPOINTS.DECLINE(id),
        { method: "POST" },
      );
      setMsg(`✅ Request #${id} ${decision}d`);
      await load();
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Action failed");
    }
  }

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold">Inventory adjustment requests</div>
          <div className="text-xs text-gray-500 mt-1">
            Manager approves/declines stock corrections.
          </div>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 rounded-lg bg-black text-white text-sm"
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {msg ? (
        <div className="p-3 text-sm">
          {msg.startsWith("✅") ? (
            <div className="p-3 rounded-lg bg-green-50 text-green-800">
              {msg}
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-red-50 text-red-700">{msg}</div>
          )}
        </div>
      ) : null}

      <div className="p-3 border-b flex flex-col md:flex-row gap-2">
        <input
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
          placeholder="Search id/product/reason/status"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="ALL">All</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="DECLINED">Declined</option>
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
                <th className="text-left p-3">Product</th>
                <th className="text-right p-3">Qty change</th>
                <th className="text-left p-3">Reason</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Created</th>
                <th className="text-right p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => {
                const rid = r?.id ?? idx;
                const st = String(r?.status || "");
                return (
                  <tr key={rid} className="border-t">
                    <td className="p-3 font-medium">{r?.id ?? "-"}</td>
                    <td className="p-3">
                      <div className="font-medium">
                        {r?.productName || `Product #${r?.productId ?? "-"}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {r?.productId ?? "-"}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      {Number(r?.qtyChange || 0)}
                    </td>
                    <td className="p-3">{r?.reason || "-"}</td>
                    <td className="p-3 font-medium">{st || "-"}</td>
                    <td className="p-3">{fmt(r?.createdAt)}</td>
                    <td className="p-3 text-right">
                      {st === "PENDING" ? (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => act(r.id, "approve")}
                            className="px-3 py-1.5 rounded-lg bg-black text-white text-xs"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => act(r.id, "decline")}
                            className="px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50"
                          >
                            Decline
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 ? (
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

      <div className="p-3 text-xs text-gray-500 border-t">
        Backend routes expected:
        <b className="mx-1">GET /inventory-adjust-requests</b>,
        <b className="mx-1">POST /inventory-adjust-requests/:id/approve</b>,
        <b className="mx-1">POST /inventory-adjust-requests/:id/decline</b>.
      </div>
    </div>
  );
}
