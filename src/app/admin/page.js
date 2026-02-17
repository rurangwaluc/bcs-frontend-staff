"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import AdminUsersPanel from "../../components/AdminUsersPanel";
import AuditLogsPanel from "../../components/AuditLogsPanel";
import CashReportsPanel from "../../components/CashReportsPanel";
import CreditsPanel from "../../components/CreditsPanel";
import CustomersPanel from "../../components/CustomersPanel";
import Last10PaymentsWidget from "../../components/Last10PaymentsWidget";
import LowStockWidget from "../../components/LowStockWidget";
import ReportsPanel from "../../components/ReportsPanel";
import RoleBar from "../../components/RoleBar";
import StuckSalesWidget from "../../components/StuckSalesWidget";
import TodayMixWidget from "../../components/TodayMixWidget";
import { apiFetch } from "../../lib/api";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

/**
 * Admin = Manager capabilities + system oversight
 */
const ENDPOINTS = {
  ADMIN_DASH: "/admin/dashboard",

  // Core
  SALES_LIST: "/sales",
  INVENTORY_LIST: "/inventory",

  // ✅ In your backend you register productPricingRoutes, so the UI must not call "/products" unless you really have it.
  // If your real route differs, change this one string.
  PRODUCTS_LIST: "/products",

  // Payments (optional)
  PAYMENTS_LIST: "/payments",
  PAYMENTS_SUMMARY: "/payments/summary",

  // Optional
  CREDITS_OPEN: "/credits/open",

  // Users
  USERS_LIST: "/users",
};

function money(n) {
  const x = Number(n || 0);
  if (!Number.isFinite(x)) return "0";
  return x.toLocaleString();
}

function safeDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
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

  if (entity) params.set("entity", String(entity));
  if (entityId) params.set("entityId", String(entityId));

  // only set if valid-looking strings
  if (from) params.set("from", String(from));
  if (to) params.set("to", String(to));
  if (action) params.set("action", String(action));
  if (userId) params.set("userId", String(userId));
  if (q) params.set("q", String(q));

  const lim = Number(limit);
  if (Number.isFinite(lim) && lim > 0) params.set("limit", String(lim));

  return `/evidence?${params.toString()}`;
}

function normalizeList(data, keys = []) {
  for (const k of keys) {
    const v = data?.[k];
    if (Array.isArray(v)) return v;
  }
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
}

function sortByCreatedAtDesc(a, b) {
  const ta = new Date(a?.createdAt || a?.created_at || 0).getTime() || 0;
  const tb = new Date(b?.createdAt || b?.created_at || 0).getTime() || 0;
  if (tb !== ta) return tb - ta;
  // fallback: string compare ids (uuid-safe)
  const ia = String(a?.id ?? "");
  const ib = String(b?.id ?? "");
  return ib.localeCompare(ia);
}

