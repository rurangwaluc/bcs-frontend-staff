"use client";

import {
  Banner,
  Input,
  RefreshButton,
  SectionCard,
  Select,
  Skeleton,
  TinyPill,
} from "./cashier-ui";

import AsyncButton from "../../../components/AsyncButton";

export default function CashierDepositsSection({
  currentOpenSession,
  deposits,
  depositsLoading,
  depositQ,
  setDepositQ,
  depositAmount,
  setDepositAmount,
  depositMethod,
  setDepositMethod,
  depositReference,
  setDepositReference,
  depositNote,
  setDepositNote,
  depositBtnState,
  methods,
  loadDeposits,
  money,
  safeDate,
  onCreateDeposit,
}) {
  const rows = Array.isArray(deposits) ? deposits : [];
  const methodRows = Array.isArray(methods) ? methods : [];
  const isLocked = !currentOpenSession?.id;

  const filteredRows = rows.filter((deposit) => {
    const q = String(depositQ || "")
      .trim()
      .toLowerCase();
    if (!q) return true;

    const hay = [
      deposit?.id,
      deposit?.amount,
      deposit?.method,
      deposit?.reference,
      deposit?.cashSessionId ?? deposit?.cash_session_id,
      deposit?.note,
    ]
      .map((x) => String(x ?? ""))
      .join(" ")
      .toLowerCase();

    return hay.includes(q);
  });

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.92fr_1.08fr]">
      <SectionCard
        title="Move cash out for banking"
        hint="Use this when cash leaves the drawer and goes to the bank or another safe destination."
      >
        {isLocked ? (
          <Banner kind="warn" className="mb-4">
            Start your cashier day first before recording a cash movement out.
          </Banner>
        ) : (
          <Banner kind="info" className="mb-4">
            This form records money that leaves the drawer. It reduces the cash
            you are expected to have in hand.
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
                New cash movement out
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
              Example: money taken to the bank.
            </div>

            <form onSubmit={onCreateDeposit} className="mt-4 grid gap-3">
              <Input
                placeholder="Amount moved out (RWF)"
                value={depositAmount}
                onChange={(e) => setDepositAmount?.(e.target.value)}
                disabled={isLocked}
              />

              <Select
                value={depositMethod}
                onChange={(e) => setDepositMethod?.(e.target.value)}
                disabled={isLocked}
              >
                {methodRows.length === 0 ? (
                  <option value="BANK">Bank</option>
                ) : (
                  methodRows.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))
                )}
              </Select>

              <Input
                placeholder="Reference number (optional)"
                value={depositReference}
                onChange={(e) => setDepositReference?.(e.target.value)}
                disabled={isLocked}
              />

              <Input
                placeholder="Short note (optional)"
                value={depositNote}
                onChange={(e) => setDepositNote?.(e.target.value)}
                disabled={isLocked}
              />

              <div className="flex flex-wrap gap-2">
                <AsyncButton
                  type="submit"
                  variant="primary"
                  state={depositBtnState}
                  text="Save cash movement"
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
        title="Cash moved out history"
        hint="Latest records of money taken out of the cashier drawer."
        right={
          <RefreshButton
            loading={depositsLoading}
            onClick={loadDeposits}
            text="Refresh"
          />
        }
      >
        <div className="grid gap-4">
          <Input
            placeholder="Search by ID, amount, method, reference or note"
            value={depositQ}
            onChange={(e) => setDepositQ?.(e.target.value)}
          />

          {depositsLoading ? (
            <div className="grid gap-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] p-6 text-sm app-muted dark:bg-slate-900">
              No cash movement out records found.
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredRows.slice(0, 60).map((deposit, idx) => (
                <div
                  key={deposit?.id || idx}
                  className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-extrabold text-[var(--app-fg)]">
                          Cash movement #{deposit?.id ?? "—"}
                        </div>
                        <TinyPill tone="info">
                          {String(deposit?.method ?? "—").toUpperCase()}
                        </TinyPill>
                      </div>

                      <div className="mt-2 text-xs app-muted">
                        Cashier day:{" "}
                        <b>
                          #
                          {deposit?.cashSessionId ??
                            deposit?.cash_session_id ??
                            "—"}
                        </b>
                      </div>

                      <div className="mt-1 text-xs app-muted">
                        Time:{" "}
                        <b>
                          {safeDate?.(
                            deposit?.createdAt || deposit?.created_at,
                          )}
                        </b>
                      </div>

                      <div className="mt-2 text-xs app-muted">
                        Reference: <b>{deposit?.reference ?? "—"}</b>
                      </div>

                      {deposit?.note ? (
                        <div className="mt-2 break-words text-xs app-muted">
                          Note: <b>{String(deposit.note)}</b>
                        </div>
                      ) : null}
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
                        Amount out
                      </div>
                      <div className="mt-1 text-lg font-extrabold text-[var(--app-fg)]">
                        {money?.(deposit?.amount ?? 0)}
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
