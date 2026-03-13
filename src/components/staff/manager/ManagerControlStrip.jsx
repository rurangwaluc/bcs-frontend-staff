"use client";

import { RefreshButton, TinyPill, cx } from "./manager-ui";

function toneClasses(tone = "neutral") {
  if (tone === "success") {
    return "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]";
  }
  if (tone === "warn") {
    return "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]";
  }
  if (tone === "danger") {
    return "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]";
  }
  if (tone === "info") {
    return "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]";
  }
  return "border-slate-300 bg-white text-slate-700 dark:border-[var(--border)] dark:bg-[var(--card)] dark:text-[var(--app-fg)]";
}

function toneDot(tone = "neutral") {
  if (tone === "success") return "bg-emerald-500";
  if (tone === "warn") return "bg-amber-500";
  if (tone === "danger") return "bg-rose-500";
  if (tone === "info") return "bg-sky-500";
  return "bg-slate-400";
}
function ControlChip({ label, value, tone = "neutral" }) {
  return (
    <div
      className={cx(
        "inline-flex items-center gap-3 rounded-full border px-3.5 py-2.5",
        "shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:shadow-none",
        toneClasses(tone),
      )}
    >
      <span className={cx("h-2.5 w-2.5 rounded-full", toneDot(tone))} />
      <span className="text-[11px] font-black uppercase tracking-[0.12em] opacity-90">
        {label}
      </span>
      <span className="text-xs font-black">{value}</span>
    </div>
  );
}

function stripStatusTone(value, type = "count") {
  const n = Number(value || 0);

  if (type === "pending") return n > 0 ? "danger" : "success";
  if (type === "pricing") return n > 0 ? "warn" : "success";
  if (type === "arrivals") return n > 0 ? "info" : "neutral";
  if (type === "stuck") return n > 0 ? "warn" : "success";

  return "neutral";
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
    <section className="border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-5">
        <div className="rounded-[26px] border border-[var(--border)] bg-[var(--card)] px-4 py-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.22)] sm:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-black tracking-[-0.02em] text-[var(--app-fg)]">
                  Manager Control Strip
                </div>
                <TinyPill tone="info">{locationLabel || "Location"}</TinyPill>
              </div>

              <div className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                Live operational view for approvals, pricing gaps, stock
                movement, delayed sales, and day-to-day branch health.
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <div className="flex flex-wrap gap-2">
                <ControlChip
                  label="Pending requests"
                  value={pendingCount}
                  tone={stripStatusTone(pendingCount, "pending")}
                />
                <ControlChip
                  label="Unpriced"
                  value={unpricedCount}
                  tone={stripStatusTone(unpricedCount, "pricing")}
                />
                <ControlChip
                  label="Arrivals"
                  value={arrivalsCount}
                  tone={stripStatusTone(arrivalsCount, "arrivals")}
                />
                <ControlChip
                  label="Stuck sales"
                  value={stuckSalesCount}
                  tone={stripStatusTone(stuckSalesCount, "stuck")}
                />
              </div>

              <div className="w-full xl:flex xl:justify-end">
                <RefreshButton
                  loading={refreshState === "loading"}
                  onClick={onRefresh}
                  className="w-full xl:w-auto xl:min-w-[120px]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
