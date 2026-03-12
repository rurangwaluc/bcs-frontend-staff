"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import AsyncButton from "./AsyncButton";
import { apiFetch } from "../lib/api";

const ENDPOINT = "/users";
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function safeDate(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

function initials(nameOrEmail) {
  const s = String(nameOrEmail || "").trim();
  if (!s) return "U";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function isOnlineFromUser(u) {
  const last = u?.lastSeenAt ?? u?.last_seen_at ?? null;
  if (!last) return null;
  const d = new Date(last);
  if (Number.isNaN(d.getTime())) return null;
  return Date.now() - d.getTime() <= ONLINE_WINDOW_MS;
}

function Badge({ tone = "neutral", children }) {
  const cls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
        : tone === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
          : tone === "info"
            ? "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-200"
            : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em]",
        cls,
      )}
    >
      {children}
    </span>
  );
}

function Skeleton({ className = "" }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded-[22px] bg-slate-200/70 dark:bg-slate-800/70",
        className,
      )}
    />
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={cx(
        "app-focus w-full rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--app-fg)] outline-none transition",
        "placeholder:text-[var(--muted)] hover:border-[var(--border-strong)]",
        className,
      )}
    />
  );
}

function roleLabel(role) {
  const r = String(role || "").toLowerCase();
  if (!r) return "unknown";
  return r.replaceAll("_", " ");
}

function OnlineBadge({ user }) {
  if (user?.isActive === false) return <Badge tone="danger">Disabled</Badge>;

  const online = isOnlineFromUser(user);
  if (online === true) return <Badge tone="success">Online</Badge>;
  if (online === false) return <Badge tone="warn">Offline</Badge>;
  return <Badge tone="neutral">Unknown</Badge>;
}

function SurfaceCard({ children, className = "" }) {
  return (
    <div
      className={cx(
        "rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-4",
        "shadow-[0_8px_24px_rgba(2,6,23,0.04)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.18)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default function ManagerUsersPanel({ title = "Staff" }) {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshState, setRefreshState] = useState("idle");

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINT, { method: "GET" });
      const list = data?.users ?? data?.items ?? data?.rows ?? [];
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setRows([]);
      setMsg(e?.data?.error || e?.message || "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const qq = String(q || "")
      .trim()
      .toLowerCase();

    let list = Array.isArray(rows) ? rows : [];

    if (onlyActive) {
      list = list.filter((u) => u?.isActive === true);
    }

    if (!qq) return list;

    return list.filter((u) => {
      const id = String(u?.id ?? "");
      const name = String(u?.name ?? "").toLowerCase();
      const email = String(u?.email ?? "").toLowerCase();
      const role = String(u?.role ?? "").toLowerCase();
      return (
        id.includes(qq) ||
        name.includes(qq) ||
        email.includes(qq) ||
        role.includes(qq)
      );
    });
  }, [rows, q, onlyActive]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const active = filtered.filter((u) => u?.isActive === true).length;
    const disabled = filtered.filter((u) => u?.isActive === false).length;

    let online = 0;
    let offline = 0;
    let unknown = 0;

    for (const u of filtered) {
      if (u?.isActive === false) continue;
      const o = isOnlineFromUser(u);
      if (o === true) online += 1;
      else if (o === false) offline += 1;
      else unknown += 1;
    }

    return { total, active, disabled, online, offline, unknown };
  }, [filtered]);

  async function onRefresh() {
    if (refreshState === "loading") return;
    setRefreshState("loading");
    await load();
    setRefreshState("success");
    setTimeout(() => setRefreshState("idle"), 900);
  }

  return (
    <div className="overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--card)] shadow-[0_10px_30px_rgba(2,6,23,0.04)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] p-5">
        <div className="min-w-0">
          <div className="text-base font-black tracking-[-0.02em] text-[var(--app-fg)]">
            {title}
          </div>
          <div className="mt-1 text-sm text-[var(--muted)]">
            View staff only. Editing is restricted to Admin and Owner.
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            Online status depends on backend <b>lastSeenAt</b>.
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="info">{stats.total} shown</Badge>
            <Badge tone="success">{stats.active} active</Badge>
            <Badge tone="danger">{stats.disabled} disabled</Badge>
            <Badge tone="success">{stats.online} online</Badge>
            <Badge tone="warn">{stats.offline} offline</Badge>
            <Badge tone="neutral">{stats.unknown} unknown</Badge>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
          <div className="w-full sm:w-[260px]">
            <Input
              placeholder="Search: id, name, email, role"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <label className="inline-flex items-center gap-2 rounded-[18px] border border-[var(--border)] bg-[var(--card-2)] px-3 py-3 text-sm font-semibold text-[var(--app-fg)]">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
            />
            Active only
          </label>

          <AsyncButton
            variant="secondary"
            state={refreshState}
            text="Refresh"
            loadingText="Loading…"
            successText="Done"
            onClick={onRefresh}
          />
        </div>
      </div>

      {msg ? (
        <div className="p-5">
          <div className="rounded-[24px] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
            {msg}
          </div>
        </div>
      ) : null}

      <div className="p-5">
        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SurfaceCard key={i}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-[18px]" />
                    <div className="min-w-0">
                      <Skeleton className="h-4 w-44" />
                      <Skeleton className="mt-2 h-3 w-64" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-7 w-20 rounded-full" />
                    <Skeleton className="h-7 w-20 rounded-full" />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Skeleton className="h-16 w-full rounded-[18px]" />
                  <Skeleton className="h-16 w-full rounded-[18px]" />
                  <Skeleton className="h-16 w-full rounded-[18px]" />
                </div>
              </SurfaceCard>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--card-2)] px-5 py-10 text-center text-sm text-[var(--muted)]">
            No staff found.
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((u) => {
              const name = String(u?.name || "Unknown");
              const email = String(u?.email || "—");
              const role = roleLabel(u?.role);
              const created = safeDate(u?.createdAt);
              const lastSeen = safeDate(u?.lastSeenAt ?? u?.last_seen_at);

              return (
                <SurfaceCard
                  key={u?.id}
                  className="transition hover:border-[var(--border-strong)] hover:bg-[var(--hover)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[var(--app-fg)] text-sm font-black text-[var(--app-bg)]">
                        {initials(name || email)}
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-sm font-black text-[var(--app-fg)]">
                          {name}{" "}
                          <span className="font-semibold text-[var(--muted)]">
                            #{u?.id ?? "—"}
                          </span>
                        </div>
                        <div className="truncate text-xs text-[var(--muted)]">
                          {email}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Badge tone={u?.isActive ? "success" : "danger"}>
                        {u?.isActive ? "Active" : "Disabled"}
                      </Badge>
                      <OnlineBadge user={u} />
                      <Badge tone="neutral">{role}</Badge>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-3">
                      <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                        Created
                      </div>
                      <div className="mt-2 truncate text-sm font-bold text-[var(--app-fg)]">
                        {created}
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-3">
                      <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                        Last seen
                      </div>
                      <div className="mt-2 truncate text-sm font-bold text-[var(--app-fg)]">
                        {lastSeen}
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card-2)] p-3">
                      <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                        Status meaning
                      </div>
                      <div className="mt-2 text-xs leading-5 text-[var(--muted)]">
                        Online = activity in last 5 min. Unknown = backend did
                        not send lastSeenAt.
                      </div>
                    </div>
                  </div>
                </SurfaceCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
