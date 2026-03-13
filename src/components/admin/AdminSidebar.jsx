"use client";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function NavItem({ active, label, onClick, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition",
        active
          ? "bg-[var(--app-fg)] text-[var(--app-bg)]"
          : "bg-transparent text-[var(--app-fg)] hover:bg-[var(--hover)]",
      )}
    >
      <span className="truncate">{label}</span>
      {badge != null ? (
        <span
          className={cx(
            "rounded-full border px-2 py-0.5 text-[11px] font-extrabold",
            active
              ? "border-white/20 bg-white/10 text-white"
              : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]",
          )}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export default function AdminSidebar({
  section,
  setSection,
  showAdvanced,
  setShowAdvanced,
  refreshState,
  refreshCurrent,
  badgeForSectionKey,
  SECTIONS,
  ADVANCED,
}) {
  return (
    <aside className="hidden h-fit rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm lg:block">
      <div className="text-sm font-black uppercase tracking-[0.08em] text-[var(--app-fg)]">
        Control center
      </div>
      <div className="mt-1 text-sm app-muted">
        Admin has broader oversight than manager.
      </div>

      <div className="mt-5 grid gap-2">
        {SECTIONS.map((s) => (
          <NavItem
            key={s.key}
            active={section === s.key}
            label={s.label}
            badge={badgeForSectionKey(s.key)}
            onClick={() => setSection(s.key)}
          />
        ))}
      </div>

      <div className="mt-4 border-t border-[var(--border)] pt-4">
        <label className="flex items-center justify-between gap-2 text-sm font-semibold text-[var(--app-fg)]">
          <span>Advanced</span>
          <input
            type="checkbox"
            checked={showAdvanced}
            onChange={(e) => setShowAdvanced(e.target.checked)}
          />
        </label>

        {showAdvanced ? (
          <div className="mt-3 grid gap-2">
            {ADVANCED.map((s) => (
              <NavItem
                key={s.key}
                active={section === s.key}
                label={s.label}
                onClick={() => setSection(s.key)}
              />
            ))}
          </div>
        ) : null}

        <button
          type="button"
          onClick={refreshCurrent}
          className="mt-4 w-full rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-3 text-sm font-semibold text-[var(--app-fg)] hover:bg-[var(--hover)]"
        >
          {refreshState === "loading" ? "Refreshing…" : "Refresh"}
        </button>
      </div>
    </aside>
  );
}
