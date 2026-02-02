"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import AdminUsersPanel from "../../components/AdminUsersPanel";
import AuditLogsPanel from "../../components/AuditLogsPanel";
import CashReportsPanel from "../../components/CashReportsPanel";
import CustomersPanel from "../../components/CustomersPanel";
import ReportsPanel from "../../components/ReportsPanel";
import RoleBar from "../../components/RoleBar";
import { apiFetch } from "../../lib/api";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

/**
 * Admin = Manager capabilities + system oversight
 * - Sales view (and later: cancel/override if you want)
 * - Inventory view
 * - Payments view + summary (if enabled)
 * - Credits open (optional)
 * - Audit logs (optional)
 * - Cash reports (summary/sessions/ledger/refunds)
 * - Users list (visibility now; CRUD can be added later)
 * - ReportsPanel (legacy client-side computed)
 */
const ENDPOINTS = {
  // Core
  SALES_LIST: "/sales",
  PRODUCTS_LIST: "/products",
  INVENTORY_LIST: "/inventory",

  // Payments (works only if you enabled payments.read.routes.js)
  PAYMENTS_LIST: "/payments",
  PAYMENTS_SUMMARY: "/payments/summary",

  // Optional
  CREDITS_OPEN: "/credits/open",

  // Users
  USERS_LIST: "/users",
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

function isToday(dateStr) {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  } catch {
    return false;
  }
}

function buildEvidenceUrl({
  entity,
  entityId,
  from,
  to,
  action,
  userId,
  q,
  limit,
}) {
  const params = new URLSearchParams();
  if (entity) params.set("entity", entity);
  if (entityId) params.set("entityId", entityId);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (action) params.set("action", action);
  if (userId) params.set("userId", userId);
  if (q) params.set("q", q);
  if (limit) params.set("limit", String(limit));
  return `/evidence?${params.toString()}`;
}

