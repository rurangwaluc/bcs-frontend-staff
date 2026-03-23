"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import AsyncButton from "./AsyncButton";
import { apiFetch } from "../lib/api";

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
      ? "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
      : kind === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
        : "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200";

  return (
    <div className={cx("rounded-2xl border px-4 py-3 text-sm", cls)}>
      {children}
    </div>
  );
}

function Card({ title, sub, children }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
        <div className="text-sm font-black text-slate-950 dark:text-slate-50">
          {title}
        </div>
        {sub ? (
          <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {sub}
          </div>
        ) : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function KpiCard({ title, value, sub, tone = "neutral" }) {
  const toneCls =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20"
        : tone === "danger"
          ? "border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/20"
          : tone === "info"
            ? "border-sky-200 bg-sky-50 dark:border-sky-900/50 dark:bg-sky-950/20"
            : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950";

  return (
    <div className={cx("rounded-[24px] border p-4 shadow-sm", toneCls)}>
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">
        {title}
      </div>
      <div className="mt-2 break-words text-2xl font-black text-slate-950 dark:text-slate-50">
        {value}
      </div>
      {sub ? (
        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function SkeletonBlock({ h = "h-40" }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded-[24px] border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900",
        h,
      )}
    />
  );
}

function EmptyState({ title, hint }) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
        {title}
      </div>
      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        {hint}
      </div>
    </div>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition",
        "placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200",
        "dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500 dark:focus:ring-slate-800",
        className,
      )}
    />
  );
}

function Select({ className = "", ...props }) {
  return (
    <select
      {...props}
      className={cx(
        "w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition",
        "focus:border-slate-500 focus:ring-2 focus:ring-slate-200",
        "dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-800",
        className,
      )}
    />
  );
}

