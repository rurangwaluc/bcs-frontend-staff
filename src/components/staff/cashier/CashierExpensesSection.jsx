"use client";

import {
  Banner,
  Input,
  RefreshButton,
  SectionCard,
  Skeleton,
  TinyPill,
} from "./cashier-ui";

import AsyncButton from "../../../components/AsyncButton";

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
  const isLocked = !currentOpenSession?.id;

  const filteredRows = rows.filter((expense) => {
    const q = String(expenseQ || "")
      .trim()
      .toLowerCase();
    if (!q) return true;

    const hay = [
      expense?.id,
      expense?.amount,
      expense?.category ?? expense?.type,
      expense?.reference ?? expense?.ref,
      expense?.cashSessionId ?? expense?.cash_session_id,
      expense?.note,
    ]
      .map((x) => String(x ?? ""))
      .join(" ")
      .toLowerCase();

    return hay.includes(q);
  });

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.92fr_1.08fr]">
      <SectionCard
        title="Record money spent"
        hint="Use this when money leaves the drawer to pay for a real business cost."
      >
        {isLocked ? (
          <Banner kind="warn" className="mb-4">
            Start your cashier day first before recording money spent.
          </Banner>
        ) : (
          <Banner kind="info" className="mb-4">
            This form is for real business spending from the cashier drawer,
            like transport, lunch, airtime, or other daily costs.
          </Banner>
        )}

        <div
          className={[
            "grid gap-4 transition",
            isLocked ? "pointer-events-none opacity-60" : "",
          ].join(" ")}
        >
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-base font-black text-[var(--app-fg)]">
                New money out record
              </div>
              {currentOpenSession?.id ? (
                <TinyPill tone="success">
                  Day #{currentOpenSession.id} is open
                </TinyPill>
              ) : (
                <TinyPill tone="warn">Day not open</TinyPill>
              )}
            </div>

            <div className="mt-2 text-sm app-muted">
              Write the amount, what it was for, and a short note if needed.
            </div>

            <form onSubmit={onCreateExpense} className="mt-4 grid gap-3">
              <Input
                placeholder="Amount spent (RWF)"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount?.(e.target.value)}
                disabled={isLocked}
              />

              <Input
                placeholder="What was it for? Example: Transport"
                value={expenseCategory}
                onChange={(e) => setExpenseCategory?.(e.target.value)}
                disabled={isLocked}
              />

              <Input
                placeholder="Reference number (optional)"
                value={expenseRef}
                onChange={(e) => setExpenseRef?.(e.target.value)}
                disabled={isLocked}
              />

              <Input
                placeholder="Short note (optional)"
                value={expenseNote}
                onChange={(e) => setExpenseNote?.(e.target.value)}
                disabled={isLocked}
              />

              <div className="flex flex-wrap gap-2">
                <AsyncButton
                  type="submit"
                  variant="primary"
                  state={expenseBtnState}
                  text="Save spending record"
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
        title="Money spent history"
        hint="Latest records of money that left the drawer for business costs."
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
            placeholder="Search by ID, amount, purpose, reference or note"
            value={expenseQ}
            onChange={(e) => setExpenseQ?.(e.target.value)}
          />

          {expensesLoading ? (
            <div className="grid gap-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] p-6 text-sm app-muted dark:bg-slate-900">
              No spending records found.
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
                          Spending #{expense?.id ?? "—"}
                        </div>
                        <TinyPill tone="warn">
                          {String(
                            expense?.category ?? expense?.type ?? "GENERAL",
                          )}
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
                        Time:{" "}
                        <b>
                          {safeDate?.(
                            expense?.createdAt || expense?.created_at,
                          )}
                        </b>
                      </div>

                      <div className="mt-2 text-xs app-muted">
                        Reference:{" "}
                        <b>{expense?.reference ?? expense?.ref ?? "—"}</b>
                      </div>

                      {expense?.note ? (
                        <div className="mt-2 break-words text-xs app-muted">
                          Note: <b>{String(expense.note)}</b>
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

              {filteredRows.length > 60 ? (
                <div className="text-xs app-muted">
                  Showing first 60 matching records. Narrow your search to find
                  more faster.
                </div>
              ) : null}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
