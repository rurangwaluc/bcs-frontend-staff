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

function normalizeRole(v) {
  return String(v || "")
    .trim()
    .toLowerCase();
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

function Badge({ kind = "gray", children }) {
  const cls =
    kind === "green"
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : kind === "red"
        ? "bg-rose-50 text-rose-900 border-rose-200"
        : kind === "amber"
          ? "bg-amber-50 text-amber-900 border-amber-200"
          : "bg-slate-50 text-slate-800 border-slate-200";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-xl border px-2.5 py-1 text-[11px] font-extrabold",
        cls,
      )}
    >
      {children}
    </span>
  );
}

function OnlineBadge({ user }) {
  if (user?.isActive === false) return <Badge kind="red">Disabled</Badge>;
  const online = isOnlineFromUser(user);
  if (online === true) return <Badge kind="green">Online</Badge>;
  if (online === false) return <Badge kind="amber">Offline</Badge>;
  return <Badge kind="gray">Unknown</Badge>;
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

function Select({ className = "", ...props }) {
  return (
    <select
      {...props}
      className={cx(
        "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none",
        "focus:ring-2 focus:ring-slate-300",
        className,
      )}
    />
  );
}

export default function AdminUsersPanel({ title = "Staff" }) {
  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info");

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");

  const [refreshState, setRefreshState] = useState("idle"); // idle|loading|success

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createState, setCreateState] = useState("idle");
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPassword, setCPassword] = useState("");
  const [cRole, setCRole] = useState("cashier");

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [saveState, setSaveState] = useState("idle");
  const [editUser, setEditUser] = useState(null);

  const [eName, setEName] = useState("");
  const [eRole, setERole] = useState("cashier");
  const [eIsActive, setEIsActive] = useState(true);

  function toast(kind, text) {
    setMsgKind(kind);
    setMsg(text || "");
  }

  const bannerStyle =
    msgKind === "success"
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : msgKind === "warn"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : msgKind === "danger"
          ? "bg-rose-50 text-rose-900 border-rose-200"
          : "bg-slate-50 text-slate-800 border-slate-200";

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
    if (String(cName || "").trim().length < 2)
      return toast("warn", "Name is required (at least 2 letters).");
    if (!String(cEmail || "").trim())
      return toast("warn", "Email is required.");
    if (String(cPassword || "").trim().length < 8)
      return toast("warn", "Password must be at least 8 characters.");

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

      toast("success", "Staff created");
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

    if (String(eName || "").trim().length < 2)
      return toast("warn", "Name must be at least 2 letters.");

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

      toast("success", "Staff updated");

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
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="text-xs text-slate-600 mt-1">
            Create, edit, and disable staff. Online works only if backend sends{" "}
            <b>lastSeenAt</b>.
          </div>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <div className="min-w-[220px]">
            <Input
              placeholder="Search: name, email, role, store"
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
            onClick={openCreate}
            className="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-800"
          >
            + New staff
          </button>
        </div>
      </div>

      {msg ? (
        <div className="p-4">
          <div
            className={cx("rounded-2xl border px-4 py-3 text-sm", bannerStyle)}
          >
            {msg}
          </div>
        </div>
      ) : null}

      {/* Mobile cards */}
      <div className="block lg:hidden p-4">
        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-2 h-3 w-56" />
                <Skeleton className="mt-3 h-10 w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-slate-600">No staff found.</div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((u) => (
              <div
                key={u?.id}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-slate-900 truncate">
                      {u?.name || "Unknown"}
                    </div>
                    <div className="mt-1 text-xs text-slate-600 truncate">
                      {u?.email || "—"}
                    </div>
                    <div className="mt-2 text-xs text-slate-600">
                      Role: <b>{u?.role || "—"}</b>
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      Store: <b>{locationLabelFromUser(u)}</b>
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      Last seen:{" "}
                      <b>{safeDate(u?.lastSeenAt ?? u?.last_seen_at)}</b>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col gap-2 items-end">
                    <Badge kind={u?.isActive ? "green" : "red"}>
                      {u?.isActive ? "Active" : "Disabled"}
                    </Badge>
                    <OnlineBadge user={u} />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEdit(u)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleActive(u)}
                    className={cx(
                      "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                      u?.isActive
                        ? "bg-rose-600 hover:bg-rose-700"
                        : "bg-emerald-600 hover:bg-emerald-700",
                    )}
                  >
                    {u?.isActive ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop grid table: NO horizontal scroll */}
      <div className="hidden lg:block p-4">
        <div className="grid grid-cols-[1.4fr_0.8fr_1fr_0.8fr_0.8fr_1fr_0.9fr] gap-2 text-[11px] font-semibold text-slate-600 border-b border-slate-200 pb-2">
          <div>Name</div>
          <div>Role</div>
          <div>Store / Branch</div>
          <div>Status</div>
          <div>Online</div>
          <div>Last seen</div>
          <div className="text-right">Actions</div>
        </div>

        {loading ? (
          <div className="mt-3 grid gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200 bg-white p-3"
              >
                <Skeleton className="h-5 w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">No staff found.</div>
        ) : (
          <div className="mt-2 grid gap-1">
            {filtered.map((u) => (
              <div
                key={u?.id}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50"
              >
                <div className="grid grid-cols-[1.4fr_0.8fr_1fr_0.8fr_0.8fr_1fr_0.9fr] gap-2 items-center text-sm">
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-900 truncate">
                      {u?.name || "Unknown"}
                    </div>
                    <div className="text-xs text-slate-600 truncate">
                      {u?.email || "—"}
                    </div>
                  </div>

                  <div className="text-slate-700">{u?.role || "—"}</div>

                  <div className="text-slate-700 truncate">
                    {locationLabelFromUser(u)}
                  </div>

                  <div>
                    <Badge kind={u?.isActive ? "green" : "red"}>
                      {u?.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </div>

                  <div>
                    <OnlineBadge user={u} />
                  </div>

                  <div className="text-xs text-slate-600 truncate">
                    {safeDate(u?.lastSeenAt ?? u?.last_seen_at)}
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEdit(u)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(u)}
                      className={cx(
                        "rounded-xl px-3 py-2 text-xs font-semibold text-white",
                        u?.isActive
                          ? "bg-rose-600 hover:bg-rose-700"
                          : "bg-emerald-600 hover:bg-emerald-700",
                      )}
                    >
                      {u?.isActive ? "Disable" : "Enable"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {createOpen ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="text-sm font-semibold text-slate-900">
                New staff
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Name, email, and password are required.
              </div>
            </div>

            <div className="p-4 grid gap-3">
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
                <div className="text-xs font-semibold text-slate-600 mb-1">
                  Role
                </div>
                <Select
                  value={cRole}
                  onChange={(e) => setCRole(e.target.value)}
                >
                  <option value="admin">admin</option>
                  <option value="manager">manager</option>
                  <option value="store_keeper">store_keeper</option>
                  <option value="seller">seller</option>
                  <option value="cashier">cashier</option>
                  <option value="owner">owner</option>
                </Select>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setCreateOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
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
          </div>
        </div>
      ) : null}

      {/* EDIT MODAL */}
      {editOpen ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="text-sm font-semibold text-slate-900">
                Edit staff{eName ? ` — ${eName}` : ""}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Update role and status. Email/store are read-only.
              </div>
            </div>

            <div className="p-4 grid gap-3">
              <Input
                placeholder="Name"
                value={eName}
                onChange={(e) => setEName(e.target.value)}
              />
              <Input
                value={editUser?.email || ""}
                readOnly
                className="bg-slate-50"
              />

              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1">
                  Role
                </div>
                <Select
                  value={eRole}
                  onChange={(e) => setERole(e.target.value)}
                >
                  <option value="admin">admin</option>
                  <option value="manager">manager</option>
                  <option value="store_keeper">store_keeper</option>
                  <option value="seller">seller</option>
                  <option value="cashier">cashier</option>
                  <option value="owner">owner</option>
                </Select>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                <b>Store:</b> {locationLabelFromUser(editUser || {})}
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={eIsActive}
                  onChange={(e) => setEIsActive(e.target.checked)}
                />
                Active
              </label>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={closeEdit}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
