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

function normalizeMethodBuckets(source) {
  const keys = ["CASH", "MOMO", "BANK", "CARD", "OTHER"];

  const base = {
    CASH: { count: 0, total: 0 },
    MOMO: { count: 0, total: 0 },
    BANK: { count: 0, total: 0 },
    CARD: { count: 0, total: 0 },
    OTHER: { count: 0, total: 0 },
  };

  if (!source) return base;

  if (Array.isArray(source)) {
    for (const row of source) {
      const rawMethod = String(
        row?.method || row?.paymentMethod || row?.key || "OTHER",
      )
        .trim()
        .toUpperCase();

      const methodKey = keys.includes(rawMethod) ? rawMethod : "OTHER";

      base[methodKey] = {
        count: base[methodKey].count + (Number(row?.count ?? 0) || 0),
        total:
          base[methodKey].total +
          (Number(row?.total ?? row?.amount ?? row?.totalAmount ?? 0) || 0),
      };
    }

    return base;
  }

  if (typeof source !== "object") return base;

  for (const key of keys) {
    const row = source?.[key] || source?.[key.toLowerCase()] || null;
    if (!row) continue;

    base[key] = {
      count: Number(row?.count ?? 0) || 0,
      total: Number(row?.total ?? row?.amount ?? row?.totalAmount ?? 0) || 0,
    };
  }

  return base;
}

function sumMethodTotal(buckets) {
  return Object.values(normalizeMethodBuckets(buckets)).reduce(
    (sum, row) => sum + (Number(row?.total ?? 0) || 0),
    0,
  );
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

  const linkedSaleStatus =
    toStr(payment?.saleStatus ?? payment?.sale_status).toUpperCase() || "";

  const status =
    toStr(payment?.status).toUpperCase() ||
    (amount > 0 ? "RECORDED" : "PENDING");

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
            {linkedSaleStatus ? (
              <StatusBadge status={linkedSaleStatus} />
            ) : null}
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <BoughtBlock saleId={saleId} salePreview={salePreview} />
          <InfoBlock
            label="Linked sale state"
            value={linkedSaleStatus || "Unknown"}
            sub="Directly returned from backend payment list"
          />
        </div>

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

function ExpenseCard({ expense }) {
  const id = expense?.id ?? "—";
  const amount = Number(expense?.amount ?? 0) || 0;
  const method = toStr(expense?.method).toUpperCase() || "—";
  const category =
    toStr(expense?.categoryName) || toStr(expense?.category) || "Expense";
  const payee = toStr(expense?.payeeName ?? expense?.payee_name) || "No payee";
  const recordedBy =
    toStr(expense?.recordedByName ?? expense?.recorded_by_name) ||
    toStr(expense?.actorName ?? expense?.actor_name) ||
    "—";
  const createdAt = expense?.createdAt || expense?.created_at;
  const note = toStr(expense?.note);

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-black text-[var(--app-fg)] sm:text-base">
              Expense #{id}
            </div>
            <PaymentMetaPill tone="danger">{method}</PaymentMetaPill>
          </div>

          <div className="mt-1.5 text-xs app-muted sm:text-sm">
            {fmt(createdAt)}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] app-muted sm:text-[11px]">
            Amount
          </div>
          <div className="mt-1 text-xl font-black leading-tight text-[var(--app-fg)] sm:text-2xl">
            {money(amount)}
          </div>
          <div className="text-[11px] app-muted">RWF</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InfoBlock label="Category" value={category} />
        <InfoBlock label="Payee" value={payee} />
        <InfoBlock label="Recorded by" value={recordedBy} />
        <InfoBlock label="Method" value={method} />
      </div>

      {note ? (
        <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] app-muted">
            Note
          </div>
          <div className="mt-1.5 text-sm leading-6 text-[var(--app-fg)]">
            {note}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BreakdownCard({ title, buckets, tone = "neutral" }) {
  const rows = normalizeMethodBuckets(buckets);

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-[var(--app-fg)]">{title}</div>
          <div className="mt-1 text-xs app-muted">
            Total {money(sumMethodTotal(rows))} RWF
          </div>
        </div>
        <Pill tone={tone}>Methods</Pill>
      </div>

      <div className="mt-4 grid gap-2">
        {Object.entries(rows).map(([methodKey, row]) => (
          <div
            key={methodKey}
            className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3.5 py-3"
          >
            <div>
              <div className="text-sm font-bold text-[var(--app-fg)]">
                {methodKey}
              </div>
              <div className="text-xs app-muted">
                {Number(row?.count ?? 0)} record(s)
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-black text-[var(--app-fg)]">
                {money(Number(row?.total ?? 0) || 0)}
              </div>
              <div className="text-[11px] app-muted">RWF</div>
            </div>
          </div>
        ))}
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

function ExpensesEmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card-2)] p-8 text-center sm:p-10">
      <div className="text-base font-black text-[var(--app-fg)] sm:text-lg">
        No expenses yet
      </div>
      <div className="mt-2 text-sm leading-6 app-muted">
        Expense records will appear here once operating costs are saved.
      </div>
    </div>
  );
}

