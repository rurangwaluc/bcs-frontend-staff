"use client";

import Nav from "../../components/Nav";
import { apiFetch } from "../../lib/api";
import { useState } from "react";

export default function CustomersPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [results, setResults] = useState([]);

  async function search() {
    const term = q.trim();
    if (!term) return;

    setLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(`/customers/search?q=${encodeURIComponent(term)}`, { method: "GET" });
      setResults(data.customers || data.results || []);
    } catch (e) {
      setMsg(e?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Nav active="customers" />
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <p className="text-sm text-gray-600 mt-1">Search by name or phone.</p>

        {msg ? (
          <div className="mt-4 text-sm">
            <div className="p-3 rounded-lg bg-red-50 text-red-700">{msg}</div>
          </div>
        ) : null}

        <div className="mt-6 bg-white rounded-xl shadow p-4">
          <div className="font-semibold">Search</div>
          <div className="mt-3 flex gap-2">
            <input
              className="flex-1 border rounded-lg px-3 py-2"
              placeholder="e.g. 0788 or Jean"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") search(); }}
            />
            <button
              onClick={search}
              className="px-4 py-2 rounded-lg bg-black text-white"
              disabled={loading}
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b">
            <div className="font-semibold">Results</div>
            <div className="text-xs text-gray-500 mt-1">
              {results.length ? `Found ${results.length} customer(s)` : "No results yet"}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left p-3">ID</th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Phone</th>
                  <th className="text-left p-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {results.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3">{c.id}</td>
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3">{c.phone}</td>
                    <td className="p-3">{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-sm text-gray-600">
                      Search a customer to see results.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t text-xs text-gray-500">
            Tip: to view a customer’s history in Phase 1, use the Sales page search with their phone number.
          </div>
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
