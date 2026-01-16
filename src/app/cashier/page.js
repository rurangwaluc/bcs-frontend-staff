"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import RoleBar from "../../components/RoleBar";
import { apiFetch } from "../../lib/api";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

/**
 * If any endpoint differs, change ONLY here.
 *
 * ✅ Safe default:
 * - We GET /sales then filter client-side by status = AWAITING_PAYMENT_RECORD
 * - We POST payment to /payments (common pattern)
 *
 * If your backend uses a different route, just change:
 *   PAYMENTS_CREATE: "/your-route"
 */
const ENDPOINTS = {
  SALES_LIST: "/sales",
  PAYMENTS_CREATE: "/payments", // POST { saleId, amount, method, note? }
  PAYMENTS_TODAY: "/payments/today" // optional; if 404, UI will ignore
};

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "MOMO", label: "Mobile Money" },
  { value: "BANK", label: "Bank Transfer" }
];

export default function CashierPage() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [msg, setMsg] = useState("");

  const [tab, setTab] = useState("awaiting"); // awaiting | record | today

  // Sales
  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesQ, setSalesQ] = useState("");

  // Record payment form
  const [saleId, setSaleId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Today (optional)
  const [today, setToday] = useState(null);
  const [todayLoading, setTodayLoading] = useState(false);

  // ---------- Auth + hard redirect ----------
  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        const data = await getMe();
        if (!alive) return;

        const user = data.user;
        setMe(user);

        if (user?.role && user.role !== "cashier") {
          const map = {
            seller: "/seller",
            store_keeper: "/store-keeper",
            manager: "/manager",
            admin: "/admin"
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

  const isAuthorized = me && me.role === "cashier";

  // ---------- Loaders ----------
  const loadSales = useCallback(async () => {
    setSalesLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.SALES_LIST, { method: "GET" });
      setSales(data.sales || data.items || data.rows || []);
    } catch (e) {
      setMsg(e?.data?.error || e.message);
    } finally {
      setSalesLoading(false);
    }
  }, []);

  const loadToday = useCallback(async () => {
    setTodayLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.PAYMENTS_TODAY, { method: "GET" });
      setToday(data);
    } catch {
      // optional endpoint — ignore if missing
      setToday(null);
    } finally {
      setTodayLoading(false);
    }
  }, []);

  // Load tab data
  useEffect(() => {
    if (!isAuthorized) return;

    async function run() {
      if (tab === "awaiting" || tab === "record") await loadSales();
      if (tab === "today") await loadToday();
    }

    run();
  }, [tab, isAuthorized, loadSales, loadToday]);

  // ---------- Derived ----------
  const awaitingSales = useMemo(() => {
      console.log("SALES FROM API:", sales);

    const list = sales || [];
      const awaiting = list.filter(
  (s) => String(s.status || "").toUpperCase() === "DRAFT"
);




    const qq = (salesQ || "").trim().toLowerCase();
    if (!qq) return awaiting;

    return awaiting.filter((s) => {
      const id = String(s.id || "");
      const cname = String(s.customerName || "").toLowerCase();
      const cphone = String(s.customerPhone || "").toLowerCase();
      return id.includes(qq) || cname.includes(qq) || cphone.includes(qq);
    });
  }, [sales, salesQ]);

  function pickSaleForPayment(s) {
    const id = s?.id ? String(s.id) : "";
    const total = s?.totalAmount ?? s?.total ?? "";

    setSaleId(id);
    setAmount(total === "" || total === null || total === undefined ? "" : String(total));
    setMethod("CASH");
    setNote("");
    setTab("record");
    setMsg("");
  }

  async function submitPayment(e) {
    e.preventDefault();
    setMsg("");

    const idNum = Number(saleId);
    const amtNum = Number(amount);

    if (!idNum) return setMsg("Enter a valid Sale ID.");
    if (!Number.isFinite(amtNum) || amtNum <= 0) return setMsg("Enter a valid amount > 0.");

    setSaving(true);
    try {
      const payload = {
      saleId: idNum,
      amount: amtNum,
      method,
      note: note || ""
    };


      await apiFetch(ENDPOINTS.PAYMENTS_CREATE, {
        method: "POST",
        body: payload
      });

      setMsg(`✅ Payment recorded for Sale #${idNum}`);
      setSaleId("");
      setAmount("");
      setMethod("CASH");
      setNote("");

      // reload list so sale disappears if backend updated status to COMPLETED
      await loadSales();
      setTab("awaiting");
    } catch (e2) {
      setMsg(e2?.data?.error || e2.message);
    } finally {
      setSaving(false);
    }
  }

  if (!isAuthorized) {
    return <div className="p-6 text-sm text-gray-600">Redirecting...</div>;
  }

  return (
    <div>
      <RoleBar
        title="Cashier"
        subtitle={`User: ${me.email} • Location: ${me.locationId}`}
      />

      <div className="max-w-6xl mx-auto p-6">
        {msg ? (
          <div className="mt-4 text-sm">
            {msg.startsWith("✅") ? (
              <div className="p-3 rounded-lg bg-green-50 text-green-800">{msg}</div>
            ) : (
              <div className="p-3 rounded-lg bg-red-50 text-red-700">{msg}</div>
            )}
          </div>
        ) : null}

        {/* Tabs */}
        <div className="mt-6 flex gap-2 text-sm flex-wrap">
          <TabButton active={tab === "awaiting"} onClick={() => setTab("awaiting")}>
            Awaiting Payments
          </TabButton>
          <TabButton active={tab === "record"} onClick={() => setTab("record")}>
            Record Payment
          </TabButton>
          <TabButton active={tab === "today"} onClick={() => setTab("today")}>
            Today (optional)
          </TabButton>
        </div>

        {/* Awaiting Payments */}
        {tab === "awaiting" ? (
          <div className="mt-4 bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">Sales awaiting payment record</div>
                <div className="text-xs text-gray-500 mt-1">
                  These are sales marked by seller as <b>AWAITING_PAYMENT_RECORD</b>.
                </div>
              </div>

              <div className="flex gap-2 items-center">
                <input
                  className="border rounded-lg px-3 py-2 text-sm"
                  placeholder="Search by id/customer"
                  value={salesQ}
                  onChange={(e) => setSalesQ(e.target.value)}
                />
                <button
                  onClick={loadSales}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm"
                >
                  Refresh
                </button>
              </div>
            </div>

            {salesLoading ? (
              <div className="p-4 text-sm text-gray-600">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left p-3">ID</th>
                      <th className="text-left p-3">Customer</th>
                      <th className="text-right p-3">Total</th>
                      <th className="text-left p-3">Created</th>
                      <th className="text-right p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {awaitingSales.map((s) => (
                      <tr key={s.id} className="border-t">
                        <td className="p-3 font-medium">{s.id}</td>
                        <td className="p-3">
                          <div className="font-medium">{s.customerName || "-"}</div>
                          <div className="text-xs text-gray-500">{s.customerPhone || ""}</div>
                        </td>
                        <td className="p-3 text-right">{s.totalAmount ?? s.total ?? "-"}</td>
                        <td className="p-3">{fmt(s.createdAt)}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => pickSaleForPayment(s)}
                            className="px-3 py-1.5 rounded-lg bg-black text-white text-xs"
                          >
                            Record
                          </button>
                        </td>
                      </tr>
                    ))}
                    {awaitingSales.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-sm text-gray-600">
                          No sales awaiting payment record.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {/* Record Payment */}
        {/* Record Payment */}
{tab === "record" ? (
  <div className="mt-4 space-y-4">

    {/* Sales list */}
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="p-4 border-b font-semibold">
        Pick sale to record payment
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">Customer</th>
                  {/* <th className="p-3 text-left">Phone Number</th> */}
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {awaitingSales.map((s) => (
              <tr key={s.id} className="border-t">
              <td className="p-3 font-medium">{s.id}</td>

              {/* Customer */}
              <td className="p-3">
                <div className="font-medium">
                  {s.customerName ?? s.customer?.name ?? "-"}
                </div>
                <div className="text-xs text-gray-500">
                  {s.customerPhone ?? s.customer?.phone ?? ""}
                </div>
              </td>

              {/* Status */}
              <td className="p-3">
                <span className="px-2 py-1 rounded text-xs bg-gray-100">
                  {s.status}
                </span>
              </td>

              {/* Total */}
              <td className="p-3 text-right">
                {s.totalAmount ?? s.total ?? "-"}
              </td>

              {/* Action */}
              <td className="p-3 text-right">
                <button
                  onClick={() => pickSaleForPayment(s)}
                  className="px-3 py-1.5 rounded bg-black text-white text-xs"
                >
                  Pick
                </button>
              </td>
            </tr>


            ))}
            {awaitingSales.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-4 text-sm text-gray-600">
                  No sales awaiting payment.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>

    {/* Payment form */}
    <div className="bg-white rounded-xl shadow p-4">
      <div className="font-semibold">Record Payment</div>

      <form onSubmit={submitPayment} className="mt-4 grid gap-3 max-w-xl">
        <div>
          <label className="block text-sm font-medium">Sale ID</label>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={saleId}
            onChange={(e) => setSaleId(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Amount</label>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Method</label>
          <select
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Note</label>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <button
          className="w-fit px-4 py-2 rounded-lg bg-black text-white text-sm"
        >
          Save Payment
        </button>
      </form>
    </div>

  </div>
) : null}


        {/* Today (optional) */}
        {tab === "today" ? (
          <div className="mt-4 bg-white rounded-xl shadow p-4">
            <div className="font-semibold">Today</div>
            <div className="text-xs text-gray-500 mt-1">
              This tab works only if your backend has <code>/payments/today</code>.
            </div>

            {todayLoading ? (
              <div className="p-4 text-sm text-gray-600">Loading...</div>
            ) : today ? (
              <div className="mt-4 text-sm">
                <div className="p-3 rounded-lg bg-gray-50">
                  <div><b>Count:</b> {today.count ?? today.paymentsToday?.count ?? "-"}</div>
                  <div><b>Total:</b> {today.total ?? today.paymentsToday?.total ?? "-"}</div>
                </div>
              </div>
            ) : (
              <div className="mt-4 text-sm text-gray-600">
                Not available (endpoint missing). You can ignore this tab.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={
        "px-3 py-2 rounded-lg border text-sm " +
        (active ? "bg-black text-white border-black" : "bg-white text-gray-700 hover:bg-gray-100")
      }
    >
      {children}
    </button>
  );
}

function fmt(v) {
  if (!v) return "-";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}
