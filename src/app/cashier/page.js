"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import RoleBar from "../../components/RoleBar";
import { apiFetch } from "../../lib/api";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

/**
 * Backend-aligned endpoints (change ONLY here if needed)
 */
const ENDPOINTS = {
  SALES_LIST: "/sales",
  PAYMENT_RECORD: "/payments", // POST
  PAYMENTS_LIST: "/payments", // GET (should be PAYMENT_VIEW)
  PAYMENTS_SUMMARY: "/payments/summary", // GET (should be PAYMENT_VIEW)
};

const METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "MOMO", label: "Mobile Money" },
  { value: "CARD", label: "Card" },
  { value: "BANK", label: "Bank" },
];

export default function CashierPage() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [msg, setMsg] = useState("");

  const [tab, setTab] = useState("record"); // record | payments

  // Sales awaiting payment record
  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesQ, setSalesQ] = useState("");
  const [selectedSale, setSelectedSale] = useState(null);

  // Payment form
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");

  // Payments list + summary (read-only)
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [payQ, setPayQ] = useState("");

  const [summary, setSummary] = useState({
    today: { count: 0, total: 0 },
    allTime: { count: 0, total: 0 },
  });
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Permission / availability flags
  const [canReadPayments, setCanReadPayments] = useState(true); // if forbidden, flip false

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
            seller: "/seller",
            store_keeper: "/store-keeper",
            manager: "/manager",
            admin: "/admin",
            owner: "/owner",
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
    setSalesLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.SALES_LIST, { method: "GET" });
      const list = Array.isArray(data?.sales)
        ? data.sales
        : data?.items || data?.rows || [];
      setSales(Array.isArray(list) ? list : []);
    } catch (e) {
      setMsg(e?.data?.error || e.message || "Failed to load sales");
      setSales([]);
    } finally {
      setSalesLoading(false);
    }
  }, []);

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.PAYMENTS_LIST, { method: "GET" });
      const list = Array.isArray(data?.payments)
        ? data.payments
        : data?.items || data?.rows || [];
      setPayments(Array.isArray(list) ? list : []);
      setCanReadPayments(true);
    } catch (e) {
      const errText = e?.data?.error || e?.message || "Failed to load payments";

      // If forbidden => cashier lacks PAYMENT_VIEW; do NOT spam red errors
      if (String(errText).toLowerCase().includes("forbidden")) {
        setCanReadPayments(false);
        setPayments([]);
        return;
      }

      setMsg(errText);
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.PAYMENTS_SUMMARY, {
        method: "GET",
      });
      const s = data?.summary || {};
      setSummary({
        today: {
          count: Number(s?.today?.count || 0),
          total: Number(s?.today?.total || 0),
        },
        allTime: {
          count: Number(s?.allTime?.count || 0),
          total: Number(s?.allTime?.total || 0),
        },
      });
      setCanReadPayments(true);
    } catch (e) {
      const errText =
        e?.data?.error || e?.message || "Failed to load payments summary";

      if (String(errText).toLowerCase().includes("forbidden")) {
        setCanReadPayments(false);
        // keep summary as zeros but don’t scream
        return;
      }

      setMsg(errText);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // Load initial data after login + on tab switch
  useEffect(() => {
    if (!isAuthorized) return;

    // Always refresh awaiting sales count + summary
    loadSales();
    loadSummary();

    if (tab === "payments") {
      loadPayments();
      loadSummary();
    }
  }, [isAuthorized, tab, loadSales, loadPayments, loadSummary]);

  // ---------------- FILTERS ----------------
  const awaitingSales = useMemo(() => {
    return (Array.isArray(sales) ? sales : []).filter(
      (s) =>
        String(s?.status || "").toUpperCase() === "AWAITING_PAYMENT_RECORD",
    );
  }, [sales]);

  const filteredAwaitingSales = useMemo(() => {
    const qq = String(salesQ || "")
      .trim()
      .toLowerCase();
    if (!qq) return awaitingSales;

    return awaitingSales.filter((s) => {
      const id = String(s.id || "");
      const name = String(s.customerName || "").toLowerCase();
      const phone = String(s.customerPhone || "").toLowerCase();
      const total = String(s.totalAmount ?? s.total ?? "");
      return (
        id.includes(qq) ||
        name.includes(qq) ||
        phone.includes(qq) ||
        total.includes(qq)
      );
    });
  }, [awaitingSales, salesQ]);

  const filteredPayments = useMemo(() => {
    const qq = String(payQ || "")
      .trim()
      .toLowerCase();
    const list = Array.isArray(payments) ? payments : [];
    if (!qq) return list;

    return list.filter((p) => {
      const id = String(p.id || "");
      const saleId = String(p.saleId || p.sale_id || "");
      const method = String(p.method || "").toLowerCase();
      const amount = String(p.amount ?? "");
      return (
        id.includes(qq) ||
        saleId.includes(qq) ||
        method.includes(qq) ||
        amount.includes(qq)
      );
    });
  }, [payments, payQ]);

  // ---------------- ACTION: RECORD PAYMENT ----------------
  async function recordPayment(e) {
    e.preventDefault();
    setMsg("");

    if (!selectedSale?.id) return setMsg("Select a sale first.");

    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return setMsg("Enter a valid amount.");

    const payload = {
      saleId: Number(selectedSale.id),
      amount: n,
      method,
      note: note ? String(note).slice(0, 200) : undefined,
    };

    try {
      await apiFetch(ENDPOINTS.PAYMENT_RECORD, {
        method: "POST",
        body: payload,
      });

      setMsg(`✅ Payment recorded for sale #${selectedSale.id}`);

      setSelectedSale(null);
      setAmount("");
      setMethod("CASH");
      setNote("");

      // refresh lists
      await loadSales();
      await loadSummary();

      // Only reload list if we can read it (or if policy fixed later, it will auto work)
      if (tab === "payments") await loadPayments();
    } catch (e2) {
      setMsg(e2?.data?.error || e2.message || "Record payment failed");
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
              <div className="p-3 rounded-lg bg-green-50 text-green-800">
                {msg}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-red-50 text-red-700">{msg}</div>
            )}
          </div>
        ) : null}

        {!canReadPayments ? (
          <div className="mt-4 text-sm p-3 rounded-lg bg-yellow-50 text-yellow-900">
            ⚠️ Payments read is disabled for cashier (Forbidden). Fix backend by
            adding a read permission like <b>PAYMENT_VIEW</b> for cashier and
            use it on GET /payments and GET /payments/summary.
          </div>
        ) : null}

        {/* KPI cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            label="Paid today"
            value={
              summaryLoading
                ? "…"
                : canReadPayments
                  ? String(summary.today.count)
                  : "—"
            }
            sub={`Total: ${money(canReadPayments ? summary.today.total : 0)}`}
          />
          <Card
            label="Payments (all time)"
            value={
              summaryLoading
                ? "…"
                : canReadPayments
                  ? String(summary.allTime.count)
                  : "—"
            }
            sub={`Total: ${money(canReadPayments ? summary.allTime.total : 0)}`}
          />
          <Card
            label="Awaiting payment record"
            value={salesLoading ? "…" : String(awaitingSales.length)}
            sub="Sales marked AWAITING_PAYMENT_RECORD"
          />
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-2 text-sm flex-wrap">
          <TabButton active={tab === "record"} onClick={() => setTab("record")}>
            Record payment
          </TabButton>
          <TabButton
            active={tab === "payments"}
            onClick={() => setTab("payments")}
          >
            Payments list
          </TabButton>
        </div>

        {/* Record tab */}
        {tab === "record" ? (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: awaiting list */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">Awaiting payment record</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Pick a sale then record the payment. After recording, it
                    disappears because status changes.
                  </div>
                </div>

                <button
                  onClick={loadSales}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm"
                >
                  Refresh
                </button>
              </div>

              <div className="p-3 border-b">
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Search by id/name/phone/total"
                  value={salesQ}
                  onChange={(e) => setSalesQ(e.target.value)}
                />
              </div>

              {salesLoading ? (
                <div className="p-4 text-sm text-gray-600">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left p-3">ID</th>
                        <th className="text-right p-3">Total</th>
                        <th className="text-left p-3">Customer</th>
                        <th className="text-right p-3">Open</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAwaitingSales.map((s) => (
                        <tr key={s.id} className="border-t">
                          <td className="p-3 font-medium">{s.id}</td>
                          <td className="p-3 text-right">
                            {money(s.totalAmount ?? s.total ?? 0)}
                          </td>
                          <td className="p-3">
                            <div className="font-medium">
                              {s.customerName || "-"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {s.customerPhone || ""}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              className="px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50"
                              onClick={() => {
                                setSelectedSale(s);
                                setAmount(
                                  String(s.totalAmount ?? s.total ?? ""),
                                );
                              }}
                            >
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredAwaitingSales.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-sm text-gray-600">
                            No sales awaiting payment record.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right: form */}
            <div className="bg-white rounded-xl shadow p-4">
              <div className="font-semibold">Record payment</div>
              <div className="text-xs text-gray-500 mt-1">
                Uses POST /payments (permission: PAYMENT_RECORD).
              </div>

              {!selectedSale ? (
                <div className="mt-4 text-sm text-gray-600">
                  Select a sale from the left.
                </div>
              ) : (
                <div className="mt-4">
                  <div className="text-sm">
                    <div>
                      <b>Sale:</b> #{selectedSale.id}
                    </div>
                    <div>
                      <b>Total:</b>{" "}
                      {money(
                        selectedSale.totalAmount ?? selectedSale.total ?? 0,
                      )}
                    </div>
                    <div>
                      <b>Customer:</b> {selectedSale.customerName || "-"}{" "}
                      {selectedSale.customerPhone
                        ? `(${selectedSale.customerPhone})`
                        : ""}
                    </div>
                  </div>

                  <form
                    onSubmit={recordPayment}
                    className="mt-4 grid grid-cols-1 gap-3"
                  >
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
                      {METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>

                    <input
                      className="border rounded-lg px-3 py-2"
                      placeholder="Note (optional)"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />

                    <div className="flex gap-2 flex-wrap">
                      <button className="px-4 py-2 rounded-lg bg-black text-white text-sm">
                        Record payment
                      </button>
                      <button
                        type="button"
                        className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
                        onClick={() => setSelectedSale(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Payments tab */}
        {tab === "payments" ? (
          <div className="mt-4 bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">Payments list (read-only)</div>
                <div className="text-xs text-gray-500 mt-1">
                  Uses GET /payments (should be permission: PAYMENT_VIEW).
                </div>
              </div>

              <div className="flex gap-2 items-center">
                <input
                  className="border rounded-lg px-3 py-2 text-sm"
                  placeholder="Search id/sale/method/amount"
                  value={payQ}
                  onChange={(e) => setPayQ(e.target.value)}
                />
                <button
                  onClick={() => {
                    loadSummary();
                    loadPayments();
                  }}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm"
                >
                  Refresh
                </button>
              </div>
            </div>

            {!canReadPayments ? (
              <div className="p-4 text-sm text-yellow-900 bg-yellow-50">
                Payments read is forbidden for cashier. Fix backend permission
                (PAYMENT_VIEW) as described above.
              </div>
            ) : paymentsLoading ? (
              <div className="p-4 text-sm text-gray-600">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left p-3">ID</th>
                      <th className="text-left p-3">Sale</th>
                      <th className="text-right p-3">Amount</th>
                      <th className="text-left p-3">Method</th>
                      <th className="text-left p-3">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((p, idx) => (
                      <tr key={p.id || idx} className="border-t">
                        <td className="p-3 font-medium">{p.id ?? "-"}</td>
                        <td className="p-3">#{p.saleId ?? p.sale_id ?? "-"}</td>
                        <td className="p-3 text-right">
                          {money(p.amount ?? 0)}
                        </td>
                        <td className="p-3">{p.method ?? "-"}</td>
                        <td className="p-3">
                          {safeDate(p.createdAt || p.created_at)}
                        </td>
                      </tr>
                    ))}
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-sm text-gray-600">
                          No payments found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
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
        (active
          ? "bg-black text-white border-black"
          : "bg-white text-gray-700 hover:bg-gray-100")
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
