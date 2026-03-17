"use client";

import {
  EmptyState,
  RefreshButton,
  SectionCard,
  StatCard,
  SurfaceRow,
  TinyPill,
} from "./manager-ui";
import { useEffect, useMemo, useRef, useState } from "react";

import { apiFetch } from "../../../lib/api";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function fallbackMoney(n) {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return "0";
  return Math.round(x).toLocaleString();
}

function fallbackFmt(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

function statusTone(status) {
  const s = String(status || "").toUpperCase();

  if (
    s === "COMPLETED" ||
    s === "PAID" ||
    s === "APPROVED" ||
    s === "FULFILLED"
  ) {
    return "success";
  }

  if (s.includes("AWAIT") || s === "PENDING" || s === "OPEN" || s === "DRAFT") {
    return "warn";
  }

  if (s === "CANCELLED" || s === "DECLINED" || s === "VOID") {
    return "danger";
  }

  return "neutral";
}

function statusPillClasses(tone) {
  if (tone === "success") {
    return "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]";
  }
  if (tone === "warn") {
    return "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]";
  }
  if (tone === "danger") {
    return "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]";
  }
  if (tone === "info") {
    return "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]";
  }
  return "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";
}

function formatAge(seconds) {
  const s = Number(seconds || 0);
  if (!Number.isFinite(s) || s <= 0) return "—";

  const mins = Math.floor(s / 60);
  if (mins < 60) return `${mins}m`;

  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs < 24) return `${hrs}h ${remMins}m`;

  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  return `${days}d ${remHrs}h`;
}

function getSaleId(row) {
  const raw = row?.id ?? row?.saleId ?? row?.sale_id ?? null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeSaleResponse(data) {
  if (!data) return null;
  if (data.sale) return data.sale;
  if (data.data?.sale) return data.data.sale;
  if (data.data?.data?.sale) return data.data.data.sale;
  if (data.row?.sale) return data.row.sale;
  if (
    data.id ||
    data.items ||
    data.itemsPreview ||
    data.saleItems ||
    data.lines
  )
    return data;
  return null;
}

function normalizeItemsFromSale(saleLike) {
  if (!saleLike) return [];

  const candidates = [
    saleLike?.items,
    saleLike?.items?.rows,
    saleLike?.items?.items,
    saleLike?.itemsPreview,
    saleLike?.saleItems,
    saleLike?.sale_items,
    saleLike?.lines,
    saleLike?.lineItems,
    saleLike?.line_items,
    saleLike?.products,
    saleLike?.rows,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) return candidate;
  }

  return [];
}

function extractItemName(item) {
  return (
    toStr(item?.productName) ||
    toStr(item?.product_name) ||
    toStr(item?.name) ||
    toStr(item?.title) ||
    toStr(item?.label) ||
    toStr(item?.product?.name) ||
    toStr(item?.product?.productName) ||
    toStr(item?.inventory?.productName) ||
    toStr(item?.inventory?.name) ||
    (item?.productId ? `Product #${item.productId}` : "") ||
    (item?.product_id ? `Product #${item.product_id}` : "") ||
    "—"
  );
}

