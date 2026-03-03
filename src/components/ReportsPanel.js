"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import AsyncButton from "./AsyncButton";

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
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString();
}

function fmtDate(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Banner({ kind = "info", children }) {
  const cls =
    kind === "danger"
      ? "bg-rose-50 text-rose-900 border-rose-200"
      : kind === "success"
        ? "bg-emerald-50 text-emerald-900 border-emerald-200"
        : "bg-slate-50 text-slate-800 border-slate-200";

  return <div className={cx("rounded-2xl border px-4 py-3 text-sm", cls)}>{children}</div>;
}

function Card({ title, sub, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {sub ? <div className="text-xs text-slate-600 mt-1">{sub}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function KpiCard({ title, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold text-slate-600">{title}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function SkeletonBlock({ h = "h-40" }) {
  return <div className={cx("animate-pulse rounded-2xl border border-slate-200 bg-white", h)} />;
}

export default function ReportsPanel({ title = "Reports" }) {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [sales, setSales] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);

  // Filters
  const [range, setRange] = useState("30"); // 7 | 30 | 90 | ALL
  const [lowStockThreshold, setLowStockThreshold] = useState("5");

  const [refreshState, setRefreshState] = useState("idle");

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

      setSales(pickList(salesRes, ["sales", "items", "rows", "data", "result"]) || []);
      setInventory(pickList(invRes, ["inventory", "items", "rows", "data", "result"]) || []);
      setRequests(pickList(reqRes, ["requests", "items", "rows", "data", "result"]) || []);
      setProducts(pickList(prodRes, ["products", "items", "rows", "data", "result"]) || []);
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Failed to load report data.");
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
    return list.filter((r) => String(r.status || r.state || "").toUpperCase() === "PENDING").length;
  }, [requests]);

  const inventoryTotals = useMemo(() => {
    const list = safeArray(inventory);
    const lines = list.map((p) => ({
      productId: p.productId ?? p.id ?? null,
      name: p.productName || p.name || "—",
      sku: p.sku || "—",
      qtyOnHand: Number(p.qtyOnHand ?? p.qty ?? p.quantity ?? 0),
      unitPrice: p.sellingPrice ?? p.price ?? p.unitPrice ?? null,
    }));

    const totalOnHand = lines.reduce((sum, x) => sum + (Number.isFinite(x.qtyOnHand) ? x.qtyOnHand : 0), 0);

    const t = Number(lowStockThreshold);
    const threshold = Number.isFinite(t) ? t : 5;
    const lowStock = lines
      .filter((x) => (Number.isFinite(x.qtyOnHand) ? x.qtyOnHand : 0) <= threshold)
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

  async function onRefresh() {
    setRefreshState("loading");
    await loadAll();
    setRefreshState("success");
    setTimeout(() => setRefreshState("idle"), 900);
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3 justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <div className="text-xs text-slate-600 mt-1">Simple overview for sales, stock, and requests.</div>
          </div>

          <AsyncButton
            state={refreshState}
            text="Refresh"
            loadingText="Loading…"
            successText="Done"
            onClick={onRefresh}
            variant="secondary"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-600">Range</div>
            <select
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-300"
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
            <div className="text-xs font-semibold text-slate-600">Low stock limit</div>
            <input
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm w-32 outline-none focus:ring-2 focus:ring-slate-300"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              placeholder="Example: 5"
              inputMode="numeric"
            />
          </div>

          <div className="text-xs text-slate-500">
            Products loaded: <b>{safeArray(products).length}</b>
          </div>
        </div>

        {msg ? (
          <div className="mt-4">
            <Banner kind="danger">{msg}</Banner>
          </div>
        ) : null}
      </div>

      {loading ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <SkeletonBlock h="h-24" />
            <SkeletonBlock h="h-24" />
            <SkeletonBlock h="h-24" />
            <SkeletonBlock h="h-24" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SkeletonBlock h="h-72" />
            <SkeletonBlock h="h-72" />
          </div>
          <SkeletonBlock h="h-72" />
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <KpiCard title="Sales (count)" value={String(salesInRange.length)} />
            <KpiCard title="Revenue (sum)" value={fmtMoney(totalRevenue)} />
            <KpiCard title="Inventory on hand (total qty)" value={String(inventoryTotals.totalOnHand)} />
            <KpiCard title="Pending requests" value={String(pendingRequestsCount)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Sales by status" sub="Count of sales in this range">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr className="border-b border-slate-200">
                      <th className="text-left p-3 text-xs font-semibold">Status</th>
                      <th className="text-right p-3 text-xs font-semibold">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesByStatus.map(([st, count]) => (
                      <tr key={st} className="border-b border-slate-100">
                        <td className="p-3 font-semibold text-slate-900">{st}</td>
                        <td className="p-3 text-right">{count}</td>
                      </tr>
                    ))}
                    {salesByStatus.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="p-4 text-sm text-slate-600">
                          No sales yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Latest sales" sub="Last 10 sales in this range">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr className="border-b border-slate-200">
                      <th className="text-left p-3 text-xs font-semibold">Status</th>
                      <th className="text-left p-3 text-xs font-semibold">Customer</th>
                      <th className="text-right p-3 text-xs font-semibold">Total</th>
                      <th className="text-left p-3 text-xs font-semibold">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestSales.map((s) => (
                      <tr key={s.id} className="border-b border-slate-100">
                        <td className="p-3 font-semibold text-slate-900">{s.status || "—"}</td>
                        <td className="p-3">{s.customerName || "—"}</td>
                        <td className="p-3 text-right">{fmtMoney(s.totalAmount ?? s.total)}</td>
                        <td className="p-3">{fmtDate(s.createdAt || s.created_at)}</td>
                      </tr>
                    ))}
                    {latestSales.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-sm text-slate-600">
                          No sales to show.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <Card title="Low stock" sub={`Items with qty ≤ ${inventoryTotals.threshold}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr className="border-b border-slate-200">
                    <th className="text-left p-3 text-xs font-semibold">Product</th>
                    <th className="text-left p-3 text-xs font-semibold">SKU</th>
                    <th className="text-right p-3 text-xs font-semibold">On hand</th>
                    <th className="text-right p-3 text-xs font-semibold">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryTotals.lowStock.map((p) => (
                    <tr key={`${p.productId}-${p.sku}`} className="border-b border-slate-100">
                      <td className="p-3 font-semibold text-slate-900">{p.name}</td>
                      <td className="p-3 text-slate-600">{p.sku}</td>
                      <td className="p-3 text-right">{p.qtyOnHand}</td>
                      <td className="p-3 text-right">{p.unitPrice != null ? fmtMoney(p.unitPrice) : "—"}</td>
                    </tr>
                  ))}

                  {inventoryTotals.lowStock.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-sm text-slate-600">
                        No low stock items (or inventory is empty).
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}