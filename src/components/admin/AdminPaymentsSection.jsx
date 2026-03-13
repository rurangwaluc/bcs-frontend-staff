"use client";

import {
  Pill,
  SectionCard,
  Skeleton,
  StatusBadge,
  cx,
  fmt,
  money,
  toStr,
} from "./adminShared";

import AsyncButton from "../AsyncButton";

function StatTile({ label, value, sub, tone = "neutral" }) {
  const toneCls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)]"
        : tone === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)]"
          : tone === "info"
            ? "border-[var(--info-border)] bg-[var(--info-bg)]"
            : "border-[var(--border)] bg-[var(--card-2)]";

  return (
    <div className={cx("rounded-2xl border p-4", toneCls)}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
        {label}
      </div>
      <div className="mt-1 text-xl font-black text-[var(--app-fg)]">
        {value}
      </div>
      {sub ? <div className="mt-1 text-xs app-muted">{sub}</div> : null}
    </div>
  );
}

function PaymentCard({ payment }) {
  const saleId = payment?.saleId ?? payment?.sale_id ?? "—";
  const method = toStr(payment?.method).toUpperCase() || "—";
  const amount = Number(payment?.amount ?? 0) || 0;
  const createdAt = payment?.createdAt || payment?.created_at;

  const cashier =
    toStr(payment?.cashierName ?? payment?.cashier_name) ||
    toStr(payment?.receivedByName ?? payment?.received_by_name) ||
    "—";

  const customer =
    toStr(payment?.customerName ?? payment?.customer_name) || "—";

  const status =
    toStr(payment?.status) || (amount > 0 ? "RECORDED" : "PENDING");

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-black text-[var(--app-fg)] sm:text-base">
              Payment #{payment?.id ?? "—"}
            </div>
            <Pill tone="info">{method}</Pill>
            <StatusBadge status={status} />
          </div>

          <div className="mt-1 text-xs app-muted">
            Sale <b>#{saleId}</b> • {fmt(createdAt)}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            Amount
          </div>
          <div className="mt-1 text-lg font-black text-[var(--app-fg)]">
            {money(amount)}
          </div>
          <div className="text-[11px] app-muted">RWF</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            Customer
          </div>
          <div className="mt-1 text-sm font-bold text-[var(--app-fg)]">
            {customer}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            Recorded by
          </div>
          <div className="mt-1 text-sm font-bold text-[var(--app-fg)]">
            {cashier}
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentsLoadingState() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4"
        >
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PaymentsEmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card-2)] p-8 text-center">
      <div className="text-base font-black text-[var(--app-fg)]">
        No payments yet
      </div>
      <div className="mt-2 text-sm app-muted">
        Payment records will appear here once cashiers or linked flows save
        them.
      </div>
    </div>
  );
}

export default function AdminPaymentsSection({
  payments = [],
  paymentsLoading = false,
  paymentsSummary = null,
  paySummaryLoading = false,
  loadPayments,
  loadPaymentsSummary,
}) {
  const list = Array.isArray(payments) ? payments : [];
  const latestPayments = list
    .slice()
    .sort((a, b) => {
      const ta = new Date(a?.createdAt || a?.created_at || 0).getTime() || 0;
      const tb = new Date(b?.createdAt || b?.created_at || 0).getTime() || 0;
      return tb - ta;
    })
    .slice(0, 60);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.92fr_1.08fr]">
      <SectionCard
        title="Payments overview"
        hint="Read-only financial visibility for recorded payments and collection flow."
        right={
          <AsyncButton
            variant="secondary"
            size="sm"
            state={paySummaryLoading || paymentsLoading ? "loading" : "idle"}
            text="Reload"
            loadingText="Loading…"
            successText="Done"
            onClick={() =>
              Promise.all([loadPaymentsSummary?.(), loadPayments?.()])
            }
          />
        }
      >
        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-2">
            <StatTile
              label="Today count"
              value={
                paySummaryLoading
                  ? "…"
                  : String(paymentsSummary?.today?.count ?? 0)
              }
              sub={`Total ${money(paymentsSummary?.today?.total ?? 0)} RWF`}
              tone="info"
            />
            <StatTile
              label="All-time count"
              value={
                paySummaryLoading
                  ? "…"
                  : String(paymentsSummary?.allTime?.count ?? 0)
              }
              sub={`Total ${money(paymentsSummary?.allTime?.total ?? 0)} RWF`}
              tone="success"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile
              label="Loaded rows"
              value={String(list.length)}
              sub="Current fetched payment rows"
            />
            <StatTile
              label="Latest shown"
              value={String(latestPayments.length)}
              sub="Most recent records"
            />
            <StatTile
              label="Summary state"
              value={paySummaryLoading ? "Loading" : "Ready"}
              sub="Dashboard payment metrics"
              tone={paySummaryLoading ? "warn" : "success"}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Pill tone="info">Read-only</Pill>
            <Pill>Today {money(paymentsSummary?.today?.total ?? 0)} RWF</Pill>
            <Pill tone="success">
              All-time {money(paymentsSummary?.allTime?.total ?? 0)} RWF
            </Pill>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4">
            <div className="text-sm font-black text-[var(--app-fg)]">
              Control note
            </div>
            <div className="mt-2 text-sm app-muted">
              Admin should use this area for oversight, mismatch detection, and
              audit review — not as a cashier replacement unless operations
              require temporary coverage.
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Latest payments"
        hint="Most recent payment records, ordered newest first."
      >
        {paymentsLoading ? (
          <PaymentsLoadingState />
        ) : latestPayments.length === 0 ? (
          <PaymentsEmptyState />
        ) : (
          <div className="grid gap-3">
            {latestPayments.map((payment) => (
              <PaymentCard key={String(payment?.id)} payment={payment} />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
