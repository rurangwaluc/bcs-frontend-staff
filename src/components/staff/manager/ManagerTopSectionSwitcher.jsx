"use client";

import { NavPill, SectionCard, Select, TinyPill, cx } from "./manager-ui";

export default function ManagerTopSectionSwitcher({
  section,
  setSection,
  sections = [],
  advancedSections = [],
  showAdvanced,
  setShowAdvanced,
  badgeForSectionKey,
  badgeToneForSectionKey,
}) {
  const allSections = [...sections, ...(showAdvanced ? advancedSections : [])];

  return (
    <SectionCard
      title="Manager workspace"
      hint="Move quickly between operations, approvals, cash controls and evidence."
      bodyClassName="p-0"
    >
      <div className="px-4 pb-4 pt-4 sm:px-5">
        {/* MOBILE */}
        <div className="grid gap-4 lg:hidden">
          <div>
            <div className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
              Current section
            </div>

            <Select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="h-12"
            >
              {allSections.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--card-2)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-black text-[var(--app-fg)]">
                  Advanced controls
                </div>
                <div className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Audit trails, proof, history and dispute review.
                </div>
              </div>

              <TinyPill tone="info">Audit</TinyPill>
            </div>

            <label className="mt-4 flex items-center justify-between gap-3 rounded-[16px] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
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
                {advancedSections.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSection(item.key)}
                    className={cx(
                      "flex items-center justify-between gap-3 rounded-[16px] border px-4 py-3 text-left transition",
                      section === item.key
                        ? "border-transparent bg-[var(--app-fg)] text-[var(--app-bg)] shadow-[0_10px_22px_rgba(15,23,42,0.16)]"
                        : "border-[var(--border)] bg-[var(--card)] text-[var(--app-fg)] hover:bg-[var(--hover)]",
                    )}
                  >
                    <span className="text-sm font-bold">{item.label}</span>

                    {badgeForSectionKey?.(item.key) != null ? (
                      <TinyPill
                        tone={badgeToneForSectionKey?.(item.key) || "neutral"}
                      >
                        {badgeForSectionKey(item.key)}
                      </TinyPill>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* DESKTOP */}
        <div className="hidden lg:grid lg:grid-cols-[1fr_280px] lg:gap-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {sections.map((s) => (
              <NavPill
                key={s.key}
                active={section === s.key}
                label={s.label}
                badge={badgeForSectionKey?.(s.key)}
                badgeTone={badgeToneForSectionKey?.(s.key) || "neutral"}
                onClick={() => setSection(s.key)}
              />
            ))}
          </div>

          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-2)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-black text-[var(--app-fg)]">
                  Advanced controls
                </div>
                <div className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Use only when you need audit trails, proof, history and
                  dispute review.
                </div>
              </div>

              <TinyPill tone="info">Audit</TinyPill>
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
                    badge={badgeForSectionKey?.(s.key)}
                    badgeTone={badgeToneForSectionKey?.(s.key) || "neutral"}
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
