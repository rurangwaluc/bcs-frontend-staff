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

function varianceTone(type) {
  const value = String(type || "")
    .trim()
    .toUpperCase();
  if (value === "MATCH") return "success";
  if (value === "SHORTAGE") return "danger";
  if (value === "SURPLUS") return "warn";
  return "neutral";
}

function varianceLabel(type) {
  const value = String(type || "")
    .trim()
    .toUpperCase();
  if (value === "MATCH") return "Matches last close";
  if (value === "SHORTAGE") return "Less than last close";
  if (value === "SURPLUS") return "More than last close";
  return value || "Unknown";
}

function closingVarianceLabel(type) {
  const value = String(type || "")
    .trim()
    .toUpperCase();
  if (value === "MATCH") return "Matches expected cash";
  if (value === "SHORTAGE") return "Less than expected";
  if (value === "SURPLUS") return "More than expected";
  return value || "Unknown";
}

export default function CashierSessionsSection({
  currentOpenSession,
  sessions,
  sessionsLoading,
  openingBalance,
  setOpeningBalance,
  openingVarianceReason,
  setOpeningVarianceReason,
  openBtnState,
  countedClosingCash,
  setCountedClosingCash,
  closingVarianceReason,
  setClosingVarianceReason,
  closeNote,
  setCloseNote,
  closeBtnState,
  expectedDrawerCash,
  loadSessions,
  money,
  safeDate,
  onOpenSession,
  onCloseSession,
}) {
  const rows = Array.isArray(sessions) ? sessions : [];
  const hasOpenSession = !!currentOpenSession?.id;

  const lastClosedSession = rows.find(
    (session) => String(session?.status || "").toUpperCase() === "CLOSED",
  );

  const expectedOpeningBalance = Number(
    lastClosedSession?.closingBalance ??
      lastClosedSession?.closing_balance ??
      0,
  );

  const typedOpeningBalance = Number(openingBalance || 0);
  const openingVarianceAmount = typedOpeningBalance - expectedOpeningBalance;

  const openingVarianceType =
    openingVarianceAmount === 0
      ? "MATCH"
      : openingVarianceAmount < 0
        ? "SHORTAGE"
        : "SURPLUS";

  const needsVarianceReason =
    !hasOpenSession &&
    String(openingBalance || "").trim() !== "" &&
    openingVarianceAmount !== 0;

  const typedCountedClosingCash = Number(countedClosingCash || 0);
  const closingVarianceAmount =
    typedCountedClosingCash - Number(expectedDrawerCash || 0);

  const closingVarianceType =
    closingVarianceAmount === 0
      ? "MATCH"
      : closingVarianceAmount < 0
        ? "SHORTAGE"
        : "SURPLUS";

  const needsClosingVarianceReason =
    hasOpenSession &&
    String(countedClosingCash || "").trim() !== "" &&
    closingVarianceAmount !== 0;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <SectionCard
        title="Your cashier day"
        hint="Start your day before taking payments. End it when your shift is finished."
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
                Enter the cash you actually have in hand at the beginning of
                your shift.
              </div>

              {!hasOpenSession ? (
                <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 dark:bg-slate-950">
                  <div className="text-xs uppercase tracking-[0.08em] app-muted">
                    Last confirmed closing cash
                  </div>
                  <div className="mt-1 text-lg font-extrabold text-[var(--app-fg)]">
                    {money?.(expectedOpeningBalance)}
                  </div>
                  <div className="mt-1 text-xs app-muted">
                    {lastClosedSession?.id ? (
                      <>
                        From cashier day <b>#{lastClosedSession.id}</b>, closed
                        on{" "}
                        <b>
                          {safeDate?.(
                            lastClosedSession?.closedAt ||
                              lastClosedSession?.closed_at,
                          )}
                        </b>
                        .
                      </>
                    ) : (
                      <>No previous closed cashier day found.</>
                    )}
                  </div>
                </div>
              ) : null}

              <form onSubmit={onOpenSession} className="mt-4 grid gap-3">
                <Input
                  placeholder="Cash now in hand (RWF)"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance?.(e.target.value)}
                  disabled={hasOpenSession}
                />

                {!hasOpenSession &&
                String(openingBalance || "").trim() !== "" ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 dark:bg-slate-950">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-[var(--app-fg)]">
                        Difference from last close
                      </div>
                      <TinyPill tone={varianceTone(openingVarianceType)}>
                        {varianceLabel(openingVarianceType)}
                      </TinyPill>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
                          Expected
                        </div>
                        <div className="mt-1 text-base font-extrabold text-[var(--app-fg)]">
                          {money?.(expectedOpeningBalance)}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
                          Entered now
                        </div>
                        <div className="mt-1 text-base font-extrabold text-[var(--app-fg)]">
                          {money?.(typedOpeningBalance)}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
                          Difference
                        </div>
                        <div className="mt-1 text-base font-extrabold text-[var(--app-fg)]">
                          {openingVarianceAmount > 0 ? "+" : ""}
                          {money?.(openingVarianceAmount)}
                        </div>
                      </div>
                    </div>

                    {openingVarianceType === "SHORTAGE" ? (
                      <div className="mt-3 text-xs text-rose-700 dark:text-rose-300">
                        The cash entered is lower than the last confirmed
                        closing cash. Explain why before starting the day.
                      </div>
                    ) : null}

                    {openingVarianceType === "SURPLUS" ? (
                      <div className="mt-3 text-xs text-amber-700 dark:text-amber-300">
                        The cash entered is higher than the last confirmed
                        closing cash. Explain why before starting the day.
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {needsVarianceReason ? (
                  <Input
                    placeholder="Why is the cash different from the last close?"
                    value={openingVarianceReason}
                    onChange={(e) => setOpeningVarianceReason?.(e.target.value)}
                    disabled={hasOpenSession}
                  />
                ) : null}

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
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 dark:bg-slate-950">
                    <div className="text-xs uppercase tracking-[0.08em] app-muted">
                      Expected cash now
                    </div>
                    <div className="mt-1 text-lg font-extrabold text-[var(--app-fg)]">
                      {money?.(expectedDrawerCash || 0)}
                    </div>
                    <div className="mt-1 text-xs app-muted">
                      This is the cash the system expects to still be in the
                      drawer.
                    </div>
                  </div>

                  <Input
                    placeholder="Cash counted now (RWF)"
                    value={countedClosingCash}
                    onChange={(e) => setCountedClosingCash?.(e.target.value)}
                  />

                  {String(countedClosingCash || "").trim() !== "" ? (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 dark:bg-slate-950">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-[var(--app-fg)]">
                          Difference from expected cash
                        </div>
                        <TinyPill tone={varianceTone(closingVarianceType)}>
                          {closingVarianceLabel(closingVarianceType)}
                        </TinyPill>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
                            Expected
                          </div>
                          <div className="mt-1 text-base font-extrabold text-[var(--app-fg)]">
                            {money?.(expectedDrawerCash || 0)}
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
                            Counted now
                          </div>
                          <div className="mt-1 text-base font-extrabold text-[var(--app-fg)]">
                            {money?.(typedCountedClosingCash)}
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
                            Difference
                          </div>
                          <div className="mt-1 text-base font-extrabold text-[var(--app-fg)]">
                            {closingVarianceAmount > 0 ? "+" : ""}
                            {money?.(closingVarianceAmount)}
                          </div>
                        </div>
                      </div>

                      {closingVarianceType === "SHORTAGE" ? (
                        <div className="mt-3 text-xs text-rose-700 dark:text-rose-300">
                          The counted cash is lower than what the system
                          expected. Explain why before ending the day.
                        </div>
                      ) : null}

                      {closingVarianceType === "SURPLUS" ? (
                        <div className="mt-3 text-xs text-amber-700 dark:text-amber-300">
                          The counted cash is higher than what the system
                          expected. Explain why before ending the day.
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {needsClosingVarianceReason ? (
                    <Input
                      placeholder="Why is the counted cash different from the expected cash?"
                      value={closingVarianceReason}
                      onChange={(e) =>
                        setClosingVarianceReason?.(e.target.value)
                      }
                    />
                  ) : null}

                  <Input
                    placeholder="Extra note (optional)"
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
        title="My recent cashier days"
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

              const expectedOpening = money?.(
                session?.expectedOpeningBalance ??
                  session?.expected_opening_balance ??
                  0,
              );

              const openingVarianceAmountValue =
                session?.openingVarianceAmount ??
                session?.opening_variance_amount ??
                0;

              const openingVariance = money?.(openingVarianceAmountValue);

              const openingVarianceTypeValue =
                session?.openingVarianceType ??
                session?.opening_variance_type ??
                "MATCH";

              const openingVarianceReasonValue =
                session?.openingVarianceReason ??
                session?.opening_variance_reason;

              const countedClosingAmount = money?.(
                session?.countedClosingBalance ??
                  session?.counted_closing_balance ??
                  session?.closingBalance ??
                  session?.closing_balance ??
                  0,
              );

              const expectedClosingAmount = money?.(
                session?.expectedClosingBalance ??
                  session?.expected_closing_balance ??
                  0,
              );

              const closingVarianceAmountValue =
                session?.closingVarianceAmount ??
                session?.closing_variance_amount ??
                0;

              const closingVariance = money?.(closingVarianceAmountValue);

              const closingVarianceTypeValue =
                session?.closingVarianceType ??
                session?.closing_variance_type ??
                "MATCH";

              const closingVarianceReasonValue =
                session?.closingVarianceReason ??
                session?.closing_variance_reason;

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

                        <TinyPill tone={varianceTone(openingVarianceTypeValue)}>
                          {varianceLabel(openingVarianceTypeValue)}
                        </TinyPill>

                        {String(status) === "CLOSED" ? (
                          <TinyPill
                            tone={varianceTone(closingVarianceTypeValue)}
                          >
                            {closingVarianceLabel(closingVarianceTypeValue)}
                          </TinyPill>
                        ) : null}

                        {String(currentOpenSession?.id) ===
                        String(sessionId) ? (
                          <TinyPill tone="success">Current</TinyPill>
                        ) : null}
                      </div>

                      <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3 dark:bg-slate-950">
                          <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
                            Start of day
                          </div>

                          <div className="mt-2 grid grid-cols-1 gap-2 text-xs app-muted">
                            <div>
                              Started at:{" "}
                              <b>
                                {safeDate?.(
                                  session?.openedAt || session?.opened_at,
                                )}
                              </b>
                            </div>
                            <div>
                              Cash expected at start: <b>{expectedOpening}</b>
                            </div>
                            <div>
                              Cash entered at start: <b>{opening}</b>
                            </div>
                            <div>
                              Difference at start:{" "}
                              <b>
                                {Number(openingVarianceAmountValue) > 0
                                  ? "+"
                                  : ""}
                                {openingVariance}
                              </b>
                            </div>
                          </div>

                          {openingVarianceReasonValue ? (
                            <div className="mt-2 text-xs app-muted">
                              Reason at start:{" "}
                              <b>{String(openingVarianceReasonValue)}</b>
                            </div>
                          ) : null}
                        </div>

                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3 dark:bg-slate-950">
                          <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
                            End of day
                          </div>

                          <div className="mt-2 grid grid-cols-1 gap-2 text-xs app-muted">
                            <div>
                              Ended at:{" "}
                              <b>
                                {safeDate?.(
                                  session?.closedAt || session?.closed_at,
                                )}
                              </b>
                            </div>
                            <div>
                              Cash expected at end:{" "}
                              <b>{expectedClosingAmount}</b>
                            </div>
                            <div>
                              Cash counted at end: <b>{countedClosingAmount}</b>
                            </div>
                            <div>
                              Difference at end:{" "}
                              <b>
                                {Number(closingVarianceAmountValue) > 0
                                  ? "+"
                                  : ""}
                                {closingVariance}
                              </b>
                            </div>
                          </div>

                          {closingVarianceReasonValue ? (
                            <div className="mt-2 text-xs app-muted">
                              Reason at end:{" "}
                              <b>{String(closingVarianceReasonValue)}</b>
                            </div>
                          ) : null}
                        </div>
                      </div>
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
