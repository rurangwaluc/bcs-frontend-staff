"use client";

import { Select, cx } from "./adminShared";

const SECTIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "sales", label: "Sales" },
  { key: "payments", label: "Payments" },
  { key: "inventory", label: "Inventory" },
  { key: "arrivals", label: "Stock arrivals" },
  { key: "pricing", label: "Pricing" },
  { key: "inv_requests", label: "Inventory requests" },
  { key: "suppliers", label: "Suppliers" },
  { key: "cash", label: "Cash reports" },
  { key: "credits", label: "Credits" },
  { key: "users", label: "Staff" },
  { key: "reports", label: "Reports" },
  { key: "audit", label: "Audit" },
  { key: "evidence", label: "Proof & history" },
];

function badgeToneFor(key, badge) {
  const n = Number(badge || 0);

  if (!n) return "neutral";
  if (key === "inv_requests") return "warn";
  if (key === "pricing") return "danger";
  if (key === "sales") return "info";
  if (key === "arrivals") return "info";
  return "neutral";
}

function TopTabButton({ active, label, badge, tone = "neutral", onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "group relative inline-flex min-w-fit items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition",
        "focus:outline-none focus:ring-2 focus:ring-[var(--border-strong)]",
        active
          ? "border-[var(--app-fg)] bg-[var(--app-fg)] text-[var(--app-bg)] shadow-sm"
          : "border-[var(--border)] bg-[var(--card)] text-[var(--app-fg)] hover:bg-[var(--hover)]",
      )}
    >
      <span className="truncate">{label}</span>

      {badge ? (
        <span
          className={cx(
            "inline-flex min-w-[22px] items-center justify-center rounded-full border px-2 py-0.5 text-[11px] font-extrabold leading-none",
            active
              ? "border-white/15 bg-white/10 text-white"
              : tone === "danger"
                ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
                : tone === "warn"
                  ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
                  : tone === "info"
                    ? "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]"
                    : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]",
          )}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export default function AdminSectionTabs({
  section,
  setSection,
  badgeMap = {},
}) {
  return (
    <div className="grid gap-3">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="flex flex-col gap-4 p-4">
          <div className="min-w-0">
            <div className="text-sm font-black uppercase tracking-[0.08em] text-[var(--app-fg)]">
              Admin workspace
            </div>
            <div className="mt-1 text-sm app-muted">
              Full-control operations, approvals, recovery actions, audit, and
              proof investigation.
            </div>
          </div>

          <div className="lg:hidden">
            <Select
              value={section}
              onChange={(e) => setSection?.(e.target.value)}
            >
              {SECTIONS.map((item) => {
                const badge = badgeMap?.[item.key];
                const suffix = badge ? ` (${badge})` : "";
                return (
                  <option key={item.key} value={item.key}>
                    {item.label}
                    {suffix}
                  </option>
                );
              })}
            </Select>
          </div>

          <div className="hidden lg:block">
            <div className="flex flex-wrap gap-2">
              {SECTIONS.map((item) => (
                <TopTabButton
                  key={item.key}
                  active={section === item.key}
                  label={item.label}
                  badge={badgeMap?.[item.key] || null}
                  tone={badgeToneFor(item.key, badgeMap?.[item.key])}
                  onClick={() => setSection?.(item.key)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
