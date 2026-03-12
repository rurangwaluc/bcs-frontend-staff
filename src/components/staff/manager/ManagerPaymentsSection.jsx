"use client";

import {
  Card,
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

function PayBreakdownCard({ title, buckets, money }) {
  const order = ["CASH", "MOMO", "BANK", "CARD", "OTHER"];
  const total = order.reduce((s, k) => s + Number(buckets?.[k]?.total || 0), 0);

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="text-sm font-black text-[var(--app-fg)]">{title}</div>
      <div className="mt-1 text-xs app-muted">
        Total: <b>{money(total)}</b> RWF
      </div>

      <div className="mt-3 grid gap-2">
        {order.map((k) => (
          <div key={k} className="flex items-center justify-between text-sm">
            <div className="text-[var(--app-fg)]">{k}</div>
            <div className="font-bold text-[var(--app-fg)]">
              {money(buckets?.[k]?.total || 0)}
            </div>
          </div>
        ))}
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

  return (
    <SectionCard
      title="Payments"
      hint="Overview and payment records. List includes top product and quantity from the linked sale."
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
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPayView?.("overview")}
          className={[
            "rounded-2xl border px-4 py-2 text-sm font-bold transition",
            payView === "overview"
              ? "border-[var(--border-strong)] bg-[var(--app-fg)] text-[var(--app-bg)]"
              : "border-[var(--border)] text-[var(--app-fg)] hover:bg-[var(--hover)]",
          ].join(" ")}
        >
          Overview
        </button>

        <button
          type="button"
          onClick={() => setPayView?.("list")}
          className={[
            "rounded-2xl border px-4 py-2 text-sm font-bold transition",
            payView === "list"
              ? "border-[var(--border-strong)] bg-[var(--app-fg)] text-[var(--app-bg)]"
              : "border-[var(--border)] text-[var(--app-fg)] hover:bg-[var(--hover)]",
          ].join(" ")}
        >
          List
        </button>
      </div>

      {payView === "overview" ? (
        <div className="mt-4 grid gap-4">
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
            />
            <PayBreakdownCard
              title="Yesterday"
              buckets={breakdownYesterday}
              money={formatMoney}
            />
            <PayBreakdownCard
              title="All time"
              buckets={breakdownAll}
              money={formatMoney}
            />
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          <Input
            placeholder="Search: payment id, sale id, method, amount"
            value={payQ}
            onChange={(e) => setPayQ?.(e.target.value)}
          />

          {loadingPayments ? (
            <div className="grid gap-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {(Array.isArray(paymentsWithItems) ? paymentsWithItems : [])
                  .filter(({ p }) => {
                    const qq = String(payQ || "")
                      .trim()
                      .toLowerCase();
                    if (!qq) return true;

                    const hay = [
                      p?.id,
                      p?.saleId ?? p?.sale_id,
                      p?.method,
                      p?.amount,
                    ]
                      .map((x) => String(x ?? ""))
                      .join(" ")
                      .toLowerCase();

                    return hay.includes(qq);
                  })
                  .slice(0, 60)
                  .map(({ p, saleId, topItemName, topItemQty }, idx) => {
                    const method = String(p?.method ?? "—").toUpperCase();
                    const amount = Number(p?.amount ?? 0) || 0;

                    return (
                      <div
                        key={p?.id || idx}
                        className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-extrabold text-[var(--app-fg)]">
                                Payment #{p?.id ?? "—"}
                              </div>
                              <TinyPill tone="info">{method}</TinyPill>
                            </div>

                            <div className="mt-1 text-xs app-muted">
                              Sale: <b>#{saleId ?? "—"}</b> • Time:{" "}
                              <b>{formatDate(p?.createdAt || p?.created_at)}</b>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xs app-muted">Amount</div>
                            <div className="text-lg font-extrabold text-[var(--app-fg)]">
                              {formatMoney(amount)}
                            </div>
                            <div className="text-[11px] app-muted">RWF</div>
                          </div>
                        </div>

                        <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
                            Top item
                          </div>
                          <div className="mt-1 truncate text-sm font-bold text-[var(--app-fg)]">
                            {topItemName || "—"}
                          </div>
                          <div className="mt-1 text-xs app-muted">
                            Qty: <b>{topItemQty || 0}</b>
                          </div>
                        </div>

                        {String(p?.note || "").trim() ? (
                          <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 text-sm text-[var(--app-fg)]">
                            <b>Note:</b> {String(p.note)}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
              </div>

              {(Array.isArray(paymentsWithItems) ? paymentsWithItems : [])
                .length === 0 ? (
                <div className="text-sm app-muted">No payments.</div>
              ) : null}

              {(Array.isArray(paymentsWithItems) ? paymentsWithItems : [])
                .length > 60 ? (
                <div className="text-xs app-muted">
                  Showing first 60 results to keep the page fast.
                </div>
              ) : null}
            </>
          )}
        </div>
      )}
    </SectionCard>
  );
}
