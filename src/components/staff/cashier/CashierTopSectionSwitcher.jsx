"use client";

import { cx, locationLabel } from "./cashier-utils";

function labelMeta(key, fallbackLabel) {
  switch (key) {
    case "dashboard":
      return "Overview";
    case "payments":
      return "Take payment";
    case "sessions":
      return "Start / end day";
    case "ledger":
      return "Money movement";
    case "credits":
      return "Credit payments";
    case "deposits":
      return "Money taken out";
    case "expenses":
      return "Cash expenses";
    case "reconcile":
      return "Cash check";
    case "refunds":
      return "Refunds";
    case "notifications":
      return "Alerts";
    default:
      return fallbackLabel || "Section";
  }
}

export default function CashierTopSectionSwitcher({
  me,
  section,
  setSection,
  sections = [],
  awaitingCount = 0,
  unread = 0,
  hasOpenSession = false,
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-lg font-black text-[var(--app-fg)]">
              Cashier
            </div>
            <div className="mt-1 text-sm app-muted">{locationLabel(me)}</div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-3 text-sm app-muted dark:bg-slate-900">
            <span className="font-semibold text-[var(--app-fg)]">
              Work order:
            </span>{" "}
            start the day, take payments, track money going in or out, then end
            the day and check cash.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {sections.map((s) => {
            const active = section === s.key;
            const badge =
              s.key === "payments"
                ? awaitingCount > 0
                  ? awaitingCount
                  : 0
                : s.key === "notifications"
                  ? unread > 0
                    ? unread
                    : 0
                  : s.key === "sessions"
                    ? hasOpenSession
                      ? "OPEN"
                      : ""
                    : "";

            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSection(s.key)}
                className={cx(
                  "app-focus inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition",
                  active
                    ? "border-[var(--app-fg)] bg-[var(--app-fg)] text-[var(--app-bg)] shadow-sm"
                    : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)] hover:bg-[var(--hover)] dark:bg-slate-900",
                )}
              >
                <span>{labelMeta(s.key, s.label)}</span>

                {badge ? (
                  <span
                    className={cx(
                      "inline-flex min-w-[22px] items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-extrabold",
                      active
                        ? "bg-white/15 text-white"
                        : "bg-[var(--danger-fg)] text-white",
                    )}
                  >
                    {badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