function extractItemQty(item) {
  const raw =
    item?.qty ??
    item?.quantity ??
    item?.count ??
    item?.units ??
    item?.amount ??
    item?.qtySold ??
    item?.qty_sold ??
    item?.requestedQty ??
    item?.requested_qty ??
    0;

  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function pickTopItemFromSaleObject(saleLike) {
  const items = normalizeItemsFromSale(saleLike);
  if (!items.length) return null;

  const first = items[0];
  const name = extractItemName(first);
  const qty = extractItemQty(first);

  return {
    name: name || "—",
    qty,
  };
}

function extractReasonList(sale) {
  const directReasons = Array.isArray(sale?.stuckReasons)
    ? sale.stuckReasons
    : Array.isArray(sale?.stuck_reasons)
      ? sale.stuck_reasons
      : Array.isArray(sale?.reasons)
        ? sale.reasons
        : [];

  if (directReasons.length > 0) {
    return directReasons
      .map((r) => {
        if (typeof r === "string") {
          return { title: r, detail: "" };
        }
        return {
          title:
            toStr(r?.title) || toStr(r?.reason) || toStr(r?.label) || "Reason",
          detail:
            toStr(r?.detail) ||
            toStr(r?.message) ||
            toStr(r?.description) ||
            "",
        };
      })
      .filter((r) => r.title);
  }

  const inferred = [];
  const status = String(sale?.status || "").toUpperCase();
  const ageSeconds = Number(sale?.ageSeconds ?? sale?.age_seconds ?? 0) || 0;
  const hasCredit = !!sale?.creditId || !!sale?.credit_id || !!sale?.credit;

  if (status === "DRAFT") {
    inferred.push({
      title: "Still in draft",
      detail: "Sale has not moved out of draft state yet.",
    });
  }

  if (status === "FULFILLED") {
    inferred.push({
      title: "Waiting next payment step",
      detail: "Sale was fulfilled but not yet completed.",
    });
  }

  if (status === "AWAITING_PAYMENT_RECORD") {
    inferred.push({
      title: "Waiting cashier payment record",
      detail: "Items were released but payment recording is still pending.",
    });
  }

  if (status === "PENDING") {
    inferred.push({
      title: "Pending workflow state",
      detail: "Sale is pending and needs the next operator action.",
    });
  }

  if (hasCredit) {
    inferred.push({
      title: "Linked credit flow",
      detail:
        "This sale appears connected to a credit process and may be blocked by approval or collection progress.",
    });
  }

  if (ageSeconds > 0) {
    inferred.push({
      title: "Aged beyond normal flow",
      detail: `This sale has stayed active for ${formatAge(ageSeconds)}.`,
    });
  }

  if (!inferred.length) {
    inferred.push({
      title: "Needs review",
      detail:
        "No explicit stuck reason was returned by backend, so this sale should be reviewed manually.",
    });
  }

  return inferred;
}

function MixCard({ label, count, total, tone = "neutral" }) {
  const toneBar =
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
    <div className="relative overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_6px_18px_rgba(15,23,42,0.05)] dark:shadow-[0_10px_22px_rgba(0,0,0,0.16)]">
      <div className="absolute inset-x-0 top-0 h-[3px]">
        <div className={`h-full w-12 rounded-r-full ${toneBar}`} />
      </div>

      <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-3 text-3xl font-black tracking-[-0.03em] text-[var(--app-fg)]">
        {count}
      </div>
      <div className="mt-2 text-sm leading-6 text-[var(--muted)]">
        Total: <b className="text-[var(--app-fg)]">{total}</b> RWF
      </div>
    </div>
  );
}

function LowStockCard({ item, productLabel }) {
  const qty = Number(item?.qtyOnHand ?? item?.qty_on_hand ?? 0);

  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_6px_18px_rgba(15,23,42,0.05)] dark:shadow-[0_10px_22px_rgba(0,0,0,0.16)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-[var(--app-fg)]">
            {productLabel(item)}
          </div>
          <div className="mt-2 text-sm text-[var(--muted)]">
            Qty remaining:{" "}
            <b className="text-[var(--app-fg)]">{qty.toLocaleString()}</b>
          </div>
        </div>

        <TinyPill tone="warn">Low</TinyPill>
      </div>
    </div>
  );
}

function QuickActionCard({ title, hint, onClick, tone = "neutral" }) {
  const toneCls =
    tone === "danger"
      ? "border-rose-200/70 dark:border-rose-900/30"
      : tone === "warn"
        ? "border-amber-200/70 dark:border-amber-900/30"
        : tone === "info"
          ? "border-sky-200/70 dark:border-sky-900/30"
          : "border-[var(--border)]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[22px] border ${toneCls} bg-[var(--card)] p-4 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--hover)]`}
    >
      <div className="text-sm font-black text-[var(--app-fg)]">{title}</div>
      <div className="mt-1 text-sm leading-6 text-[var(--muted)]">{hint}</div>
    </button>
  );
}

