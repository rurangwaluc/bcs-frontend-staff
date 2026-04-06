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
  if (n === 0) return "Balanced";
  if (n > 0) return "More than expected";
  return "Less than expected";
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
        title="Count cash after closing the day"
        hint="After you end the cashier day, count all cash in hand and compare it with the system total."
      >
        {hasOpenSession ? (
          <Banner kind="warn" className="mb-4">
            You still have an open cashier day. Close it first before saving a
            cash count result.
          </Banner>
        ) : !hasClosedSession ? (
          <Banner kind="warn" className="mb-4">
            No finished cashier day found yet. Close a cashier day first before
            saving a cash count result.
          </Banner>
        ) : (
          <Banner kind="info" className="mb-4">
            Choose a finished cashier day, enter the total cash you counted by
            hand, then save the result.
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
                Save cash count result
              </div>

              {hasOpenSession ? (
                <TinyPill tone="warn">Close open day first</TinyPill>
              ) : hasClosedSession ? (
                <TinyPill tone="success">Ready</TinyPill>
              ) : (
                <TinyPill tone="warn">Nothing to count yet</TinyPill>
              )}
            </div>

            <div className="mt-2 text-sm app-muted">
              This checks whether the total cash you counted matches what the
              system expects for that finished cashier day.
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
                      Cashier day #{session?.id} • closed{" "}
                      {dateText(
                        safeDate,
                        session?.closedAt || session?.closed_at,
                      )}
                    </option>
                  ))}
                </Select>

                <Input
                  placeholder="Total cash counted by hand (RWF)"
                  value={reconcileCountedCash}
                  onChange={(e) => setReconcileCountedCash?.(e.target.value)}
                />

                <Input
                  placeholder="Short note (optional)"
                  value={reconcileNote}
                  onChange={(e) => setReconcileNote?.(e.target.value)}
                />

                <div className="flex flex-wrap gap-2">
                  <AsyncButton
                    type="submit"
                    variant="primary"
                    state={reconcileBtnState}
                    text="Save cash count result"
                    loadingText="Saving…"
                    successText="Saved"
                  />
                </div>
              </form>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] p-4 text-sm app-muted dark:bg-slate-950">
                {hasOpenSession
                  ? "Close the current cashier day first, then come back here to save the final cash count."
                  : "Once you close a cashier day, it will appear here for cash counting."}
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Cash count history"
        hint="Past records showing system cash, counted cash, and the difference."
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
            placeholder="Search by record ID, cashier day, note or amount"
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
              No cash count records found.
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
                            Cash count #{row?.id ?? "—"}
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
                            Note: <b>{toText(row.note)}</b>
                          </div>
                        ) : null}
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
                          Difference
                        </div>
                        <div className="mt-1 text-lg font-extrabold text-[var(--app-fg)]">
                          {moneyText(money, difference)}
                        </div>
                        <div className="text-[11px] app-muted">RWF</div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3 dark:bg-slate-950">
                        <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
                          System cash
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
                          Counted cash
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
