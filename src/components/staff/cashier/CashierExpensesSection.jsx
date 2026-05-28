"use client";

import {
  Banner,
  Input,
  RefreshButton,
  SectionCard,
  Skeleton,
  TinyPill,
} from "./cashier-ui";

import AsyncButton from "../../AsyncButton";

function toText(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function statusTone(status) {
  const value = String(status || "")
    .trim()
    .toUpperCase();

  if (value === "VOID") return "danger";
  return "success";
}

function categoryLabel(category) {
  const raw = String(category || "GENERAL")
    .trim()
    .toUpperCase();

  return raw.replaceAll("_", " ");
}

function methodLabel(method) {
  const raw = String(method || "CASH")
    .trim()
    .toUpperCase();

  if (raw === "CASH") return "Cash";
  if (raw === "BANK") return "Bank";
  if (raw === "MOMO") return "Mobile money";
  if (raw === "CARD") return "Card";
  if (raw === "OTHER") return "Other";
  return raw || "Cash";
}

function sessionIdOf(session) {
  return session?.id ?? session?.sessionId ?? session?.cashSessionId ?? null;
}

function expenseSessionId(expense) {
  return (
    expense?.cashSessionId ??
    expense?.cash_session_id ??
    expense?.sessionId ??
    expense?.session_id ??
    null
  );
}

function expenseDateValue(expense) {
  return (
    expense?.expenseDate ||
    expense?.expense_date ||
    expense?.createdAt ||
    expense?.created_at ||
    null
  );
}

function isSameSessionExpense(expense, openSessionId) {
  if (!openSessionId) return false;
  return String(expenseSessionId(expense) || "") === String(openSessionId);
}

function moneyOutTotal(rows) {
  return rows.reduce((sum, row) => {
    if (String(row?.status || "").toUpperCase() === "VOID") return sum;
    return sum + toNumber(row?.amount ?? 0, 0);
  }, 0);
}

export default function CashierExpensesSection({
  currentOpenSession,
  expenses,
  expensesLoading,
  expenseQ,
  setExpenseQ,
  expenseAmount,
  setExpenseAmount,
  expenseCategory,
  setExpenseCategory,
  expenseDate,
  setExpenseDate,
  expensePayeeName,
  setExpensePayeeName,
  expenseRef,
  setExpenseRef,
  expenseNote,
  setExpenseNote,
  expenseBtnState,
  loadExpenses,
  money,
  safeDate,
  onCreateExpense,
}) {
  const rows = Array.isArray(expenses) ? expenses : [];
  const openSessionId = sessionIdOf(currentOpenSession);
  const isLocked = !openSessionId;

  const currentSessionRows = rows.filter((expense) =>
    isSameSessionExpense(expense, openSessionId),
  );

  const filteredRows = currentSessionRows.filter((expense) => {
    const q = String(expenseQ || "")
      .trim()
      .toLowerCase();

    if (!q) return true;

    const hay = [
      expense?.id,
      expense?.amount,
      expense?.category ?? expense?.type,
      expense?.method,
      expense?.status,
      expense?.payeeName ?? expense?.payee_name,
      expense?.reference ?? expense?.ref,
      expense?.cashSessionId ?? expense?.cash_session_id,
      expense?.note,
      expense?.expenseDate ?? expense?.expense_date,
      expense?.createdAt ?? expense?.created_at,
    ]
      .map((x) => String(x ?? ""))
      .join(" ")
      .toLowerCase();

    return hay.includes(q);
  });

  const postedCount = currentSessionRows.filter(
    (expense) => String(expense?.status || "").toUpperCase() !== "VOID",
  ).length;

  const voidCount = currentSessionRows.filter(
    (expense) => String(expense?.status || "").toUpperCase() === "VOID",
  ).length;

  const totalMoneyOut = moneyOutTotal(currentSessionRows);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.92fr_1.08fr]">
      <SectionCard
        title="Money spent"
        hint="Cashier expenses must stay tied to the current open cashier day."
      >
        {isLocked ? (
          <Banner kind="warn" className="mb-4">
            Start your cashier day first before saving money spent.
          </Banner>
        ) : (
          <Banner kind="info" className="mb-4">
            Use this only for real day-to-day business costs paid during this
            cashier day. Do not use this for stock buying, supplier purchasing,
            loans, or owner spending.
          </Banner>
        )}

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4 dark:bg-slate-900">
            <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
              Current cashier day
            </div>
            <div className="mt-2 text-lg font-extrabold text-[var(--app-fg)]">
              {openSessionId ? `#${openSessionId}` : "Not open"}
            </div>
            <div className="mt-1 text-xs app-muted">
              Only this day can receive cashier expenses.
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4 dark:bg-slate-900">
            <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
              Saved expenses
            </div>
            <div className="mt-2 text-lg font-extrabold text-[var(--app-fg)]">
              {postedCount}
            </div>
            <div className="mt-1 text-xs app-muted">
              Active money-out records for this day.
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4 dark:bg-slate-900">
            <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
              Money out total
            </div>
            <div className="mt-2 text-lg font-extrabold text-[var(--app-fg)]">
              {money?.(totalMoneyOut)}
            </div>
            <div className="mt-1 text-xs app-muted">
              Voided records are not included.
            </div>
          </div>
        </div>

        <div
          className={[
            "grid gap-4 transition",
            isLocked ? "pointer-events-none opacity-60" : "",
          ].join(" ")}
        >
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-base font-black text-[var(--app-fg)]">
                Save money spent
              </div>

              {openSessionId ? (
                <>
                  <TinyPill tone="success">
                    Day #{openSessionId} is open
                  </TinyPill>
                  <TinyPill tone="warn">Session-bound</TinyPill>
                  <TinyPill tone="warn">Cashier use only</TinyPill>
                </>
              ) : (
                <TinyPill tone="warn">Day not open</TinyPill>
              )}
            </div>

            <div className="mt-2 text-sm app-muted">
              Record what money left the drawer during this cashier day, why it
              left, and who received it if needed.
            </div>

            <form onSubmit={onCreateExpense} className="mt-4 grid gap-3">
              <Input
                placeholder="Amount spent (RWF)"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount?.(e.target.value)}
                disabled={isLocked}
                inputMode="numeric"
              />

              <Input
                placeholder="What was this money used for?"
                value={expenseCategory}
                onChange={(e) => setExpenseCategory?.(e.target.value)}
                disabled={isLocked}
              />

              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate?.(e.target.value)}
                disabled={isLocked}
              />

              <Input
                placeholder="Who received this money? (optional)"
                value={expensePayeeName}
                onChange={(e) => setExpensePayeeName?.(e.target.value)}
                disabled={isLocked}
              />

              <Input
                placeholder="Receipt number or transfer code (optional)"
                value={expenseRef}
                onChange={(e) => setExpenseRef?.(e.target.value)}
                disabled={isLocked}
              />

              <div className="text-xs app-muted">
                Fill this only if you have a receipt number, slip number, or
                transfer code. You can leave it empty.
              </div>

              <Input
                placeholder="Extra note (optional)"
                value={expenseNote}
                onChange={(e) => setExpenseNote?.(e.target.value)}
                disabled={isLocked}
              />

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 text-xs app-muted dark:bg-slate-950">
                This form is for normal operating costs only. Stock purchases,
                supplier bills, owner loans, and other non-cashier flows must
                not be recorded here.
              </div>

              <div className="flex flex-wrap gap-2">
                <AsyncButton
                  type="submit"
                  variant="primary"
                  state={expenseBtnState}
                  text="Save money spent"
                  loadingText="Saving…"
                  successText="Saved"
                  disabled={isLocked}
                />
              </div>
            </form>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Current cashier day expense history"
        hint="Only expenses tied to the open cashier day appear here."
        right={
          <RefreshButton
            loading={expensesLoading}
            onClick={loadExpenses}
            text="Refresh"
          />
        }
      >
        <div className="grid gap-4">
          <Input
            placeholder="Search by number, amount, purpose, person, receipt code, status or note"
            value={expenseQ}
            onChange={(e) => setExpenseQ?.(e.target.value)}
          />

          {isLocked ? (
            <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] p-6 text-sm app-muted dark:bg-slate-900">
              Open a cashier day first to view and manage that day’s expenses.
            </div>
          ) : expensesLoading ? (
            <div className="grid gap-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] p-6 text-sm app-muted dark:bg-slate-900">
              No money spent records found for cashier day #{openSessionId}.
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredRows.slice(0, 60).map((expense, idx) => (
                <div
                  key={expense?.id || idx}
                  className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-extrabold text-[var(--app-fg)]">
                          Money spent #{expense?.id ?? "—"}
                        </div>

                        <TinyPill tone="warn">
                          {categoryLabel(
                            expense?.category ?? expense?.type ?? "GENERAL",
                          )}
                        </TinyPill>

                        <TinyPill tone={statusTone(expense?.status)}>
                          {toText(expense?.status, "POSTED")}
                        </TinyPill>

                        <TinyPill tone="neutral">
                          {methodLabel(expense?.method || "CASH")}
                        </TinyPill>
                      </div>

                      <div className="mt-2 text-xs app-muted">
                        Cashier day:{" "}
                        <b>
                          #
                          {expense?.cashSessionId ??
                            expense?.cash_session_id ??
                            "—"}
                        </b>
                      </div>

                      <div className="mt-1 text-xs app-muted">
                        When it happened:{" "}
                        <b>
                          {safeDate?.(expenseDateValue(expense)) ||
                            safeDate(expenseDateValue(expense))}
                        </b>
                      </div>

                      <div className="mt-1 text-xs app-muted">
                        Saved on:{" "}
                        <b>
                          {safeDate?.(
                            expense?.createdAt || expense?.created_at,
                          ) ||
                            safeDate(expense?.createdAt || expense?.created_at)}
                        </b>
                      </div>

                      <div className="mt-2 text-xs app-muted">
                        Who received it:{" "}
                        <b>
                          {expense?.payeeName ?? expense?.payee_name ?? "—"}
                        </b>
                      </div>

                      <div className="mt-1 text-xs app-muted">
                        Receipt / transfer code:{" "}
                        <b>{expense?.reference ?? expense?.ref ?? "—"}</b>
                      </div>

                      {expense?.voidReason || expense?.void_reason ? (
                        <div className="mt-2 break-words text-xs text-rose-700 dark:text-rose-300">
                          Why it was cancelled:{" "}
                          <b>
                            {String(
                              expense?.voidReason ?? expense?.void_reason,
                            )}
                          </b>
                        </div>
                      ) : null}

                      {expense?.note ? (
                        <div className="mt-2 break-words text-xs app-muted">
                          Extra note: <b>{String(expense.note)}</b>
                        </div>
                      ) : null}
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
                        Amount out
                      </div>
                      <div className="mt-1 text-lg font-extrabold text-[var(--app-fg)]">
                        {money?.(expense?.amount ?? 0)}
                      </div>
                      <div className="text-[11px] app-muted">RWF</div>
                    </div>
                  </div>
                </div>
              ))}

              {voidCount > 0 ? (
                <div className="text-xs app-muted">
                  This cashier day has {voidCount} voided expense
                  {voidCount === 1 ? "" : "s"} kept for record truth.
                </div>
              ) : null}

              {filteredRows.length > 60 ? (
                <div className="text-xs app-muted">
                  Showing first 60 matching records. Narrow your search to find
                  results faster.
                </div>
              ) : null}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
