"use client";

import {
  Card,
  EmptyState,
  Input,
  RefreshButton,
  SectionCard,
  Skeleton,
  TinyPill,
} from "./manager-ui";

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

function PayBreakdownCard({ title, buckets, money, tone = "neutral" }) {
  const order = ["CASH", "MOMO", "BANK", "CARD", "OTHER"];
  const total = order.reduce((s, k) => s + Number(buckets?.[k]?.total || 0), 0);

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
    <div className="relative overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_8px_22px_rgba(15,23,42,0.05)] dark:shadow-[0_12px_28px_rgba(0,0,0,0.16)]">
      <div className="absolute inset-x-0 top-0 h-[3px]">
        <div className={`h-full w-14 rounded-r-full ${barTone}`} />
      </div>

      <div className="text-sm font-black text-[var(--app-fg)]">{title}</div>
      <div className="mt-1 text-xs text-[var(--muted)]">
        Total: <b className="text-[var(--app-fg)]">{money(total)}</b> RWF
      </div>

      <div className="mt-4 grid gap-2">
        {order.map((k) => (
          <div
            key={k}
            className="flex items-center justify-between rounded-[14px] bg-[var(--card-2)] px-3 py-2 text-sm"
          >
            <div className="font-semibold text-[var(--app-fg)]">{k}</div>
            <div className="font-black text-[var(--app-fg)]">
              {money(buckets?.[k]?.total || 0)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentRecordCard({
  p,
  saleId,
  topItemName,
  topItemQty,
  formatDate,
  formatMoney,
}) {
  const method = String(p?.method ?? "—").toUpperCase();
  const amount = Number(p?.amount ?? 0) || 0;

  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] dark:shadow-[0_12px_28px_rgba(0,0,0,0.16)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-black text-[var(--app-fg)]">
              Payment #{p?.id ?? "—"}
            </div>
            <TinyPill tone="info">{method}</TinyPill>
          </div>

          <div className="mt-2 text-xs text-[var(--muted)]">
            Sale: <b className="text-[var(--app-fg)]">#{saleId ?? "—"}</b>
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            Time:{" "}
            <b className="text-[var(--app-fg)]">
              {formatDate(p?.createdAt || p?.created_at)}
            </b>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
            Amount
          </div>
          <div className="mt-1 text-2xl font-black tracking-[-0.03em] text-[var(--app-fg)]">
            {formatMoney(amount)}
          </div>
          <div className="text-[11px] text-[var(--muted)]">RWF</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card-2)] p-3">
          <div className="text-[11px] font-black uppercase tracking-[0.08em] text-[var(--muted)]">
            Top item
          </div>
          <div className="mt-1 truncate text-sm font-bold text-[var(--app-fg)]">
            {topItemName || "—"}
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            Qty: <b className="text-[var(--app-fg)]">{topItemQty || 0}</b>
          </div>
        </div>

        {String(p?.note || "").trim() ? (
          <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card)] p-3 text-sm text-[var(--app-fg)]">
            <b>Note:</b> {String(p.note)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ManagerPaymentsSection({
  payView,
  setPayView,
  payQ,
  setPayQ,
  loadPayments,
  loadPaymentsSummary,
  loadPaymentsBreakdown,
  loadingPayments,
  loadingPaySummary,
  loadingPayBreakdown,
  paymentsSummary,
  breakdownTodayTotals,
  breakdownYesterday,
  breakdownAll,
  paymentsWithItems,
  fmt,
  money,
}) {
  const formatMoney = typeof money === "function" ? money : fallbackMoney;
  const formatDate = typeof fmt === "function" ? fmt : fallbackFmt;

  const loadingAny =
    !!loadingPayments || !!loadingPaySummary || !!loadingPayBreakdown;

  const records = (Array.isArray(paymentsWithItems) ? paymentsWithItems : [])
    .filter(({ p }) => {
      const qq = String(payQ || "")
        .trim()
        .toLowerCase();
      if (!qq) return true;

      const hay = [p?.id, p?.saleId ?? p?.sale_id, p?.method, p?.amount]
        .map((x) => String(x ?? ""))
        .join(" ")
        .toLowerCase();

      return hay.includes(qq);
    })
    .slice(0, 60);

  return (
    <SectionCard
      title="Payments"
      hint="Monitor payment totals, method mix, and linked payment activity."
      right={
        <RefreshButton
          loading={loadingAny}
          onClick={() => {
            loadPayments?.();
            loadPaymentsSummary?.();
            loadPaymentsBreakdown?.();
          }}
        />
      }
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPayView?.("overview")}
            className={[
              "rounded-full border px-4 py-2 text-sm font-bold transition",
              payView === "overview"
                ? "border-[var(--border-strong)] bg-[var(--app-fg)] text-[var(--app-bg)]"
                : "border-[var(--border)] bg-[var(--card)] text-[var(--app-fg)] hover:bg-[var(--hover)]",
            ].join(" ")}
          >
            Overview
          </button>

          <button
            type="button"
            onClick={() => setPayView?.("list")}
            className={[
              "rounded-full border px-4 py-2 text-sm font-bold transition",
              payView === "list"
                ? "border-[var(--border-strong)] bg-[var(--app-fg)] text-[var(--app-bg)]"
                : "border-[var(--border)] bg-[var(--card)] text-[var(--app-fg)] hover:bg-[var(--hover)]",
            ].join(" ")}
          >
            Payment records
          </button>
        </div>

        {payView === "overview" ? (
          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Card
                label="Today"
                value={
                  loadingPaySummary
                    ? "…"
                    : String(paymentsSummary?.today?.count ?? 0)
                }
                sub={`Total: ${formatMoney(paymentsSummary?.today?.total ?? 0)} RWF`}
              />
              <Card
                label="Yesterday"
                value={
                  loadingPaySummary
                    ? "…"
                    : String(paymentsSummary?.yesterday?.count ?? 0)
                }
                sub={`Total: ${formatMoney(paymentsSummary?.yesterday?.total ?? 0)} RWF`}
              />
              <Card
                label="All time"
                value={
                  loadingPaySummary
                    ? "…"
                    : String(paymentsSummary?.allTime?.count ?? 0)
                }
                sub={`Total: ${formatMoney(paymentsSummary?.allTime?.total ?? 0)} RWF`}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <PayBreakdownCard
                title="Today"
                buckets={breakdownTodayTotals}
                money={formatMoney}
                tone="info"
              />
              <PayBreakdownCard
                title="Yesterday"
                buckets={breakdownYesterday}
                money={formatMoney}
                tone="warn"
              />
              <PayBreakdownCard
                title="All time"
                buckets={breakdownAll}
                money={formatMoney}
                tone="success"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <Input
                placeholder="Search: payment id, sale id, method, amount"
                value={payQ}
                onChange={(e) => setPayQ?.(e.target.value)}
              />

              <div className="rounded-full border border-[var(--border)] bg-[var(--card-2)] px-4 py-2 text-sm font-bold text-[var(--app-fg)]">
                {records.length} shown
              </div>
            </div>

            {loadingPayments ? (
              <div className="grid gap-3">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : records.length === 0 ? (
              <EmptyState
                title="No payments"
                hint="There are no payment records matching this filter."
              />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {records.map(
                    ({ p, saleId, topItemName, topItemQty }, idx) => (
                      <PaymentRecordCard
                        key={p?.id || idx}
                        p={p}
                        saleId={saleId}
                        topItemName={topItemName}
                        topItemQty={topItemQty}
                        formatDate={formatDate}
                        formatMoney={formatMoney}
                      />
                    ),
                  )}
                </div>

                {(Array.isArray(paymentsWithItems) ? paymentsWithItems : [])
                  .length > 60 ? (
                  <div className="text-xs text-[var(--muted)]">
                    Showing first 60 results to keep the page fast.
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