function StuckSaleReasonModal({ open, sale, onClose, money, fmt }) {
  useEffect(() => {
    if (!open) return;

    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !sale) return null;

  const reasons = extractReasonList(sale);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      <div className="relative z-[121] max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--card)] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-lg font-black text-[var(--app-fg)]">
                Sale #{sale?.id ?? "—"}
              </div>
              <span
                className={cx(
                  "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em]",
                  statusPillClasses(statusTone(sale?.status)),
                )}
              >
                {String(sale?.status || "—")}
              </span>
            </div>

            <div className="mt-2 text-sm app-muted">
              Created: {fmt(sale?.createdAt || sale?.created_at)}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-2 text-sm font-bold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
          >
            Close
          </button>
        </div>

        <div className="max-h-[calc(90vh-84px)] overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
              <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                Total
              </div>
              <div className="mt-1 text-base font-black text-[var(--app-fg)]">
                {money(sale?.totalAmount ?? sale?.total ?? 0)} RWF
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
              <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                Age
              </div>
              <div className="mt-1 text-base font-black text-[var(--app-fg)]">
                {formatAge(sale?.ageSeconds ?? sale?.age_seconds)}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
              <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                Reason count
              </div>
              <div className="mt-1 text-base font-black text-[var(--app-fg)]">
                {reasons.length}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[22px] border border-[var(--border)] bg-[var(--card-2)] p-4">
            <div className="text-sm font-black text-[var(--app-fg)]">
              Why this sale is stuck
            </div>
            <div className="mt-1 text-sm app-muted">
              Backend reasons are shown first when available. Otherwise the UI
              shows grounded fallback explanations.
            </div>

            <div className="mt-4 grid gap-3">
              {reasons.map((reason, idx) => (
                <div
                  key={`${reason.title}-${idx}`}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
                >
                  <div className="text-sm font-black text-[var(--app-fg)]">
                    {reason.title}
                  </div>
                  {reason.detail ? (
                    <div className="mt-1 text-sm leading-6 text-[var(--muted)]">
                      {reason.detail}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StuckSaleCard({ sale, money, fmt, topItem, onOpenReasons }) {
  const total = money(sale?.totalAmount ?? sale?.total ?? 0);

  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_8px_22px_rgba(15,23,42,0.05)] dark:shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-black text-[var(--app-fg)]">
              Sale #{sale?.id ?? "—"}
            </div>
            <TinyPill tone={statusTone(sale?.status)}>
              {String(sale?.status ?? "—")}
            </TinyPill>
          </div>

          <div className="mt-2 text-xs text-[var(--muted)]">
            Created: {fmt(sale?.createdAt || sale?.created_at)}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
            Total
          </div>
          <div className="mt-1 text-2xl font-black tracking-[-0.03em] text-[var(--app-fg)]">
            {total}
          </div>
          <div className="text-[11px] text-[var(--muted)]">RWF</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card-2)] p-4">
          <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
            Product
          </div>
          <div className="mt-2 truncate text-sm font-bold text-[var(--app-fg)]">
            {topItem?.name || "—"}
          </div>
        </div>

        <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card-2)] p-4">
          <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
            Qty
          </div>
          <div className="mt-2 text-sm font-bold text-[var(--app-fg)]">
            {Number(topItem?.qty ?? 0)}
          </div>
        </div>

        <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card-2)] p-4">
          <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
            Reason count
          </div>
          <div className="mt-2 text-sm font-bold text-[var(--app-fg)]">
            {extractReasonList(sale).length}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-[var(--warn-border)] bg-[var(--warn-bg)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--warn-fg)]">
            Age {formatAge(sale?.ageSeconds ?? sale?.age_seconds)}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onOpenReasons?.(sale)}
          className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
        >
          Click for details
        </button>
      </div>
    </div>
  );
}

