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
  const isLocked = !currentOpenSession;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SectionCard
        title="Create deposit"
        hint="Move money to bank or safe. Open session required."
      >
        {!currentOpenSession ? (
          <Banner kind="warn">Open a session to create a deposit.</Banner>
        ) : null}

        <div
          className={[
            "rounded-3xl transition",
            isLocked ? "pointer-events-none opacity-60" : "",
          ].join(" ")}
        >
          <form className="grid max-w-md gap-3" onSubmit={onCreateDeposit}>
            <Input
              placeholder="Amount (RWF)"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              disabled={isLocked}
            />
            <Select
              value={depositMethod}
              onChange={(e) => setDepositMethod(e.target.value)}
              disabled={isLocked}
            >
              {methods.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
            <Input
              placeholder="Reference (optional)"
              value={depositReference}
              onChange={(e) => setDepositReference(e.target.value)}
              disabled={isLocked}
            />
            <Input
              placeholder="Note (optional)"
              value={depositNote}
              onChange={(e) => setDepositNote(e.target.value)}
              disabled={isLocked}
            />

            <AsyncButton
              type="submit"
              variant="primary"
              state={depositBtnState}
              text="Save deposit"
              loadingText="Saving…"
              successText="Saved"
              disabled={isLocked}
            />
          </form>
        </div>
      </SectionCard>

      <SectionCard
        title="Deposits"
        hint="Latest deposit records"
        right={
          <RefreshButton loading={depositsLoading} onClick={loadDeposits} />
        }
      >
        <Input
          placeholder="Search"
          value={depositQ}
          onChange={(e) => setDepositQ(e.target.value)}
        />

        <div className="mt-3">
          {depositsLoading ? (
            <div className="grid gap-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="grid gap-2">
              {(Array.isArray(deposits) ? deposits : [])
                .filter((d) => {
                  const q = String(depositQ || "")
                    .trim()
                    .toLowerCase();
                  if (!q) return true;
                  const hay = [
                    d?.id,
                    d?.amount,
                    d?.method,
                    d?.reference,
                    d?.cashSessionId ?? d?.cash_session_id,
                  ]
                    .map((x) => String(x ?? ""))
                    .join(" ")
                    .toLowerCase();
                  return hay.includes(q);
                })
                .slice(0, 60)
                .map((d, idx) => (
                  <div
                    key={d?.id || idx}
                    className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-[var(--app-fg)]">
                          Deposit #{d?.id ?? "—"}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs app-muted">
                          <TinyPill tone="info">
                            {String(d?.method ?? "—").toUpperCase()}
                          </TinyPill>
                          <span>
                            Session:{" "}
                            <b>
                              #{d?.cashSessionId ?? d?.cash_session_id ?? "—"}
                            </b>
                          </span>
                        </div>
                        <div className="mt-2 text-xs app-muted">
                          Ref: <b>{d?.reference ?? "—"}</b>
                        </div>
                        <div className="mt-1 text-xs app-muted">
                          Time: <b>{safeDate(d?.createdAt || d?.created_at)}</b>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-xs app-muted">Amount</div>
                        <div className="text-lg font-extrabold text-[var(--app-fg)]">
                          {money(d?.amount ?? 0)}
                        </div>
                        <div className="text-[11px] app-muted">RWF</div>
                      </div>
                    </div>
                  </div>
                ))}

              {(Array.isArray(deposits) ? deposits : []).length === 0 ? (
                <div className="text-sm app-muted">No deposits yet.</div>
              ) : null}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
