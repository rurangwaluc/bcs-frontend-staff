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

function displayMethodLabel(method) {
  const value = String(method || "")
    .trim()
    .toUpperCase();

  if (value === "BANK") return "To bank";
  if (value === "MOMO") return "To mobile money";
  if (value === "CARD") return "To card machine";
  if (value === "CASH") return "Cash kept aside";
  return value || "—";
}

function mapMethodOptionLabel(method) {
  const value = String(method?.value || "")
    .trim()
    .toUpperCase();
  const fallback = safeLabel(method?.label);

  if (value === "BANK") return "To bank";
  if (value === "MOMO") return "To mobile money";
  if (value === "CARD") return "To card machine";
  if (value === "CASH") return "Cash kept aside";

  return fallback || value || "Unknown";
}

function safeLabel(v) {
  return String(v || "").trim();
}

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
        title="Send money out"
        hint="Use this when cash leaves the drawer and is sent somewhere safe, like the bank or mobile money."
      >
        {isLocked ? (
          <Banner kind="warn" className="mb-4">
            Start your cashier day first before saving money sent out.
          </Banner>
        ) : (
          <Banner kind="info" className="mb-4">
            Use this only when money is really leaving the drawer. This will
            reduce the cash you are expected to still have in hand.
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
                Save money sent out
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
              Example: money taken to the bank or sent to mobile money.
            </div>

            <form onSubmit={onCreateDeposit} className="mt-4 grid gap-3">
              <Input
                placeholder="Amount sent out (RWF)"
                value={depositAmount}
                onChange={(e) => setDepositAmount?.(e.target.value)}
                disabled={isLocked}
              />

              <div className="grid gap-2">
                <label className="text-sm font-medium text-[var(--app-fg)]">
                  Where did this money go?
                </label>
                <Select
                  value={depositMethod}
                  onChange={(e) => setDepositMethod?.(e.target.value)}
                  disabled={isLocked}
                >
                  {methodRows.length === 0 ? (
                    <option value="BANK">To bank</option>
                  ) : (
                    methodRows.map((method) => (
                      <option key={method.value} value={method.value}>
                        {mapMethodOptionLabel(method)}
                      </option>
                    ))
                  )}
                </Select>
              </div>

              <Input
                placeholder="Receipt number or transfer code (optional)"
                value={depositReference}
                onChange={(e) => setDepositReference?.(e.target.value)}
                disabled={isLocked}
              />

              <div className="text-xs app-muted">
                Fill this only if you have a bank slip number, receipt number,
                or mobile money transfer code. You can leave it empty.
              </div>

              <Input
                placeholder="Extra note (optional)"
                value={depositNote}
                onChange={(e) => setDepositNote?.(e.target.value)}
                disabled={isLocked}
              />

              <div className="flex flex-wrap gap-2">
                <AsyncButton
                  type="submit"
                  variant="primary"
                  state={depositBtnState}
                  text="Save money sent out"
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
        title="Money sent out history"
        hint="Latest records of money that left the cashier drawer."
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
            placeholder="Search by number, amount, destination, receipt code or note"
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
              No money sent out records found.
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
                          Money sent out #{deposit?.id ?? "—"}
                        </div>
                        <TinyPill tone="info">
                          {displayMethodLabel(deposit?.method)}
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
                        Saved on:{" "}
                        <b>
                          {safeDate?.(
                            deposit?.createdAt || deposit?.created_at,
                          )}
                        </b>
                      </div>

                      <div className="mt-2 text-xs app-muted">
                        Receipt / transfer code:{" "}
                        <b>{deposit?.reference ?? "—"}</b>
                      </div>

                      {deposit?.note ? (
                        <div className="mt-2 break-words text-xs app-muted">
                          Extra note: <b>{String(deposit.note)}</b>
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