export default function AdminPaymentsSection({
  payments = [],
  paymentsLoading = false,
  paymentsSummary = null,
  paySummaryLoading = false,
  paymentsBreakdown = null,
  payBreakdownLoading = false,
  expenses = [],
  expensesLoading = false,
  expensesSummary = null,
  expensesSummaryLoading = false,
  loadPayments,
  loadPaymentsSummary,
  loadPaymentsBreakdown,
  loadExpenses,
  loadExpensesSummary,

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
  const expenseList = Array.isArray(expenses) ? expenses : [];

  const sortedPayments = list.slice().sort((a, b) => {
    const ta = new Date(a?.createdAt || a?.created_at || 0).getTime() || 0;
    const tb = new Date(b?.createdAt || b?.created_at || 0).getTime() || 0;
    return tb - ta;
  });

  const sortedExpenses = expenseList.slice().sort((a, b) => {
    const ta = new Date(a?.createdAt || a?.created_at || 0).getTime() || 0;
    const tb = new Date(b?.createdAt || b?.created_at || 0).getTime() || 0;
    return tb - ta;
  });

  const visiblePayments = sortedPayments.slice(0, paymentsPage * PAGE_SIZE);
  const canLoadMorePayments = visiblePayments.length < sortedPayments.length;

  const todayCount = Number(paymentsSummary?.today?.count ?? 0) || 0;
  const todayTotal = Number(paymentsSummary?.today?.total ?? 0) || 0;
  const allTimeCount = Number(paymentsSummary?.allTime?.count ?? 0) || 0;
  const allTimeTotal = Number(paymentsSummary?.allTime?.total ?? 0) || 0;

  const todayExpenseCount =
    Number(expensesSummary?.today?.count ?? expensesSummary?.todayCount ?? 0) ||
    0;

  const todayExpenseTotal =
    Number(expensesSummary?.today?.total ?? expensesSummary?.todayTotal ?? 0) ||
    0;

  const allExpenseCount =
    Number(
      expensesSummary?.allTime?.count ??
        expensesSummary?.count ??
        expensesSummary?.allCount ??
        0,
    ) || 0;

  const allExpenseTotal =
    Number(
      expensesSummary?.allTime?.total ??
        expensesSummary?.total ??
        expensesSummary?.allTotal ??
        0,
    ) || 0;

  const netAllTime = allTimeTotal - allExpenseTotal;

  const todayBreakdown =
    paymentsBreakdown?.today ||
    paymentsBreakdown?.todayTotals ||
    paymentsBreakdown?.todayByMethod ||
    {};

  const yesterdayBreakdown =
    paymentsBreakdown?.yesterday ||
    paymentsBreakdown?.yesterdayTotals ||
    paymentsBreakdown?.yesterdayByMethod ||
    {};

  const allTimeBreakdown =
    paymentsBreakdown?.allTime ||
    paymentsBreakdown?.all ||
    paymentsBreakdown?.allTotals ||
    paymentsBreakdown?.allTimeByMethod ||
    {};

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
              : "Read-only financial visibility for collections, payment mix, expenses, and oversight."
          }
          right={
            <AsyncButton
              variant="secondary"
              size="sm"
              state={
                paySummaryLoading ||
                paymentsLoading ||
                payBreakdownLoading ||
                expensesLoading ||
                expensesSummaryLoading
                  ? "loading"
                  : "idle"
              }
              text="Reload"
              loadingText="Loading…"
              successText="Done"
              onClick={() =>
                Promise.all([
                  loadPaymentsSummary?.(),
                  loadPayments?.(),
                  loadPaymentsBreakdown?.(),
                  loadExpenses?.(),
                  loadExpensesSummary?.(),
                ])
              }
            />
          }
        >
          <div className="grid gap-4 sm:gap-5">
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                label={coverageActive ? "Today collected" : "Today payments"}
                value={paySummaryLoading ? "…" : String(todayCount)}
                sub={`Total ${money(todayTotal)} RWF`}
                tone="info"
              />
              <StatTile
                label={coverageActive ? "All collected" : "All-time payments"}
                value={paySummaryLoading ? "…" : String(allTimeCount)}
                sub={`Total ${money(allTimeTotal)} RWF`}
                tone="success"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatTile
                label="Today expenses"
                value={expensesSummaryLoading ? "…" : String(todayExpenseCount)}
                sub={`Total ${money(todayExpenseTotal)} RWF`}
                tone="danger"
              />
              <StatTile
                label="All-time expenses"
                value={expensesSummaryLoading ? "…" : String(allExpenseCount)}
                sub={`Total ${money(allExpenseTotal)} RWF`}
                tone="warn"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatTile
                label="Loaded payments"
                value={String(list.length)}
                sub={
                  coverageActive
                    ? "Fetched collection records"
                    : "Fetched payment records"
                }
              />
              <StatTile
                label="Loaded expenses"
                value={String(expenseList.length)}
                sub="Fetched expense records"
                tone="danger"
              />
              <StatTile
                label="Net money"
                value={money(netAllTime)}
                sub="Payments minus expenses"
                tone={netAllTime >= 0 ? "success" : "danger"}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {coverageActive ? (
                <>
                  <Pill tone="warn">Cashier coverage</Pill>
                  <Pill tone="info">Today in {money(todayTotal)} RWF</Pill>
                  <Pill tone="danger">
                    Today out {money(todayExpenseTotal)} RWF
                  </Pill>
                  <Pill tone={netAllTime >= 0 ? "success" : "danger"}>
                    Net {money(netAllTime)} RWF
                  </Pill>
                </>
              ) : (
                <>
                  <Pill tone="info">Read-only</Pill>
                  <Pill>Today in {money(todayTotal)} RWF</Pill>
                  <Pill tone="danger">
                    Today out {money(todayExpenseTotal)} RWF
                  </Pill>
                  <Pill tone={netAllTime >= 0 ? "success" : "danger"}>
                    Net {money(netAllTime)} RWF
                  </Pill>
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
                  : "This area is for oversight, mismatch review, payment-method health, and expense pressure. Admin should monitor both money-in and money-out here, not just collections."}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Payment method picture"
          hint="Compare payment strength across today, yesterday, and all time."
        >
          {payBreakdownLoading ? (
            <div className="grid gap-3 lg:grid-cols-3">
              <Skeleton className="h-72 w-full rounded-3xl" />
              <Skeleton className="h-72 w-full rounded-3xl" />
              <Skeleton className="h-72 w-full rounded-3xl" />
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-3">
              <BreakdownCard
                title="Today"
                buckets={todayBreakdown}
                tone="info"
              />
              <BreakdownCard
                title="Yesterday"
                buckets={yesterdayBreakdown}
                tone="warn"
              />
              <BreakdownCard
                title="All time"
                buckets={allTimeBreakdown}
                tone="success"
              />
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          title={coverageActive ? "Collections in focus" : "Latest payments"}
          hint={
            coverageActive
              ? "Newest collections with customer, bought item, amount paid, and collector visibility."
              : "Newest payment records with customer, bought item, amount paid, linked sale state, and recorder visibility."
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

        <SectionCard
          title="Latest expenses"
          hint="Recent money-out records so admin can track operating pressure next to collections."
        >
          {expensesLoading ? (
            <div className="grid gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-52 w-full rounded-3xl" />
              ))}
            </div>
          ) : sortedExpenses.length === 0 ? (
            <ExpensesEmptyState />
          ) : (
            <div className="grid gap-3">
              {sortedExpenses.slice(0, PAGE_SIZE).map((expense) => (
                <ExpenseCard key={String(expense?.id)} expense={expense} />
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
