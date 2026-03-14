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

const PAGE_SIZE = 10;

function prettyRole(role) {
  return String(role || "")
    .trim()
    .split("_")
    .filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

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
    <div
      className={cx(
        "rounded-3xl border p-4 sm:p-5 transition",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        toneCls,
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] app-muted sm:text-[11px]">
        {label}
      </div>
      <div className="mt-1.5 text-lg font-black leading-tight text-[var(--app-fg)] sm:text-2xl">
        {value}
      </div>
      {sub ? (
        <div className="mt-1.5 text-xs leading-5 app-muted sm:text-sm">
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function PaymentMetaPill({ children, tone = "neutral" }) {
  return <Pill tone={tone}>{children}</Pill>;
}

function InfoBlock({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] app-muted">
        {label}
      </div>
      <div className="mt-1.5 truncate text-sm font-bold text-[var(--app-fg)]">
        {value || "—"}
      </div>
      {sub ? (
        <div className="mt-1 truncate text-xs app-muted">{sub}</div>
      ) : null}
    </div>
  );
}

function BoughtBlock({ saleId, salePreview }) {
  const topItemName = toStr(salePreview?.topItemName);
  const topItemQty = Number(salePreview?.topItemQty ?? 0) || 0;
  const itemCount = Number(salePreview?.itemCount ?? 0) || 0;
  const extraCount = Math.max(0, itemCount - 1);

  if (!topItemName) {
    return (
      <InfoBlock
        label="Bought"
        value={`Sale #${saleId ?? "—"}`}
        sub="Open proof for full item details"
      />
    );
  }

  return (
    <InfoBlock
      label="Bought"
      value={`${topItemName}${topItemQty > 0 ? ` × ${topItemQty}` : ""}`}
      sub={extraCount > 0 ? `+${extraCount} more item(s)` : "Single-item sale"}
    />
  );
}

function CoverageOperatorStrip({ coverage }) {
  if (!coverage?.active) return null;

  return (
    <div className="rounded-3xl border border-[var(--warn-border)] bg-[var(--warn-bg)] p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-black text-[var(--app-fg)] sm:text-base">
              Cashier coverage mode
            </div>
            <Pill tone="warn">Active</Pill>
            <Pill tone="info">{prettyRole(coverage?.actingAsRole)}</Pill>
          </div>

          <div className="mt-2 text-sm leading-6 text-[var(--app-fg)]">
            You are temporarily operating in cashier coverage mode. Prioritize
            collection accuracy, customer traceability, and payment-method
            correctness.
          </div>

          <div className="mt-2 text-xs leading-6 app-muted">
            Actions remain attributable to admin with coverage context.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <PaymentMetaPill tone="warn">Operator focus</PaymentMetaPill>
          <PaymentMetaPill tone="success">Collections active</PaymentMetaPill>
        </div>
      </div>
    </div>
  );
}

function PaymentCard({ payment, coverageActive = false }) {
  const paymentId = payment?.id ?? "—";
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

  const customerPhone =
    toStr(payment?.customerPhone ?? payment?.customer_phone) || null;

  const status =
    toStr(payment?.status) || (amount > 0 ? "RECORDED" : "PENDING");

  const salePreview = payment?.salePreview || null;

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-black text-[var(--app-fg)] sm:text-base">
              Payment #{paymentId}
            </div>
            <PaymentMetaPill tone="info">{method}</PaymentMetaPill>
            <StatusBadge status={status} />
            {coverageActive ? (
              <PaymentMetaPill tone="warn">Cashier coverage</PaymentMetaPill>
            ) : null}
          </div>

          <div className="mt-1.5 text-xs app-muted sm:text-sm">
            Sale{" "}
            <span className="font-bold text-[var(--app-fg)]">#{saleId}</span>
            {" • "}
            {fmt(createdAt)}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] app-muted sm:text-[11px]">
            Amount paid
          </div>
          <div className="mt-1 text-xl font-black leading-tight text-[var(--app-fg)] sm:text-2xl">
            {money(amount)}
          </div>
          <div className="text-[11px] app-muted">RWF</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoBlock
            label="Customer"
            value={customer}
            sub={customerPhone || "No phone"}
          />

          <InfoBlock
            label={coverageActive ? "Collected by" : "Recorded by"}
            value={cashier}
            sub={`Method: ${method}`}
          />
        </div>

        <BoughtBlock saleId={saleId} salePreview={salePreview} />

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] app-muted">
                Traceability
              </div>
              <div className="mt-1 text-sm text-[var(--app-fg)]">
                Linked to sale <span className="font-bold">#{saleId}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <PaymentMetaPill tone="info">Payment record</PaymentMetaPill>
              <PaymentMetaPill tone="success">Collected</PaymentMetaPill>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentsLoadingState() {
  return (
    <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="mt-2 h-4 w-56 max-w-full" />
            </div>
            <div className="w-24 shrink-0">
              <Skeleton className="ml-auto h-4 w-16" />
              <Skeleton className="mt-2 ml-auto h-8 w-24" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>

          <Skeleton className="mt-3 h-20 w-full rounded-2xl" />
          <Skeleton className="mt-3 h-16 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

function PaymentsEmptyState({ coverageActive = false }) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card-2)] p-8 text-center sm:p-10">
      <div className="text-base font-black text-[var(--app-fg)] sm:text-lg">
        {coverageActive ? "No collections recorded yet" : "No payments yet"}
      </div>
      <div className="mt-2 text-sm leading-6 app-muted">
        {coverageActive
          ? "When payments are recorded during cashier operations, they will appear here with customer, bought item, amount, and recorder visibility."
          : "Payment records will appear here once cashier or linked sales flows save them."}
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

  coverage = null,
  paymentsPage = 1,
  setPaymentsPage,
}) {
  const coverageActive =
    !!coverage?.active &&
    String(coverage?.actingAsRole || "")
      .trim()
      .toLowerCase() === "cashier";

  const list = Array.isArray(payments) ? payments : [];

  const sortedPayments = list.slice().sort((a, b) => {
    const ta = new Date(a?.createdAt || a?.created_at || 0).getTime() || 0;
    const tb = new Date(b?.createdAt || b?.created_at || 0).getTime() || 0;
    return tb - ta;
  });

  const visiblePayments = sortedPayments.slice(0, paymentsPage * PAGE_SIZE);
  const canLoadMorePayments = visiblePayments.length < sortedPayments.length;

  const todayCount = paymentsSummary?.today?.count ?? 0;
  const todayTotal = paymentsSummary?.today?.total ?? 0;
  const allTimeCount = paymentsSummary?.allTime?.count ?? 0;
  const allTimeTotal = paymentsSummary?.allTime?.total ?? 0;

  return (
    <div className="grid gap-4">
      <CoverageOperatorStrip coverage={coverage} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.92fr_1.08fr] 2xl:grid-cols-[0.85fr_1.15fr]">
        <SectionCard
          title={
            coverageActive ? "Cashier coverage overview" : "Payments overview"
          }
          hint={
            coverageActive
              ? "Operational collection visibility while admin is temporarily covering cashier responsibilities."
              : "Read-only financial visibility for collections, traceability, and oversight."
          }
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
          <div className="grid gap-4 sm:gap-5">
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                label={coverageActive ? "Today collected" : "Today count"}
                value={paySummaryLoading ? "…" : String(todayCount)}
                sub={`Total ${money(todayTotal)} RWF`}
                tone="info"
              />
              <StatTile
                label={coverageActive ? "All collected" : "All-time count"}
                value={paySummaryLoading ? "…" : String(allTimeCount)}
                sub={`Total ${money(allTimeTotal)} RWF`}
                tone="success"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatTile
                label="Loaded rows"
                value={String(list.length)}
                sub={
                  coverageActive
                    ? "Fetched collection records"
                    : "Fetched payment records"
                }
              />
              <StatTile
                label="Showing now"
                value={String(visiblePayments.length)}
                sub={
                  canLoadMorePayments
                    ? `More available (${sortedPayments.length - visiblePayments.length})`
                    : "All loaded"
                }
                tone={canLoadMorePayments ? "warn" : "success"}
              />
              <StatTile
                label="Summary state"
                value={paySummaryLoading ? "Loading" : "Ready"}
                sub={
                  coverageActive
                    ? "Operational cashier metrics"
                    : "Overview metrics"
                }
                tone={paySummaryLoading ? "warn" : "success"}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {coverageActive ? (
                <>
                  <Pill tone="warn">Cashier coverage</Pill>
                  <Pill tone="info">Today {money(todayTotal)} RWF</Pill>
                  <Pill tone="success">All-time {money(allTimeTotal)} RWF</Pill>
                </>
              ) : (
                <>
                  <Pill tone="info">Read-only</Pill>
                  <Pill>Today {money(todayTotal)} RWF</Pill>
                  <Pill tone="success">All-time {money(allTimeTotal)} RWF</Pill>
                </>
              )}
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4 sm:p-5">
              <div className="text-sm font-black text-[var(--app-fg)]">
                {coverageActive ? "Operational note" : "Control note"}
              </div>
              <div className="mt-2 text-sm leading-6 app-muted">
                {coverageActive
                  ? "You are in cashier coverage mode. Focus on correct collection recording, method accuracy, customer traceability, and payment-to-sale linkage."
                  : "This area is for oversight, mismatch review, and financial investigation. Admin should monitor collection flow here, not replace cashier operations unless temporary operational coverage is required."}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title={coverageActive ? "Collections in focus" : "Latest payments"}
          hint={
            coverageActive
              ? "Newest collections with customer, bought item, amount paid, and collector visibility."
              : "Newest payment records with customer, bought item, amount paid, and recorder visibility."
          }
        >
          {paymentsLoading ? (
            <PaymentsLoadingState />
          ) : visiblePayments.length === 0 ? (
            <PaymentsEmptyState coverageActive={coverageActive} />
          ) : (
            <div className="grid gap-4">
              <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
                {visiblePayments.map((payment) => (
                  <PaymentCard
                    key={String(payment?.id)}
                    payment={payment}
                    coverageActive={coverageActive}
                  />
                ))}
              </div>

              {canLoadMorePayments ? (
                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => setPaymentsPage?.((p) => Number(p || 1) + 1)}
                    className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-3 text-sm font-semibold text-[var(--app-fg)] shadow-sm hover:bg-[var(--hover)]"
                  >
                    Load more (+{PAGE_SIZE})
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
