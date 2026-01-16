import Link from "next/link";
<<<<<<< HEAD
import Nav from "../components/Nav";
=======
>>>>>>> 340607d (Update project - 16/01/2026)
import { headers } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

async function serverFetch(path) {
  const h = await headers();
  const cookie = h.get("cookie") || "";

  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: cookie ? { cookie } : {},
    cache: "no-store"
  });

  if (res.status === 401) return { unauth: true };
  return res.json();
}

<<<<<<< HEAD
function money(n) {
  const x = Number(n || 0);
  return x.toLocaleString();
}

function safeDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export default async function AdminHome() {
=======
function roleHome(role) {
  if (role === "seller") return "/seller";
  if (role === "store_keeper") return "/store-keeper";
  if (role === "cashier") return "/cashier";
  if (role === "manager") return "/manager";
  if (role === "admin") return "/admin";
  return "/login";
}

export default async function StaffHome() {
>>>>>>> 340607d (Update project - 16/01/2026)
  const me = await serverFetch("/auth/me");
  if (me?.unauth) {
    return (
      <div className="max-w-md mx-auto mt-24 bg-white p-6 rounded-xl shadow">
<<<<<<< HEAD
        <h1 className="text-xl font-semibold">BCS Admin</h1>
=======
        <h1 className="text-xl font-semibold">BCS Staff</h1>
>>>>>>> 340607d (Update project - 16/01/2026)
        <p className="mt-2 text-sm text-gray-600">You are not logged in.</p>
        <Link className="inline-block mt-4 px-4 py-2 rounded-lg bg-black text-white" href="/login">
          Go to Login
        </Link>
      </div>
    );
  }

<<<<<<< HEAD
  const summary = await serverFetch("/dashboard/owner/summary").catch(() => null);
  const d = summary?.dashboard || {};

  const productsCount = d.productsCount ?? 0;
  const totalQty = d.inventory?.totalqty ?? 0;

  const salesTodayCount = d.salesToday?.count ?? 0;
  const salesTodayTotal = d.salesToday?.total ?? 0;

  const paymentsTodayCount = d.paymentsToday?.count ?? 0;
  const paymentsTodayTotal = d.paymentsToday?.total ?? 0;

  const paymentsAllTimeTotal = d.paymentsAllTime?.total ?? 0;

  const salesByStatus = Array.isArray(d.salesByStatus) ? d.salesByStatus : [];
  const recent = Array.isArray(d.recentActivity) ? d.recentActivity : [];

  return (
    <div>
      <Nav active="home" />
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Owner Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">
              Logged in as <span className="font-medium">{me.user.email}</span>
            </p>
          </div>

          <Link className="px-4 py-2 rounded-lg bg-black text-white" href="/login">
            Switch account
          </Link>
        </div>

        {/* KPI cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card label="Products (SKU count)" value={productsCount} />
          <Card label="Total qty in store" value={totalQty} />
          <Card label="Payments (all time)" value={money(paymentsAllTimeTotal)} />
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
                    <td className="p-4 text-sm text-gray-600" colSpan={3}>No sales data.</td>
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
              The system is auditable. This is your accountability feed.
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
                    <td className="p-4 text-sm text-gray-600" colSpan={6}>No recent activity.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
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
=======
  const home = roleHome(me.user.role);

  return (
    <div className="max-w-md mx-auto mt-24 bg-white p-6 rounded-xl shadow">
      <h1 className="text-xl font-semibold">Welcome</h1>
      <p className="mt-2 text-sm text-gray-600">
        Signed in as <span className="font-medium">{me.user.email}</span> ({me.user.role})
      </p>
      <Link className="inline-block mt-4 px-4 py-2 rounded-lg bg-black text-white" href={home}>
        Continue
      </Link>
>>>>>>> 340607d (Update project - 16/01/2026)
    </div>
  );
}
