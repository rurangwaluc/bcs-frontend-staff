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

export default function CashierReconcileSection({
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
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SectionCard
        title="Create reconcile"
        hint="Pick a closed session, then enter counted cash."
      >
        {closedSessions.length === 0 ? (
          <Banner kind="warn">
            No closed sessions found. Close a session first.
          </Banner>
        ) : (
          <form className="grid max-w-md gap-3" onSubmit={onCreateReconcile}>
            <Select
              value={selectedClosedSessionId}
              onChange={(e) => setSelectedClosedSessionId(e.target.value)}
            >
              {closedSessions.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  Session #{s.id} • closed {safeDate(s.closedAt || s.closed_at)}
                </option>
              ))}
            </Select>

            <Input
              placeholder="Counted cash (RWF)"
              value={reconcileCountedCash}
              onChange={(e) => setReconcileCountedCash(e.target.value)}
            />
            <Input
              placeholder="Note (optional)"
              value={reconcileNote}
              onChange={(e) => setReconcileNote(e.target.value)}
            />

            <AsyncButton
              type="submit"
              variant="primary"
              state={reconcileBtnState}
              text="Save reconcile"
              loadingText="Saving…"
              successText="Saved"
            />
          </form>
        )}
      </SectionCard>

      <SectionCard
        title="Reconciles"
        hint="Latest reconciliation records"
        right={
          <RefreshButton loading={reconcilesLoading} onClick={loadReconciles} />
        }
      >
        <Input
          placeholder="Search"
          value={reconcileQ}
          onChange={(e) => setReconcileQ(e.target.value)}
        />

        <div className="mt-3">
          {reconcilesLoading ? (
            <div className="grid gap-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="grid gap-2">
              {(Array.isArray(reconciles) ? reconciles : [])
                .filter((r) => {
                  const q = String(reconcileQ || "")
                    .trim()
                    .toLowerCase();
                  if (!q) return true;
                  const hay = [
                    r?.id,
                    r?.cashSessionId ?? r?.cash_session_id,
                    r?.note,
                    r?.difference,
                  ]
                    .map((v) => String(v ?? ""))
                    .join(" ")
                    .toLowerCase();
                  return hay.includes(q);
                })
                .slice(0, 60)
                .map((r, idx) => (
                  <div
                    key={r?.id || idx}
                    className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-[var(--app-fg)]">
                          Reconcile #{r?.id ?? "—"}
                        </div>
                        <div className="mt-2 text-xs app-muted">
                          Session:{" "}
                          <b>
                            #{r?.cashSessionId ?? r?.cash_session_id ?? "—"}
                          </b>
                        </div>
                        <div className="mt-1 text-xs app-muted">
                          Time: <b>{safeDate(r?.createdAt || r?.created_at)}</b>
                        </div>
                        {r?.note ? (
                          <div className="mt-2 break-words text-xs app-muted">
                            Note: <b>{String(r.note)}</b>
                          </div>
                        ) : null}
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-xs app-muted">Expected</div>
                        <div className="text-sm font-extrabold text-[var(--app-fg)]">
                          {money(r?.expectedCash ?? r?.expected_cash ?? 0)}
                        </div>
                        <div className="mt-2 text-xs app-muted">Counted</div>
                        <div className="text-sm font-extrabold text-[var(--app-fg)]">
                          {money(r?.countedCash ?? r?.counted_cash ?? 0)}
                        </div>
                        <div className="mt-2">
                          <TinyPill
                            tone={
                              (Number(r?.difference ?? 0) || 0) === 0
                                ? "success"
                                : "warn"
                            }
                          >
                            Diff: {money(r?.difference ?? 0)}
                          </TinyPill>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

              {(Array.isArray(reconciles) ? reconciles : []).length === 0 ? (
                <div className="text-sm app-muted">No reconciles yet.</div>
              ) : null}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
