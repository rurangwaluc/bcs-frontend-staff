"use client";

import { Pill, cx } from "./adminShared";

import AsyncButton from "../AsyncButton";

function prettyRole(role) {
  const v = String(role || "").trim();
  if (!v) return "—";
  return v
    .split("_")
    .filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

function prettyReason(reason) {
  const v = String(reason || "").trim();
  if (!v) return "—";
  return v
    .split("_")
    .filter(Boolean)
    .map((x) => x.charAt(0) + x.slice(1).toLowerCase())
    .join(" ");
}

function fmtSince(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function AdminCoverageBanner({
  coverage,
  loading = false,
  onOpenStart,
  onStop,
  stopState = "idle",
}) {
  const active = !!coverage?.active;

  return (
    <div
      className={cx(
        "rounded-3xl border p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-5",
        active
          ? "border-[var(--warn-border)] bg-[var(--warn-bg)]"
          : "border-[var(--border)] bg-[var(--card)]",
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-black text-[var(--app-fg)] sm:text-base">
              Coverage mode
            </div>

            {active ? (
              <Pill tone="warn">Active</Pill>
            ) : (
              <Pill tone="info">Inactive</Pill>
            )}
          </div>

          {active ? (
            <div className="mt-2 grid gap-2 text-sm text-[var(--app-fg)]">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>
                  Acting as: <b>{prettyRole(coverage?.actingAsRole)}</b>
                </span>
                <span>
                  Reason: <b>{prettyReason(coverage?.reason)}</b>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm app-muted">
                <span>Since: {fmtSince(coverage?.startedAt)}</span>
                {coverage?.note ? <span>Note: {coverage.note}</span> : null}
              </div>

              <div className="text-xs leading-6 app-muted">
                Operational actions remain attributable to admin with active
                coverage metadata.
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm leading-6 app-muted">
              Start coverage mode when admin needs to temporarily operate as
              store keeper, cashier, seller, or manager without losing
              accountability.
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!active ? (
            <button
              type="button"
              onClick={onOpenStart}
              className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--app-fg)] px-4 py-2.5 text-sm font-semibold text-[var(--app-bg)] transition hover:opacity-90"
            >
              Start coverage
            </button>
          ) : (
            <AsyncButton
              variant="danger"
              size="sm"
              state={stopState}
              text="Stop coverage"
              loadingText="Stopping…"
              successText="Stopped"
              onClick={onStop}
            />
          )}
        </div>
      </div>
    </div>
  );
}
