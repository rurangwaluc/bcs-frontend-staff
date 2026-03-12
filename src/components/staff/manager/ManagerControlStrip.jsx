"use client";

import { RefreshButton, TinyPill, cx } from "./manager-ui";

function ControlChip({ label, value, tone = "neutral" }) {
  return (
    <div
      className={cx(
        "flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold",
        tone === "success"
          ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
          : tone === "warn"
            ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
            : tone === "danger"
              ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
              : tone === "info"
                ? "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-200"
                : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]",
      )}
    >
      <span className="uppercase tracking-[0.12em] opacity-80">{label}</span>
      <span className="font-black">{value}</span>
    </div>
  );
}

export default function ManagerControlStrip({
  locationLabel,
  pendingRequests,
  pendingInventoryRequests,
  unpricedCount = 0,
  arrivalsCount = 0,
  stuckSalesCount = 0,
  refreshState = "idle",
  onRefresh,
}) {
  const pendingCount =
    Number(pendingRequests ?? pendingInventoryRequests ?? 0) || 0;

  return (
    <section className="overflow-hidden border-b border-[var(--border)] bg-[var(--card)]">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-black tracking-[-0.02em] text-[var(--app-fg)]">
                Manager Control Strip
              </div>
              <TinyPill tone="info">{locationLabel || "Location"}</TinyPill>
            </div>
            <div className="mt-1 text-sm text-[var(--muted)]">
              Live oversight for approvals, pricing gaps, arrivals, stuck sales
              and operational health.
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <div className="flex flex-wrap gap-2">
              <ControlChip
                label="Pending requests"
                value={pendingCount}
                tone={pendingCount > 0 ? "warn" : "success"}
              />
              <ControlChip
                label="Unpriced"
                value={unpricedCount}
                tone={unpricedCount > 0 ? "warn" : "success"}
              />
              <ControlChip
                label="Arrivals"
                value={arrivalsCount}
                tone={arrivalsCount > 0 ? "info" : "neutral"}
              />
              <ControlChip
                label="Stuck sales"
                value={stuckSalesCount}
                tone={stuckSalesCount > 0 ? "warn" : "success"}
              />
            </div>

            <RefreshButton
              loading={refreshState === "loading"}
              onClick={onRefresh}
              className="min-w-[120px]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
