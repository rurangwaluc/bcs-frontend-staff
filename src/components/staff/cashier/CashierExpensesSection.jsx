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
  const isLocked = !currentOpenSession;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SectionCard
        title="Create expense"
        hint="Cash spent. Open session required."
      >
        {!currentOpenSession ? (
          <Banner kind="warn">Open a session to create an expense.</Banner>
        ) : null}

        <div
          className={[
            "rounded-3xl transition",
            isLocked ? "pointer-events-none opacity-60" : "",
          ].join(" ")}
        >
          <form className="grid max-w-md gap-3" onSubmit={onCreateExpense}>
            <Input
              placeholder="Amount (RWF)"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              disabled={isLocked}
            />
            <Input
              placeholder="Category (example: Transport)"
              value={expenseCategory}
              onChange={(e) => setExpenseCategory(e.target.value)}
              disabled={isLocked}
            />
            <Input
              placeholder="Reference (optional)"
              value={expenseRef}
              onChange={(e) => setExpenseRef(e.target.value)}
              disabled={isLocked}
            />
            <Input
              placeholder="Note (optional)"
              value={expenseNote}
              onChange={(e) => setExpenseNote(e.target.value)}
              disabled={isLocked}
            />

            <AsyncButton
              type="submit"
              variant="primary"
              state={expenseBtnState}
              text="Save expense"
              loadingText="Saving…"
              successText="Saved"
              disabled={isLocked}
            />
          </form>
        </div>
      </SectionCard>

      <SectionCard
        title="Expenses"
        hint="Latest expense records"
        right={
          <RefreshButton loading={expensesLoading} onClick={loadExpenses} />
        }
      >
        <Input
          placeholder="Search"
          value={expenseQ}
          onChange={(e) => setExpenseQ(e.target.value)}
        />

        <div className="mt-3">
          {expensesLoading ? (
            <div className="grid gap-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="grid gap-2">
              {(Array.isArray(expenses) ? expenses : [])
                .filter((x) => {
                  const q = String(expenseQ || "")
                    .trim()
                    .toLowerCase();
                  if (!q) return true;
                  const hay = [
                    x?.id,
                    x?.amount,
                    x?.category ?? x?.type,
                    x?.reference ?? x?.ref,
                    x?.cashSessionId ?? x?.cash_session_id,
                    x?.note,
                  ]
                    .map((v) => String(v ?? ""))
                    .join(" ")
                    .toLowerCase();
                  return hay.includes(q);
                })
                .slice(0, 60)
                .map((x, idx) => (
                  <div
                    key={x?.id || idx}
                    className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-[var(--app-fg)]">
                          Expense #{x?.id ?? "—"}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs app-muted">
                          <TinyPill tone="warn">
                            {String(x?.category ?? x?.type ?? "GENERAL")}
                          </TinyPill>
                          <span>
                            Session:{" "}
                            <b>
                              #{x?.cashSessionId ?? x?.cash_session_id ?? "—"}
                            </b>
                          </span>
                        </div>
                        <div className="mt-2 text-xs app-muted">
                          Ref: <b>{x?.reference ?? x?.ref ?? "—"}</b>
                        </div>
                        <div className="mt-1 text-xs app-muted">
                          Time: <b>{safeDate(x?.createdAt || x?.created_at)}</b>
                        </div>
                        {x?.note ? (
                          <div className="mt-2 break-words text-xs app-muted">
                            Note: <b>{String(x.note)}</b>
                          </div>
                        ) : null}
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-xs app-muted">Amount</div>
                        <div className="text-lg font-extrabold text-[var(--app-fg)]">
                          {money(x?.amount ?? 0)}
                        </div>
                        <div className="text-[11px] app-muted">RWF</div>
                      </div>
                    </div>
                  </div>
                ))}

              {(Array.isArray(expenses) ? expenses : []).length === 0 ? (
                <div className="text-sm app-muted">No expenses yet.</div>
              ) : null}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
