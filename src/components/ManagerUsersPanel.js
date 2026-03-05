"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import AsyncButton from "./AsyncButton";
import { apiFetch } from "../lib/api";

const ENDPOINT = "/users";
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Skeleton({ className = "" }) {
  return (
    <div
      className={cx("animate-pulse rounded-xl bg-slate-200/70", className)}
    />
  );
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
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : tone === "warn"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : tone === "danger"
          ? "bg-rose-50 text-rose-900 border-rose-200"
          : tone === "info"
            ? "bg-sky-50 text-sky-900 border-sky-200"
            : "bg-slate-50 text-slate-800 border-slate-200";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-xl border px-2.5 py-1 text-[11px] font-bold",
        cls,
      )}
    >
      {children}
    </span>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none",
        "focus:ring-2 focus:ring-slate-300",
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

    if (onlyActive) list = list.filter((u) => u?.isActive === true);

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
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="text-xs text-slate-600 mt-1">
            View staff only. Editing is restricted to Admin/Owner.
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Online status depends on backend <b>lastSeenAt</b>.
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone="info">{stats.total} shown</Badge>
            <Badge tone="success">{stats.active} active</Badge>
            <Badge tone="danger">{stats.disabled} disabled</Badge>
            <Badge tone="success">{stats.online} online</Badge>
            <Badge tone="warn">{stats.offline} offline</Badge>
            <Badge tone="neutral">{stats.unknown} unknown</Badge>
          </div>
        </div>

        <div className="flex gap-2 items-center flex-wrap w-full lg:w-auto">
          <div className="w-full sm:w-[260px]">
            <Input
              placeholder="Search: id, name, email, role"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
            />
            Active only
          </label>

          <AsyncButton
            variant="primary"
            state={refreshState}
            text="Refresh"
            loadingText="Loading…"
            successText="Done"
            onClick={onRefresh}
          />
        </div>
      </div>

      {msg ? (
        <div className="p-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {msg}
          </div>
        </div>
      ) : null}

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Skeleton className="h-10 w-10 rounded-2xl" />
                    <div className="min-w-0">
                      <Skeleton className="h-4 w-44" />
                      <Skeleton className="mt-2 h-3 w-64" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-7 w-20 rounded-xl" />
                    <Skeleton className="h-7 w-20 rounded-xl" />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Skeleton className="h-12 w-full rounded-2xl" />
                  <Skeleton className="h-12 w-full rounded-2xl" />
                  <Skeleton className="h-12 w-full rounded-2xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-slate-600">No staff found.</div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((u) => {
              const name = String(u?.name || "Unknown");
              const email = String(u?.email || "—");
              const role = roleLabel(u?.role);
              const created = safeDate(u?.createdAt);
              const lastSeen = safeDate(u?.lastSeenAt ?? u?.last_seen_at);

              return (
                <div
                  key={u?.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-sm font-extrabold">
                        {initials(name || email)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-slate-900 truncate">
                          {name}{" "}
                          <span className="text-slate-500 font-semibold">
                            #{u?.id ?? "—"}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 truncate">
                          {email}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center justify-end">
                      <Badge tone={u?.isActive ? "success" : "danger"}>
                        {u?.isActive ? "Active" : "Disabled"}
                      </Badge>
                      <OnlineBadge user={u} />
                      <Badge tone="neutral">{role}</Badge>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="text-[11px] font-semibold text-slate-600">
                        Created
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900 truncate">
                        {created}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="text-[11px] font-semibold text-slate-600">
                        Last seen
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900 truncate">
                        {lastSeen}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-[11px] font-semibold text-slate-600">
                        Status meaning
                      </div>
                      <div className="mt-1 text-xs text-slate-700">
                        Online = activity in last 5 min • Unknown = backend
                        didn’t send lastSeenAt.
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