function MobileReportRow({ title, lines = [] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="text-sm font-black text-slate-950 dark:text-slate-50">
        {title}
      </div>
      <div className="mt-3 grid gap-2">
        {lines.map((line, idx) => (
          <div
            key={idx}
            className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
          >
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {line.label}
            </span>
            <span className="text-right text-sm font-semibold text-slate-950 dark:text-slate-50">
              {line.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportsPanel({ title = "Reports" }) {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [sales, setSales] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);

  const [range, setRange] = useState("30");
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
    return safeArray(requests).filter(
      (r) => String(r.status || r.state || "").toUpperCase() === "PENDING",
    ).length;
  }, [requests]);

  const inventoryTotals = useMemo(() => {
    const list = safeArray(inventory);
    const lines = list.map((p) => {
      const qtyOnHand = Number(p.qtyOnHand ?? p.qty ?? p.quantity ?? 0);
      const purchasePrice = Number(
        p.purchasePrice ?? p.costPrice ?? p.cost_price ?? 0,
      );
      return {
        productId: p.productId ?? p.id ?? null,
        name: p.productName || p.name || "—",
        sku: p.sku || "—",
        qtyOnHand: Number.isFinite(qtyOnHand) ? qtyOnHand : 0,
        unitPrice: p.sellingPrice ?? p.price ?? p.unitPrice ?? null,
        purchasePrice: Number.isFinite(purchasePrice) ? purchasePrice : 0,
        inventoryValue:
          (Number.isFinite(qtyOnHand) ? qtyOnHand : 0) *
          (Number.isFinite(purchasePrice) ? purchasePrice : 0),
      };
    });

    const totalOnHand = lines.reduce((sum, x) => sum + x.qtyOnHand, 0);
    const totalInventoryValue = lines.reduce(
      (sum, x) => sum + x.inventoryValue,
      0,
    );

    const t = Number(lowStockThreshold);
    const threshold = Number.isFinite(t) ? t : 5;

    const lowStock = lines
      .filter((x) => x.qtyOnHand <= threshold)
      .sort((a, b) => a.qtyOnHand - b.qtyOnHand);

    return { lines, totalOnHand, totalInventoryValue, lowStock, threshold };
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
      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="text-lg font-black tracking-[-0.02em] text-slate-950 dark:text-slate-50">
              {title}
            </div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Sales, stock, and request visibility in one operational reports
              view.
            </div>
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

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div>
            <div className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">
              Range
            </div>
            <Select value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="ALL">All time</option>
            </Select>
          </div>

          <div>
            <div className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">
              Low stock limit
            </div>
            <Input
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              placeholder="Example: 5"
              inputMode="numeric"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
              Loaded products
            </div>
            <div className="mt-1 text-lg font-black text-slate-950 dark:text-slate-50">
              {safeArray(products).length}
            </div>
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
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SkeletonBlock h="h-28" />
            <SkeletonBlock h="h-28" />
            <SkeletonBlock h="h-28" />
            <SkeletonBlock h="h-28" />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <SkeletonBlock h="h-80" />
            <SkeletonBlock h="h-80" />
          </div>
          <SkeletonBlock h="h-80" />
        </>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              title="Sales count"
              value={
                <span className="text-[19px] font-semibold tracking-tight">
                  {salesInRange.length.toLocaleString()}
                </span>
              }
              sub="In selected range"
              tone="info"
            />

            <KpiCard
              title="Revenue"
              value={
                <span className="text-[19px] font-semibold tracking-tight">
                  {fmtMoney(totalRevenue)} RWF
                </span>
              }
              sub="Sales total"
              tone="success"
            />

            <KpiCard
              title="Inventory qty"
              value={
                <span className="text-[19px] font-semibold tracking-tight">
                  {inventoryTotals.totalOnHand.toLocaleString()}
                </span>
              }
              sub="Total units on hand"
            />

            <KpiCard
              title="Inventory value"
              value={
                <span className="text-[19px] font-semibold tracking-tight">
                  {fmtMoney(inventoryTotals.totalInventoryValue)} RWF
                </span>
              }
              sub="Qty × purchase price"
              tone="warn"
            />

            <KpiCard
              title="Pending requests"
              value={
                <span className="text-[19px] font-semibold tracking-tight">
                  {pendingRequestsCount.toLocaleString()}
                </span>
              }
              sub="Awaiting action"
              tone={pendingRequestsCount > 0 ? "danger" : "neutral"}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card title="Sales by status" sub="Count of sales in this range">
              {salesByStatus.length === 0 ? (
                <EmptyState
                  title="No sales yet"
                  hint="Nothing in the selected range."
                />
              ) : (
                <>
                  <div className="grid gap-3 md:hidden">
                    {salesByStatus.map(([st, count]) => (
                      <MobileReportRow
                        key={st}
                        title={st}
                        lines={[{ label: "Count", value: count }]}
                      />
                    ))}
                  </div>

                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                        <tr className="border-b border-slate-200 dark:border-slate-800">
                          <th className="p-3 text-left text-xs font-semibold">
                            Status
                          </th>
                          <th className="p-3 text-right text-xs font-semibold">
                            Count
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesByStatus.map(([st, count]) => (
                          <tr
                            key={st}
                            className="border-b border-slate-100 dark:border-slate-900"
                          >
                            <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                              {st}
                            </td>
                            <td className="p-3 text-right text-slate-700 dark:text-slate-300">
                              {count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Card>

            <Card title="Latest sales" sub="Last 10 sales in this range">
              {latestSales.length === 0 ? (
                <EmptyState
                  title="No sales to show"
                  hint="Nothing matches the selected range."
                />
              ) : (
                <>
                  <div className="grid gap-3 md:hidden">
                    {latestSales.map((s) => (
                      <MobileReportRow
                        key={s.id}
                        title={s.customerName || "Customer"}
                        lines={[
                          { label: "Status", value: s.status || "—" },
                          {
                            label: "Total",
                            value: `${fmtMoney(s.totalAmount ?? s.total)} RWF`,
                          },
                          {
                            label: "Time",
                            value: fmtDate(s.createdAt || s.created_at),
                          },
                        ]}
                      />
                    ))}
                  </div>

                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                        <tr className="border-b border-slate-200 dark:border-slate-800">
                          <th className="p-3 text-left text-xs font-semibold">
                            Status
                          </th>
                          <th className="p-3 text-left text-xs font-semibold">
                            Customer
                          </th>
                          <th className="p-3 text-right text-xs font-semibold">
                            Total
                          </th>
                          <th className="p-3 text-left text-xs font-semibold">
                            Time
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {latestSales.map((s) => (
                          <tr
                            key={s.id}
                            className="border-b border-slate-100 dark:border-slate-900"
                          >
                            <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                              {s.status || "—"}
                            </td>
                            <td className="p-3 text-slate-700 dark:text-slate-300">
                              {s.customerName || "—"}
                            </td>
                            <td className="p-3 text-right text-slate-700 dark:text-slate-300">
                              {fmtMoney(s.totalAmount ?? s.total)}
                            </td>
                            <td className="p-3 text-slate-700 dark:text-slate-300">
                              {fmtDate(s.createdAt || s.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Card>
          </div>

          <Card
            title="Low stock"
            sub={`Items with qty less than or equal to ${inventoryTotals.threshold}`}
          >
            {inventoryTotals.lowStock.length === 0 ? (
              <EmptyState
                title="No low stock items"
                hint="Inventory is healthy or inventory data is empty."
              />
            ) : (
              <>
                <div className="grid gap-3 md:hidden">
                  {inventoryTotals.lowStock.map((p) => (
                    <MobileReportRow
                      key={`${p.productId}-${p.sku}`}
                      title={p.name}
                      lines={[
                        { label: "SKU", value: p.sku },
                        { label: "On hand", value: p.qtyOnHand },
                        {
                          label: "Price",
                          value:
                            p.unitPrice != null
                              ? `${fmtMoney(p.unitPrice)} RWF`
                              : "—",
                        },
                        {
                          label: "Inventory value",
                          value: `${fmtMoney(p.inventoryValue)} RWF`,
                        },
                      ]}
                    />
                  ))}
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        <th className="p-3 text-left text-xs font-semibold">
                          Product
                        </th>
                        <th className="p-3 text-left text-xs font-semibold">
                          SKU
                        </th>
                        <th className="p-3 text-right text-xs font-semibold">
                          On hand
                        </th>
                        <th className="p-3 text-right text-xs font-semibold">
                          Price
                        </th>
                        <th className="p-3 text-right text-xs font-semibold">
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryTotals.lowStock.map((p) => (
                        <tr
                          key={`${p.productId}-${p.sku}`}
                          className="border-b border-slate-100 dark:border-slate-900"
                        >
                          <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                            {p.name}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">
                            {p.sku}
                          </td>
                          <td className="p-3 text-right text-slate-700 dark:text-slate-300">
                            {p.qtyOnHand}
                          </td>
                          <td className="p-3 text-right text-slate-700 dark:text-slate-300">
                            {p.unitPrice != null ? fmtMoney(p.unitPrice) : "—"}
                          </td>
                          <td className="p-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                            {fmtMoney(p.inventoryValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