export default function ManagerDashboardSection(props) {
  const {
    dash,
    dashLoading,
    dashTodayTotal,
    dashLowStockCount,
    dashStuckSalesCount,
    unpricedCount,
    pricingGapCount,
    refreshLoading,
    onRefresh,
    onGoToSection,
    setSection,
    breakdownTodayTotals,
    money,
    fmt,
    productLabel,
  } = props;

  const formatMoney = typeof money === "function" ? money : fallbackMoney;
  const formatDate = typeof fmt === "function" ? fmt : fallbackFmt;
  const getProductLabel =
    typeof productLabel === "function"
      ? productLabel
      : (item) =>
          item?.productName ||
          item?.product_name ||
          item?.name ||
          (item?.productId ? `Product #${item.productId}` : "Product");

  const goToSection =
    typeof onGoToSection === "function"
      ? onGoToSection
      : typeof setSection === "function"
        ? setSection
        : () => {};

  const pricingCount = Number(unpricedCount ?? pricingGapCount ?? 0) || 0;
  const stuck = Array.isArray(dash?.sales?.stuck) ? dash.sales.stuck : [];
  const lowStock = Array.isArray(dash?.inventory?.lowStock)
    ? dash.inventory.lowStock
    : [];

  const [shown, setShown] = useState(10);
  const [selectedStuckSale, setSelectedStuckSale] = useState(null);
  const [topItemMap, setTopItemMap] = useState(() => new Map());
  const inFlightRef = useRef(new Set());

  useEffect(() => {
    setShown(10);
  }, [stuck]);

  const visibleStuck = useMemo(() => stuck.slice(0, shown), [stuck, shown]);
  const canLoadMore = shown < stuck.length;

  useEffect(() => {
    let alive = true;

    async function resolveTopItems() {
      for (const sale of visibleStuck) {
        const saleId = getSaleId(sale);
        if (!saleId) continue;
        if (topItemMap.has(saleId)) continue;
        if (inFlightRef.current.has(saleId)) continue;

        const direct = pickTopItemFromSaleObject(sale);
        if (direct) {
          setTopItemMap((prev) => {
            const next = new Map(prev);
            next.set(saleId, direct);
            return next;
          });
          continue;
        }

        inFlightRef.current.add(saleId);

        try {
          const data = await apiFetch(`/sales/${saleId}`, { method: "GET" });
          if (!alive) return;

          const normalizedSale = normalizeSaleResponse(data);
          const extracted = pickTopItemFromSaleObject(normalizedSale);

          setTopItemMap((prev) => {
            const next = new Map(prev);
            next.set(
              saleId,
              extracted || {
                name: "—",
                qty: 0,
              },
            );
            return next;
          });
        } catch {
          if (!alive) return;
          setTopItemMap((prev) => {
            const next = new Map(prev);
            next.set(saleId, {
              name: "—",
              qty: 0,
            });
            return next;
          });
        } finally {
          inFlightRef.current.delete(saleId);
        }
      }
    }

    resolveTopItems();

    return () => {
      alive = false;
    };
  }, [visibleStuck, topItemMap]);

  const totalStuckValue = useMemo(() => {
    return stuck.reduce(
      (sum, sale) => sum + (Number(sale?.totalAmount ?? sale?.total ?? 0) || 0),
      0,
    );
  }, [stuck]);

  const totalReasonCount = useMemo(() => {
    return stuck.reduce((sum, sale) => sum + extractReasonList(sale).length, 0);
  }, [stuck]);

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Money today"
          value={dashLoading ? "…" : formatMoney(dashTodayTotal)}
          sub="All methods"
          tone="info"
        />
        <StatCard
          label="Low stock"
          value={dashLoading ? "…" : String(dashLowStockCount ?? 0)}
          sub="Need restock"
          tone={Number(dashLowStockCount || 0) > 0 ? "warn" : "success"}
        />
        <StatCard
          label="Stuck sales"
          value={dashLoading ? "…" : String(dashStuckSalesCount ?? 0)}
          sub="Need action"
          tone={Number(dashStuckSalesCount || 0) > 0 ? "warn" : "success"}
        />
        <StatCard
          label="Pricing gaps"
          value={dashLoading ? "…" : String(pricingCount)}
          sub="Products missing selling price"
          tone={pricingCount > 0 ? "warn" : "success"}
        />
      </div>

      {!dashLoading && !dash ? (
        <EmptyState
          title="No dashboard data"
          hint="The dashboard endpoint returned no usable data."
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard
          title="Today payment mix"
          hint="How money came in today."
          right={<RefreshButton loading={refreshLoading} onClick={onRefresh} />}
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <MixCard
              label="Cash"
              count={breakdownTodayTotals?.CASH?.count ?? 0}
              total={formatMoney(breakdownTodayTotals?.CASH?.total ?? 0)}
              tone="success"
            />
            <MixCard
              label="Momo"
              count={breakdownTodayTotals?.MOMO?.count ?? 0}
              total={formatMoney(breakdownTodayTotals?.MOMO?.total ?? 0)}
              tone="info"
            />
            <MixCard
              label="Bank"
              count={breakdownTodayTotals?.BANK?.count ?? 0}
              total={formatMoney(breakdownTodayTotals?.BANK?.total ?? 0)}
              tone="neutral"
            />
            <MixCard
              label="Card"
              count={breakdownTodayTotals?.CARD?.count ?? 0}
              total={formatMoney(breakdownTodayTotals?.CARD?.total ?? 0)}
              tone="warn"
            />
            <MixCard
              label="Other"
              count={breakdownTodayTotals?.OTHER?.count ?? 0}
              total={formatMoney(breakdownTodayTotals?.OTHER?.total ?? 0)}
              tone="danger"
            />
          </div>

          <SurfaceRow className="mt-4">
            <div className="text-sm text-[var(--muted)]">
              Today total:{" "}
              <b className="text-[var(--app-fg)]">
                {formatMoney(dashTodayTotal)}
              </b>{" "}
              RWF
            </div>
          </SurfaceRow>
        </SectionCard>

        <SectionCard
          title="Low stock"
          hint={`Items with quantity at or below ${dash?.inventory?.lowStockThreshold ?? 5}.`}
        >
          {lowStock.length === 0 ? (
            <EmptyState
              title="No low stock alerts"
              hint="Everything currently looks healthy."
            />
          ) : (
            <div className="grid gap-3">
              {lowStock.map((item, idx) => (
                <LowStockCard
                  key={item?.productId ?? idx}
                  item={item}
                  productLabel={getProductLabel}
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Stuck sales"
        hint={
          dash?.sales?.stuckRule || "Not completed and older than 30 minutes"
        }
      >
        {stuck.length === 0 ? (
          <EmptyState
            title="No stuck sales"
            hint="There are no delayed or blocked sales right now."
          />
        ) : (
          <>
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
                <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                  Total stuck sales
                </div>
                <div className="mt-1 text-base font-black text-[var(--app-fg)]">
                  {stuck.length}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
                <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                  Total stuck value
                </div>
                <div className="mt-1 text-base font-black text-[var(--app-fg)]">
                  {formatMoney(totalStuckValue)} RWF
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
                <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                  Total detected reasons
                </div>
                <div className="mt-1 text-base font-black text-[var(--app-fg)]">
                  {totalReasonCount}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleStuck.map((sale, idx) => {
                const saleId = getSaleId(sale);
                const topItem = (saleId && topItemMap.get(saleId)) ||
                  pickTopItemFromSaleObject(sale) || {
                    name: "—",
                    qty: 0,
                  };

                return (
                  <StuckSaleCard
                    key={sale?.id ?? `${saleId}-${idx}`}
                    sale={sale}
                    money={formatMoney}
                    fmt={formatDate}
                    topItem={topItem}
                    onOpenReasons={setSelectedStuckSale}
                  />
                );
              })}
            </div>

            {canLoadMore ? (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShown((n) => n + 10)}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-3 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
                >
                  Load more (+10)
                </button>
              </div>
            ) : null}
          </>
        )}

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <QuickActionCard
            title="Inventory requests"
            hint="Approve or decline stock adjustments."
            tone="danger"
            onClick={() => goToSection("inv_requests")}
          />
          <QuickActionCard
            title="Pricing"
            hint="Fix missing product selling prices."
            tone="warn"
            onClick={() => goToSection("pricing")}
          />
          <QuickActionCard
            title="Stock arrivals"
            hint="Review incoming stock activity."
            tone="info"
            onClick={() => goToSection("arrivals")}
          />
          <QuickActionCard
            title="Suppliers"
            hint="Review supplier balances and bills."
            tone="neutral"
            onClick={() => goToSection("suppliers")}
          />
        </div>
      </SectionCard>

      <StuckSaleReasonModal
        open={!!selectedStuckSale}
        sale={selectedStuckSale}
        onClose={() => setSelectedStuckSale(null)}
        money={formatMoney}
        fmt={formatDate}
      />
    </div>
  );
}
