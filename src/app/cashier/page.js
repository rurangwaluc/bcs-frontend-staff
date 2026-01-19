"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import RoleBar from "../../components/RoleBar";
import { apiFetch } from "../../lib/api";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

const ENDPOINTS = {
  SALES_LIST: "/sales",
  RECORD_PAYMENT: "/payments",
  CASH_TODAY: "/cash/today",
};

function money(n) {
  const x = Number(n || 0);
  return x.toLocaleString();
}

function fmt(v) {
  if (!v) return "-";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

export default function CashierPage() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [msg, setMsg] = useState("");

  const [tab, setTab] = useState("awaiting"); // awaiting | today

  const [sales, setSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);

  const [cashToday, setCashToday] = useState(null);
  const [loadingCash, setLoadingCash] = useState(false);

  // record payment form
  const [saleId, setSaleId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ---------------- ROLE GUARD ----------------
  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        const data = await getMe();
        if (!alive) return;

        const user = data?.user || null;
        setMe(user);

        if (!user?.role) return router.replace("/login");

        if (user.role !== "cashier") {
          const map = {
            owner: "/owner",
            admin: "/admin",
            manager: "/manager",
            store_keeper: "/store-keeper",
            seller: "/seller",
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

  const isAuthorized = !!me && me.role === "cashier";

  // ---------------- LOADERS ----------------
  const loadSales = useCallback(async () => {
    setLoadingSales(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.SALES_LIST, { method: "GET" });
      const items = data?.sales ?? data?.items ?? data?.rows ?? [];
      setSales(Array.isArray(items) ? items : []);
    } catch (e) {
      setMsg(e?.data?.error || e.message || "Failed to load sales");
    } finally {
      setLoadingSales(false);
    }
  }, []);

  const loadCashToday = useCallback(async () => {
    setLoadingCash(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.CASH_TODAY, { method: "GET" });
      setCashToday(data?.summary ?? data ?? null);
    } catch (e) {
      // Not fatal if you haven’t implemented it fully
      setCashToday(null);
    } finally {
      setLoadingCash(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    loadSales();
    loadCashToday();
  }, [isAuthorized, loadSales, loadCashToday]);

  // ---------------- FILTERS ----------------
  const awaiting = useMemo(() => {
    return (sales || []).filter((s) => String(s.status) === "AWAITING_PAYMENT_RECORD");
  }, [sales]);

  const paidToday = useMemo(() => {
    // Phase 1 logic: show completed sales created today OR recently completed.
    // If backend has payment timestamps, we can improve later.
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = now.getMonth();
    const dd = now.getDate();

    return (sales || []).filter((s) => {
      if (String(s.status) !== "COMPLETED") return false;
      if (!s.createdAt) return true;

      try {
        const d = new Date(s.createdAt);
        return d.getFullYear() === yyyy && d.getMonth() === mm && d.getDate() === dd;
      } catch {
        return true;
      }
    });
  }, [sales]);

  // ---------------- ACTION ----------------
  async function recordPayment(e) {
    e.preventDefault();
    setMsg("");
    setSubmitting(true);

    const sid = Number(saleId);
    const amt = Number(amount);

    if (!sid) {
      setSubmitting(false);
      return setMsg("Pick a sale first.");
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setSubmitting(false);
      return setMsg("Amount must be a positive number.");
    }

    try {
      await apiFetch(ENDPOINTS.RECORD_PAYMENT, {
        method: "POST",
        body: {
          saleId: sid,
          amount: amt,
          method: String(method || "CASH"),
          note: note ? String(note) : "",
        },
      });

      setMsg("✅ Payment recorded");
      setSaleId("");
      setAmount("");
      setMethod("CASH");
      setNote("");

      // reload lists so the sale moves to "Paid Today"
      await loadSales();
      await loadCashToday();
      setTab("today");
    } catch (e2) {
      setMsg(e2?.data?.error || e2.message || "Payment failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAuthorized) {
    return <div className="p-6 text-sm text-gray-600">Redirecting...</div>;
  }

  const list = tab === "awaiting" ? awaiting : paidToday;

  return (
    <div>
      <RoleBar title="Cashier" subtitle={`User: ${me.email} • Location: ${me.locationId}`} />

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

        {/* Summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card label="Awaiting payment" value={awaiting.length} />
          <Card label="Completed (today view)" value={paidToday.length} />
          <Card
            label="Cash today"
            value={loadingCash ? "..." : money(cashToday?.total ?? cashToday?.totalAmount ?? 0)}
            sub={loadingCash ? "" : `${cashToday?.count ?? cashToday?.paymentsCount ?? 0} payment(s)`}
          />
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-2 flex-wrap text-sm">
          <Tab active={tab === "awaiting"} onClick={() => setTab("awaiting")}>
            Awaiting Payment
          </Tab>
          <Tab active={tab === "today"} onClick={() => setTab("today")}>
            Paid Today
          </Tab>

          <button
            onClick={() => {
              loadSales();
              loadCashToday();
            }}
            className="ml-auto px-4 py-2 rounded-lg bg-black text-white"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: list */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b">
              <div className="font-semibold">
                {tab === "awaiting" ? "Sales awaiting payment" : "Completed sales (today view)"}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                After payment, the sale moves from “Awaiting Payment” to “Paid Today”.
              </div>
            </div>

            {loadingSales ? (
              <div className="p-4 text-sm text-gray-600">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left p-3">ID</th>
                      <th className="text-left p-3">Customer</th>
                      <th className="text-right p-3">Total</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Time</th>
                      <th className="text-right p-3">Select</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((s) => (
                      <tr key={s.id} className="border-t">
                        <td className="p-3 font-medium">{s.id}</td>
                        <td className="p-3">
                          {(s.customerName || "").trim() ? s.customerName : "-"}
                          <div className="text-xs text-gray-500">{s.customerPhone || ""}</div>
                        </td>
                        <td className="p-3 text-right">{money(s.totalAmount)}</td>
                        <td className="p-3">{s.status}</td>
                        <td className="p-3">{fmt(s.createdAt)}</td>
                        <td className="p-3 text-right">
                          <button
                            disabled={tab !== "awaiting"}
                            onClick={() => {
                              setSaleId(String(s.id));
                              setAmount(String(s.totalAmount || ""));
                            }}
                            className={
                              "px-3 py-1.5 rounded-lg text-xs border " +
                              (tab === "awaiting" ? "hover:bg-gray-50" : "bg-gray-100 text-gray-400 cursor-not-allowed")
                            }
                          >
                            Use
                          </button>
                        </td>
                      </tr>
                    ))}
                    {list.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-sm text-gray-600">
                          No items here.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right: record payment */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="font-semibold">Record payment</div>
            <div className="text-xs text-gray-500 mt-1">
              Only for sales in status <b>AWAITING_PAYMENT_RECORD</b>.
            </div>

            <form onSubmit={recordPayment} className="mt-4 grid gap-3">
              <input
                className="border rounded-lg px-3 py-2"
                placeholder="Sale ID (pick from left list)"
                value={saleId}
                onChange={(e) => setSaleId(e.target.value)}
              />
              <input
                className="border rounded-lg px-3 py-2"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />

              <select
                className="border rounded-lg px-3 py-2"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="CASH">CASH</option>
                <option value="MOMO">MOMO</option>
                <option value="CARD">CARD</option>
                <option value="BANK">BANK</option>
              </select>

              <input
                className="border rounded-lg px-3 py-2"
                placeholder="Note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />

              <button
                disabled={submitting}
                className={
                  "w-fit px-4 py-2 rounded-lg text-white " +
                  (submitting ? "bg-gray-400 cursor-not-allowed" : "bg-black")
                }
              >
                {submitting ? "Saving..." : "Record payment"}
              </button>
            </form>

            <div className="mt-4 text-xs text-gray-500">
              If you want a “refund” feature, we add that in Phase 2 (manager-only).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tab({ active, onClick, children }) {
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

function Card({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub ? <div className="text-sm text-gray-600 mt-1">{sub}</div> : null}
    </div>
  );
}
