"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import RoleBar from "../../components/RoleBar";
import { apiFetch } from "../../lib/api";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

/**
 * Phase 1 Manager abilities (policy):
 * - view sales (GET /sales)
 * - cancel sale (POST /sales/:id/cancel)
 * - view products (GET /products)
 * - view inventory balances (GET /inventory)
 * - view credits (GET /credits/open) [optional]
 * - view payments (GET /payments, GET /payments/summary) [optional if you added read routes]
 * - view audit (GET /audit) [optional]
 */
const ENDPOINTS = {
  SALES_LIST: "/sales",
  SALE_CANCEL: (id) => `/sales/${id}/cancel`,
  PRODUCTS_LIST: "/products",
  INVENTORY_LIST: "/inventory",

  // Optional: only works if your backend has these routes
  CREDITS_OPEN: "/credits/open",
  PAYMENTS_LIST: "/payments",
  PAYMENTS_SUMMARY: "/payments/summary",
  AUDIT_LIST: "/audit",
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

export default function ManagerPage() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [msg, setMsg] = useState("");

  const [tab, setTab] = useState("dashboard"); // dashboard | sales | inventory | payments | credits | audit

  // ---------- SALES ----------
  const [sales, setSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [salesQ, setSalesQ] = useState("");

  // Cancel modal
  const [cancelOpen, setCancelOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelSaleId, setCancelSaleId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  // ---------- INVENTORY ----------
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingInv, setLoadingInv] = useState(false);
  const [loadingProd, setLoadingProd] = useState(false);
  const [invQ, setInvQ] = useState("");

  // ---------- PAYMENTS (optional) ----------
  const [payments, setPayments] = useState([]);
  const [paymentsSummary, setPaymentsSummary] = useState(null);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loadingPaySummary, setLoadingPaySummary] = useState(false);

  // ---------- CREDITS (optional) ----------
  const [openCredits, setOpenCredits] = useState([]);
  const [loadingCredits, setLoadingCredits] = useState(false);

  // ---------- AUDIT (optional) ----------
  const [auditRows, setAuditRows] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

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

        if (user.role !== "manager") {
          const map = {
            owner: "/owner",
            admin: "/admin",
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

  const isAuthorized = !!me && me.role === "manager";

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
      setSales([]);
    } finally {
      setLoadingSales(false);
    }
  }, []);

  const loadInventory = useCallback(async () => {
    setLoadingInv(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.INVENTORY_LIST, { method: "GET" });
      const items = data?.inventory ?? data?.items ?? data?.rows ?? [];
      setInventory(Array.isArray(items) ? items : []);
    } catch (e) {
      setMsg(e?.data?.error || e.message || "Failed to load inventory");
      setInventory([]);
    } finally {
      setLoadingInv(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoadingProd(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.PRODUCTS_LIST, { method: "GET" });
      const items = data?.products ?? data?.items ?? data?.rows ?? [];
      setProducts(Array.isArray(items) ? items : []);
    } catch (e) {
      setMsg(e?.data?.error || e.message || "Failed to load products");
      setProducts([]);
    } finally {
      setLoadingProd(false);
    }
  }, []);

  const loadCreditsOpen = useCallback(async () => {
    setLoadingCredits(true);
    try {
      const data = await apiFetch(ENDPOINTS.CREDITS_OPEN, { method: "GET" });
      const items =
        data?.credits ?? data?.openCredits ?? data?.items ?? data?.rows ?? [];
      setOpenCredits(Array.isArray(items) ? items : []);
    } catch {
      // If credits not used yet, keep silent
      setOpenCredits([]);
    } finally {
      setLoadingCredits(false);
    }
  }, []);

  const loadPayments = useCallback(async () => {
    setLoadingPayments(true);
    
    try {
      const data = await apiFetch(ENDPOINTS.PAYMENTS_LIST, { method: "GET" });
      const items = data?.payments ?? data?.items ?? data?.rows ?? [];
      setPayments(Array.isArray(items) ? items : []);
    } catch (e) {
      // optional route — don’t block manager if not enabled
      setPayments([]);
      const text = e?.data?.error || e?.message || "";
      if (String(text).toLowerCase().includes("not found")) return;
      // if it exists but errors, show message
      setMsg(e?.data?.error || e.message || "Failed to load payments");
    } finally {
      setLoadingPayments(false);
    }
  }, []);

  const loadPaymentsSummary = useCallback(async () => {
    setLoadingPaySummary(true);
    
    try {
      const data = await apiFetch(ENDPOINTS.PAYMENTS_SUMMARY, {
        method: "GET",
      });
      setPaymentsSummary(data?.summary || null);
    } catch (e) {
      setPaymentsSummary(null);
      const text = e?.data?.error || e?.message || "";
      if (String(text).toLowerCase().includes("not found")) return;
      setMsg(e?.data?.error || e.message || "Failed to load payments summary");
    } finally {
      setLoadingPaySummary(false);
    }
  }, []);

  const loadAudit = useCallback(async () => {
    setLoadingAudit(true);
    
    try {
      const data = await apiFetch(ENDPOINTS.AUDIT_LIST, { method: "GET" });
      const items =
        data?.audit ?? data?.logs ?? data?.items ?? data?.rows ?? [];
      setAuditRows(Array.isArray(items) ? items : []);
    } catch (e) {
      setAuditRows([]);
      const text = e?.data?.error || e?.message || "";
      if (String(text).toLowerCase().includes("not found")) return;
      setMsg(e?.data?.error || e.message || "Failed to load audit logs");
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  // Load per tab (avoid spamming endpoints)
  useEffect(() => {
    if (!isAuthorized) return;

    if (tab === "dashboard" || tab === "sales") loadSales();
    if (tab === "dashboard" || tab === "inventory") {
      loadInventory();
      loadProducts();
    }
    if (tab === "payments" || tab === "dashboard") {
      loadPaymentsSummary();
      loadPayments();
    }
    if (tab === "credits") loadCreditsOpen();
    if (tab === "audit") loadAudit();
  }, [
    isAuthorized,
    tab,
    loadSales,
    loadInventory,
    loadProducts,
    loadCreditsOpen,
    loadPayments,
    loadPaymentsSummary,
    loadAudit,
  ]);

  // ---------------- CANCEL SALE ----------------
  function openCancel(saleId) {
    setCancelSaleId(Number(saleId));
    setCancelReason("");
    setCancelOpen(true);
    setMsg("");
  }

  function canCancelSale(s) {
    const st = String(s?.status || "");
    // Phase 1: never cancel COMPLETED
    return st !== "COMPLETED";
  }

  async function confirmCancel() {
    if (!cancelSaleId) return;

    setCanceling(true);
    setMsg("");
    try {
      await apiFetch(ENDPOINTS.SALE_CANCEL(cancelSaleId), {
        method: "POST",
        body: cancelReason?.trim()
          ? { reason: cancelReason.trim() }
          : undefined,
      });

      setMsg(`✅ Sale #${cancelSaleId} cancelled`);
      setCancelOpen(false);
      setCancelSaleId(null);
      setCancelReason("");

      await loadSales();
    } catch (e) {
      setMsg(e?.data?.error || e.message || "Cancel failed");
    } finally {
      setCanceling(false);
    }
  }

  // ---------------- DERIVED KPI ----------------
  const salesSorted = useMemo(
    () =>
      (sales || [])
        .slice()
        .sort((a, b) => Number(b.id || 0) - Number(a.id || 0)),
    [sales],
  );

  const salesToday = useMemo(
    () => (sales || []).filter((s) => isToday(s.createdAt)),
    [sales],
  );

  const salesTodayTotal = useMemo(
    () => salesToday.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0),
    [salesToday],
  );

  const awaitingPayment = useMemo(
    () =>
      (sales || []).filter(
        (s) => String(s.status) === "AWAITING_PAYMENT_RECORD",
      ),
    [sales],
  );

  const draftSales = useMemo(
    () => (sales || []).filter((s) => String(s.status) === "DRAFT"),
    [sales],
  );

  const completedToday = useMemo(
    () =>
      (sales || []).filter(
        (s) => String(s.status) === "COMPLETED" && isToday(s.createdAt),
      ),
    [sales],
  );

  // Sales search filter
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
      return (
        id.includes(qq) ||
        status.includes(qq) ||
        name.includes(qq) ||
        phone.includes(qq)
      );
    });
  }, [salesSorted, salesQ]);

  // Inventory filter
  const filteredInventory = useMemo(() => {
    const list = Array.isArray(inventory) ? inventory : [];
    const qq = String(invQ || "")
      .trim()
      .toLowerCase();
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

  // Payments KPI (optional)
  const paidToday = useMemo(() => {
    const list = Array.isArray(payments) ? payments : [];
    return list.filter((p) => isToday(p.createdAt));
  }, [payments]);

  const paidTodayTotal = useMemo(() => {
    return paidToday.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [paidToday]);

  // ---------------- RENDER ----------------
  if (!isAuthorized) {
    return <div className="p-6 text-sm text-gray-600">Redirecting...</div>;
  }

  return (
    <div>
      <RoleBar
        title="Manager"
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

        {/* Tabs */}
        <div className="mt-6 flex gap-2 text-sm flex-wrap items-center">
          <Tab active={tab === "dashboard"} onClick={() => setTab("dashboard")}>
            Dashboard
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
          <Tab active={tab === "audit"} onClick={() => setTab("audit")}>
            Audit
          </Tab>

          <button
            onClick={() => {
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
              else if (tab === "audit") loadAudit();
            }}
            className="ml-auto px-4 py-2 rounded-lg bg-black text-white"
          >
            Refresh
          </button>
        </div>

        {/* DASHBOARD */}
        {tab === "dashboard" ? (
          <div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card
                label="Sales today"
                value={salesToday.length}
                sub={`Total: ${money(salesTodayTotal)}`}
              />
              <Card
                label="Awaiting payment"
                value={awaitingPayment.length}
                sub="Cashier must record"
              />
              <Card
                label="Draft sales"
                value={draftSales.length}
                sub="Seller didn’t finish"
              />
              <Card
                label="Completed today"
                value={completedToday.length}
                sub="Done"
              />
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card
                label="Paid today (payments)"
                value={paidToday.length}
                sub={`Total: ${money(paidTodayTotal)}`}
              />
              <Card
                label="Payments today (summary)"
                value={paymentsSummary?.today?.count ?? "-"}
                sub={`Total: ${money(paymentsSummary?.today?.total ?? 0)}`}
              />
              <Card
                label="Payments all time"
                value={paymentsSummary?.allTime?.count ?? "-"}
                sub={`Total: ${money(paymentsSummary?.allTime?.total ?? 0)}`}
              />
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="p-4 border-b">
                  <div className="font-semibold">Needs attention</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Awaiting payment + Draft. Manager can cancel if needed.
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left p-3">ID</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-right p-3">Total</th>
                        <th className="text-left p-3">Customer</th>
                        <th className="text-right p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...awaitingPayment, ...draftSales]
                        .slice()
                        .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
                        .slice(0, 10)
                        .map((s) => (
                          <tr key={s.id} className="border-t">
                            <td className="p-3 font-medium">{s.id}</td>
                            <td className="p-3">{s.status}</td>
                            <td className="p-3 text-right">
                              {money(s.totalAmount)}
                            </td>
                            <td className="p-3">
                              {(s.customerName || "").trim()
                                ? s.customerName
                                : "-"}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                disabled={!canCancelSale(s)}
                                onClick={() => openCancel(s.id)}
                                className={
                                  "px-3 py-1.5 rounded-lg text-xs " +
                                  (canCancelSale(s)
                                    ? "border hover:bg-gray-50"
                                    : "bg-gray-100 text-gray-400")
                                }
                              >
                                Cancel
                              </button>
                            </td>
                          </tr>
                        ))}

                      {awaitingPayment.length + draftSales.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-sm text-gray-600">
                            Nothing urgent right now.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="p-4 border-b">
                  <div className="font-semibold">Inventory snapshot</div>
                  <div className="text-xs text-gray-500 mt-1">
                    View only (manager can’t adjust).
                  </div>
                </div>

                {loadingInv || loadingProd ? (
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
                        {(inventory || []).slice(0, 10).map((p, idx) => (
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
                        {(inventory || []).length === 0 ? (
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

                <div className="p-4 border-t">
                  <button
                    onClick={() => setTab("inventory")}
                    className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
                  >
                    Open full inventory
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* SALES */}
        {tab === "sales" ? (
          <div className="mt-6 bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b">
              <div className="font-semibold">Sales</div>
              <div className="text-xs text-gray-500 mt-1">
                Manager can cancel non-completed sales.
              </div>
            </div>

            <div className="p-3 border-b">
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Search by sale id / status / customer / phone"
                value={salesQ}
                onChange={(e) => setSalesQ(e.target.value)}
              />
            </div>

            {loadingSales ? (
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
                      <th className="text-right p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((s) => (
                      <tr key={s.id} className="border-t">
                        <td className="p-3 font-medium">{s.id}</td>
                        <td className="p-3">{s.status}</td>
                        <td className="p-3 text-right">
                          {money(s.totalAmount)}
                        </td>
                        <td className="p-3">
                          {(s.customerName || "").trim() ? s.customerName : "-"}
                          <div className="text-xs text-gray-500">
                            {s.customerPhone || ""}
                          </div>
                        </td>
                        <td className="p-3">{fmt(s.createdAt)}</td>
                        <td className="p-3 text-right">
                          <button
                            disabled={!canCancelSale(s)}
                            onClick={() => openCancel(s.id)}
                            className={
                              "px-3 py-1.5 rounded-lg text-xs " +
                              (canCancelSale(s)
                                ? "border hover:bg-gray-50"
                                : "bg-gray-100 text-gray-400")
                            }
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredSales.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-sm text-gray-600">
                          No sales.
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
              <div className="font-semibold">Inventory (view only)</div>
              <div className="text-xs text-gray-500 mt-1">
                GET /inventory and price joined from GET /products.
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

            {loadingInv || loadingProd ? (
              <div className="p-4 text-sm text-gray-600">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left p-3">ID</th>
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
                          No inventory items.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {/* PAYMENTS (optional) */}
        {tab === "payments" ? (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="font-semibold">Payments summary</div>
              <div className="text-xs text-gray-500 mt-1">Read-only.</div>

              {loadingPaySummary ? (
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
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b">
                <div className="font-semibold">Payments list</div>
                <div className="text-xs text-gray-500 mt-1">
                  If GET /payments is not enabled, this stays empty (that’s ok).
                </div>
              </div>

              {loadingPayments ? (
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
                      {(payments || []).slice(0, 100).map((p) => (
                        <tr key={p.id} className="border-t">
                          <td className="p-3 font-medium">{p.id}</td>
                          <td className="p-3">{p.saleId ?? "-"}</td>
                          <td className="p-3 text-right">{money(p.amount)}</td>
                          <td className="p-3">{p.method ?? "-"}</td>
                          <td className="p-3">{fmt(p.createdAt)}</td>
                        </tr>
                      ))}
                      {(payments || []).length === 0 ? (
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

        {/* CREDITS (optional) */}
        {tab === "credits" ? (
          <div className="mt-6 bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">Open credits</div>
                <div className="text-xs text-gray-500 mt-1">
                  Will be empty until you start using credit flow.
                </div>
              </div>
              <button
                onClick={loadCreditsOpen}
                className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
              >
                {loadingCredits ? "Loading..." : "Reload"}
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
                  {(openCredits || []).map((c, idx) => (
                    <tr key={c.id || idx} className="border-t">
                      <td className="p-3 font-medium">{c.id ?? "-"}</td>
                      <td className="p-3">{c.saleId ?? "-"}</td>
                      <td className="p-3">{c.status ?? c.state ?? "-"}</td>
                      <td className="p-3 text-right">
                        {money(c.amount ?? c.totalAmount ?? 0)}
                      </td>
                      <td className="p-3">{fmt(c.createdAt)}</td>
                    </tr>
                  ))}
                  {(openCredits || []).length === 0 ? (
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

        {/* AUDIT (optional) */}
        {tab === "audit" ? (
          <div className="mt-6 bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b">
              <div className="font-semibold">Audit logs</div>
              <div className="text-xs text-gray-500 mt-1">Read-only.</div>
            </div>

            {loadingAudit ? (
              <div className="p-4 text-sm text-gray-600">Loading...</div>
            ) : (
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
                    {(auditRows || []).slice(0, 200).map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="p-3">{fmt(r.createdAt)}</td>
                        <td className="p-3">{r.userId ?? "-"}</td>
                        <td className="p-3 font-medium">{r.action ?? "-"}</td>
                        <td className="p-3">{r.entity ?? "-"}</td>
                        <td className="p-3">{r.entityId ?? "-"}</td>
                        <td className="p-3 text-gray-700">
                          {r.description ?? "-"}
                        </td>
                      </tr>
                    ))}
                    {(auditRows || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-sm text-gray-600">
                          No audit logs (or GET /audit not enabled).
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

      {/* Cancel modal */}
      {cancelOpen ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow max-w-md w-full p-4">
            <div className="font-semibold">Cancel sale #{cancelSaleId}</div>
            <div className="text-xs text-gray-500 mt-1">
              Phase 1 rule: do NOT cancel COMPLETED sales.
            </div>

            <div className="mt-3">
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Reason (optional)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>

            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => {
                  setCancelOpen(false);
                  setCancelSaleId(null);
                  setCancelReason("");
                }}
                className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
                disabled={canceling}
              >
                Close
              </button>

              <button
                onClick={confirmCancel}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
                disabled={canceling}
              >
                {canceling ? "Cancelling..." : "Confirm cancel"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
