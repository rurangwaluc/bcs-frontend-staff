"use client";

import { NavItem, Select } from "./storekeeper-ui";

import { locationLabel } from "./storekeeper-utils";

export default function StoreKeeperSidebar({
  me,
  section,
  setSection,
  sections,
  draftSalesCount,
}) {
  return (
    <>
      <div className="lg:hidden">
        <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-black text-[var(--app-fg)]">
                Store keeper
              </div>
              <div className="mt-1 text-xs app-muted">{locationLabel(me)}</div>
            </div>

            <div className="rounded-full border border-[var(--border)] bg-[var(--card-2)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--app-fg)]">
              Branch
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
              Section
            </div>
            <Select
              value={section}
              onChange={(e) => setSection(e.target.value)}
            >
              {sections.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {sections.map((s) => {
              const isSales = s.key === "sales";
              const active = section === s.key;
              const badge =
                isSales && draftSalesCount > 0 ? draftSalesCount : 0;

              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSection(s.key)}
                  className={cx(
                    "app-focus rounded-2xl border px-3 py-2.5 text-sm font-semibold transition",
                    active
                      ? "border-[var(--app-fg)] bg-[var(--app-fg)] text-[var(--app-bg)]"
                      : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]",
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="truncate">{s.label}</span>
                    {badge > 0 ? (
                      <span className="rounded-full bg-[var(--danger-fg)] px-2 py-0.5 text-[10px] font-extrabold text-white">
                        {badge}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3 text-xs app-muted">
            Stock movement, arrivals and release are handled here. Pricing stays
            with manager/admin/owner.
          </div>
        </div>
      </div>

      <aside className="hidden h-fit lg:block">
        <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-lg font-black text-[var(--app-fg)]">
                Store keeper
              </div>
              <div className="mt-1 text-sm app-muted">{locationLabel(me)}</div>
            </div>

            <div className="rounded-full border border-[var(--border)] bg-[var(--card-2)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--app-fg)]">
              Branch
            </div>
          </div>

          <div className="mt-5 grid gap-2">
            {sections.map((s) => {
              const isSales = s.key === "sales";
              const badge =
                isSales && draftSalesCount > 0 ? String(draftSalesCount) : null;

              return (
                <NavItem
                  key={s.key}
                  active={section === s.key}
                  label={s.label}
                  onClick={() => setSection(s.key)}
                  badge={badge}
                  badgeTone={
                    isSales && draftSalesCount > 0 ? "danger" : "default"
                  }
                />
              );
            })}
          </div>

          <div className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4">
            <div className="text-xs font-black uppercase tracking-[0.08em] text-[var(--app-fg)]">
              Store keeper rule
            </div>
            <div className="mt-3 space-y-2 text-sm app-muted">
              <div>You control stock movement and release.</div>
              <div>Arrivals and corrections must be recorded clearly.</div>
              <div>
                Prices and commercial decisions belong to manager/admin.
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}
