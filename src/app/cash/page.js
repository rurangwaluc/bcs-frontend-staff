"use client";

import { useEffect, useMemo, useState } from "react";

import Nav from "../../components/Nav";
import { apiFetch } from "../../lib/api";

const DIRECTIONS = ["", "IN", "OUT"];
const TYPES = [
  "", // all
  "SALE_PAYMENT",
  "VERSEMENT",
  "PETTY_CASH",
  "CREDIT_SETTLEMENT",
  "ADJUSTMENT"
];

export default function CashPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [direction, setDirection] = useState("");
  const [type, setType] = useState("");
  const [limit, setLimit] = useState(100);

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const data = await apiFetch("/cash/ledger", { method: "GET" });
      setRows(data.ledger || data.rows || []);
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
    if (direction) r = r.filter((x) => (x.direction || "").toUpperCase() === direction);
    if (type) r = r.filter((x) => (x.type || "").toUpperCase() === type);
    r = r.slice(0, Math.min(Math.max(Number(limit) || 100, 1), 500));
    return r;
  }, [rows, direction, type, limit]);

  const summary = useMemo(() => {
    let inTotal = 0;
    let outTotal = 0;
    for (const x of filtered) {
      const amt = Number(x.amount || 0);
      if ((x.direction || "").toUpperCase() === "IN") inTotal += amt;
      if ((x.direction || "").toUpperCase() === "OUT") outTotal += amt;
    }
    return { inTotal, outTotal, net: inTotal - outTotal };
  }, [filtered]);

  return (
    <div>
      <Nav active="cash" />
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Cash Ledger</h1>
            <p className="text-sm text-gray-600 mt-1">
              Every money movement. Auditable.
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

        {/* Summary cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card label="IN (filtered)" value={summary.inTotal} />
          <Card label="OUT (filtered)" value={summary.outTotal} />
          <Card label="NET (filtered)" value={summary.net} />
        </div>

        {/* Filters */}
        <div className="mt-6 bg-white rounded-xl shadow p-4">
          <div className="font-semibold">Filters</div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
            <select className="border rounded-lg px-3 py-2" value={direction} onChange={(e) => setDirection(e.target.value)}>
              {DIRECTIONS.map((d) => (
                <option key={d} value={d}>{d ? d : "ALL directions"}</option>
              ))}
            </select>

            <select className="border rounded-lg px-3 py-2" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t} value={t}>{t ? t : "ALL types"}</option>
              ))}
            </select>

            <input
              className="border rounded-lg px-3 py-2"
              type="number"
              min="1"
              max="500"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            />

            <button
              onClick={() => { /* filters are client side */ }}
              className="rounded-lg bg-black text-white px-4 py-2"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="mt-6 bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b">
            <div className="font-semibold">Ledger entries</div>
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
                    <th className="text-left p-3">Type</th>
                    <th className="text-left p-3">Direction</th>
                    <th className="text-right p-3">Amount</th>
                    <th className="text-left p-3">User</th>
                    <th className="text-left p-3">Ref</th>
                    <th className="text-left p-3">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-3">{formatDate(r.createdAt || r.time || r.created_at)}</td>
                      <td className="p-3">{r.type}</td>
                      <td className="p-3">{r.direction}</td>
                      <td className="p-3 text-right">{r.amount}</td>
                      <td className="p-3">{r.userId || r.user_id || "-"}</td>
                      <td className="p-3">
                        {r.saleId ? `sale:${r.saleId}` : r.creditId ? `credit:${r.creditId}` : r.ref || "-"}
                      </td>
                      <td className="p-3 text-gray-600">{r.note || r.description || "-"}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 ? (
                    <tr>
                      <td className="p-4 text-sm text-gray-600" colSpan={7}>No ledger entries.</td>
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

function Card({ label, value }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
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
