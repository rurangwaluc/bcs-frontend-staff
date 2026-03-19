"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import AsyncButton from "./AsyncButton";
import { apiFetch } from "../lib/api";

const ENDPOINTS = {
  LIST: "/users",
  CREATE: "/users",
  UPDATE: (id) => `/users/${id}`,
};

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

function normalizeRole(v) {
  return String(v || "")
    .trim()
    .toLowerCase();
}

function roleLabel(v) {
  const role = normalizeRole(v);
  if (role === "store_keeper") return "Store keeper";
  if (role === "cashier") return "Cashier";
  if (role === "seller") return "Seller";
  if (role === "manager") return "Manager";
  if (role === "admin") return "Admin";
  if (role === "owner") return "Owner";
  return v || "—";
}

function roleTone(v) {
  const role = normalizeRole(v);
  if (role === "owner" || role === "admin") return "info";
  if (role === "manager") return "warn";
  if (role === "cashier") return "success";
  return "neutral";
}

function isOnlineFromUser(u) {
  const last = u?.lastSeenAt ?? u?.last_seen_at ?? null;
  if (!last) return null;
  const d = new Date(last);
  if (Number.isNaN(d.getTime())) return null;
  return Date.now() - d.getTime() <= ONLINE_WINDOW_MS;
}

function locationLabelFromUser(u) {
  const loc = u?.location || null;

  const name =
    (loc?.name != null ? String(loc.name).trim() : "") ||
    (u?.locationName != null ? String(u.locationName).trim() : "") ||
    "";

  const code =
    (loc?.code != null ? String(loc.code).trim() : "") ||
    (u?.locationCode != null ? String(u.locationCode).trim() : "") ||
    "";

  if (name && code) return `${name} (${code})`;
  if (name) return name;

  return "Store not set";
}

function toneClass(tone = "neutral") {
  if (tone === "success") {
    return "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]";
  }
  if (tone === "danger") {
    return "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]";
  }
  if (tone === "warn") {
    return "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]";
  }
  if (tone === "info") {
    return "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]";
  }
  return "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";
}

function Skeleton({ className = "" }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70",
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
        "w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-3 text-sm text-[var(--app-fg)] outline-none transition",
        "placeholder:text-[var(--muted)] hover:border-[var(--border-strong)]",
        "focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[var(--border)]",
        className,
      )}
    />
  );
}

function Select({ className = "", ...props }) {
  return (
    <select
      {...props}
      className={cx(
        "w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-3 text-sm text-[var(--app-fg)] outline-none transition",
        "hover:border-[var(--border-strong)]",
        "focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[var(--border)]",
        className,
      )}
    />
  );
}

function Banner({ kind = "info", children }) {
  const cls =
    kind === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
      : kind === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
        : kind === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
          : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

  return (
    <div className={cx("rounded-2xl border px-4 py-3 text-sm", cls)}>
      {children}
    </div>
  );
}

function Badge({ tone = "neutral", children }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em]",
        toneClass(tone),
      )}
    >
      {children}
    </span>
  );
}

function OnlineBadge({ user }) {
  if (user?.isActive === false) return <Badge tone="danger">Disabled</Badge>;
  const online = isOnlineFromUser(user);
  if (online === true) return <Badge tone="success">Online</Badge>;
  if (online === false) return <Badge tone="warn">Offline</Badge>;
  return <Badge tone="neutral">Unknown</Badge>;
}

function StatCard({ label, value, hint, tone = "neutral" }) {
  return (
    <div className={cx("rounded-3xl border p-4", toneClass(tone))}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-80">
        {label}
      </div>
      <div className="mt-2 text-2xl font-black">{value}</div>
      {hint ? <div className="mt-1 text-xs opacity-80">{hint}</div> : null}
    </div>
  );
}

function SectionTitle({ title, hint }) {
  return (
    <div className="min-w-0">
      <div className="text-base font-black text-[var(--app-fg)]">{title}</div>
      {hint ? <div className="mt-1 text-sm app-muted">{hint}</div> : null}
    </div>
  );
}

function UserIdentity({ user }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-sm font-black text-[var(--app-fg)] sm:text-base">
        {user?.name || "Unknown"}
      </div>
      <div className="mt-1 truncate text-xs app-muted">
        {user?.email || "—"}
      </div>
    </div>
  );
}

