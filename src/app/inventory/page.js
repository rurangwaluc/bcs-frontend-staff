"use client";

import { useEffect, useMemo, useState } from "react";

import Nav from "../../components/Nav";
import { apiFetch } from "../../lib/api";

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const data = await apiFetch("/inventory", { method: "GET" });
      setItems(data.inventory || data.items || []);
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
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter((it) => {
      const name = (it.name || "").toLowerCase();
      const sku = (it.sku || "").toLowerCase();
      return name.includes(qq) || sku.includes(qq);
    });
  }, [items, q]);

  return (
    <div>
      <Nav active="inventory" />
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Inventory</h1>
            <p className="text-sm text-gray-600 mt-1">
              Read-only inventory view (Phase 1).
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

        <div className="mt-6 bg-white rounded-xl shadow p-4">
          <div className="font-semibold">Search</div>
          <input
            className="mt-2 w-full border rounded-lg px-3 py-2"
            placeholder="Search by name or SKU"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="mt-6 bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b">
            <div className="font-semibold">Items</div>
            <div className="text-xs text-gray-500 mt-1">
              Showing {filtered.length} items
            </div>
          </div>

          {loading ? (
            <div className="p-4 text-sm text-gray-600">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left p-3">ID</th>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">SKU</th>
                    <th className="text-left p-3">Unit</th>
                    <th className="text-right p-3">Selling</th>
                    <th className="text-right p-3">Qty on hand</th>
                    <th className="text-left p-3">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((it) => (
                    <tr key={it.id} className="border-t">
                      <td className="p-3">{it.id}</td>
                      <td className="p-3 font-medium">{it.name}</td>
                      <td className="p-3 text-gray-600">{it.sku}</td>
                      <td className="p-3">{it.unit}</td>
                      <td className="p-3 text-right">{it.sellingPrice}</td>
                      <td className="p-3 text-right">{it.qtyOnHand}</td>
                      <td className="p-3">{formatDate(it.updatedAt)}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-sm text-gray-600">No inventory items.</td>
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
