"use client";

import {
  Banner,
  Card,
  RefreshButton,
  SectionCard,
  TinyPill,
} from "./cashier-ui";

export default function CashierDashboardSection({
  summaryLoading,
  salesLoading,
  sessionsLoading,
  summary,
  ledgerToday,
  ledgerTodayLoading,
  unread,
  streamStatus,
  awaitingCount,
  loadSessions,
  loadSummary,
  loadSales,
  loadPayments,
  loadUnread,
  setSection,
}) {
  const todayPaymentsCount = Number(summary?.today?.count ?? 0);
  const todayPaymentsTotal = Number(summary?.today?.total ?? 0);
  const todayMoneyIn = Number(ledgerToday?.totalIn ?? 0);
  const todayMoneyOut = Number(ledgerToday?.totalOut ?? 0);

  return (
    <div className="grid gap-4">
      <SectionCard
        title="What to do now"
        hint="Use this order so cashier work stays clean and easy to follow."
        right={
          <RefreshButton
            loading={summaryLoading || salesLoading || sessionsLoading}
            onClick={() => {
              loadSessions?.();
              loadSummary?.();
              loadSales?.();
              loadPayments?.();
              loadUnread?.();
            }}
          />
        }
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4 dark:bg-slate-900">
            <div className="text-sm font-black text-[var(--app-fg)]">
              1) Start the day
            </div>
            <div className="mt-1 text-sm app-muted">
              Open your cashier day before you receive or move cash.
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <TinyPill tone="info">Start here</TinyPill>
              <button
                type="button"
                className="rounded-2xl bg-[var(--app-fg)] px-4 py-2.5 text-sm font-bold text-[var(--app-bg)]"
                onClick={() => setSection?.("sessions")}
              >
                Open day controls
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4 dark:bg-slate-900">
            <div className="text-sm font-black text-[var(--app-fg)]">
              2) Take customer payments
            </div>
            <div className="mt-1 text-sm app-muted">
              Finish every sale that is still waiting for cashier action.
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <TinyPill tone={awaitingCount > 0 ? "warn" : "neutral"}>
                Waiting: {awaitingCount}
              </TinyPill>
              <button
                type="button"
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-bold text-[var(--app-fg)] hover:bg-[var(--hover)] dark:bg-slate-900"
                onClick={() => setSection?.("payments")}
              >
                Go to payments
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4 dark:bg-slate-900">
            <div className="text-sm font-black text-[var(--app-fg)]">
              3) End the day and check cash
            </div>
            <div className="mt-1 text-sm app-muted">
              Close the day properly and compare real cash with system cash.
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <TinyPill tone="info">End of day</TinyPill>
              <button
                type="button"
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-bold text-[var(--app-fg)] hover:bg-[var(--hover)] dark:bg-slate-900"
                onClick={() => setSection?.("reconcile")}
              >
                Go to cash check
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          label="Payments recorded today"
          value={summaryLoading ? "…" : String(todayPaymentsCount)}
          sub={`Total: ${todayPaymentsTotal.toLocaleString()} RWF`}
        />
        <Card
          label="Money in today"
          value={ledgerTodayLoading ? "…" : todayMoneyIn.toLocaleString()}
          sub="All payment methods"
        />
        <Card
          label="Money out today"
          value={ledgerTodayLoading ? "…" : todayMoneyOut.toLocaleString()}
          sub="Deposits, refunds, expenses"
        />
        <Card
          label="Unread alerts"
          value={String(unread ?? 0)}
          sub={
            streamStatus === "live"
              ? "Live updates on"
              : streamStatus === "error"
                ? "Live updates off"
                : "Checking live updates"
          }
        />
      </div>

      {awaitingCount > 0 ? (
        <Banner kind="warn">
          There {awaitingCount === 1 ? "is" : "are"} <b>{awaitingCount}</b>{" "}
          {awaitingCount === 1 ? "sale" : "sales"} still waiting for payment
          recording.
        </Banner>
      ) : (
        <Banner kind="success">
          No sales are waiting for payment right now.
        </Banner>
      )}
    </div>
  );
}
