"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiFetch } from "../lib/api";

const ENDPOINT = "/users";

function safeDate(v) {
  if (!v) return "-";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

export default function ManagerUsersPanel({ title = "Staff (view-only)" }) {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINT, { method: "GET" });
      const list = data?.users ?? data?.items ?? data?.rows ?? [];
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setRows([]);
      setMsg(e?.data?.error || e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const qq = String(q || "")
      .trim()
      .toLowerCase();
    let list = Array.isArray(rows) ? rows : [];

    if (onlyActive) {
      list = list.filter((u) => u?.isActive === true);
    }

    if (!qq) return list;

    return list.filter((u) => {
      const id = String(u.id ?? "");
      const name = String(u.name ?? "").toLowerCase();
      const email = String(u.email ?? "").toLowerCase();
      const role = String(u.role ?? "").toLowerCase();
      return (
        id.includes(qq) ||
        name.includes(qq) ||
        email.includes(qq) ||
        role.includes(qq)
      );
    });
  }, [rows, q, onlyActive]);

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-lg font-bold">{title}</div>
          <div className="text-xs text-gray-500 mt-1">
            Manager can view staff list, but cannot edit roles or status.
          </div>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <input
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="Search (id, name, email, role)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
            />
            Active only
          </label>
          <button
            onClick={load}
            className="px-4 py-2 rounded-lg bg-black text-white text-sm"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {msg ? (
        <div className="p-4 text-sm">
          <div className="p-3 rounded-lg bg-red-50 text-red-700">{msg}</div>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3">ID</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Active</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3 font-medium">{u.id}</td>
                <td className="p-3">{u.name ?? "-"}</td>
                <td className="p-3">{u.email ?? "-"}</td>
                <td className="p-3">{u.role ?? "-"}</td>
                <td className="p-3">{u.isActive ? "Yes" : "No"}</td>
                <td className="p-3">{safeDate(u.createdAt)}</td>
              </tr>
            ))}

            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-sm text-gray-600">
                  {loading ? "Loading..." : "No users found."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
