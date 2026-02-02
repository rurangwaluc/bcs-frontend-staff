"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiFetch } from "../lib/api";

const ENDPOINTS = {
  LIST: "/users", // GET
  CREATE: "/users", // POST
  UPDATE: (id) => `/users/${id}`, // PATCH (or PUT)
  DELETE: (id) => `/users/${id}`, // DELETE
};

function safeDate(v) {
  if (!v) return "-";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

function normalizeRole(v) {
  const r = String(v || "")
    .trim()
    .toLowerCase();
  // keep what your backend expects
  return r;
}

export default function AdminUsersPanel() {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPassword, setCPassword] = useState("");
  const [cRole, setCRole] = useState("cashier");
  const [cLocationId, setCLocationId] = useState("");

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [eName, setEName] = useState("");
  const [eEmail, setEEmail] = useState("");
  const [eRole, setERole] = useState("");
  const [eLocationId, setELocationId] = useState("");
  const [eIsActive, setEIsActive] = useState(true);
  const [eResetPassword, setEResetPassword] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.LIST, { method: "GET" });
      const list = data?.users ?? data?.items ?? data?.rows ?? [];
      setUsers(Array.isArray(list) ? list : []);
    } catch (e) {
      setUsers([]);
      setMsg(e?.data?.error || e?.message || "Failed to load users");
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
    if (!qq) return users;

    return users.filter((u) => {
      const id = String(u.id ?? "");
      const name = String(u.name ?? "").toLowerCase();
      const email = String(u.email ?? "").toLowerCase();
      const role = String(u.role ?? "").toLowerCase();
      const active = String(u.isActive ? "yes" : "no");
      const loc = String(u.locationId ?? "").toLowerCase();
      return (
        id.includes(qq) ||
        name.includes(qq) ||
        email.includes(qq) ||
        role.includes(qq) ||
        active.includes(qq) ||
        loc.includes(qq)
      );
    });
  }, [users, q]);

  function openCreate() {
    setMsg("");
    setCName("");
    setCEmail("");
    setCPassword("");
    setCRole("cashier");
    setCLocationId("");
    setCreateOpen(true);
  }

  async function submitCreate() {
    // minimal validation
    if (!cEmail.trim() || !cPassword.trim() || !cRole.trim()) {
      setMsg("Email, password and role are required.");
      return;
    }

    setCreating(true);
    setMsg("");
    try {
      await apiFetch(ENDPOINTS.CREATE, {
        method: "POST",
        body: {
          name: cName.trim() || null,
          email: cEmail.trim(),
          password: cPassword.trim(),
          role: normalizeRole(cRole),
          // optional
          locationId: cLocationId.trim() || null,
        },
      });

      setMsg("✅ User created");
      setCreateOpen(false);
      await loadUsers();
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  function openEdit(u) {
    setMsg("");
    setEditId(u?.id ?? null);
    setEName(u?.name ?? "");
    setEEmail(u?.email ?? "");
    setERole(u?.role ?? "");
    setELocationId(u?.locationId ?? "");
    setEIsActive(!!u?.isActive);
    setEResetPassword("");
    setEditOpen(true);
  }

  async function submitEdit() {
    if (!editId) return;

    setSaving(true);
    setMsg("");
    try {
      const payload = {
        name: eName.trim() || null,
        email: eEmail.trim() || null,
        role: eRole ? normalizeRole(eRole) : null,
        locationId: eLocationId ? eLocationId.toString().trim() : null, // Fix trim error
        isActive: !!eIsActive,
      };

      if (String(eResetPassword || "").trim()) {
        payload.password = String(eResetPassword).trim();
      }

      const response = await apiFetch(ENDPOINTS.UPDATE(editId), {
        method: "PATCH",
        body: payload,
      });

      // Update local state immediately
      const updatedUser = response.user;
      setUsers((prev) =>
        prev.map((u) => (u.id === editId ? { ...u, ...updatedUser } : u)),
      );

      setMsg("✅ User updated");
      setEditOpen(false);
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Failed to update user");
    } finally {
      setSaving(false);
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
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Failed to update active status");
    }
  }

  //   async function deleteUser(u) {
  //     if (!u?.id) return;
  //     const ok = window.confirm(
  //       `Deactivate user "${u.email}"?\n\nUser can be re-activated later.`,
  //     );

  //     if (!ok) return;

  //     setMsg("");
  //     try {
  //       await apiFetch(ENDPOINTS.DELETE(u.id), { method: "DELETE" });
  //       setMsg("✅ User deleted");
  //       await loadUsers();
  //     } catch (e) {
  //       setMsg(e?.data?.error || e?.message || "Failed to delete user");
  //     }
  //   }

  return (
    <div className="mt-6 bg-white rounded-xl shadow overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="font-semibold">Users</div>
          <div className="text-xs text-gray-500 mt-1">
            Admin can create, edit, disable and delete users (policy enforced in
            backend).
          </div>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <input
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="Search users..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            onClick={loadUsers}
            className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg bg-black text-white text-sm"
          >
            + New user
          </button>
        </div>
      </div>

      {msg ? (
        <div className="p-4 text-sm">
          {msg.startsWith("✅") ? (
            <div className="p-3 rounded-lg bg-green-50 text-green-800">
              {msg}
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-red-50 text-red-700">{msg}</div>
          )}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3">ID</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Location</th>
              <th className="text-left p-3">Active</th>
              <th className="text-left p-3">Created</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3">{u.id}</td>
                <td className="p-3 font-medium">{u.name || "-"}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3">{u.locationId ?? "-"}</td>
                <td className="p-3">
                  <span
                    className={
                      "px-2 py-1 rounded-full text-xs " +
                      (u.isActive
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-600")
                    }
                  >
                    {u.isActive ? "Yes" : "No"}
                  </span>
                </td>
                <td className="p-3">{safeDate(u.createdAt)}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => openEdit(u)}
                    className="px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => toggleActive(u)}
                    className={
                      "ml-2 px-3 py-1.5 rounded-lg text-xs font-medium " +
                      (u.isActive
                        ? "bg-red-600 text-white hover:bg-red-700" // Active → red
                        : "bg-green-600 text-white hover:bg-green-700") // Inactive → green
                    }
                  >
                    {u.isActive ? "Deactivate" : "Activate"}
                  </button>

                  {/* <button
                    onClick={() => deleteUser(u)}
                    className="ml-2 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs hover:bg-red-700"
                  >
                    Deactivate
                  </button> */}
                </td>
              </tr>
            ))}

            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-4 text-sm text-gray-600">
                  {loading ? "Loading..." : "No users found."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {createOpen ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow max-w-md w-full p-4">
            <div className="font-semibold">Create user</div>
            <div className="text-xs text-gray-500 mt-1">
              Email + password required. Role must match backend.
            </div>

            <div className="mt-3 grid gap-2">
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Name (optional)"
                value={cName}
                onChange={(e) => setCName(e.target.value)}
              />
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Email"
                value={cEmail}
                onChange={(e) => setCEmail(e.target.value)}
              />
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Password"
                type="password"
                value={cPassword}
                onChange={(e) => setCPassword(e.target.value)}
              />

              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={cRole}
                onChange={(e) => setCRole(e.target.value)}
              >
                <option value="admin">admin</option>
                <option value="manager">manager</option>
                <option value="store_keeper">store_keeper</option>
                <option value="seller">seller</option>
                <option value="cashier">cashier</option>
                <option value="owner">owner</option>
              </select>

              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Location ID (optional)"
                value={cLocationId}
                onChange={(e) => setCLocationId(e.target.value)}
              />
            </div>

            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
                disabled={creating}
              >
                Close
              </button>
              <button
                onClick={submitCreate}
                className="px-4 py-2 rounded-lg bg-black text-white text-sm"
                disabled={creating}
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Edit modal */}
      {editOpen ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow max-w-md w-full p-4">
            <div className="font-semibold">Edit user #{editId}</div>
            <div className="text-xs text-gray-500 mt-1">
              Update role, location, active status. Reset password optional.
            </div>

            <div className="mt-3 grid gap-2">
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Name"
                value={eName}
                onChange={(e) => setEName(e.target.value)}
              />
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Email"
                value={eEmail}
                onChange={(e) => setEEmail(e.target.value)}
              />
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={eRole}
                onChange={(e) => setERole(e.target.value)}
              >
                <option value="admin">admin</option>
                <option value="manager">manager</option>
                <option value="store_keeper">store_keeper</option>
                <option value="seller">seller</option>
                <option value="cashier">cashier</option>
                <option value="owner">owner</option>
              </select>

              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Location ID"
                value={eLocationId}
                onChange={(e) => setELocationId(e.target.value)}
              />

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={eIsActive}
                  onChange={(e) => setEIsActive(e.target.checked)}
                />
                Active
              </label>

              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Reset password (optional)"
                type="password"
                value={eResetPassword}
                onChange={(e) => setEResetPassword(e.target.value)}
              />
            </div>

            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => setEditOpen(false)}
                className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
                disabled={saving}
              >
                Close
              </button>
              <button
                onClick={submitEdit}
                className="px-4 py-2 rounded-lg bg-black text-white text-sm"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
