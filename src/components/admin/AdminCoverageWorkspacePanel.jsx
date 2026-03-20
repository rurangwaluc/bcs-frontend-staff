"use client";

import { Pill, cx } from "./adminShared";

const CONFIG = {
  store_keeper: {
    title: "Store keeper coverage",
    summary:
      "Focus on stock intake, inventory review, low-stock checks, and request handling.",
    actions: [
      { key: "inventory", label: "Open inventory" },
      { key: "arrivals", label: "Open arrivals" },
      { key: "inv_requests", label: "Open inventory requests" },
      { key: "sales", label: "Open sales" },
      // { key: "evidence", label: "Open proof & history" },
    ],
  },
  cashier: {
    title: "Cashier coverage",
    summary:
      "Focus on payment recording, cash visibility, and payment-side transaction flow.",
    actions: [
      { key: "payments", label: "Open payments" },
      { key: "cash", label: "Open cash reports" },
      { key: "sales", label: "Open sales" },
      // { key: "evidence", label: "Open proof & history" },
    ],
  },
  seller: {
    title: "Seller coverage",
    summary:
      "Focus on sales flow, customer transactions, and unresolved sales operations.",
    actions: [
      { key: "sales", label: "Open sales" },
      { key: "payments", label: "Open payments" },
      { key: "dashboard", label: "Open dashboard" },
      // { key: "evidence", label: "Open proof & history" },
    ],
  },
  manager: {
    title: "Manager coverage",
    summary:
      "Focus on oversight, approvals, exceptions, credits, and operational visibility.",
    actions: [
      { key: "dashboard", label: "Open dashboard" },
      { key: "inv_requests", label: "Open inventory requests" },
      { key: "credits", label: "Open credits" },
      { key: "reports", label: "Open reports" },
    ],
  },
};

function prettyRole(role) {
  return String(role || "")
    .trim()
    .split("_")
    .filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

export default function AdminCoverageWorkspacePanel({
  coverage,
  section,
  setSection,
}) {
  const role = String(coverage?.actingAsRole || "")
    .trim()
    .toLowerCase();
  const cfg = CONFIG[role];

  if (!coverage?.active || !cfg) return null;

  return (
    <div className="rounded-3xl border border-[var(--info-border)] bg-[var(--info-bg)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-black text-[var(--app-fg)] sm:text-base">
              {cfg.title}
            </div>
            <Pill tone="info">{prettyRole(role)}</Pill>
          </div>

          <div className="mt-2 text-sm leading-6 text-[var(--app-fg)]">
            {cfg.summary}
          </div>

          <div className="mt-3 text-xs leading-6 app-muted">
            All actions remain recorded as admin actions with coverage context.
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:w-[420px]">
          {cfg.actions.map((action) => {
            const active = section === action.key;
            return (
              <button
                key={action.key}
                type="button"
                onClick={() => setSection?.(action.key)}
                className={cx(
                  "min-h-11 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition",
                  active
                    ? "border-[var(--app-fg)] bg-[var(--app-fg)] text-[var(--app-bg)]"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--app-fg)] hover:bg-[var(--hover)]",
                )}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