function UserCard({ user, onEdit, onToggleActive }) {
  const active = user?.isActive !== false;

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm transition hover:border-[var(--border-strong)] hover:bg-[var(--hover)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <UserIdentity user={user} />

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={roleTone(user?.role)}>{roleLabel(user?.role)}</Badge>
            <Badge tone={active ? "success" : "danger"}>
              {active ? "Active" : "Disabled"}
            </Badge>
            <OnlineBadge user={user} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            Store / Branch
          </div>
          <div className="mt-1 text-sm font-bold text-[var(--app-fg)]">
            {locationLabelFromUser(user)}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            Last seen
          </div>
          <div className="mt-1 text-sm font-bold text-[var(--app-fg)]">
            {safeDate(user?.lastSeenAt ?? user?.last_seen_at)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onEdit(user)}
          className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={() => onToggleActive(user)}
          className={cx(
            "rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition",
            active
              ? "bg-rose-600 hover:bg-rose-700"
              : "bg-emerald-600 hover:bg-emerald-700",
          )}
        >
          {active ? "Disable" : "Enable"}
        </button>
      </div>
    </div>
  );
}

function ModalShell({ title, hint, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
        <div className="border-b border-[var(--border)] p-4">
          <div className="text-base font-black text-[var(--app-fg)]">
            {title}
          </div>
          {hint ? <div className="mt-1 text-sm app-muted">{hint}</div> : null}
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export default function AdminUsersPanel({ title = "Staff" }) {
  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info");

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [refreshState, setRefreshState] = useState("idle");

  const [createOpen, setCreateOpen] = useState(false);
  const [createState, setCreateState] = useState("idle");
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPassword, setCPassword] = useState("");
  const [cRole, setCRole] = useState("cashier");

  const [editOpen, setEditOpen] = useState(false);
  const [saveState, setSaveState] = useState("idle");
  const [editUser, setEditUser] = useState(null);
  const [eName, setEName] = useState("");
  const [eRole, setERole] = useState("cashier");
  const [eIsActive, setEIsActive] = useState(true);

  function toast(kind, text) {
    setMsgKind(kind || "info");
    setMsg(text || "");
  }

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.LIST, { method: "GET" });
      const list = data?.users ?? data?.items ?? data?.rows ?? [];
      setUsers(Array.isArray(list) ? list : []);
    } catch (e) {
      setUsers([]);
      toast("danger", e?.data?.error || e?.message || "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filtered = useMemo(() => {
    const qq = String(q || "")
      .trim()
      .toLowerCase();
    const list = Array.isArray(users) ? users : [];
    if (!qq) return list;

    return list.filter((u) => {
      const name = String(u?.name ?? "").toLowerCase();
      const email = String(u?.email ?? "").toLowerCase();
      const role = String(u?.role ?? "").toLowerCase();
      const loc = locationLabelFromUser(u).toLowerCase();
      const active = u?.isActive ? "active" : "disabled";
      return (
        name.includes(qq) ||
        email.includes(qq) ||
        role.includes(qq) ||
        loc.includes(qq) ||
        active.includes(qq)
      );
    });
  }, [users, q]);

  const stats = useMemo(() => {
    const list = filtered;
    const active = list.filter((u) => u?.isActive !== false).length;
    const disabled = list.filter((u) => u?.isActive === false).length;
    const online = list.filter((u) => isOnlineFromUser(u) === true).length;
    return {
      total: list.length,
      active,
      disabled,
      online,
    };
  }, [filtered]);

  async function onRefresh() {
    setRefreshState("loading");
    await loadUsers();
    setRefreshState("success");
    setTimeout(() => setRefreshState("idle"), 900);
  }

  function openCreate() {
    setMsg("");
    setCName("");
    setCEmail("");
    setCPassword("");
    setCRole("cashier");
    setCreateState("idle");
    setCreateOpen(true);
  }

  async function submitCreate() {
    if (String(cName || "").trim().length < 2) {
      toast("warn", "Name is required and must be at least 2 letters.");
      return;
    }
    if (!String(cEmail || "").trim()) {
      toast("warn", "Email is required.");
      return;
    }
    if (String(cPassword || "").trim().length < 8) {
      toast("warn", "Password must be at least 8 characters.");
      return;
    }

    setCreateState("loading");
    setMsg("");

    try {
      await apiFetch(ENDPOINTS.CREATE, {
        method: "POST",
        body: {
          name: String(cName).trim(),
          email: String(cEmail).trim(),
          password: String(cPassword).trim(),
          role: normalizeRole(cRole),
        },
      });

      toast("success", "Staff created successfully.");
      setCreateOpen(false);
      setCreateState("success");
      setTimeout(() => setCreateState("idle"), 900);
      await loadUsers();
    } catch (e) {
      setCreateState("idle");
      toast("danger", e?.data?.error || e?.message || "Failed to create staff");
    }
  }

  function openEdit(u) {
    setMsg("");
    setEditUser(u || null);
    setEName(u?.name ?? "");
    setERole(u?.role ?? "cashier");
    setEIsActive(u?.isActive !== false);
    setSaveState("idle");
    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setEditUser(null);
    setSaveState("idle");
  }

  async function submitEdit() {
    const id = editUser?.id;
    if (!id) return;

    if (String(eName || "").trim().length < 2) {
      toast("warn", "Name must be at least 2 letters.");
      return;
    }

    setSaveState("loading");
    setMsg("");

    try {
      await apiFetch(ENDPOINTS.UPDATE(id), {
        method: "PATCH",
        body: {
          name: String(eName).trim(),
          role: normalizeRole(eRole),
          isActive: !!eIsActive,
        },
      });

      toast("success", "Staff updated successfully.");
      setSaveState("success");
      setTimeout(() => setSaveState("idle"), 900);
      closeEdit();
      await loadUsers();
    } catch (e) {
      setSaveState("idle");
      toast("danger", e?.data?.error || e?.message || "Failed to update staff");
    }
  }

  async function toggleActive(u) {
    if (!u?.id) return;

    setMsg("");
    try {
      await apiFetch(ENDPOINTS.UPDATE(u.id), {
        method: "PATCH",
        body: { isActive: !u.isActive },
      });

      await loadUsers();
      toast("success", u.isActive ? "Staff disabled" : "Staff enabled");
    } catch (e) {
      toast(
        "danger",
        e?.data?.error || e?.message || "Failed to update staff status",
      );
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="border-b border-[var(--border)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <SectionTitle
            title={title}
            hint="Create, edit, and control staff access across branches from one professional admin workspace."
          />

          <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
            <div className="min-w-0 sm:min-w-[260px]">
              <Input
                placeholder="Search name, email, role, store..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <AsyncButton
              variant="secondary"
              state={refreshState}
              text="Refresh"
              loadingText="Loading…"
              successText="Done"
              onClick={onRefresh}
            />

            <button
              type="button"
              onClick={openCreate}
              className="rounded-2xl bg-[var(--app-fg)] px-4 py-3 text-sm font-semibold text-[var(--app-bg)] transition hover:opacity-90"
            >
              + New staff
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Visible staff"
            value={String(stats.total)}
            hint="Current filtered result"
            tone="info"
          />
          <StatCard
            label="Active"
            value={String(stats.active)}
            hint="Enabled users"
            tone="success"
          />
          <StatCard
            label="Disabled"
            value={String(stats.disabled)}
            hint="Access turned off"
            tone={stats.disabled > 0 ? "warn" : "neutral"}
          />
          <StatCard
            label="Online now"
            value={String(stats.online)}
            hint="Based on lastSeenAt"
            tone="success"
          />
        </div>
      </div>

      {msg ? (
        <div className="p-4">
          <Banner kind={msgKind}>{msg}</Banner>
        </div>
      ) : null}

      <div className="block p-4 xl:hidden">
        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4"
              >
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-2 h-4 w-56" />
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Skeleton className="h-20 w-full rounded-2xl" />
                  <Skeleton className="h-20 w-full rounded-2xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card-2)] p-8 text-center">
            <div className="text-base font-black text-[var(--app-fg)]">
              No staff found
            </div>
            <div className="mt-2 text-sm app-muted">
              Try another search or create a new staff member.
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((u) => (
              <UserCard
                key={u?.id}
                user={u}
                onEdit={openEdit}
                onToggleActive={toggleActive}
              />
            ))}
          </div>
        )}
      </div>

      <div className="hidden p-4 xl:block">
        <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)]">
          <div className="grid grid-cols-[1.5fr_0.9fr_1.1fr_0.85fr_0.85fr_1fr_0.95fr] gap-3 border-b border-[var(--border)] bg-[var(--card-2)] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            <div>User</div>
            <div>Role</div>
            <div>Store / Branch</div>
            <div>Status</div>
            <div>Online</div>
            <div>Last seen</div>
            <div className="text-right">Actions</div>
          </div>

          {loading ? (
            <div className="grid gap-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3"
                >
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-base font-black text-[var(--app-fg)]">
                No staff found
              </div>
              <div className="mt-2 text-sm app-muted">
                Try another search or create a new staff member.
              </div>
            </div>
          ) : (
            <div className="grid">
              {filtered.map((u) => {
                const active = u?.isActive !== false;

                return (
                  <div
                    key={u?.id}
                    className="grid grid-cols-[1.5fr_0.9fr_1.1fr_0.85fr_0.85fr_1fr_0.95fr] gap-3 border-b border-[var(--border)] px-4 py-3 text-sm last:border-b-0 hover:bg-[var(--hover)]"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-black text-[var(--app-fg)]">
                        {u?.name || "Unknown"}
                      </div>
                      <div className="truncate text-xs app-muted">
                        {u?.email || "—"}
                      </div>
                    </div>

                    <div className="text-[var(--app-fg)]">
                      {roleLabel(u?.role)}
                    </div>

                    <div className="truncate text-[var(--app-fg)]">
                      {locationLabelFromUser(u)}
                    </div>

                    <div>
                      <Badge tone={active ? "success" : "danger"}>
                        {active ? "Active" : "Disabled"}
                      </Badge>
                    </div>

                    <div>
                      <OnlineBadge user={u} />
                    </div>

                    <div className="truncate text-xs app-muted">
                      {safeDate(u?.lastSeenAt ?? u?.last_seen_at)}
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive(u)}
                        className={cx(
                          "rounded-xl px-3 py-2 text-xs font-semibold text-white transition",
                          active
                            ? "bg-rose-600 hover:bg-rose-700"
                            : "bg-emerald-600 hover:bg-emerald-700",
                        )}
                      >
                        {active ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {createOpen ? (
        <ModalShell
          title="New staff"
          hint="Create a new user account with role-based access."
          onClose={() => setCreateOpen(false)}
        >
          <div className="grid gap-3">
            <Input
              placeholder="Name"
              value={cName}
              onChange={(e) => setCName(e.target.value)}
            />
            <Input
              placeholder="Email"
              value={cEmail}
              onChange={(e) => setCEmail(e.target.value)}
            />
            <Input
              placeholder="Password (min 8 chars)"
              type="password"
              value={cPassword}
              onChange={(e) => setCPassword(e.target.value)}
            />

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                Role
              </div>
              <Select value={cRole} onChange={(e) => setCRole(e.target.value)}>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="store_keeper">Store keeper</option>
                <option value="seller">Seller</option>
                <option value="cashier">Cashier</option>
                <option value="owner">Owner</option>
              </Select>
            </div>

            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
              >
                Close
              </button>

              <AsyncButton
                state={createState}
                text="Create"
                loadingText="Creating…"
                successText="Created"
                onClick={submitCreate}
              />
            </div>
          </div>
        </ModalShell>
      ) : null}

      {editOpen ? (
        <ModalShell
          title={`Edit staff${eName ? ` — ${eName}` : ""}`}
          hint="Update staff role and status. Email and store remain read-only."
          onClose={closeEdit}
        >
          <div className="grid gap-3">
            <Input
              placeholder="Name"
              value={eName}
              onChange={(e) => setEName(e.target.value)}
            />
            <Input
              value={editUser?.email || ""}
              readOnly
              className="bg-[var(--card-2)]"
            />

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                Role
              </div>
              <Select value={eRole} onChange={(e) => setERole(e.target.value)}>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="store_keeper">Store keeper</option>
                <option value="seller">Seller</option>
                <option value="cashier">Cashier</option>
                <option value="owner">Owner</option>
              </Select>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-3 text-sm text-[var(--app-fg)]">
              <b>Store:</b> {locationLabelFromUser(editUser || {})}
            </div>

            <label className="flex items-center gap-2 text-sm text-[var(--app-fg)]">
              <input
                type="checkbox"
                checked={eIsActive}
                onChange={(e) => setEIsActive(e.target.checked)}
              />
              Active
            </label>

            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
              >
                Close
              </button>

              <AsyncButton
                state={saveState}
                text="Save"
                loadingText="Saving…"
                successText="Saved"
                onClick={submitEdit}
              />
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}
