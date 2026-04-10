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

function toText(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function moneyText(fn, value) {
  if (typeof fn === "function") return fn(value);
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.round(n).toLocaleString() : "0";
}

function dateText(fn, value) {
  if (typeof fn === "function") return fn(value);
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

function differenceTone(value) {
  const n = Number(value || 0);
  if (n === 0) return "success";
  if (n > 0) return "info";
  return "warn";
}

function differenceLabel(value) {
  const n = Number(value || 0);
  if (n === 0) return "Matches closed day";
  if (n > 0) return "More than closed day";
  return "Less than closed day";
}

export default function CashierReconcileSection({
  currentOpenSession = null,
  closedSessions,
  reconciles,
  reconcilesLoading,
  reconcileQ,
  setReconcileQ,
  selectedClosedSessionId,
  setSelectedClosedSessionId,
  reconcileCountedCash,
  setReconcileCountedCash,
  reconcileNote,
  setReconcileNote,
  reconcileBtnState,
  loadReconciles,
  money,
  safeDate,
  onCreateReconcile,
}) {
  const sessionRows = Array.isArray(closedSessions) ? closedSessions : [];
  const reconcileRows = Array.isArray(reconciles) ? reconciles : [];

  const hasClosedSession = sessionRows.length > 0;
  const hasOpenSession = !!currentOpenSession?.id;
  const formLocked = hasOpenSession || !hasClosedSession;

  const selectedClosedSession = sessionRows.find(
    (session) => String(session?.id) === String(selectedClosedSessionId || ""),
  );

  const officialClosedCash = Number(
    selectedClosedSession?.countedClosingBalance ??
      selectedClosedSession?.counted_closing_balance ??
      selectedClosedSession?.closingBalance ??
      selectedClosedSession?.closing_balance ??
      0,
  );

  const typedCheckedCash = Number(reconcileCountedCash || 0);
  const checkDifference = typedCheckedCash - officialClosedCash;

  const filteredRows = reconcileRows.filter((row) => {
    const q = String(reconcileQ || "")
      .trim()
      .toLowerCase();

    if (!q) return true;

    const hay = [
      row?.id,
      row?.cashSessionId ?? row?.cash_session_id,
      row?.note,
      row?.difference,
      row?.expectedCash ?? row?.expected_cash,
      row?.countedCash ?? row?.counted_cash,
      row?.createdAt ?? row?.created_at,
    ]
      .map((x) => String(x ?? ""))
      .join(" ")
      .toLowerCase();

    return hay.includes(q);
  });

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.92fr_1.08fr]">
      <SectionCard
        title="Check cash after closing the day"
        hint="Use this to check a finished cashier day again and confirm whether the cash still matches the closed result."
      >
        {hasOpenSession ? (
          <Banner kind="warn" className="mb-4">
            You still have an open cashier day. End it first before saving a
            cash check.
          </Banner>
        ) : !hasClosedSession ? (
          <Banner kind="warn" className="mb-4">
            No finished cashier day found yet. End a cashier day first before
            saving a cash check.
          </Banner>
        ) : (
          <Banner kind="info" className="mb-4">
            Choose a finished cashier day, count the cash again, then save the
            result to check whether it still matches the closed day.
          </Banner>
        )}

        <div
          className={[
            "grid gap-4 transition",
            formLocked ? "pointer-events-none opacity-60" : "",
          ].join(" ")}
        >
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-base font-black text-[var(--app-fg)]">
                Save cash check
              </div>

              {hasOpenSession ? (
                <TinyPill tone="warn">End open day first</TinyPill>
              ) : hasClosedSession ? (
                <TinyPill tone="success">Ready</TinyPill>
              ) : (
                <TinyPill tone="warn">Nothing to check yet</TinyPill>
              )}
            </div>

            <div className="mt-2 text-sm app-muted">
              This is a second check after the day was already closed. It does
              not replace the closed result. It helps confirm it.
            </div>

            {!formLocked ? (
              <form onSubmit={onCreateReconcile} className="mt-4 grid gap-3">
                <Select
                  value={selectedClosedSessionId}
                  onChange={(e) => setSelectedClosedSessionId?.(e.target.value)}
                >
                  <option value="">Choose finished cashier day…</option>
                  {sessionRows.map((session) => (
                    <option key={session?.id} value={String(session?.id)}>
                      Cashier day #{session?.id} • ended{" "}
                      {dateText(
                        safeDate,
                        session?.closedAt || session?.closed_at,
                      )}
                    </option>
                  ))}
                </Select>

                {selectedClosedSession ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 dark:bg-slate-950">
                    <div className="text-xs uppercase tracking-[0.08em] app-muted">
                      Cash counted when the day was closed
                    </div>
                    <div className="mt-1 text-lg font-extrabold text-[var(--app-fg)]">
                      {moneyText(money, officialClosedCash)}
                    </div>
                    <div className="mt-1 text-xs app-muted">
                      This is the official cash result saved when that cashier
                      day was ended.
                    </div>
                  </div>
                ) : null}

                <Input
                  placeholder="Cash counted during this check (RWF)"
                  value={reconcileCountedCash}
                  onChange={(e) => setReconcileCountedCash?.(e.target.value)}
                />

                {selectedClosedSession &&
                String(reconcileCountedCash || "").trim() !== "" ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 dark:bg-slate-950">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-[var(--app-fg)]">
                        Difference from the closed day
                      </div>
                      <TinyPill tone={differenceTone(checkDifference)}>
                        {differenceLabel(checkDifference)}
                      </TinyPill>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
                          Closed day cash
                        </div>
                        <div className="mt-1 text-base font-extrabold text-[var(--app-fg)]">
                          {moneyText(money, officialClosedCash)}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
                          Counted now
                        </div>
                        <div className="mt-1 text-base font-extrabold text-[var(--app-fg)]">
                          {moneyText(money, typedCheckedCash)}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
                          Difference
                        </div>
                        <div className="mt-1 text-base font-extrabold text-[var(--app-fg)]">
                          {checkDifference > 0 ? "+" : ""}
                          {moneyText(money, checkDifference)}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <Input
                  placeholder="Why are you doing this check? (optional)"
                  value={reconcileNote}
                  onChange={(e) => setReconcileNote?.(e.target.value)}
                />

                <div className="flex flex-wrap gap-2">
                  <AsyncButton
                    type="submit"
                    variant="primary"
                    state={reconcileBtnState}
                    text="Save cash check"
                    loadingText="Saving…"
                    successText="Saved"
                  />
                </div>
              </form>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] p-4 text-sm app-muted dark:bg-slate-950">
                {hasOpenSession
                  ? "End the current cashier day first, then come back here to save a cash check."
                  : "Once you end a cashier day, it will appear here for cash checking."}
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Cash check history"
        hint="Past checks showing the closed day cash, the cash counted again later, and the difference."
        right={
          <RefreshButton
            loading={reconcilesLoading}
            onClick={loadReconciles}
            text="Refresh"
          />
        }
      >
        <div className="grid gap-4">
          <Input
            placeholder="Search by check ID, cashier day, note or amount"
            value={reconcileQ}
            onChange={(e) => setReconcileQ?.(e.target.value)}
          />

          {reconcilesLoading ? (
            <div className="grid gap-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] p-6 text-sm app-muted dark:bg-slate-900">
              No cash check records found.
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredRows.slice(0, 60).map((row, idx) => {
                const difference = Number(row?.difference ?? 0) || 0;
                const tone = differenceTone(difference);

                return (
                  <div
                    key={row?.id || idx}
                    className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-extrabold text-[var(--app-fg)]">
                            Cash check #{row?.id ?? "—"}
                          </div>

                          <TinyPill tone={tone}>
                            {differenceLabel(difference)}
                          </TinyPill>
                        </div>

                        <div className="mt-2 text-xs app-muted">
                          Cashier day:{" "}
                          <b>
                            #{row?.cashSessionId ?? row?.cash_session_id ?? "—"}
                          </b>
                        </div>

                        <div className="mt-1 text-xs app-muted">
                          Saved on:{" "}
                          <b>
                            {dateText(
                              safeDate,
                              row?.createdAt || row?.created_at,
                            )}
                          </b>
                        </div>

                        {toText(row?.note) ? (
                          <div className="mt-2 break-words text-xs app-muted">
                            Reason for check: <b>{toText(row.note)}</b>
                          </div>
                        ) : null}
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
                          Difference
                        </div>
                        <div className="mt-1 text-lg font-extrabold text-[var(--app-fg)]">
                          {difference > 0 ? "+" : ""}
                          {moneyText(money, difference)}
                        </div>
                        <div className="text-[11px] app-muted">RWF</div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3 dark:bg-slate-950">
                        <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
                          Closed day cash
                        </div>
                        <div className="mt-1 text-sm font-extrabold text-[var(--app-fg)]">
                          {moneyText(
                            money,
                            row?.expectedCash ?? row?.expected_cash ?? 0,
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3 dark:bg-slate-950">
                        <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
                          Counted again
                        </div>
                        <div className="mt-1 text-sm font-extrabold text-[var(--app-fg)]">
                          {moneyText(
                            money,
                            row?.countedCash ?? row?.counted_cash ?? 0,
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3 dark:bg-slate-950">
                        <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
                          Difference
                        </div>
                        <div className="mt-1 text-sm font-extrabold text-[var(--app-fg)]">
                          {difference > 0 ? "+" : ""}
                          {moneyText(money, difference)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

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
