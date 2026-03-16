"use client";

import { Input, RefreshButton, SectionCard, Skeleton } from "./cashier-ui";

import AsyncButton from "../../../components/AsyncButton";

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
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SectionCard
        title="Open session"
        hint="Only one open session is allowed."
      >
        <form onSubmit={onOpenSession} className="grid max-w-md gap-3">
          <Input
            placeholder="Opening balance (RWF)"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            disabled={!!currentOpenSession}
          />

          <AsyncButton
            type="submit"
            variant="primary"
            state={openBtnState}
            text="Open session"
            loadingText="Opening…"
            successText="Opened"
          />
        </form>

        <div className="mt-6 border-t border-[var(--border)] pt-4">
          <div className="text-sm font-semibold text-[var(--app-fg)]">
            Close session
          </div>
          <div className="mt-1 text-xs app-muted">
            Closing stops new cashier money movement.
          </div>

          {!currentOpenSession ? (
            <div className="mt-3 text-sm app-muted">No open session.</div>
          ) : (
            <form
              onSubmit={onCloseSession}
              className="mt-3 grid max-w-md gap-3"
            >
              <Input
                placeholder="Note (optional)"
                value={closeNote}
                onChange={(e) => setCloseNote(e.target.value)}
              />
              <AsyncButton
                type="submit"
                variant="danger"
                state={closeBtnState}
                text="Close session"
                loadingText="Closing…"
                successText="Closed"
              />
            </form>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="My sessions"
        hint="Recent cashier sessions"
        right={
          <RefreshButton loading={sessionsLoading} onClick={loadSessions} />
        }
      >
        {sessionsLoading ? (
          <div className="grid gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (Array.isArray(sessions) ? sessions : []).length === 0 ? (
          <div className="text-sm app-muted">No sessions yet.</div>
        ) : (
          <div className="grid gap-3">
            {(Array.isArray(sessions) ? sessions : []).map((s) => (
              <div
                key={s?.id}
                className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[var(--app-fg)]">
                      Session #{s?.id}
                    </div>
                    <div className="mt-1 text-xs app-muted">
                      Status: <b>{String(s?.status || "—").toUpperCase()}</b>
                    </div>
                    <div className="mt-2 text-xs app-muted">
                      Opened: {safeDate(s?.openedAt || s?.opened_at)} • Closed:{" "}
                      {safeDate(s?.closedAt || s?.closed_at)}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-xs app-muted">Opening</div>
                    <div className="text-sm font-bold text-[var(--app-fg)]">
                      {money(s?.openingBalance ?? s?.opening_balance)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