export default function AdminPage() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [msg, setMsg] = useState("");

  const [tab, setTab] = useState("dashboard");
  // dashboard | cash | sales | inventory | payments | credits | customers | audit | evidence | users | reports

  // ---------------- EVIDENCE FORM (ADMIN ONLY) ----------------
  const [evEntity, setEvEntity] = useState("sale"); // default to most common
  const [evEntityId, setEvEntityId] = useState("");
  const [evFrom, setEvFrom] = useState("");
  const [evTo, setEvTo] = useState("");
  const [evAction, setEvAction] = useState("");
  const [evUserId, setEvUserId] = useState("");
  const [evQ, setEvQ] = useState("");
  const [evLimit, setEvLimit] = useState(200);

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

        if (user.role !== "admin") {
          const map = {
            owner: "/owner",
            manager: "/manager",
            store_keeper: "/store-keeper",
            cashier: "/cashier",
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

  const isAuthorized = !!me && me.role === "admin";
  const locationId = me?.locationId;

  // ---------------- SALES ----------------
  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesQ, setSalesQ] = useState("");

  const loadSales = useCallback(async () => {
    setSalesLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.SALES_LIST, { method: "GET" });
      const list = data?.sales ?? data?.items ?? data?.rows ?? [];
      setSales(Array.isArray(list) ? list : []);
    } catch (e) {
      setSales([]);
      setMsg(e?.data?.error || e?.message || "Failed to load sales");
    } finally {
      setSalesLoading(false);
    }
  }, []);

  const salesSorted = useMemo(
    () =>
      (Array.isArray(sales) ? sales : [])
        .slice()
        .sort((a, b) => Number(b.id || 0) - Number(a.id || 0)),
    [sales],
  );

  const filteredSales = useMemo(() => {
    const qq = String(salesQ || "")
      .trim()
      .toLowerCase();
    if (!qq) return salesSorted;
    return salesSorted.filter((s) => {
      const id = String(s.id ?? "");
      const status = String(s.status ?? "").toLowerCase();
      const name = String(s.customerName ?? "").toLowerCase();
      const phone = String(s.customerPhone ?? "").toLowerCase();
      const total = String(s.totalAmount ?? s.total ?? "");
      return (
        id.includes(qq) ||
        status.includes(qq) ||
        name.includes(qq) ||
        phone.includes(qq) ||
        total.includes(qq)
      );
    });
  }, [salesSorted, salesQ]);

  // Dashboard KPIs from sales
  const salesToday = useMemo(
    () =>
      (Array.isArray(sales) ? sales : []).filter((s) => isToday(s.createdAt)),
    [sales],
  );
  const salesTodayTotal = useMemo(
    () =>
      salesToday.reduce(
        (sum, s) => sum + Number(s.totalAmount ?? s.total ?? 0),
        0,
      ),
    [salesToday],
  );
  const awaitingPayment = useMemo(
    () =>
      (Array.isArray(sales) ? sales : []).filter(
        (s) => String(s.status) === "AWAITING_PAYMENT_RECORD",
      ),
    [sales],
  );
  const refundedCount = useMemo(
    () =>
      (Array.isArray(sales) ? sales : []).filter(
        (s) => String(s.status) === "REFUNDED",
      ).length,
    [sales],
  );

  // ---------------- INVENTORY + PRODUCTS ----------------
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [invLoading, setInvLoading] = useState(false);
  const [prodLoading, setProdLoading] = useState(false);
  const [invQ, setInvQ] = useState("");

  const loadInventory = useCallback(async () => {
    setInvLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.INVENTORY_LIST, { method: "GET" });
      const list = data?.inventory ?? data?.items ?? data?.rows ?? [];
      setInventory(Array.isArray(list) ? list : []);
    } catch (e) {
      setInventory([]);
      setMsg(e?.data?.error || e?.message || "Failed to load inventory");
    } finally {
      setInvLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setProdLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.PRODUCTS_LIST, { method: "GET" });
      const list = data?.products ?? data?.items ?? data?.rows ?? [];
      setProducts(Array.isArray(list) ? list : []);
    } catch (e) {
      setProducts([]);
      setMsg(e?.data?.error || e?.message || "Failed to load products");
    } finally {
      setProdLoading(false);
    }
  }, []);

  const filteredInventory = useMemo(() => {
    const qq = String(invQ || "")
      .trim()
      .toLowerCase();
    const list = Array.isArray(inventory) ? inventory : [];
    if (!qq) return list;

    return list.filter((p) => {
      const name = String(p?.name || p?.productName || "").toLowerCase();
      const sku = String(p?.sku || "").toLowerCase();
      return name.includes(qq) || sku.includes(qq);
    });
  }, [inventory, invQ]);

  function priceFor(invRow) {
    const pid = invRow?.productId ?? invRow?.id;
    const sku = invRow?.sku;
    const prod =
      products.find((x) => String(x.id) === String(pid)) ||
      (sku ? products.find((x) => String(x.sku) === String(sku)) : null);

    const price = prod?.sellingPrice ?? prod?.price ?? prod?.unitPrice ?? null;
    return price == null ? "-" : money(price);
  }

  // ---------------- PAYMENTS (optional) ----------------
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsSummary, setPaymentsSummary] = useState(null);
  const [paySummaryLoading, setPaySummaryLoading] = useState(false);

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.PAYMENTS_LIST, { method: "GET" });
      const list = data?.payments ?? data?.items ?? data?.rows ?? [];
      setPayments(Array.isArray(list) ? list : []);
    } catch (e) {
      setPayments([]);
      const text = e?.data?.error || e?.message || "";
      if (String(text).toLowerCase().includes("not found")) return;
      setMsg(e?.data?.error || e?.message || "Failed to load payments");
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  const loadPaymentsSummary = useCallback(async () => {
    setPaySummaryLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.PAYMENTS_SUMMARY, {
        method: "GET",
      });
      setPaymentsSummary(data?.summary || null);
    } catch (e) {
      setPaymentsSummary(null);
      const text = e?.data?.error || e?.message || "";
      if (String(text).toLowerCase().includes("not found")) return;
      setMsg(e?.data?.error || e?.message || "Failed to load payments summary");
    } finally {
      setPaySummaryLoading(false);
    }
  }, []);

  const paidToday = useMemo(() => {
    const list = Array.isArray(payments) ? payments : [];
    return list.filter((p) => isToday(p.createdAt || p.created_at));
  }, [payments]);

  const paidTodayTotal = useMemo(
    () => paidToday.reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [paidToday],
  );

  // ---------------- CREDITS (optional) ----------------
  const [openCredits, setOpenCredits] = useState([]);
  const [creditsLoading, setCreditsLoading] = useState(false);

  const loadCreditsOpen = useCallback(async () => {
    setCreditsLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.CREDITS_OPEN, { method: "GET" });
      const list =
        data?.credits ?? data?.openCredits ?? data?.items ?? data?.rows ?? [];
      setOpenCredits(Array.isArray(list) ? list : []);
    } catch {
      setOpenCredits([]);
    } finally {
      setCreditsLoading(false);
    }
  }, []);

  // ---------------- Load per tab ----------------
  useEffect(() => {
    if (!isAuthorized) return;

    const run = async () => {
      if (tab === "dashboard") {
        await Promise.all([
          loadSales(),
          loadInventory(),
          loadProducts(),
          loadPaymentsSummary(),
          loadPayments(),
        ]);
        return;
      }

      if (tab === "sales") {
        await loadSales();
        return;
      }

      if (tab === "inventory") {
        await Promise.all([loadInventory(), loadProducts()]);
        return;
      }

      if (tab === "payments") {
        await Promise.all([loadPaymentsSummary(), loadPayments()]);
        return;
      }

      if (tab === "credits") {
        await loadCreditsOpen();
        return;
      }

      // audit handled by <AuditLogsPanel />
      // evidence handled by router push to /evidence
      // users handled by <AdminUsersPanel />
    };

    run();
  }, [
    isAuthorized,
    tab,
    loadSales,
    loadInventory,
    loadProducts,
    loadPaymentsSummary,
    loadPayments,
    loadCreditsOpen,
  ]);

  if (!isAuthorized)
    return <div className="p-6 text-sm text-gray-600">Redirecting...</div>;

  return (
    <div>
      <RoleBar
        title="Admin"
        subtitle={`User: ${me.email} • Location: ${locationId}`}
      />

      <div className="max-w-6xl mx-auto p-6">
        {/* Global message */}
        {msg ? (
          <div className="mb-4 text-sm">
            {msg.startsWith("✅") ? (
              <div className="p-3 rounded-lg bg-green-50 text-green-800">
                {msg}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-red-50 text-red-700">{msg}</div>
            )}
          </div>
        ) : null}

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap text-sm items-center">
          <Tab active={tab === "dashboard"} onClick={() => setTab("dashboard")}>
            Dashboard
          </Tab>
          <Tab active={tab === "cash"} onClick={() => setTab("cash")}>
            Cash Reports
          </Tab>
          <Tab active={tab === "sales"} onClick={() => setTab("sales")}>
            Sales
          </Tab>
          <Tab active={tab === "inventory"} onClick={() => setTab("inventory")}>
            Inventory
          </Tab>
          <Tab active={tab === "payments"} onClick={() => setTab("payments")}>
            Payments
          </Tab>
          <Tab active={tab === "credits"} onClick={() => setTab("credits")}>
            Credits
          </Tab>
          <Tab active={tab === "customers"} onClick={() => setTab("customers")}>
            Customers
          </Tab>
          <Tab active={tab === "audit"} onClick={() => setTab("audit")}>
            Audit
          </Tab>

          {/* ✅ NEW: Evidence tab */}
          <Tab active={tab === "evidence"} onClick={() => setTab("evidence")}>
            Evidence
          </Tab>

          <Tab active={tab === "users"} onClick={() => setTab("users")}>
            Users
          </Tab>
          <Tab active={tab === "reports"} onClick={() => setTab("reports")}>
            Reports
          </Tab>

          <button
            onClick={() => {
              setMsg("");
              if (tab === "dashboard") {
                Promise.all([
                  loadSales(),
                  loadInventory(),
                  loadProducts(),
                  loadPaymentsSummary(),
                  loadPayments(),
                ]);
              } else if (tab === "sales") loadSales();
              else if (tab === "inventory")
                Promise.all([loadInventory(), loadProducts()]);
              else if (tab === "payments")
                Promise.all([loadPaymentsSummary(), loadPayments()]);
              else if (tab === "credits") loadCreditsOpen();
              // audit/evidence/users/reports have their own actions
            }}
            className="ml-auto px-4 py-2 rounded-lg bg-black text-white"
          >
            Refresh
          </button>
        </div>

        {/* DASHBOARD */}
        {tab === "dashboard" ? (
          <div className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card
                label="Sales today"
                value={salesLoading ? "…" : String(salesToday.length)}
                sub={`Total: ${money(salesTodayTotal)}`}
              />
              <Card
                label="Awaiting payment"
                value={salesLoading ? "…" : String(awaitingPayment.length)}
                sub="Cashier must record payment"
              />
              <Card
                label="Refunded (all time)"
                value={salesLoading ? "…" : String(refundedCount)}
                sub="Sales with status REFUNDED"
              />
              <Card
                label="Paid today (payments)"
                value={paymentsLoading ? "…" : String(paidToday.length)}
                sub={`Total: ${money(paidTodayTotal)}`}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card
                label="Payments today (summary)"
                value={
                  paySummaryLoading
                    ? "…"
                    : String(paymentsSummary?.today?.count ?? "-")
                }
                sub={`Total: ${money(paymentsSummary?.today?.total ?? 0)}`}
              />
              <Card
                label="Payments all time (summary)"
                value={
                  paySummaryLoading
                    ? "…"
                    : String(paymentsSummary?.allTime?.count ?? "-")
                }
                sub={`Total: ${money(paymentsSummary?.allTime?.total ?? 0)}`}
              />
              <Card
                label="Inventory lines"
                value={
                  invLoading
                    ? "…"
                    : String((Array.isArray(inventory) ? inventory : []).length)
                }
                sub="Current location snapshot"
              />
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="p-4 border-b">
                  <div className="font-semibold">Latest sales (10)</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Quick oversight
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
                          <th className="text-left p-3">Status</th>
                          <th className="text-right p-3">Total</th>
                          <th className="text-left p-3">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesSorted.slice(0, 10).map((s) => (
                          <tr key={s.id} className="border-t">
                            <td className="p-3 font-medium">{s.id}</td>
                            <td className="p-3">{s.status ?? "-"}</td>
                            <td className="p-3 text-right">
                              {money(s.totalAmount ?? s.total ?? 0)}
                            </td>
                            <td className="p-3">{safeDate(s.createdAt)}</td>
                          </tr>
                        ))}
                        {salesSorted.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="p-4 text-sm text-gray-600"
                            >
                              No sales yet.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="p-4 border-b">
                  <div className="font-semibold">Inventory snapshot (10)</div>
                  <div className="text-xs text-gray-500 mt-1">View only</div>
                </div>

                {invLoading || prodLoading ? (
                  <div className="p-4 text-sm text-gray-600">Loading...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="text-left p-3">SKU</th>
                          <th className="text-left p-3">Name</th>
                          <th className="text-right p-3">Qty</th>
                          <th className="text-right p-3">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Array.isArray(inventory) ? inventory : [])
                          .slice(0, 10)
                          .map((p, idx) => (
                            <tr
                              key={p.id || `${p.productId}-${idx}`}
                              className="border-t"
                            >
                              <td className="p-3">{p.sku || "-"}</td>
                              <td className="p-3">
                                {p.productName || p.name || "-"}
                              </td>
                              <td className="p-3 text-right">
                                {p.qtyOnHand ?? p.qty ?? p.quantity ?? 0}
                              </td>
                              <td className="p-3 text-right">{priceFor(p)}</td>
                            </tr>
                          ))}
                        {(Array.isArray(inventory) ? inventory : []).length ===
                        0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="p-4 text-sm text-gray-600"
                            >
                              No inventory rows.
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
        ) : null}

        {/* CASH */}
        {tab === "cash" ? (
          <div className="mt-6">
            <CashReportsPanel title="Admin Cash Oversight" />
            <div className="mt-3 text-xs text-gray-500">
              Admin uses this to detect anomalies: missing sessions, unusual
              refunds, ledger movement.
            </div>
          </div>
        ) : null}

        {/* SALES */}
        {tab === "sales" ? (
          <div className="mt-6 bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b">
              <div className="font-semibold">Sales (Admin view)</div>
              <div className="text-xs text-gray-500 mt-1">
                Read-only for now in frontend-staff.
              </div>
            </div>

            <div className="p-3 border-b">
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Search by id / status / customer / phone / total"
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
                      <th className="text-left p-3">Status</th>
                      <th className="text-right p-3">Total</th>
                      <th className="text-left p-3">Customer</th>
                      <th className="text-left p-3">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((s) => (
                      <tr key={s.id} className="border-t">
                        <td className="p-3 font-medium">{s.id}</td>
                        <td className="p-3">{s.status ?? "-"}</td>
                        <td className="p-3 text-right">
                          {money(s.totalAmount ?? s.total ?? 0)}
                        </td>
                        <td className="p-3">
                          {(s.customerName || "").trim() ? s.customerName : "-"}
                          <div className="text-xs text-gray-500">
                            {s.customerPhone || ""}
                          </div>
                        </td>
                        <td className="p-3">{safeDate(s.createdAt)}</td>
                      </tr>
                    ))}
                    {filteredSales.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-sm text-gray-600">
                          No sales found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {/* INVENTORY */}
        {tab === "inventory" ? (
          <div className="mt-6 bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b">
              <div className="font-semibold">Inventory (Admin view)</div>
              <div className="text-xs text-gray-500 mt-1">
                GET /inventory + price from GET /products
              </div>
            </div>

            <div className="p-3 border-b">
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Search by name or SKU"
                value={invQ}
                onChange={(e) => setInvQ(e.target.value)}
              />
            </div>

            {invLoading || prodLoading ? (
              <div className="p-4 text-sm text-gray-600">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left p-3">Product ID</th>
                      <th className="text-left p-3">Name</th>
                      <th className="text-left p-3">SKU</th>
                      <th className="text-right p-3">On hand</th>
                      <th className="text-right p-3">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((p, idx) => {
                      const pid = p.productId ?? p.id ?? "-";
                      return (
                        <tr key={p.id || `${pid}-${idx}`} className="border-t">
                          <td className="p-3 font-medium">{pid}</td>
                          <td className="p-3">
                            {p.productName || p.name || "-"}
                          </td>
                          <td className="p-3 text-gray-600">{p.sku || "-"}</td>
                          <td className="p-3 text-right">
                            {p.qtyOnHand ?? p.qty ?? p.quantity ?? 0}
                          </td>
                          <td className="p-3 text-right">{priceFor(p)}</td>
                        </tr>
                      );
                    })}
                    {filteredInventory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-sm text-gray-600">
                          No inventory rows.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {/* PAYMENTS */}
        {tab === "payments" ? (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="font-semibold">Payments summary</div>
              <div className="text-xs text-gray-500 mt-1">Read-only.</div>

              {paySummaryLoading ? (
                <div className="mt-3 text-sm text-gray-600">Loading...</div>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-3">
                  <Card
                    label="Today"
                    value={`${paymentsSummary?.today?.count ?? 0} payment(s)`}
                    sub={`Total: ${money(paymentsSummary?.today?.total ?? 0)}`}
                  />
                  <Card
                    label="All time"
                    value={`${paymentsSummary?.allTime?.count ?? 0} payment(s)`}
                    sub={`Total: ${money(paymentsSummary?.allTime?.total ?? 0)}`}
                  />
                </div>
              )}

              <div className="mt-4 text-xs text-gray-500">
                If this is empty, ensure backend has{" "}
                <b>payments.read.routes.js</b> registered.
              </div>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b">
                <div className="font-semibold">Payments list</div>
                <div className="text-xs text-gray-500 mt-1">
                  GET /payments (optional route)
                </div>
              </div>

              {paymentsLoading ? (
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
                      {(Array.isArray(payments) ? payments : [])
                        .slice(0, 200)
                        .map((p) => (
                          <tr key={p.id} className="border-t">
                            <td className="p-3 font-medium">{p.id}</td>
                            <td className="p-3">
                              {p.saleId ?? p.sale_id ?? "-"}
                            </td>
                            <td className="p-3 text-right">
                              {money(p.amount)}
                            </td>
                            <td className="p-3">{p.method ?? "-"}</td>
                            <td className="p-3">
                              {safeDate(p.createdAt || p.created_at)}
                            </td>
                          </tr>
                        ))}
                      {(Array.isArray(payments) ? payments : []).length ===
                      0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-sm text-gray-600">
                            No payments (or GET /payments not enabled).
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* CREDITS */}
        {tab === "credits" ? (
          <div className="mt-6 bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">Open credits</div>
                <div className="text-xs text-gray-500 mt-1">
                  Will be empty until you start credit flow.
                </div>
              </div>
              <button
                onClick={loadCreditsOpen}
                className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
              >
                {creditsLoading ? "Loading..." : "Reload"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left p-3">ID</th>
                    <th className="text-left p-3">Sale</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-right p-3">Amount</th>
                    <th className="text-left p-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(openCredits) ? openCredits : []).map(
                    (c, idx) => (
                      <tr key={c.id || idx} className="border-t">
                        <td className="p-3 font-medium">{c.id ?? "-"}</td>
                        <td className="p-3">{c.saleId ?? "-"}</td>
                        <td className="p-3">{c.status ?? c.state ?? "-"}</td>
                        <td className="p-3 text-right">
                          {money(c.amount ?? c.totalAmount ?? 0)}
                        </td>
                        <td className="p-3">{safeDate(c.createdAt)}</td>
                      </tr>
                    ),
                  )}
                  {(Array.isArray(openCredits) ? openCredits : []).length ===
                  0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-sm text-gray-600">
                        No open credits.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* CUSTOMERS */}
        {tab === "customers" ? (
          <div className="mt-6">
            <CustomersPanel title="Customers (Admin)" />
          </div>
        ) : null}

        {/* AUDIT */}
        {tab === "audit" ? (
          <div className="mt-6">
            <AuditLogsPanel />
          </div>
        ) : null}

        {/* ✅ NEW: EVIDENCE TAB */}
        {tab === "evidence" ? (
          <div className="mt-6 bg-white rounded-xl shadow p-4 space-y-3">
            <div>
              <div className="font-semibold">Evidence (investigation)</div>
              <div className="text-sm text-gray-600 mt-1">
                Use this to open an audit trail for one record
                (sale/payment/credit/refund). This is read-only and is meant for
                disputes & fraud checks.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Entity</div>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={evEntity}
                  onChange={(e) => setEvEntity(e.target.value)}
                >
                  <option value="sale">sale</option>
                  <option value="payment">payment</option>
                  <option value="credit">credit</option>
                  <option value="refund">refund</option>
                  <option value="cash_session">cash_session</option>
                  <option value="expense">expense</option>
                  <option value="deposit">deposit</option>
                  <option value="user">user</option>
                  <option value="inventory">inventory</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <div className="text-xs text-gray-500 mb-1">
                  Entity ID (required)
                </div>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Paste the record ID here"
                  value={evEntityId}
                  onChange={(e) => setEvEntityId(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">
                  From (optional)
                </div>
                <input
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={evFrom}
                  onChange={(e) => setEvFrom(e.target.value)}
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">To (optional)</div>
                <input
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={evTo}
                  onChange={(e) => setEvTo(e.target.value)}
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">
                  Action (optional)
                </div>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. SALE_CREATE"
                  value={evAction}
                  onChange={(e) => setEvAction(e.target.value)}
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">
                  User ID (optional)
                </div>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Who acted"
                  value={evUserId}
                  onChange={(e) => setEvUserId(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <div className="text-xs text-gray-500 mb-1">
                  Search (optional)
                </div>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Free text search"
                  value={evQ}
                  onChange={(e) => setEvQ(e.target.value)}
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Limit</div>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={String(evLimit)}
                  onChange={(e) => setEvLimit(Number(e.target.value || 200))}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                className="px-4 py-2 rounded-lg bg-black text-white"
                onClick={() => {
                  const id = String(evEntityId || "").trim();
                  if (!id) {
                    setMsg("Entity ID is required to open evidence.");
                    return;
                  }
                  const url = buildEvidenceUrl({
                    entity: evEntity,
                    entityId: id,
                    from: evFrom,
                    to: evTo,
                    action: evAction,
                    userId: evUserId,
                    q: evQ,
                    limit: evLimit,
                  });
                  router.push(url);
                }}
              >
                Open evidence →
              </button>

              <button
                className="px-4 py-2 rounded-lg border hover:bg-gray-50"
                onClick={() => {
                  setEvEntity("sale");
                  setEvEntityId("");
                  setEvFrom("");
                  setEvTo("");
                  setEvAction("");
                  setEvUserId("");
                  setEvQ("");
                  setEvLimit(200);
                  setMsg("");
                }}
              >
                Clear
              </button>

              <div className="text-xs text-gray-500">
                Opens a read-only investigation page backed by <b>GET /audit</b>
                .
              </div>
            </div>
          </div>
        ) : null}

        {/* USERS */}
        {tab === "users" ? <AdminUsersPanel /> : null}

        {/* REPORTS */}
        {tab === "reports" ? (
          <div className="mt-6">
            <div className="text-sm text-gray-600">
              Reports below are computed from live data (sales, inventory,
              requests).
            </div>
            <ReportsPanel />
          </div>
        ) : null}
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
