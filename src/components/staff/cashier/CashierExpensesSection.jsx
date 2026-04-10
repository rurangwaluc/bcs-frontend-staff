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

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.92fr_1.08fr]">
      <SectionCard
        title="Money spent"
        hint="Use this only when cash leaves the drawer for a real day-to-day business cost."
      >
        {isLocked ? (
          <Banner kind="warn" className="mb-4">
            Start your cashier day first before saving money spent.
          </Banner>
        ) : (
          <Banner kind="info" className="mb-4">
            Use this for real cash spending like transport, lunch, airtime,
            repairs, or other daily business costs. Do not use this for stock
            buying or supplier purchasing.
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
                Save money spent
              </div>
              {currentOpenSession?.id ? (
                <>
                  <TinyPill tone="success">
                    Day #{currentOpenSession.id} is open
                  </TinyPill>
                  <TinyPill tone="warn">Cash only</TinyPill>
                </>
              ) : (
                <TinyPill tone="warn">Day not open</TinyPill>
              )}
            </div>

            <div className="mt-2 text-sm app-muted">
              Write how much money left the drawer, what it was used for, and
              who received it if needed.
            </div>

            <form onSubmit={onCreateExpense} className="mt-4 grid gap-3">
              <Input
                placeholder="Amount spent (RWF)"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount?.(e.target.value)}
                disabled={isLocked}
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
        title="Money spent history"
        hint="Latest records of cash that left the drawer for daily business costs."
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

          {expensesLoading ? (
            <div className="grid gap-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] p-6 text-sm app-muted dark:bg-slate-900">
              No money spent records found.
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
                          {String(expense?.status || "POSTED")}
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
                          {safeDate?.(
                            expense?.expenseDate ||
                              expense?.expense_date ||
                              expense?.createdAt ||
                              expense?.created_at,
                          )}
                        </b>
                      </div>

                      <div className="mt-1 text-xs app-muted">
                        Saved on:{" "}
                        <b>
                          {safeDate?.(
                            expense?.createdAt || expense?.created_at,
                          )}
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
