"use client";

import { useEffect, useMemo, useState } from "react";

import AsyncButton from "./AsyncButton";

function safeArray(x) {
  return Array.isArray(x) ? x : [];
}

function parseDateMaybe(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
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

function Card({ title, sub, children, right = null }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-black text-slate-950 dark:text-slate-50">
            {title}
          </div>
          {sub ? (
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {sub}
            </div>
          ) : null}
        </div>
        {right}
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

function normalizeBreakdownBucketMap(bucketLike) {
  const base = {
    CASH: { count: 0, total: 0 },
    MOMO: { count: 0, total: 0 },
    BANK: { count: 0, total: 0 },
    CARD: { count: 0, total: 0 },
    OTHER: { count: 0, total: 0 },
  };

  if (!bucketLike) return base;

  if (!Array.isArray(bucketLike) && typeof bucketLike === "object") {
    return {
      CASH: {
        count: toNumber(bucketLike?.CASH?.count, 0),
        total: toNumber(bucketLike?.CASH?.total ?? bucketLike?.CASH?.amount, 0),
      },
      MOMO: {
        count: toNumber(bucketLike?.MOMO?.count, 0),
        total: toNumber(bucketLike?.MOMO?.total ?? bucketLike?.MOMO?.amount, 0),
      },
      BANK: {
        count: toNumber(bucketLike?.BANK?.count, 0),
        total: toNumber(bucketLike?.BANK?.total ?? bucketLike?.BANK?.amount, 0),
      },
      CARD: {
        count: toNumber(bucketLike?.CARD?.count, 0),
        total: toNumber(bucketLike?.CARD?.total ?? bucketLike?.CARD?.amount, 0),
      },
      OTHER: {
        count: toNumber(bucketLike?.OTHER?.count, 0),
        total: toNumber(
          bucketLike?.OTHER?.total ?? bucketLike?.OTHER?.amount,
          0,
        ),
      },
    };
  }

  for (const row of bucketLike) {
    const method = String(row?.method || row?.paymentMethod || "OTHER")
      .trim()
      .toUpperCase();

    const key = Object.prototype.hasOwnProperty.call(base, method)
      ? method
      : "OTHER";

    base[key] = {
      count: base[key].count + toNumber(row?.count, 0),
      total:
        base[key].total +
        toNumber(row?.totalAmount ?? row?.total ?? row?.amount, 0),
    };
  }

  return base;
}

function PaymentBreakdownCard({ title, buckets, tone = "neutral" }) {
  const total = Object.values(buckets || {}).reduce(
    (sum, row) => sum + toNumber(row?.total, 0),
    0,
  );

  const barTone =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "warn"
        ? "bg-amber-500"
        : tone === "danger"
          ? "bg-rose-500"
          : tone === "info"
            ? "bg-sky-500"
            : "bg-slate-400";

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="absolute inset-x-0 top-0 h-[3px]">
        <div className={cx("h-full w-14 rounded-r-full", barTone)} />
      </div>

      <div className="text-sm font-black text-slate-950 dark:text-slate-50">
        {title}
      </div>
      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        Total:{" "}
        <b className="text-slate-950 dark:text-slate-50">{fmtMoney(total)}</b>{" "}
        RWF
      </div>

      <div className="mt-4 grid gap-2">
        {["CASH", "MOMO", "BANK", "CARD", "OTHER"].map((key) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-[14px] bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900"
          >
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {key}
            </div>

            <div className="text-right">
              <div className="font-black text-slate-950 dark:text-slate-50">
                {fmtMoney(buckets?.[key]?.total || 0)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {toNumber(buckets?.[key]?.count, 0)} record(s)
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpenseSummaryCard({ title, count, total, tone = "danger" }) {
  return (
    <KpiCard
      title={title}
      value={
        <span className="text-[19px] font-semibold tracking-tight">
          {fmtMoney(total)} RWF
        </span>
      }
      sub={`${toNumber(count, 0).toLocaleString()} expense record(s)`}
      tone={tone}
    />
  );
}

export default function ReportsPanel({
  title = "Reports",

  sales = [],
  inventory = [],
  products = [],
  payments = [],
  paymentsSummary = null,
  paymentsBreakdown = null,
  expenses = [],
  expensesSummary = null,

  salesLoading = false,
  inventoryLoading = false,
  productsLoading = false,
  paymentsLoading = false,
  paySummaryLoading = false,
  payBreakdownLoading = false,
  expensesLoading = false,
  expensesSummaryLoading = false,

  invReqPendingCount = 0,

  loadSales,
  loadInventory,
  loadProducts,
  loadPayments,
  loadPaymentsSummary,
  loadPaymentsBreakdown,
  loadExpenses,
  loadExpensesSummary,
}) {
  const [msg, setMsg] = useState("");
  const [range, setRange] = useState("30");
  const [lowStockThreshold, setLowStockThreshold] = useState("5");
  const [refreshState, setRefreshState] = useState("idle");
  const [rangeAnchor, setRangeAnchor] = useState(() => Date.now());

  useEffect(() => {
    setRangeAnchor(Date.now());
  }, [range]);

  const loading =
    !!salesLoading ||
    !!inventoryLoading ||
    !!productsLoading ||
    !!paymentsLoading ||
    !!paySummaryLoading ||
    !!payBreakdownLoading ||
    !!expensesLoading ||
    !!expensesSummaryLoading;

  const rangeMs = useMemo(() => {
    if (range === "ALL") return null;
    const days = Number(range);
    if (!Number.isFinite(days)) return null;
    return days * 24 * 60 * 60 * 1000;
  }, [range]);

  const salesInRange = useMemo(() => {
    const list = safeArray(sales);

    if (!rangeMs) return list;

    const cutoff = rangeAnchor - rangeMs;

    return list.filter((s) => {
      const d = parseDateMaybe(s?.createdAt || s?.created_at);
      return d ? d.getTime() >= cutoff : true;
    });
  }, [sales, rangeMs, rangeAnchor]);

  const totalRevenue = useMemo(() => {
    return salesInRange.reduce((sum, s) => {
      return sum + toNumber(s?.totalAmount ?? s?.total, 0);
    }, 0);
  }, [salesInRange]);

  const salesByStatus = useMemo(() => {
    const map = {};

    for (const s of salesInRange) {
      const st = String(s?.status || "UNKNOWN").toUpperCase();
      map[st] = (map[st] || 0) + 1;
    }

    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [salesInRange]);

  const inventoryTotals = useMemo(() => {
    const lines = safeArray(inventory).map((p) => {
      const qtyOnHand = toNumber(p?.qtyOnHand ?? p?.qty ?? p?.quantity, 0);
      const purchasePrice = toNumber(
        p?.purchasePrice ?? p?.costPrice ?? p?.cost_price,
        0,
      );

      return {
        productId: p?.productId ?? p?.id ?? null,
        name: p?.productName || p?.name || "—",
        sku: p?.sku || "—",
        qtyOnHand,
        unitPrice:
          p?.sellingPrice ?? p?.price ?? p?.unitPrice ?? p?.unit_price ?? null,
        purchasePrice,
        inventoryValue: qtyOnHand * purchasePrice,
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
      .sort((a, b) => a.qtyOnHand - b.qtyOnHand)
      .slice(0, 20);

    return { lines, totalOnHand, totalInventoryValue, lowStock, threshold };
  }, [inventory, lowStockThreshold]);

  const latestSales = useMemo(() => {
    return safeArray(salesInRange)
      .slice()
      .sort((a, b) => {
        const da =
          parseDateMaybe(a?.createdAt || a?.created_at)?.getTime() || 0;
        const db =
          parseDateMaybe(b?.createdAt || b?.created_at)?.getTime() || 0;
        return db - da;
      })
      .slice(0, 10);
  }, [salesInRange]);

  const latestPayments = useMemo(() => {
    return safeArray(payments)
      .slice()
      .sort((a, b) => {
        const da =
          parseDateMaybe(a?.createdAt || a?.created_at)?.getTime() || 0;
        const db =
          parseDateMaybe(b?.createdAt || b?.created_at)?.getTime() || 0;
        return db - da;
      })
      .slice(0, 8);
  }, [payments]);

  const latestExpenses = useMemo(() => {
    return safeArray(expenses)
      .slice()
      .sort((a, b) => {
        const da =
          parseDateMaybe(
            a?.createdAt || a?.created_at || a?.paidAt || a?.paid_at,
          )?.getTime() || 0;
        const db =
          parseDateMaybe(
            b?.createdAt || b?.created_at || b?.paidAt || b?.paid_at,
          )?.getTime() || 0;
        return db - da;
      })
      .slice(0, 8);
  }, [expenses]);

  const normalizedBreakdown = useMemo(() => {
    return {
      today: normalizeBreakdownBucketMap(
        paymentsBreakdown?.today ||
          paymentsBreakdown?.todayTotals ||
          paymentsBreakdown?.todayByMethod,
      ),
      yesterday: normalizeBreakdownBucketMap(
        paymentsBreakdown?.yesterday ||
          paymentsBreakdown?.yesterdayTotals ||
          paymentsBreakdown?.yesterdayByMethod,
      ),
      allTime: normalizeBreakdownBucketMap(
        paymentsBreakdown?.allTime ||
          paymentsBreakdown?.all ||
          paymentsBreakdown?.allTotals ||
          paymentsBreakdown?.allTimeByMethod ||
          paymentsBreakdown,
      ),
    };
  }, [paymentsBreakdown]);

  const paymentTodayCount = toNumber(paymentsSummary?.today?.count, 0);
  const paymentTodayTotal = toNumber(paymentsSummary?.today?.total, 0);
  const paymentAllCount = toNumber(paymentsSummary?.allTime?.count, 0);
  const paymentAllTotal = toNumber(paymentsSummary?.allTime?.total, 0);

  const expenseTodayCount = toNumber(
    expensesSummary?.today?.count ?? expensesSummary?.todayCount,
    0,
  );
  const expenseTodayTotal = toNumber(
    expensesSummary?.today?.total ?? expensesSummary?.todayTotal,
    0,
  );
  const expenseAllCount = toNumber(
    expensesSummary?.allTime?.count ??
      expensesSummary?.count ??
      expensesSummary?.allCount,
    0,
  );
  const expenseAllTotal = toNumber(
    expensesSummary?.allTime?.total ??
      expensesSummary?.total ??
      expensesSummary?.allTotal,
    0,
  );

  const netCashMovement = paymentAllTotal - expenseAllTotal;

  async function onRefresh() {
    setRefreshState("loading");
    setMsg("");
    setRangeAnchor(Date.now());

    try {
      await Promise.all([
        typeof loadSales === "function" ? loadSales() : Promise.resolve(),
        typeof loadInventory === "function"
          ? loadInventory()
          : Promise.resolve(),
        typeof loadProducts === "function" ? loadProducts() : Promise.resolve(),
        typeof loadPayments === "function" ? loadPayments() : Promise.resolve(),
        typeof loadPaymentsSummary === "function"
          ? loadPaymentsSummary()
          : Promise.resolve(),
        typeof loadPaymentsBreakdown === "function"
          ? loadPaymentsBreakdown()
          : Promise.resolve(),
        typeof loadExpenses === "function" ? loadExpenses() : Promise.resolve(),
        typeof loadExpensesSummary === "function"
          ? loadExpensesSummary()
          : Promise.resolve(),
      ]);

      setRefreshState("success");
      setTimeout(() => setRefreshState("idle"), 900);
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Failed to refresh report data.");
      setRefreshState("idle");
    }
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
              Owner-grade admin reporting across sales, collections, expenses,
              inventory pressure, and operating health.
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
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <SkeletonBlock h="h-28" />
            <SkeletonBlock h="h-28" />
            <SkeletonBlock h="h-28" />
            <SkeletonBlock h="h-28" />
            <SkeletonBlock h="h-28" />
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <SkeletonBlock h="h-80" />
            <SkeletonBlock h="h-80" />
            <SkeletonBlock h="h-80" />
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
              sub="Sales total in range"
              tone="success"
            />

            <KpiCard
              title="Payments all time"
              value={
                <span className="text-[19px] font-semibold tracking-tight">
                  {fmtMoney(paymentAllTotal)} RWF
                </span>
              }
              sub={`${paymentAllCount.toLocaleString()} payment record(s)`}
              tone="info"
            />

            <ExpenseSummaryCard
              title="Expenses all time"
              count={expenseAllCount}
              total={expenseAllTotal}
              tone="danger"
            />

            <KpiCard
              title="Net cash movement"
              value={
                <span className="text-[19px] font-semibold tracking-tight">
                  {fmtMoney(netCashMovement)} RWF
                </span>
              }
              sub="Payments minus expenses"
              tone={
                netCashMovement > 0
                  ? "success"
                  : netCashMovement < 0
                    ? "danger"
                    : "neutral"
              }
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card
              title="Financial control"
              sub="Fast operational view of money in, money out, and unresolved pressure."
            >
              <div className="grid gap-3">
                <KpiCard
                  title="Payments today"
                  value={`${fmtMoney(paymentTodayTotal)} RWF`}
                  sub={`${paymentTodayCount.toLocaleString()} payment(s)`}
                  tone="success"
                />

                <ExpenseSummaryCard
                  title="Expenses today"
                  count={expenseTodayCount}
                  total={expenseTodayTotal}
                  tone="danger"
                />

                <KpiCard
                  title="Pending inventory requests"
                  value={toNumber(invReqPendingCount, 0).toLocaleString()}
                  sub="Awaiting decision"
                  tone={
                    toNumber(invReqPendingCount, 0) > 0 ? "warn" : "neutral"
                  }
                />

                <KpiCard
                  title="Inventory value"
                  value={`${fmtMoney(inventoryTotals.totalInventoryValue)} RWF`}
                  sub={`${inventoryTotals.totalOnHand.toLocaleString()} unit(s) on hand`}
                  tone="warn"
                />
              </div>
            </Card>

            <PaymentBreakdownCard
              title="Today payment mix"
              buckets={normalizedBreakdown.today}
              tone="info"
            />

            <PaymentBreakdownCard
              title="All-time payment mix"
              buckets={normalizedBreakdown.allTime}
              tone="success"
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

                  <div className="hidden overflow-x-auto md:block">
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
                        key={s?.id}
                        title={s?.customerName || "Customer"}
                        lines={[
                          { label: "Status", value: s?.status || "—" },
                          {
                            label: "Total",
                            value: `${fmtMoney(s?.totalAmount ?? s?.total)} RWF`,
                          },
                          {
                            label: "Time",
                            value: fmtDate(s?.createdAt || s?.created_at),
                          },
                        ]}
                      />
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
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
                            key={s?.id}
                            className="border-b border-slate-100 dark:border-slate-900"
                          >
                            <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                              {s?.status || "—"}
                            </td>
                            <td className="p-3 text-slate-700 dark:text-slate-300">
                              {s?.customerName || "—"}
                            </td>
                            <td className="p-3 text-right text-slate-700 dark:text-slate-300">
                              {fmtMoney(s?.totalAmount ?? s?.total)}
                            </td>
                            <td className="p-3 text-slate-700 dark:text-slate-300">
                              {fmtDate(s?.createdAt || s?.created_at)}
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

          <div className="grid gap-4 xl:grid-cols-2">
            <Card
              title="Latest payment records"
              sub="Newest recorded collections"
            >
              {latestPayments.length === 0 ? (
                <EmptyState
                  title="No payments yet"
                  hint="Payment records will appear here once recorded."
                />
              ) : (
                <>
                  <div className="grid gap-3 md:hidden">
                    {latestPayments.map((p) => (
                      <MobileReportRow
                        key={p?.id}
                        title={`Payment #${p?.id ?? "—"}`}
                        lines={[
                          {
                            label: "Sale",
                            value: `#${p?.saleId ?? p?.sale_id ?? "—"}`,
                          },
                          {
                            label: "Method",
                            value: String(p?.method || "—").toUpperCase(),
                          },
                          {
                            label: "Amount",
                            value: `${fmtMoney(p?.amount)} RWF`,
                          },
                          {
                            label: "Time",
                            value: fmtDate(p?.createdAt || p?.created_at),
                          },
                        ]}
                      />
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                        <tr className="border-b border-slate-200 dark:border-slate-800">
                          <th className="p-3 text-left text-xs font-semibold">
                            Payment
                          </th>
                          <th className="p-3 text-left text-xs font-semibold">
                            Sale
                          </th>
                          <th className="p-3 text-left text-xs font-semibold">
                            Method
                          </th>
                          <th className="p-3 text-right text-xs font-semibold">
                            Amount
                          </th>
                          <th className="p-3 text-left text-xs font-semibold">
                            Time
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {latestPayments.map((p) => (
                          <tr
                            key={p?.id}
                            className="border-b border-slate-100 dark:border-slate-900"
                          >
                            <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                              #{p?.id ?? "—"}
                            </td>
                            <td className="p-3 text-slate-700 dark:text-slate-300">
                              #{p?.saleId ?? p?.sale_id ?? "—"}
                            </td>
                            <td className="p-3 text-slate-700 dark:text-slate-300">
                              {String(p?.method || "—").toUpperCase()}
                            </td>
                            <td className="p-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                              {fmtMoney(p?.amount)}
                            </td>
                            <td className="p-3 text-slate-700 dark:text-slate-300">
                              {fmtDate(p?.createdAt || p?.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Card>

            <Card
              title="Latest expenses"
              sub="Newest recorded money-out activity"
            >
              {latestExpenses.length === 0 ? (
                <EmptyState
                  title="No expenses yet"
                  hint="Expense records will appear here once recorded."
                />
              ) : (
                <>
                  <div className="grid gap-3 md:hidden">
                    {latestExpenses.map((e) => (
                      <MobileReportRow
                        key={e?.id}
                        title={
                          e?.categoryName ||
                          e?.category ||
                          e?.type ||
                          `Expense #${e?.id ?? "—"}`
                        }
                        lines={[
                          {
                            label: "Amount",
                            value: `${fmtMoney(e?.amount)} RWF`,
                          },
                          {
                            label: "Method",
                            value: String(
                              e?.method || e?.paymentMethod || "—",
                            ).toUpperCase(),
                          },
                          {
                            label: "Time",
                            value: fmtDate(
                              e?.createdAt ||
                                e?.created_at ||
                                e?.paidAt ||
                                e?.paid_at,
                            ),
                          },
                        ]}
                      />
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                        <tr className="border-b border-slate-200 dark:border-slate-800">
                          <th className="p-3 text-left text-xs font-semibold">
                            Expense
                          </th>
                          <th className="p-3 text-left text-xs font-semibold">
                            Method
                          </th>
                          <th className="p-3 text-right text-xs font-semibold">
                            Amount
                          </th>
                          <th className="p-3 text-left text-xs font-semibold">
                            Time
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {latestExpenses.map((e) => (
                          <tr
                            key={e?.id}
                            className="border-b border-slate-100 dark:border-slate-900"
                          >
                            <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                              {e?.categoryName ||
                                e?.category ||
                                e?.type ||
                                `Expense #${e?.id ?? "—"}`}
                            </td>
                            <td className="p-3 text-slate-700 dark:text-slate-300">
                              {String(
                                e?.method || e?.paymentMethod || "—",
                              ).toUpperCase()}
                            </td>
                            <td className="p-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                              {fmtMoney(e?.amount)}
                            </td>
                            <td className="p-3 text-slate-700 dark:text-slate-300">
                              {fmtDate(
                                e?.createdAt ||
                                  e?.created_at ||
                                  e?.paidAt ||
                                  e?.paid_at,
                              )}
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

                <div className="hidden overflow-x-auto md:block">
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