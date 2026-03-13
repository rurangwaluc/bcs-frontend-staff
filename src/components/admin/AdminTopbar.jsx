"use client";

export default function AdminTopbar({
  actAs,
  setActAs,
  actAsHref,
  router,
  section,
  setSection,
  showAdvanced,
  SECTIONS,
  ADVANCED,
  refreshState,
  refreshCurrent,
}) {
  return (
    <div className="rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm lg:hidden">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <select
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--app-fg)]"
          value={section}
          onChange={(e) => setSection(e.target.value)}
        >
          {[...SECTIONS, ...(showAdvanced ? ADVANCED : [])].map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--app-fg)]"
          value={actAs}
          onChange={(e) => setActAs(e.target.value)}
        >
          <option value="admin">Admin</option>
          <option value="seller">Seller</option>
          <option value="cashier">Cashier</option>
          <option value="store_keeper">Store keeper</option>
          <option value="manager">Manager</option>
        </select>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => router.push(actAsHref())}
          className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-3 text-sm font-semibold text-[var(--app-fg)] hover:bg-[var(--hover)]"
        >
          Open role
        </button>

        <button
          type="button"
          onClick={refreshCurrent}
          className="rounded-2xl bg-[var(--app-fg)] px-4 py-3 text-sm font-semibold text-[var(--app-bg)] hover:opacity-90"
        >
          {refreshState === "loading" ? "Refreshing…" : "Refresh"}
        </button>
      </div>
    </div>
  );
}