export default function AdminPage() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [msg, setMsg] = useState("");

  const [tab, setTab] = useState("dashboard");

  const [dash, setDash] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);
  // dashboard | cash | sales | inventory | payments | credits | customers | audit | evidence | users | reports

  // ---------------- EVIDENCE FORM (ADMIN ONLY) ----------------
  const [evEntity, setEvEntity] = useState("sale");
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

  const loadAdminDash = useCallback(async () => {
    setDashLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.ADMIN_DASH, { method: "GET" });
      setDash(data?.dashboard || null);
    } catch (e) {
      setDash(null);
      setMsg(e?.data?.error || e?.message || "Failed to load admin dashboard");
    } finally {
      setDashLoading(false);
    }
  }, []);

  // ---------------- SALES ----------------
  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesQ, setSalesQ] = useState("");

  const loadSales = useCallback(async () => {
    setSalesLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.SALES_LIST, { method: "GET" });
      const list = normalizeList(data, ["sales"]);
      setSales(list);
    } catch (e) {
      setSales([]);
      setMsg(e?.data?.error || e?.message || "Failed to load sales");
    } finally {
      setSalesLoading(false);
    }
  }, []);

  const salesSorted = useMemo(() => {
    const list = Array.isArray(sales) ? sales : [];
    return list.slice().sort(sortByCreatedAtDesc);
  }, [sales]);

  const filteredSales = useMemo(() => {
    const qq = String(salesQ || "")
      .trim()
      .toLowerCase();
    if (!qq) return salesSorted;

    return salesSorted.filter((s) => {
      const id = String(s.id ?? "");
      const status = String(s.status ?? "").toLowerCase();
      const name = String(
        s.customerName ?? s.customer_name ?? "",
      ).toLowerCase();
      const phone = String(
        s.customerPhone ?? s.customer_phone ?? "",
      ).toLowerCase();
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

  const salesToday = useMemo(
    () =>
      (Array.isArray(sales) ? sales : []).filter((s) =>
        isToday(s.createdAt || s.created_at),
      ),
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
      const list = normalizeList(data, ["inventory"]);
      setInventory(list);
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

      // common shapes across implementations
      const list = normalizeList(data, [
        "products",
        "pricing",
        "items",
        "rows",
      ]);
      setProducts(list);
    } catch (e) {
      // If route doesn't exist, inventory can still show without prices.
      setProducts([]);
      const text = e?.data?.error || e?.message || "";
      if (!String(text).toLowerCase().includes("not found")) {
        setMsg(
          e?.data?.error || e?.message || "Failed to load products/pricing",
        );
      }
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
      const name = String(
        p?.name || p?.productName || p?.product_name || "",
      ).toLowerCase();
      const sku = String(p?.sku || "").toLowerCase();
      return name.includes(qq) || sku.includes(qq);
    });
  }, [inventory, invQ]);

  function priceFor(invRow) {
    const pid = invRow?.productId ?? invRow?.product_id ?? invRow?.id;
    const sku = invRow?.sku;

    const prod =
      (pid ? products.find((x) => String(x.id) === String(pid)) : null) ||
      (sku ? products.find((x) => String(x.sku) === String(sku)) : null);

    const price =
      prod?.sellingPrice ??
      prod?.selling_price ??
      prod?.price ??
      prod?.unitPrice ??
      prod?.unit_price ??
      null;

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
      const list = normalizeList(data, ["payments"]);
      setPayments(list);
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
      setPaymentsSummary(data?.summary || data || null);
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
      const list = normalizeList(data, ["credits", "openCredits"]);
      setOpenCredits(list);
    } catch {
      setOpenCredits([]);
    } finally {
      setCreditsLoading(false);
    }
  }, []);

  // ---------------- USERS ----------------
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.USERS_LIST, { method: "GET" });
      const list = normalizeList(data, ["users"]);
      setUsers(list);
    } catch (e) {
      setUsers([]);
      setMsg(e?.data?.error || e?.message || "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // ---------------- Load per tab ----------------
  useEffect(() => {
    if (!isAuthorized) return;

    const run = async () => {
      if (tab === "dashboard") {
        await Promise.all([
          loadAdminDash(),
          loadSales(),
          loadInventory(),
          loadProducts(),
          loadPaymentsSummary(),
          loadPayments(),
        ]);
        return;
      }

      if (tab === "sales") return loadSales();
      if (tab === "inventory")
        return Promise.all([loadInventory(), loadProducts()]);
      if (tab === "payments")
        return Promise.all([loadPaymentsSummary(), loadPayments()]);
      if (tab === "credits") return loadCreditsOpen();
      if (tab === "users") return loadUsers();

      // cash handled by <CashReportsPanel />
      // customers handled by <CustomersPanel />
      // audit handled by <AuditLogsPanel />
      // evidence handled by router push to /evidence
    };

    run();
  }, [
    isAuthorized,
    tab,
    loadAdminDash,
    loadSales,
    loadInventory,
    loadProducts,
    loadPaymentsSummary,
    loadPayments,
    loadCreditsOpen,
    loadUsers,
  ]);

  if (!isAuthorized) {
    return <div className="p-6 text-sm text-gray-600">Redirecting...</div>;
  }

  return (
    <div>
      <RoleBar
        title="Admin"
        subtitle={`User: ${me.email} • Location: ${me.locationId}`}
        user={me}
      />

      <div className="max-w-6xl mx-auto p-6">
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
              else if (tab === "users") loadUsers();
            }}
            className="ml-auto px-4 py-2 rounded-lg bg-black text-white"
          >
            Refresh
          </button>
        </div>

        {tab === "dashboard" ? (
          <div className="mt-6">
            {/* KPI CARDS (mix of legacy + admin dash if available) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card
                label="Sales today"
                value={
                  dashLoading
                    ? "…"
                    : String(dash?.sales?.today?.count ?? salesToday.length)
                }
                sub={`Total: ${money(
                  dash?.sales?.today?.total ?? salesTodayTotal ?? 0,
                )}`}
              />

              <Card
                label="Awaiting payment"
                value={
                  dashLoading
                    ? "…"
                    : String(
                        dash?.sales?.awaitingPayment ?? awaitingPayment.length,
                      )
                }
                sub="Cashier must record payment"
              />

              <Card
                label="Draft sales"
                value={dashLoading ? "…" : String(dash?.sales?.draft ?? 0)}
                sub="Incomplete / not finalized"
              />

              <Card
                label="Payments today"
                value={
                  dashLoading
                    ? "…"
                    : String(dash?.payments?.today?.count ?? paidToday.length)
                }
                sub={`Total: ${money(dash?.payments?.today?.total ?? paidTodayTotal ?? 0)}`}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card
                label="Payments yesterday"
                value={
                  dashLoading
                    ? "…"
                    : String(dash?.payments?.yesterday?.count ?? "-")
                }
                sub={`Total: ${money(dash?.payments?.yesterday?.total ?? 0)}`}
              />
              <Card
                label="Payments all time"
                value={
                  dashLoading
                    ? "…"
                    : String(dash?.payments?.allTime?.count ?? "-")
                }
                sub={`Total: ${money(dash?.payments?.allTime?.total ?? 0)}`}
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

            {/* ADMIN WIDGETS */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow p-4">
                {dashLoading ? (
                  <div className="text-sm text-gray-600">Loading...</div>
                ) : (
                  <TodayMixWidget
                    breakdown={dash?.payments?.breakdownToday || []}
                  />
                )}
              </div>

              <div className="bg-white rounded-xl shadow p-4">
                {dashLoading ? (
                  <div className="text-sm text-gray-600">Loading...</div>
                ) : (
                  <LowStockWidget
                    lowStock={dash?.inventory?.lowStock || []}
                    threshold={dash?.inventory?.lowStockThreshold ?? 5}
                    products={products}
                  />
                )}
              </div>

              <div className="bg-white rounded-xl shadow p-4">
                {dashLoading ? (
                  <div className="text-sm text-gray-600">Loading...</div>
                ) : (
                  <StuckSalesWidget
                    stuck={dash?.sales?.stuck || []}
                    rule={dash?.sales?.stuckRule}
                  />
                )}
              </div>

              <div className="bg-white rounded-xl shadow p-4">
                {dashLoading ? (
                  <div className="text-sm text-gray-600">Loading...</div>
                ) : (
                  <Last10PaymentsWidget rows={dash?.payments?.last10 || []} />
                )}
              </div>
            </div>

            {/* LEGACY TABLES (keep them; they’re useful) */}
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
                            <td className="p-3 font-medium">
                              {String(s.id ?? "-")}
                            </td>
                            <td className="p-3">{s.status ?? "-"}</td>
                            <td className="p-3 text-right">
                              {money(s.totalAmount ?? s.total ?? 0)}
                            </td>
                            <td className="p-3">
                              {safeDate(s.createdAt || s.created_at)}
                            </td>
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
                              key={
                                p.id || `${p.productId || p.product_id}-${idx}`
                              }
                              className="border-t"
                            >
                              <td className="p-3">{p.sku || "-"}</td>
                              <td className="p-3">
                                {p.productName ||
                                  p.product_name ||
                                  p.name ||
                                  "-"}
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

        {tab === "cash" ? (
          <div className="mt-6">
            <CashReportsPanel title="Admin Cash Oversight" />
            <div className="mt-3 text-xs text-gray-500">
              Admin uses this to detect anomalies: missing sessions, unusual
              refunds, ledger movement.
            </div>
          </div>
        ) : null}

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
                        <td className="p-3 font-medium">
                          {String(s.id ?? "-")}
                        </td>
                        <td className="p-3">{s.status ?? "-"}</td>
                        <td className="p-3 text-right">
                          {money(s.totalAmount ?? s.total ?? 0)}
                        </td>
                        <td className="p-3">
                          {(s.customerName || s.customer_name || "").trim() ||
                            "-"}
                          <div className="text-xs text-gray-500">
                            {s.customerPhone || s.customer_phone || ""}
                          </div>
                        </td>
                        <td className="p-3">
                          {safeDate(s.createdAt || s.created_at)}
                        </td>
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

        {tab === "inventory" ? (
          <div className="mt-6 bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b">
              <div className="font-semibold">Inventory (Admin view)</div>
              <div className="text-xs text-gray-500 mt-1">
                GET /inventory + price from pricing route
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
                      const pid = p.productId ?? p.product_id ?? p.id ?? "-";
                      return (
                        <tr key={p.id || `${pid}-${idx}`} className="border-t">
                          <td className="p-3 font-medium">{String(pid)}</td>
                          <td className="p-3">
                            {p.productName || p.product_name || p.name || "-"}
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

        {tab === "payments" ? (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {/* LEFT: SUMMARY */}
            <div className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">Payments summary</div>
                  <div className="text-xs text-gray-500 mt-1">Read-only.</div>
                </div>

                <button
                  onClick={() => {
                    setMsg("");
                    Promise.all([loadPaymentsSummary(), loadPayments()]);
                  }}
                  className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
                >
                  Refresh
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Card
                  label="Today"
                  value={
                    paySummaryLoading
                      ? "…"
                      : `${paymentsSummary?.today?.count ?? 0} payment(s)`
                  }
                  sub={`Total: ${money(paymentsSummary?.today?.total ?? 0)}`}
                />
                <Card
                  label="All time"
                  value={
                    paySummaryLoading
                      ? "…"
                      : `${paymentsSummary?.allTime?.count ?? 0} payment(s)`
                  }
                  sub={`Total: ${money(paymentsSummary?.allTime?.total ?? 0)}`}
                />
              </div>

              <div className="mt-4 text-xs text-gray-500">
                If summary stays empty, ensure the backend route exists for{" "}
                <b>GET /payments/summary</b>.
              </div>
            </div>

            {/* RIGHT: TABLE */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b">
                <div className="font-semibold">Payments list</div>
                <div className="text-xs text-gray-500 mt-1">
                  Latest payments (read-only)
                </div>
              </div>

              {paymentsLoading ? (
                <div className="p-4 text-sm text-gray-600">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="max-h-[65vh] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10">
                        <tr>
                          <th className="text-left p-3">ID</th>
                          <th className="text-left p-3">Sale</th>
                          <th className="text-right p-3">Amount</th>
                          <th className="text-left p-3">Method</th>
                          <th className="text-left p-3">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Array.isArray(payments) ? payments : []).map((p) => (
                          <tr key={p.id} className="border-t">
                            <td className="p-3 font-medium">
                              {String(p.id ?? "-")}
                            </td>
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
                            <td
                              colSpan={5}
                              className="p-4 text-sm text-gray-600"
                            >
                              No payments found.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {tab === "credits" ? (
          <div className="mt-6">
            <CreditsPanel
              title="Credits (Admin)"
              capabilities={{
                canView: true,
                canCreate: false,
                canDecide: true,
                canSettle: true,
              }}
            />
          </div>
        ) : null}

        {tab === "customers" ? (
          <div className="mt-6">
            <CustomersPanel title="Customers (Admin)" />
          </div>
        ) : null}

        {tab === "audit" ? (
          <div className="mt-6">
            <AuditLogsPanel />
          </div>
        ) : null}

        {tab === "evidence" ? (
          <div className="mt-6 bg-white rounded-xl shadow p-4 space-y-3">
            <div>
              <div className="font-semibold">Evidence (investigation)</div>
              <div className="text-sm text-gray-600 mt-1">
                Open an audit trail for one record (sale/payment/credit/refund).
                Read-only.
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
                  router.push(
                    buildEvidenceUrl({
                      entity: evEntity,
                      entityId: id,
                      from: evFrom,
                      to: evTo,
                      action: evAction,
                      userId: evUserId,
                      q: evQ,
                      limit: evLimit,
                    }),
                  );
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

        {tab === "users" ? (
          <div className="mt-6">
            {/* If your AdminUsersPanel already fetches, it can ignore these props. */}
            <AdminUsersPanel users={users} loading={usersLoading} />
          </div>
        ) : null}

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
