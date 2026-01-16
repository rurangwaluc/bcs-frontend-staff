"use client";

import { useEffect, useMemo, useState } from "react";

import Nav from "../../components/Nav";
import { apiFetch } from "../../lib/api";

export default function AuditPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [userId, setUserId] = useState("");
  const [limit, setLimit] = useState(200);

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      // If your backend supports query filters later, we can pass them.
      // For now we fetch and filter client-side (Phase 1 ok).
      const data = await apiFetch("/audit", { method: "GET" });
      setRows(data.audit || data.logs || data.rows || []);
    } catch (e) {
      setMsg(e?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let r = [...rows];

    if (action) r = r.filter((x) => (x.action || "").toLowerCase().includes(action.toLowerCase()));
    if (entity) r = r.filter((x) => (x.entity || "").toLowerCase().includes(entity.toLowerCase()));
    if (userId) r = r.filter((x) => String(x.userId || x.user_id || "") === String(userId));

    if (q) {
      const qq = q.toLowerCase();
      r = r.filter((x) => {
        const d = (x.description || x.message || "").toLowerCase();
        const ent = (x.entity || "").toLowerCase();
        const act = (x.action || "").toLowerCase();
        const eid = String(x.entityId || x.entity_id || "");
        return d.includes(qq) || ent.includes(qq) || act.includes(qq) || eid.includes(qq);
      });
    }

    r = r.slice(0, Math.min(Math.max(Number(limit) || 200, 1), 500));
    return r;
  }, [rows, action, entity, userId, q, limit]);

  return (
    <div>
      <Nav active="audit" />
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Audit Logs</h1>
            <p className="text-sm text-gray-600 mt-1">
              Who did what, when. This is accountability.
            </p>
          </div>
          <button onClick={load} className="px-4 py-2 rounded-lg bg-black text-white">
            Refresh
          </button>
        </div>

        {msg ? (
          <div className="mt-4 text-sm">
            <div className="p-3 rounded-lg bg-red-50 text-red-700">{msg}</div>
          </div>
        ) : null}

        {/* Filters */}
        <div className="mt-6 bg-white rounded-xl shadow p-4">
          <div className="font-semibold">Filters</div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Search (description/action/entity/id)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Action (e.g. SALE_CREATE)"
              value={action}
              onChange={(e) => setAction(e.target.value)}
            />
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Entity (e.g. sale, credit)"
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
            />
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
            <input
              className="border rounded-lg px-3 py-2"
              type="number"
              min="1"
              max="500"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Table */}
        <div className="mt-6 bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b">
            <div className="font-semibold">Logs</div>
            <div className="text-xs text-gray-500 mt-1">
              Showing {filtered.length} rows (client-filtered).
            </div>
          </div>

          {loading ? (
            <div className="p-4 text-sm text-gray-600">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left p-3">Time</th>
                    <th className="text-left p-3">User</th>
                    <th className="text-left p-3">Action</th>
                    <th className="text-left p-3">Entity</th>
                    <th className="text-left p-3">Entity ID</th>
                    <th className="text-left p-3">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-3">{formatDate(r.createdAt || r.created_at)}</td>
                      <td className="p-3">{r.userId || r.user_id}</td>
                      <td className="p-3 font-medium">{r.action}</td>
                      <td className="p-3">{r.entity}</td>
                      <td className="p-3">{r.entityId || r.entity_id || "-"}</td>
                      <td className="p-3 text-gray-700">{r.description || r.message || "-"}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 ? (
                    <tr>
                      <td className="p-4 text-sm text-gray-600" colSpan={6}>No logs.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}
