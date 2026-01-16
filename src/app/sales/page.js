"use client";

import { useEffect, useState } from "react";

import Nav from "../../components/Nav";
import { apiFetch } from "../../lib/api";

const STATUSES = [
  "", // all
  "DRAFT",
  "PENDING",
  "AWAITING_PAYMENT_RECORD",
  "COMPLETED",
  "CANCELED"
];

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [limit, setLimit] = useState(50);

  const [selectedId, setSelectedId] = useState(null);
  const [saleDetail, setSaleDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (q) params.set("q", q);
      if (sellerId) params.set("sellerId", sellerId);
      if (limit) params.set("limit", String(limit));

      const data = await apiFetch(`/sales?${params.toString()}`, { method: "GET" });
      setSales(data.sales || []);
    } catch (e) {
      setMsg(e?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  async function openSale(id) {
    setSelectedId(id);
    setSaleDetail(null);
    setDetailLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(`/sales/${id}`, { method: "GET" });
      setSaleDetail(data.sale);
    } catch (e) {
      setMsg(e?.data?.error || e.message);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <Nav active="sales" />
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Sales</h1>
            <p className="text-sm text-gray-600 mt-1">
              List + details (read-only).
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
            <select className="border rounded-lg px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s ? s : "ALL"}</option>
              ))}
            </select>

            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Search customer name or phone"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Seller ID (optional)"
              value={sellerId}
              onChange={(e) => setSellerId(e.target.value)}
            />

            <input
              className="border rounded-lg px-3 py-2"
              type="number"
              min="1"
              max="200"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            />

            <button onClick={load} className="rounded-lg bg-black text-white px-4 py-2">
              Apply
            </button>
          </div>
        </div>

        {/* Main split */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* List */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b">
              <div className="font-semibold">Sales list</div>
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
                      <th className="text-left p-3">Total</th>
                      <th className="text-left p-3">Customer</th>
                      <th className="text-left p-3">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((s) => (
                      <tr
                        key={s.id}
                        className={"border-t cursor-pointer hover:bg-gray-50 " + (selectedId === s.id ? "bg-gray-50" : "")}
                        onClick={() => openSale(s.id)}
                      >
                        <td className="p-3 font-medium">{s.id}</td>
                        <td className="p-3">{s.status}</td>
                        <td className="p-3">{s.totalAmount}</td>
                        <td className="p-3">
                          <div className="font-medium">{s.customerName || "-"}</div>
                          <div className="text-xs text-gray-500">{s.customerPhone || ""}</div>
                        </td>
                        <td className="p-3">{formatDate(s.createdAt)}</td>
                      </tr>
                    ))}
                    {sales.length === 0 ? (
                      <tr>
                        <td className="p-4 text-sm text-gray-600" colSpan={5}>No sales found.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detail */}
          <div className="bg-white rounded-xl shadow">
            <div className="p-4 border-b">
              <div className="font-semibold">Sale detail</div>
              <div className="text-xs text-gray-500 mt-1">
                Click a sale from the list.
              </div>
            </div>

            {detailLoading ? (
              <div className="p-4 text-sm text-gray-600">Loading detail...</div>
            ) : saleDetail ? (
              <SaleDetail sale={saleDetail} />
            ) : (
              <div className="p-4 text-sm text-gray-600">No sale selected.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SaleDetail({ sale }) {
  return (
    <div className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-gray-500">Sale #{sale.id}</div>
          <div className="text-lg font-semibold mt-1">{sale.status}</div>
          <div className="text-sm text-gray-600 mt-1">Total: <span className="font-medium">{sale.totalAmount}</span></div>
        </div>
        <div className="text-right text-xs text-gray-500">
          <div>Created: {formatDate(sale.createdAt)}</div>
          {sale.updatedAt ? <div>Updated: {formatDate(sale.updatedAt)}</div> : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border rounded-lg p-3">
          <div className="text-xs text-gray-500">Customer</div>
          <div className="font-medium">{sale.customerName || "-"}</div>
          <div className="text-sm text-gray-600">{sale.customerPhone || ""}</div>
        </div>

        <div className="border rounded-lg p-3">
          <div className="text-xs text-gray-500">Seller ID</div>
          <div className="font-medium">{sale.sellerId}</div>
          <div className="text-xs text-gray-500 mt-1">Customer ID: {sale.customerId || "-"}</div>
        </div>
      </div>

      {sale.status === "CANCELED" ? (
        <div className="mt-4 border rounded-lg p-3 bg-red-50">
          <div className="text-xs text-red-700">Canceled</div>
          <div className="text-sm text-red-700 mt-1">{sale.cancelReason || "-"}</div>
          <div className="text-xs text-red-700 mt-1">
            By: {sale.canceledBy || "-"} • At: {sale.canceledAt ? formatDate(sale.canceledAt) : "-"}
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        <div className="font-semibold">Items</div>
        <div className="mt-2 overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-3">Product</th>
                <th className="text-left p-3">SKU</th>
                <th className="text-right p-3">Qty</th>
                <th className="text-right p-3">Unit</th>
                <th className="text-right p-3">Line</th>
              </tr>
            </thead>
            <tbody>
              {sale.items?.map((it) => (
                <tr key={it.id} className="border-t">
                  <td className="p-3">{it.productName}</td>
                  <td className="p-3 text-gray-600">{it.sku}</td>
                  <td className="p-3 text-right">{it.qty}</td>
                  <td className="p-3 text-right">{it.unitPrice}</td>
                  <td className="p-3 text-right">{it.lineTotal}</td>
                </tr>
              ))}
              {!sale.items?.length ? (
                <tr>
                  <td colSpan={5} className="p-4 text-sm text-gray-600">No items.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
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
