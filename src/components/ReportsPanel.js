"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiFetch } from "../lib/api";

/**
 * Reports are computed client-side from existing endpoints:
 * - GET /sales
 * - GET /inventory
 * - GET /requests
 * - GET /products
 *
 * This avoids needing a /reports backend route.
 */

const ENDPOINTS = {
  SALES_LIST: "/sales",
  INVENTORY_LIST: "/inventory",
  REQUESTS_LIST: "/requests",
  PRODUCTS_LIST: "/products",
};

function safeArray(x) {
  return Array.isArray(x) ? x : [];
}

function pickList(data, keys) {
  for (const k of keys) {
    if (Array.isArray(data?.[k])) return data[k];
  }
  return [];
}

function parseDateMaybe(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function fmtMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString();
}

function fmtDate(v) {
  if (!v) return "-";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

export default function ReportsPanel() {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [sales, setSales] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);

  // Filters
  const [range, setRange] = useState("30"); // 7 | 30 | 90 | ALL
  const [lowStockThreshold, setLowStockThreshold] = useState("5");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setMsg("");

    try {
      const [salesRes, invRes, reqRes, prodRes] = await Promise.all([
        apiFetch(ENDPOINTS.SALES_LIST, { method: "GET" }),
        apiFetch(ENDPOINTS.INVENTORY_LIST, { method: "GET" }),
        apiFetch(ENDPOINTS.REQUESTS_LIST, { method: "GET" }),
        apiFetch(ENDPOINTS.PRODUCTS_LIST, { method: "GET" }),
      ]);

      setSales(
        pickList(salesRes, ["sales", "items", "rows", "data", "result"]) || [],
      );
      setInventory(
        pickList(invRes, ["inventory", "items", "rows", "data", "result"]) ||
          [],
      );
      setRequests(
        pickList(reqRes, ["requests", "items", "rows", "data", "result"]) || [],
      );
      setProducts(
        pickList(prodRes, ["products", "items", "rows", "data", "result"]) ||
          [],
      );
    } catch (e) {
      setMsg(e?.data?.error || e.message || "Failed to load report data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const rangeMs = useMemo(() => {
    if (range === "ALL") return null;
    const days = Number(range);
    if (!Number.isFinite(days)) return null;
    return days * 24 * 60 * 60 * 1000;
  }, [range]);

  const salesInRange = useMemo(() => {
    const list = safeArray(sales);
    if (!rangeMs) return list;

    const cutoff = Date.now() - rangeMs;
    return list.filter((s) => {
      const d = parseDateMaybe(s.createdAt || s.created_at);
      return d ? d.getTime() >= cutoff : true;
    });
  }, [sales, rangeMs]);

  const totalRevenue = useMemo(() => {
    // your sales list may return totalAmount or total
    return salesInRange.reduce((sum, s) => {
      const v = s.totalAmount ?? s.total ?? 0;
      const n = Number(v);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  }, [salesInRange]);

  const salesByStatus = useMemo(() => {
    const map = {};
    for (const s of salesInRange) {
      const st = String(s.status || "UNKNOWN").toUpperCase();
      map[st] = (map[st] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [salesInRange]);

  const pendingRequestsCount = useMemo(() => {
    const list = safeArray(requests);
    return list.filter(
      (r) => String(r.status || r.state || "").toUpperCase() === "PENDING",
    ).length;
  }, [requests]);

  const inventoryTotals = useMemo(() => {
    const list = safeArray(inventory);
    const lines = list.map((p) => ({
      productId: p.productId ?? p.id ?? null,
      name: p.productName || p.name || "-",
      sku: p.sku || "-",
      qtyOnHand: Number(p.qtyOnHand ?? p.qty ?? p.quantity ?? 0),
      unitPrice: p.sellingPrice ?? p.price ?? p.unitPrice ?? null,
    }));

    const totalOnHand = lines.reduce(
      (sum, x) => sum + (Number.isFinite(x.qtyOnHand) ? x.qtyOnHand : 0),
      0,
    );

    // Low stock list
    const t = Number(lowStockThreshold);
    const threshold = Number.isFinite(t) ? t : 5;
    const lowStock = lines
      .filter(
        (x) => (Number.isFinite(x.qtyOnHand) ? x.qtyOnHand : 0) <= threshold,
      )
      .sort((a, b) => a.qtyOnHand - b.qtyOnHand);

    return { lines, totalOnHand, lowStock, threshold };
  }, [inventory, lowStockThreshold]);

  const latestSales = useMemo(() => {
    const list = safeArray(salesInRange);
    const sorted = [...list].sort((a, b) => {
      const da = parseDateMaybe(a.createdAt || a.created_at)?.getTime() || 0;
      const db = parseDateMaybe(b.createdAt || b.created_at)?.getTime() || 0;
      return db - da;
    });
    return sorted.slice(0, 10);
  }, [salesInRange]);

  return (
    <div className="mt-6">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <div className="text-xs text-gray-500">Range</div>
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="ALL">All time</option>
          </select>
        </div>

        <div>
          <div className="text-xs text-gray-500">Low stock threshold</div>
          <input
            className="border rounded-lg px-3 py-2 text-sm w-32"
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(e.target.value)}
            placeholder="e.g. 5"
          />
        </div>

        <button
          onClick={loadAll}
          className="px-4 py-2 rounded-lg bg-black text-white text-sm"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {msg ? (
        <div className="mt-4 text-sm">
          <div className="p-3 rounded-lg bg-red-50 text-red-700">{msg}</div>
        </div>
      ) : null}

      {/* KPI Cards */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
        <KpiCard title="Sales (count)" value={salesInRange.length} />
        <KpiCard title="Revenue (sum)" value={fmtMoney(totalRevenue)} />
        <KpiCard
          title="Inventory on hand (total qty)"
          value={inventoryTotals.totalOnHand}
        />
        <KpiCard title="Pending requests" value={pendingRequestsCount} />
      </div>

      {/* Sales by status + Latest sales */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b">
            <div className="font-semibold">Sales by status</div>
            <div className="text-xs text-gray-500 mt-1">
              Computed from GET /sales
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Count</th>
                </tr>
              </thead>
              <tbody>
                {salesByStatus.map(([st, count]) => (
                  <tr key={st} className="border-t">
                    <td className="p-3 font-medium">{st}</td>
                    <td className="p-3 text-right">{count}</td>
                  </tr>
                ))}
                {salesByStatus.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="p-4 text-sm text-gray-600">
                      No sales yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b">
            <div className="font-semibold">Latest sales</div>
            <div className="text-xs text-gray-500 mt-1">
              Last 10 records in this range
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left p-3">ID</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-left p-3">Customer</th>
                  <th className="text-left p-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {latestSales.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-3 font-medium">{s.id}</td>
                    <td className="p-3">{s.status || "-"}</td>
                    <td className="p-3 text-right">
                      {fmtMoney(s.totalAmount ?? s.total)}
                    </td>
                    <td className="p-3">{s.customerName || "-"}</td>
                    <td className="p-3">{fmtDate(s.createdAt)}</td>
                  </tr>
                ))}
                {latestSales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-sm text-gray-600">
                      No sales to show.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Low stock table */}
      <div className="mt-4 bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold">Low stock</div>
            <div className="text-xs text-gray-500 mt-1">
              Qty ≤ {inventoryTotals.threshold} (from GET /inventory)
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Products loaded: {safeArray(products).length}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-3">Product</th>
                <th className="text-left p-3">SKU</th>
                <th className="text-right p-3">On hand</th>
                <th className="text-right p-3">Price</th>
              </tr>
            </thead>
            <tbody>
              {inventoryTotals.lowStock.map((p) => (
                <tr key={`${p.productId}-${p.sku}`} className="border-t">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 text-gray-600">{p.sku}</td>
                  <td className="p-3 text-right">{p.qtyOnHand}</td>
                  <td className="p-3 text-right">
                    {p.unitPrice != null ? fmtMoney(p.unitPrice) : "-"}
                  </td>
                </tr>
              ))}
              {inventoryTotals.lowStock.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-sm text-gray-600">
                    No low stock items (or inventory empty).
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
