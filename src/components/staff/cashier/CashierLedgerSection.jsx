"use client";

import {
  Banner,
  Card,
  Input,
  RefreshButton,
  SectionCard,
  Skeleton,
  TinyPill,
} from "./cashier-ui";

function toDateInputValue(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isWithinDateRange(rawDate, fromDate, toDate) {
  if (!rawDate) return false;

  const d = new Date(rawDate);
  if (Number.isNaN(d.getTime())) return false;

  const current = toDateInputValue(d);

  if (fromDate && current < fromDate) return false;
  if (toDate && current > toDate) return false;

  return true;
}

export default function CashierLedgerSection({
  currentOpenSession,
  canReadLedger,
  ledger,
  ledgerLoading,
  ledgerQ,
  setLedgerQ,
  ledgerFromDate,
  setLedgerFromDate,
  ledgerToDate,
  setLedgerToDate,
  ledgerToday,
  ledgerTodayLoading,
  opening,
  expectedDrawerCash,
  sessionCashIn,
  sessionCashOut,
  depositsOut,
  expensesOut,
  sessionDeposits,
  sessionExpenses,
  loadLedger,
  loadLedgerToday,
  loadDeposits,
  loadExpenses,
  loadSessions,
  money,
  safeDate,
}) {
  const filteredLedger = (Array.isArray(ledger) ? ledger : []).filter((r) => {
    const q = String(ledgerQ || "")
      .trim()
      .toLowerCase();

    const matchesText = !q
      ? true
      : [
          r?.type,
          r?.direction,
          r?.method,
          r?.reference,
          r?.note,
          r?.saleId ?? r?.sale_id,
          r?.paymentId ?? r?.payment_id,
          r?.cashSessionId ?? r?.cash_session_id,
        ]
          .map((x) => String(x ?? ""))
          .join(" ")
          .toLowerCase()
          .includes(q);

    const rawDate = r?.createdAt || r?.created_at;
    const matchesDate =
      !ledgerFromDate && !ledgerToDate
        ? true
        : isWithinDateRange(rawDate, ledgerFromDate, ledgerToDate);

    return matchesText && matchesDate;
  });

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SectionCard
        title="Session summary"
        hint="Expected drawer cash for the open session."
        right={
          <RefreshButton
            loading={ledgerLoading || ledgerTodayLoading}
            onClick={() => {
              loadLedger();
              loadLedgerToday();
              loadDeposits();
              loadExpenses();
              loadSessions();
            }}
          />
        }
      >
        {!currentOpenSession ? (
          <Banner kind="warn">
            No open session. Open one to see drawer expectations.
          </Banner>
        ) : !canReadLedger ? (
          <Banner kind="warn">
            You do not have permission to view cash ledger.
          </Banner>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card
              label="Opening balance"
              value={money(opening)}
              sub={`Session #${currentOpenSession.id}`}
            />
            <Card
              label="Expected drawer cash"
              value={money(expectedDrawerCash)}
              sub="opening + cash in - cash out - deposits - expenses"
            />
            <Card
              label="Cash IN (cash only)"
              value={money(sessionCashIn)}
              sub="Ledger cash movements"
            />
            <Card
              label="Cash OUT (cash only)"
              value={money(sessionCashOut)}
              sub="Ledger cash movements"
            />
            <Card
              label="Deposits (this session)"
              value={money(depositsOut)}
              sub={`Count: ${sessionDeposits.length}`}
            />
            <Card
              label="Expenses (this session)"
              value={money(expensesOut)}
              sub={`Count: ${sessionExpenses.length}`}
            />
          </div>
        )}

        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <div className="text-sm font-semibold text-[var(--app-fg)]">
            Today (location)
          </div>
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card
              label="Total IN"
              value={ledgerTodayLoading ? "…" : money(ledgerToday.totalIn)}
            />
            <Card
              label="Total OUT"
              value={ledgerTodayLoading ? "…" : money(ledgerToday.totalOut)}
            />
            <Card
              label="Net"
              value={ledgerTodayLoading ? "…" : money(ledgerToday.net)}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Cash ledger"
        hint="All money movements, latest first."
      >
        {!canReadLedger ? (
          <Banner kind="warn">Ledger is blocked by permission.</Banner>
        ) : (
          <div className="grid gap-3">
            <Input
              placeholder="Search type, method, sale, payment or note"
              value={ledgerQ}
              onChange={(e) => setLedgerQ(e.target.value)}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                type="date"
                value={ledgerFromDate}
                onChange={(e) => setLedgerFromDate(e.target.value)}
              />
              <Input
                type="date"
                value={ledgerToDate}
                onChange={(e) => setLedgerToDate(e.target.value)}
              />
            </div>

            {(ledgerFromDate || ledgerToDate) && !ledgerLoading ? (
              <div className="flex flex-wrap items-center gap-2">
                {ledgerFromDate ? (
                  <TinyPill tone="info">From: {ledgerFromDate}</TinyPill>
                ) : null}
                {ledgerToDate ? (
                  <TinyPill tone="info">To: {ledgerToDate}</TinyPill>
                ) : null}
                <button
                  type="button"
                  className="rounded-2xl border border-[var(--border)] px-3 py-2 text-xs font-extrabold text-[var(--app-fg)]"
                  onClick={() => {
                    setLedgerFromDate("");
                    setLedgerToDate("");
                  }}
                >
                  Clear dates
                </button>
              </div>
            ) : null}

            {ledgerLoading ? (
              <div className="grid gap-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <div className="grid gap-2">
                {filteredLedger.slice(0, 80).map((r, idx) => {
                  const dir = String(r?.direction || "").toUpperCase();
                  const amt = Number(r?.amount ?? 0) || 0;

                  return (
                    <div
                      key={r?.id || idx}
                      className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-extrabold text-[var(--app-fg)]">
                              {r?.type ?? "Movement"}
                            </div>
                            <TinyPill
                              tone={dir === "IN" ? "success" : "danger"}
                            >
                              {dir || "—"}
                            </TinyPill>
                            <TinyPill tone="info">
                              {String(r?.method ?? "—").toUpperCase()}
                            </TinyPill>
                          </div>

                          <div className="mt-2 text-xs app-muted">
                            Time:{" "}
                            <b>{safeDate(r?.createdAt || r?.created_at)}</b>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2 text-xs app-muted">
                            <span>
                              Session:{" "}
                              <b>
                                #{r?.cashSessionId ?? r?.cash_session_id ?? "—"}
                              </b>
                            </span>
                            <span>
                              Sale: <b>#{r?.saleId ?? r?.sale_id ?? "—"}</b>
                            </span>
                            <span>
                              Payment:{" "}
                              <b>#{r?.paymentId ?? r?.payment_id ?? "—"}</b>
                            </span>
                          </div>

                          {r?.note ? (
                            <div className="mt-2 break-words text-xs app-muted">
                              Note: <b>{String(r.note)}</b>
                            </div>
                          ) : null}
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-xs app-muted">Amount</div>
                          <div className="text-lg font-extrabold text-[var(--app-fg)]">
                            {money(amt)}
                          </div>
                          <div className="text-[11px] app-muted">RWF</div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredLedger.length === 0 ? (
                  <div className="text-sm app-muted">
                    No ledger entries found for the selected filters.
                  </div>
                ) : null}

                {filteredLedger.length > 80 ? (
                  <div className="text-xs app-muted">
                    Showing first 80 matching records.
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
