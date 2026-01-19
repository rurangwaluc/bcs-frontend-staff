"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import RoleBar from "../../components/RoleBar";
import { apiFetch } from "../../lib/api";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

/**
 * ✅ Backend endpoints
 * If your backend uses different paths, change ONLY here.
 */
const ENDPOINTS = {
  OWNER_SUMMARY: "/dashboard/owner/summary",
  USERS_LIST: "/users", // useful for quick visibility (optional)
};

function money(n) {
  const x = Number(n || 0);
  return x.toLocaleString();
}
function safeDate(v) {
  if (!v) return "-";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

export default function OwnerPage() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [msg, setMsg] = useState("");

  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState(null);

  // Optional: show users table for sanity (owner can see everything)
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersQ, setUsersQ] = useState("");

  // --- ROLE GUARD ---
  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        const data = await getMe();
        if (!alive) return;

        const user = data?.user || null;
        setMe(user);

        if (!user?.role) return router.replace("/login");

        if (user.role !== "owner") {
          // redirect other roles to their home
          const map = {
            admin: "/admin",
            manager: "/manager",
            store_keeper: "/store-keeper",
            seller: "/seller",
            cashier: "/cashier",
          };
          router.replace(map[user.role] || "/");
        }
      } catch {
        if (!alive) return;
        router.replace("/login");
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [router]);

  const isAuthorized = !!me && me.role === "owner";

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.OWNER_SUMMARY, { method: "GET" });
      setDashboard(data?.dashboard || data || null);
    } catch (e) {
      setMsg(e?.data?.error || e.message || "Failed to load owner summary");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.USERS_LIST, { method: "GET" });
      const list = data?.users ?? data?.items ?? data?.rows ?? [];
      setUsers(Array.isArray(list) ? list : []);
    } catch (e) {
      // owner should have USER_MANAGE via policy, so this should work
      setMsg(e?.data?.error || e.message || "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    loadSummary();
    loadUsers();
  }, [isAuthorized, loadSummary, loadUsers]);

  const filteredUsers = useMemo(() => {
    const qq = String(usersQ || "")
      .trim()
      .toLowerCase();
    if (!qq) return users || [];
    return (users || []).filter((u) => {
      const id = String(u.id || "");
      const email = String(u.email || "").toLowerCase();
      const role = String(u.role || "").toLowerCase();
      const name = String(u.name || "").toLowerCase();
      return (
        id.includes(qq) ||
        email.includes(qq) ||
        role.includes(qq) ||
        name.includes(qq)
      );
    });
  }, [users, usersQ]);

  if (!isAuthorized)
    return <div className="p-6 text-sm text-gray-600">Redirecting...</div>;

  // Pull fields from backend structure you already used in frontend-admin
  const d = dashboard || {};

  const productsCount = d.productsCount ?? 0;
  const totalQty = d.inventory?.totalqty ?? d.inventory?.totalQty ?? 0;

  const salesTodayCount = d.salesToday?.count ?? 0;
  const salesTodayTotal = d.salesToday?.total ?? 0;

  const paymentsTodayCount = d.paymentsToday?.count ?? 0;
  const paymentsTodayTotal = d.paymentsToday?.total ?? 0;

  const paymentsAllTimeTotal = d.paymentsAllTime?.total ?? 0;

  const salesByStatus = Array.isArray(d.salesByStatus) ? d.salesByStatus : [];
  const recent = Array.isArray(d.recentActivity) ? d.recentActivity : [];

  return (
    <div>
      <RoleBar title="Owner" subtitle={`User: ${me.email}`} />

      <div className="max-w-6xl mx-auto p-6">
        {msg ? (
          <div className="mt-4 text-sm">
            {msg.startsWith("✅") ? (
              <div className="p-3 rounded-lg bg-green-50 text-green-800">
                {msg}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-red-50 text-red-700">{msg}</div>
            )}
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-2xl font-bold">Owner Dashboard</div>
            <div className="text-sm text-gray-600 mt-1">
              Cross-location control (phase 1: global summary + activity).
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadSummary}
              className="px-4 py-2 rounded-lg bg-black text-white text-sm"
            >
              {loading ? "Refreshing..." : "Refresh summary"}
            </button>

            <button
              onClick={loadUsers}
              className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
            >
              {usersLoading ? "Loading..." : "Refresh users"}
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card label="Products (SKU count)" value={productsCount} />
          <Card label="Total qty in store" value={totalQty} />
          <Card
            label="Payments (all time)"
            value={money(paymentsAllTimeTotal)}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card
            label="Sales today"
            value={`${salesTodayCount} sale(s)`}
            sub={`Total: ${money(salesTodayTotal)}`}
          />
          <Card
            label="Payments today"
            value={`${paymentsTodayCount} payment(s)`}
            sub={`Total: ${money(paymentsTodayTotal)}`}
          />
        </div>

        {/* Sales by status */}
        <div className="mt-6 bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b">
            <div className="font-semibold">Sales by status</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Count</th>
                  <th className="text-right p-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {salesByStatus.map((s) => (
                  <tr key={s.status} className="border-t">
                    <td className="p-3 font-medium">{s.status}</td>
                    <td className="p-3 text-right">{s.count}</td>
                    <td className="p-3 text-right">{money(s.total)}</td>
                  </tr>
                ))}
                {salesByStatus.length === 0 ? (
                  <tr>
                    <td className="p-4 text-sm text-gray-600" colSpan={3}>
                      No sales data.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent activity */}
        <div className="mt-6 bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b">
            <div className="font-semibold">Recent activity</div>
            <div className="text-xs text-gray-500 mt-1">
              Auditable trail across the platform.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left p-3">Time</th>
                  <th className="text-left p-3">User</th>
                  <th className="text-left p-3">Action</th>
                  <th className="text-left p-3">Entity</th>
                  <th className="text-left p-3">Entity ID</th>
                  <th className="text-left p-3">Description</th>
                </tr>
              </thead>
              <tbody>
                {recent.slice(0, 12).map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3">{safeDate(r.createdAt)}</td>
                    <td className="p-3">{r.userId ?? "-"}</td>
                    <td className="p-3 font-medium">{r.action}</td>
                    <td className="p-3">{r.entity}</td>
                    <td className="p-3">{r.entityId ?? "-"}</td>
                    <td className="p-3 text-gray-700">{r.description}</td>
                  </tr>
                ))}
                {recent.length === 0 ? (
                  <tr>
                    <td className="p-4 text-sm text-gray-600" colSpan={6}>
                      No recent activity.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {/* Users (quick visibility) */}
        <div className="mt-6 bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">Users</div>
              <div className="text-xs text-gray-500 mt-1">
                Phase 1: visibility only. CRUD stays in frontend-admin.
              </div>
            </div>

            <input
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Search users"
              value={usersQ}
              onChange={(e) => setUsersQ(e.target.value)}
            />
          </div>

          {usersLoading ? (
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
                    <th className="text-left p-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="p-3">{u.id}</td>
                      <td className="p-3 font-medium">{u.name}</td>
                      <td className="p-3">{u.email}</td>
                      <td className="p-3">{u.role}</td>
                      <td className="p-3">{u.isActive ? "Yes" : "No"}</td>
                      <td className="p-3">{safeDate(u.createdAt)}</td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td className="p-4 text-sm text-gray-600" colSpan={6}>
                        No users found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub ? <div className="text-sm text-gray-600 mt-1">{sub}</div> : null}
    </div>
  );
}
