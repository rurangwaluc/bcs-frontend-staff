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

function sessionStatusTone(status) {
  const value = String(status || "")
    .trim()
    .toUpperCase();
  if (value === "OPEN") return "success";
  if (value === "CLOSED") return "neutral";
  return "warn";
}

export default function CashierSessionsSection({
  currentOpenSession,
  sessions,
  sessionsLoading,
  openingBalance,
  setOpeningBalance,
  openBtnState,
  closeNote,
  setCloseNote,
  closeBtnState,
  loadSessions,
  money,
  safeDate,
  onOpenSession,
  onCloseSession,
}) {
  const rows = Array.isArray(sessions) ? sessions : [];
  const hasOpenSession = !!currentOpenSession?.id;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <SectionCard
        title="Start or end your cashier day"
        hint="Open your cashier day before taking payments. End it when your shift is finished."
      >
        <div className="grid gap-4">
          {hasOpenSession ? (
            <Banner kind="success">
              Your cashier day is open now. Day <b>#{currentOpenSession.id}</b>{" "}
              is active.
            </Banner>
          ) : (
            <Banner kind="warn">
              No cashier day is open yet. Start your day before receiving
              payments or recording money movement.
            </Banner>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4 dark:bg-slate-900">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-base font-black text-[var(--app-fg)]">
                  Start cashier day
                </div>
                {hasOpenSession ? (
                  <TinyPill tone="success">Already open</TinyPill>
                ) : (
                  <TinyPill tone="info">First step</TinyPill>
                )}
              </div>

              <div className="mt-2 text-sm app-muted">
                Enter the money you are starting with at the beginning of your
                shift.
              </div>

              <form onSubmit={onOpenSession} className="mt-4 grid gap-3">
                <Input
                  placeholder="Starting amount in hand (RWF)"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance?.(e.target.value)}
                  disabled={hasOpenSession}
                />

                <AsyncButton
                  type="submit"
                  variant="primary"
                  state={openBtnState}
                  text="Start day"
                  loadingText="Starting…"
                  successText="Started"
                  disabled={hasOpenSession}
                />
              </form>

              {hasOpenSession ? (
                <div className="mt-3 text-xs app-muted">
                  You cannot start another cashier day while this one is still
                  open.
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4 dark:bg-slate-900">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-base font-black text-[var(--app-fg)]">
                  End cashier day
                </div>
                {hasOpenSession ? (
                  <TinyPill tone="warn">Ready to end</TinyPill>
                ) : (
                  <TinyPill tone="neutral">No open day</TinyPill>
                )}
              </div>

              <div className="mt-2 text-sm app-muted">
                End the day after you finish payments and money movement for
                this shift.
              </div>

              {!hasOpenSession ? (
                <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] p-4 text-sm app-muted dark:bg-slate-900">
                  There is no open cashier day to end.
                </div>
              ) : (
                <form onSubmit={onCloseSession} className="mt-4 grid gap-3">
                  <Input
                    placeholder="Closing note (optional)"
                    value={closeNote}
                    onChange={(e) => setCloseNote?.(e.target.value)}
                  />

                  <AsyncButton
                    type="submit"
                    variant="danger"
                    state={closeBtnState}
                    text="End day"
                    loadingText="Ending…"
                    successText="Ended"
                  />
                </form>
              )}

              {hasOpenSession ? (
                <div className="mt-3 text-xs app-muted">
                  Started on{" "}
                  <b>
                    {safeDate?.(
                      currentOpenSession?.openedAt ||
                        currentOpenSession?.opened_at,
                    )}
                  </b>
                  .
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="My cashier day history"
        hint="See your recent open and closed cashier days."
        right={
          <RefreshButton loading={sessionsLoading} onClick={loadSessions} />
        }
      >
        {sessionsLoading ? (
          <div className="grid gap-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] p-6 text-sm app-muted dark:bg-slate-900">
            No cashier day history yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {rows.map((session) => {
              const status = String(session?.status || "—").toUpperCase();
              const sessionId = session?.id ?? "—";
              const opening = money?.(
                session?.openingBalance ?? session?.opening_balance ?? 0,
              );

              return (
                <div
                  key={sessionId}
                  className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 dark:bg-slate-900"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-extrabold text-[var(--app-fg)] sm:text-base">
                          Cashier day #{sessionId}
                        </div>

                        <TinyPill tone={sessionStatusTone(status)}>
                          {status === "OPEN" ? "Open now" : status}
                        </TinyPill>

                        {String(currentOpenSession?.id) ===
                        String(sessionId) ? (
                          <TinyPill tone="success">Current</TinyPill>
                        ) : null}
                      </div>

                      <div className="mt-2 grid grid-cols-1 gap-2 text-xs app-muted sm:grid-cols-2">
                        <div>
                          Started:{" "}
                          <b>
                            {safeDate?.(
                              session?.openedAt || session?.opened_at,
                            )}
                          </b>
                        </div>
                        <div>
                          Ended:{" "}
                          <b>
                            {safeDate?.(
                              session?.closedAt || session?.closed_at,
                            )}
                          </b>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
                        Starting amount
                      </div>
                      <div className="mt-1 text-lg font-extrabold text-[var(--app-fg)]">
                        {opening}
                      </div>
                      <div className="text-[11px] app-muted">RWF</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
