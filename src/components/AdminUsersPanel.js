"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import AsyncButton from "./AsyncButton";

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
  if (!v) return "No activity yet";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

function normalizeRole(v) {
  return String(v || "").trim().toLowerCase();
}

function isOnlineFromUser(u) {
  const last = u?.lastSeenAt ?? u?.last_seen_at ?? null;
  if (!last) return null;
  const d = new Date(last);
  if (Number.isNaN(d.getTime())) return null;
  return Date.now() - d.getTime() <= ONLINE_WINDOW_MS;
}

/**
 * IMPORTANT:
 * Your /users response currently does NOT include location name/code.
 * So we show “Store not set” instead of “Location #1”.
 * Once backend returns locationName/locationCode or location {}, this will automatically display it.
 */
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

  const [refreshState, setRefreshState] = useState("idle"); // idle | loading | success

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
  const [eResetPassword, setEResetPassword] = useState("");

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
    toast("info", "");
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
    const qq = String(q || "").trim().toLowerCase();
    const list = Array.isArray(users) ? users : [];
    if (!qq) return list;

    return list.filter((u) => {
      const name = String(u?.name ?? "").toLowerCase();
      const email = String(u?.email ?? "").toLowerCase();
      const role = String(u?.role ?? "").toLowerCase();
      const loc = locationLabelFromUser(u).toLowerCase();
      const active = u?.isActive ? "active" : "disabled";

      return name.includes(qq) || email.includes(qq) || role.includes(qq) || loc.includes(qq) || active.includes(qq);
    });
  }, [users, q]);

  async function onRefresh() {
    setRefreshState("loading");
    await loadUsers();
    setRefreshState("success");
    setTimeout(() => setRefreshState("idle"), 900);
  }

  function openCreate() {
    toast("info", "");
    setCName("");
    setCEmail("");
    setCPassword("");
    setCRole("cashier");
    setCreateState("idle");
    setCreateOpen(true);
  }

  async function submitCreate() {
    // backend requires name min 2, email, password min 8, role
    if (String(cName || "").trim().length < 2) {
      toast("warn", "Name is required (at least 2 letters).");
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
    toast("info", "");

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
    toast("info", "");
    setEditUser(u || null);

    setEName(u?.name ?? "");
    setERole(u?.role ?? "cashier");
    setEIsActive(u?.isActive !== false);
    setEResetPassword("");

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

    // backend update schema allows: name, role, isActive
    if (String(eName || "").trim().length < 2) {
      toast("warn", "Name must be at least 2 letters.");
      return;
    }

    setSaveState("loading");
    toast("info", "");

    try {
      const payload = {
        name: String(eName).trim(),
        role: normalizeRole(eRole),
        isActive: !!eIsActive,
      };

      // NOTE: backend updateUserSchema currently does NOT accept password.
      // If you want password reset, you must add it to updateUserSchema + service.
      // For now we do NOT send it to avoid 400 errors.
      if (String(eResetPassword || "").trim()) {
        toast("warn", "Password reset is not enabled in backend yet.");
      }

      await apiFetch(ENDPOINTS.UPDATE(id), {
        method: "PATCH",
        body: payload,
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

    toast("info", "");
    try {
      await apiFetch(ENDPOINTS.UPDATE(u.id), {
        method: "PATCH",
        body: { isActive: !u.isActive },
      });

      await loadUsers();
      toast("success", u.isActive ? "Staff disabled" : "Staff enabled");
    } catch (e) {
      toast("danger", e?.data?.error || e?.message || "Failed to update staff status");
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="text-xs text-slate-600 mt-1">
            Create, edit, and disable staff. Online works only if backend sends <b>lastSeenAt</b>.
          </div>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <div className="min-w-[220px]">
            <Input placeholder="Search: name, email, role, store" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          <AsyncButton
            variant="secondary"
            state={refreshState}
            text="Refresh"
            loadingText="Loading…"
            successText="Done"
            onClick={onRefresh}
            className="cursor-pointer"
          />

          <button
            onClick={openCreate}
            className="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 cursor-pointer"
          >
            + New staff
          </button>
        </div>
      </div>

      {msg ? (
        <div className="p-4">
          <div className={cx("rounded-2xl border px-4 py-3 text-sm", bannerStyle)}>{msg}</div>
        </div>
      ) : null}

      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr className="border-b border-slate-200">
              <th className="text-left p-3 text-xs font-semibold">Name</th>
              <th className="text-left p-3 text-xs font-semibold">Role</th>
              <th className="text-left p-3 text-xs font-semibold">Store / Branch</th>
              <th className="text-left p-3 text-xs font-semibold">Status</th>
              <th className="text-left p-3 text-xs font-semibold">Online</th>
              <th className="text-left p-3 text-xs font-semibold">Last seen</th>
              <th className="text-right p-3 text-xs font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u?.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-3">
                  <div className="font-semibold text-slate-900">{u?.name || "Unknown name"}</div>
                  <div className="text-xs text-slate-600">{u?.email || "No email"}</div>
                </td>

                <td className="p-3">{u?.role || "Unknown"}</td>

                <td className="p-3">{locationLabelFromUser(u)}</td>

                <td className="p-3">
                  <Badge kind={u?.isActive ? "green" : "red"}>{u?.isActive ? "Active" : "Disabled"}</Badge>
                </td>

                <td className="p-3">
                  <OnlineBadge user={u} />
                </td>

                <td className="p-3">{safeDate(u?.lastSeenAt ?? u?.last_seen_at)}</td>

               <td className="p-3 text-right">
                  <div className="inline-flex flex-col items-end gap-2">
                    <button
                      onClick={() => openEdit(u)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => toggleActive(u)}
                      className={cx(
                        "rounded-xl px-3 py-2 text-xs font-semibold text-white cursor-pointer",
                        u?.isActive ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700",
                      )}
                    >
                      {u?.isActive ? "Disable" : "Enable"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-sm text-slate-600">
                  {loading ? "Loading…" : "No staff found."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* CREATE MODAL */}
      {createOpen ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="text-sm font-semibold text-slate-900">New staff</div>
              <div className="text-xs text-slate-600 mt-1">Name, email, and password are required.</div>
            </div>

            <div className="p-4 grid gap-3">
              <Input placeholder="Name" value={cName} onChange={(e) => setCName(e.target.value)} />
              <Input placeholder="Email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} />
              <Input placeholder="Password (min 8 chars)" type="password" value={cPassword} onChange={(e) => setCPassword(e.target.value)} />

              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1">Role</div>
                <Select value={cRole} onChange={(e) => setCRole(e.target.value)}>
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
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>

                <AsyncButton
                  state={createState}
                  text="Create"
                  loadingText="Creating…"
                  successText="Created"
                  onClick={submitCreate}
                  className="cursor-pointer"
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
              <div className="text-xs text-slate-600 mt-1">Update role and status. Email/store are read-only.</div>
            </div>

            <div className="p-4 grid gap-3">
              <Input placeholder="Name" value={eName} onChange={(e) => setEName(e.target.value)} />

              {/* Email is read-only (backend update schema does not allow changing email) */}
              <Input value={editUser?.email || ""} readOnly className="bg-slate-50" />

              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1">Role</div>
                <Select value={eRole} onChange={(e) => setERole(e.target.value)}>
                  <option value="admin">admin</option>
                  <option value="manager">manager</option>
                  <option value="store_keeper">store_keeper</option>
                  <option value="seller">seller</option>
                  <option value="cashier">cashier</option>
                  <option value="owner">owner</option>
                </Select>
              </div>

              {/* Store is read-only until backend exposes location name/code on /users */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                <b>Store:</b> {locationLabelFromUser(editUser || {})}
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={eIsActive} onChange={(e) => setEIsActive(e.target.checked)} />
                Active
              </label>

              {/* Password reset is not supported by backend updateUserSchema yet */}
              <Input
                placeholder="Reset password (not enabled yet)"
                type="password"
                value={eResetPassword}
                onChange={(e) => setEResetPassword(e.target.value)}
                disabled
                className="bg-slate-50"
              />

              <div className="flex gap-2 justify-end">
                <button
                  onClick={closeEdit}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>

                <AsyncButton
                  state={saveState}
                  text="Save"
                  loadingText="Saving…"
                  successText="Saved"
                  onClick={submitEdit}
                  className="cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}