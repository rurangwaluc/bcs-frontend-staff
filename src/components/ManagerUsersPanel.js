"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

const ENDPOINT = "/users";
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function safeDate(v) {
  if (!v) return "No activity yet";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

function isOnlineFromUser(u) {
  const last = u?.lastSeenAt ?? u?.last_seen_at ?? null;
  if (!last) return null; // cannot confirm
  const d = new Date(last);
  if (Number.isNaN(d.getTime())) return null;
  return Date.now() - d.getTime() <= ONLINE_WINDOW_MS;
}

function Badge({ kind = "gray", children }) {
  const cls =
    kind === "green"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : kind === "red"
      ? "bg-rose-50 text-rose-800 border-rose-200"
      : kind === "amber"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <span className={cx("inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-semibold", cls)}>
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
        className
      )}
    />
  );
}

function OnlineLabel({ user }) {
  // If user is disabled, online does not matter
  if (user?.isActive === false) {
    return <Badge kind="red">Disabled</Badge>;
  }

  const online = isOnlineFromUser(user);

  if (online === true) return <Badge kind="green">Online</Badge>;
  if (online === false) return <Badge kind="amber">Offline</Badge>;

  // cannot confirm
  return <Badge kind="gray">Unknown</Badge>;
}

export default function ManagerUsersPanel({ title = "Staff (view-only)" }) {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

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
    const qq = String(q || "").trim().toLowerCase();
    let list = Array.isArray(rows) ? rows : [];

    if (onlyActive) list = list.filter((u) => u?.isActive === true);

    if (!qq) return list;

    return list.filter((u) => {
      const id = String(u?.id ?? "");
      const name = String(u?.name ?? "").toLowerCase();
      const email = String(u?.email ?? "").toLowerCase();
      const role = String(u?.role ?? "").toLowerCase();
      return id.includes(qq) || name.includes(qq) || email.includes(qq) || role.includes(qq);
    });
  }, [rows, q, onlyActive]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="text-xs text-slate-600 mt-1">You can see staff. You can’t edit them here.</div>
          <div className="text-xs text-slate-500 mt-1">
            Online works only when backend sends <b>lastSeenAt</b>.
          </div>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <div className="min-w-[220px]">
            <Input placeholder="Search: id, name, email, role" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />
            Active only
          </label>

          <button
            onClick={load}
            className="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {msg ? (
        <div className="p-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{msg}</div>
        </div>
      ) : null}

      {/* Mobile cards */}
      <div className="block lg:hidden p-4">
        <div className="grid gap-3">
          {filtered.map((u) => (
            <div key={u?.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">{u?.name ?? "Unknown name"}</div>
                  <div className="mt-1 text-xs text-slate-600 truncate">{u?.email ?? "No email"}</div>
                  <div className="mt-2 text-xs text-slate-600">
                    Role: <b>{u?.role ?? "Unknown"}</b>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">Created: {safeDate(u?.createdAt)}</div>
                  <div className="mt-1 text-xs text-slate-600">
                    Last seen: {safeDate(u?.lastSeenAt ?? u?.last_seen_at)}
                  </div>
                </div>

                <div className="shrink-0 flex flex-col gap-2 items-end">
                  <Badge kind={u?.isActive ? "green" : "red"}>{u?.isActive ? "Active" : "Disabled"}</Badge>
                  <OnlineLabel user={u} />
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 ? (
            <div className="text-sm text-slate-600">{loading ? "Loading…" : "No staff found."}</div>
          ) : null}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr className="border-b border-slate-200">
              <th className="text-left p-3 text-xs font-semibold">ID</th>
              <th className="text-left p-3 text-xs font-semibold">Name</th>
              <th className="text-left p-3 text-xs font-semibold">Email</th>
              <th className="text-left p-3 text-xs font-semibold">Role</th>
              <th className="text-left p-3 text-xs font-semibold">Status</th>
              <th className="text-left p-3 text-xs font-semibold">Online</th>
              <th className="text-left p-3 text-xs font-semibold">Created</th>
              <th className="text-left p-3 text-xs font-semibold">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u?.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-3 font-semibold text-slate-900">{u?.id ?? "—"}</td>
                <td className="p-3">{u?.name ?? "Unknown"}</td>
                <td className="p-3">{u?.email ?? "No email"}</td>
                <td className="p-3">{u?.role ?? "Unknown"}</td>
                <td className="p-3">
                  <Badge kind={u?.isActive ? "green" : "red"}>{u?.isActive ? "Active" : "Disabled"}</Badge>
                </td>
                <td className="p-3">
                  <OnlineLabel user={u} />
                </td>
                <td className="p-3">{safeDate(u?.createdAt)}</td>
                <td className="p-3">{safeDate(u?.lastSeenAt ?? u?.last_seen_at)}</td>
              </tr>
            ))}

            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-4 text-sm text-slate-600">
                  {loading ? "Loading…" : "No staff found."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}