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
  return (
    <div className="grid gap-4">
      <SectionCard
        title="What to do now"
        hint="Use this order to keep cashier operations clean."
        right={
          <RefreshButton
            loading={summaryLoading || salesLoading || sessionsLoading}
            onClick={() => {
              loadSessions();
              loadSummary();
              loadSales();
              loadPayments();
              loadUnread();
            }}
          />
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4">
            <div className="text-sm font-black text-[var(--app-fg)]">
              1) Open session
            </div>
            <div className="mt-1 text-xs app-muted">
              You need an open session before cash work starts.
            </div>
            <div className="mt-3">
              <button
                type="button"
                className="rounded-2xl bg-[var(--app-fg)] px-4 py-2.5 text-sm font-bold text-[var(--app-bg)]"
                onClick={() => setSection("sessions")}
              >
                Go
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4">
            <div className="text-sm font-black text-[var(--app-fg)]">
              2) Record payments
            </div>
            <div className="mt-1 text-xs app-muted">
              Finish all sales that are waiting for cashier action.
            </div>
            <div className="mt-3 flex items-center gap-2">
              <TinyPill tone={awaitingCount > 0 ? "warn" : "neutral"}>
                Waiting: {awaitingCount}
              </TinyPill>
              <button
                type="button"
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-bold text-[var(--app-fg)]"
                onClick={() => setSection("payments")}
              >
                Go
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4">
            <div className="text-sm font-black text-[var(--app-fg)]">
              3) Close & reconcile
            </div>
            <div className="mt-1 text-xs app-muted">
              Finish the day with control, not guesswork.
            </div>
            <div className="mt-3">
              <button
                type="button"
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-bold text-[var(--app-fg)]"
                onClick={() => setSection("reconcile")}
              >
                Go
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          label="Today payments"
          value={summaryLoading ? "…" : String(summary?.today?.count ?? 0)}
          sub={`Total: ${Number(summary?.today?.total ?? 0).toLocaleString()}`}
        />
        <Card
          label="Today money IN"
          value={
            ledgerTodayLoading
              ? "…"
              : Number(ledgerToday?.totalIn ?? 0).toLocaleString()
          }
          sub="All methods"
        />
        <Card
          label="Today money OUT"
          value={
            ledgerTodayLoading
              ? "…"
              : Number(ledgerToday?.totalOut ?? 0).toLocaleString()
          }
          sub="All methods"
        />
        <Card
          label="Unread notifications"
          value={String(unread ?? 0)}
          sub={
            streamStatus === "live"
              ? "Live ON"
              : streamStatus === "error"
                ? "Live OFF"
                : "—"
          }
        />
      </div>

      {awaitingCount > 0 ? (
        <Banner kind="warn">
          There are <b>{awaitingCount}</b> sales waiting for payment recording.
        </Banner>
      ) : null}
    </div>
  );
}
