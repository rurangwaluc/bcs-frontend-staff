"use client";

import { NavPill, SectionCard } from "./manager-ui";

export default function ManagerTopSectionSwitcher({
  section,
  setSection,
  sections = [],
  advancedSections = [],
  showAdvanced,
  setShowAdvanced,
  badgeForSectionKey,
}) {
  return (
    <SectionCard
      title="Manager workspace"
      hint="Move quickly between operations, approvals, cash controls and evidence."
      bodyClassName="p-0"
    >
      <div className="px-4 pb-4 pt-4 sm:px-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {sections.map((s) => (
              <NavPill
                key={s.key}
                active={section === s.key}
                label={s.label}
                badge={badgeForSectionKey?.(s.key)}
                onClick={() => setSection(s.key)}
              />
            ))}
          </div>

          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-2)] p-4">
            <div className="text-sm font-black text-[var(--app-fg)]">
              Advanced controls
            </div>
            <div className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Use only when you need audit trails, proof, history and dispute
              review.
            </div>

            <label className="mt-4 flex items-center justify-between gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
              <span className="text-sm font-bold text-[var(--app-fg)]">
                Show advanced
              </span>
              <input
                type="checkbox"
                checked={!!showAdvanced}
                onChange={(e) => setShowAdvanced(e.target.checked)}
              />
            </label>

            {showAdvanced ? (
              <div className="mt-3 grid gap-2">
                {advancedSections.map((s) => (
                  <NavPill
                    key={s.key}
                    active={section === s.key}
                    label={s.label}
                    onClick={() => setSection(s.key)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
