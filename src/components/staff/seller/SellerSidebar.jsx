"use client";

import { NavItem, Select } from "./seller-ui";

import { locationLabel } from "./seller-utils";

export default function SellerSidebar({
  title,
  me,
  roleLower,
  section,
  setSection,
  draftCount,
  creditCount,
  sections,
}) {
  return (
    <>
      <div className="lg:hidden">
        <div className="app-card overflow-hidden rounded-3xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-black text-[var(--app-fg)]">
                {title}
              </div>
              <div className="mt-1 text-xs app-muted">{locationLabel(me)}</div>
            </div>

            <div className="app-pill app-card-soft px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--app-fg)]">
              {roleLower === "admin" ? "Admin" : "Staff"}
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

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { key: "dashboard", label: "Dashboard" },
              { key: "create", label: "Create" },
              { key: "sales", label: "Sales" },
              { key: "credits", label: "Credits" },
            ].map((item) => {
              const active = section === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSection(item.key)}
                  className={`app-focus rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? "border-[var(--app-fg)] bg-[var(--app-fg)] text-[var(--app-bg)] shadow-sm"
                      : "border-[var(--border-strong)] bg-[var(--card-2)] text-[var(--app-fg)] hover:bg-[var(--hover)]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="hidden h-fit lg:block">
        <div className="app-card overflow-hidden rounded-3xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-lg font-black text-[var(--app-fg)]">
                {title}
              </div>
              <div className="mt-1 text-sm app-muted">{locationLabel(me)}</div>
            </div>

            <div className="app-pill app-card-soft px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--app-fg)]">
              {roleLower === "admin" ? "Admin" : "Staff"}
            </div>
          </div>

          <div className="mt-5 grid gap-2">
            <NavItem
              active={section === "dashboard"}
              label="Dashboard"
              onClick={() => setSection("dashboard")}
            />
            <NavItem
              active={section === "create"}
              label="Create sale"
              onClick={() => setSection("create")}
            />
            <NavItem
              active={section === "sales"}
              label="My sales"
              onClick={() => setSection("sales")}
              badge={draftCount > 0 ? String(draftCount) : null}
            />
            <NavItem
              active={section === "credits"}
              label="Credits"
              onClick={() => setSection("credits")}
              badge={creditCount > 0 ? String(creditCount) : null}
            />
          </div>

          <div className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.08em] text-[var(--app-fg)]">
              Seller flow
            </div>
            <div className="mt-3 space-y-2 text-sm app-muted">
              <div>
                Draft → Store keeper releases → you mark Paid or Credit.
              </div>
              <div>
                Release and cashier payment updates appear automatically while
                you are on Dashboard or Sales.
              </div>
            </div>
          </div>

          {roleLower === "admin" ? (
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3 text-xs app-muted">
              Admin is viewing seller tools using admin permissions.
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
