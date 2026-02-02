"use client";

import { useEffect, useState } from "react";

import Nav from "../../components/Nav";
import { apiFetch } from "../../lib/api";

const ROLES = ["admin", "manager", "store_keeper", "seller", "cashier"];

export default function StaffPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // create form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("seller");
  const [password, setPassword] = useState("");

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const data = await apiFetch("/users", { method: "GET" });
      setUsers(data.users || []);
    } catch (e) {
      setMsg(e?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createUser(e) {
    e.preventDefault();
    setMsg("");
    try {
      await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify({ name, email, role, password })
      });
      setName("");
      setEmail("");
      setPassword("");
      setRole("seller");
      setMsg("✅ User created");
      await load();
    } catch (e2) {
      setMsg(e2?.data?.error || e2.message);
    }
  }

  async function updateUser(id, patch) {
    setMsg("");
    try {
      await apiFetch(`/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch)
      });
      setMsg("✅ Updated");
      await load();
    } catch (e) {
      setMsg(e?.data?.error || e.message);
    }
  }

  return (
    <div>
      <Nav active="staff" />
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Staff</h1>
            <p className="text-sm text-gray-600 mt-1">
              Admin-only: create users and update role/active.
            </p>
          </div>
          <button
            onClick={load}
            className="px-4 py-2 rounded-lg bg-black text-white"
          >
            Refresh
          </button>
        </div>

        {msg ? (
          <div className="mt-4 text-sm">
            {msg.startsWith("✅") ? (
              <div className="p-3 rounded-lg bg-green-50 text-green-800">{msg}</div>
            ) : (
              <div className="p-3 rounded-lg bg-red-50 text-red-700">{msg}</div>
            )}
          </div>
        ) : null}

        {/* Create */}
        <form onSubmit={createUser} className="mt-6 bg-white rounded-xl shadow p-4">
          <div className="font-semibold">Create staff</div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <select
              className="border rounded-lg px-3 py-2"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Temp password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="mt-3">
            <button className="px-4 py-2 rounded-lg bg-black text-white">
              Create
            </button>
          </div>
        </form>

        {/* List */}
        <div className="mt-6 bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b">
            <div className="font-semibold">Users</div>
          </div>

          {loading ? (
            <div className="p-4 text-sm text-gray-600">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left p-3">ID</th>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Email</th>
                    <th className="text-left p-3">Role</th>
                    <th className="text-left p-3">Active</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <UserRow key={u.id} u={u} onSave={updateUser} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserRow({ u, onSave }) {
  const [role, setRole] = useState(u.role);
  const [isActive, setIsActive] = useState(!!u.isActive);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave(u.id, { role, isActive });
    setSaving(false);
  }

  return (
    <tr className="border-t">
      <td className="p-3">{u.id}</td>
      <td className="p-3">{u.name}</td>
      <td className="p-3">{u.email}</td>
      <td className="p-3">
        <select
          className="border rounded-lg px-2 py-1"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </td>
      <td className="p-3">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <span>{isActive ? "Yes" : "No"}</span>
        </label>
      </td>
      <td className="p-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg bg-black text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </td>
    </tr>
  );
}
