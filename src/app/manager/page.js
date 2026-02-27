"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import AuditLogsPanel from "../../components/AuditLogsPanel";
import CashReportsPanel from "../../components/CashReportsPanel";
import CreditsPanel from "../../components/CreditsPanel";
import CustomersPanel from "../../components/CustomersPanel";
import InventoryAdjustRequestsPanel from "../../components/InventoryAdjustRequestsPanel";
import ManagerUsersPanel from "../../components/ManagerUsersPanel";
import ProductPricingPanel from "../../components/ProductPricingPanel";
import RoleBar from "../../components/RoleBar";
import { apiFetch } from "../../lib/api";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

const ENDPOINTS = {
  SALES_LIST: "/sales",
  SALE_CANCEL: (id) => `/sales/${id}/cancel`,

  MANAGER_DASHBOARD: "/manager/dashboard",

  PRODUCTS_LIST: "/products",
  INVENTORY_LIST: "/inventory",

  PAYMENTS_LIST: "/payments",
  PAYMENTS_SUMMARY: "/payments/summary",
  PAYMENTS_BREAKDOWN: "/payments/breakdown",

  INVENTORY_ARRIVALS_LIST: "/inventory/arrivals",

  PRODUCT_ARCHIVE: (id) => `/products/${id}/archive`,
  PRODUCT_RESTORE: (id) => `/products/${id}/restore`,
};

function money(n) {
  const x = Number(n || 0);
  if (!Number.isFinite(x)) return "0";
  return x.toLocaleString();
}

function fmt(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
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

function normalizeMethodKey(method) {
  const m = String(method || "")
    .trim()
    .toUpperCase();
  if (!m) return "OTHER";
  if (m === "CASH") return "CASH";
  if (m === "MOMO" || m === "MOBILEMONEY" || m === "MOBILE") return "MOMO";
  if (m === "BANK" || m === "TRANSFER") return "BANK";
  if (m === "CARD" || m === "POS") return "CARD";
  return "OTHER";
}

function sumBreakdown(rows) {
  const out = {
    CASH: { count: 0, total: 0 },
    MOMO: { count: 0, total: 0 },
    BANK: { count: 0, total: 0 },
    CARD: { count: 0, total: 0 },
    OTHER: { count: 0, total: 0 },
  };

  const list = Array.isArray(rows) ? rows : [];
  for (const r of list) {
    const k = normalizeMethodKey(r?.method);
    out[k].count += Number(r?.count || 0);
    out[k].total += Number(r?.total || 0);
  }
  return out;
}

function isArchivedProduct(p) {
  if (!p) return false;

  // Your backend likely uses isActive
  if (p.isActive === false) return true;
  if (p.is_active === false) return true;

  // Other possible shapes
  if (p.isArchived === true) return true;
  if (p.is_archived === true) return true;
  if (p.archivedAt || p.archived_at) return true;
  if (String(p.status || "").toUpperCase() === "ARCHIVED") return true;

  return false;
}

function ArrivalDocCard({ doc }) {
  const raw = doc?.fileUrl || doc?.url || "";
  if (!raw) return null;

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";
  const url = /^https?:\/\//i.test(raw)
    ? raw
    : `${API_BASE}${raw.startsWith("/") ? "" : "/"}${raw}`;

  return (
    <div className="border rounded-lg p-3 bg-white flex items-center justify-between gap-3">
      <div className="flex flex-col">
        <div className="text-sm font-medium truncate max-w-[220px]">
          {raw.split("/").pop()}
        </div>
        {doc?.uploadedAt ? (
          <div className="text-xs text-gray-500">
            Uploaded: {new Date(doc.uploadedAt).toLocaleString()}
          </div>
        ) : null}
      </div>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="px-3 py-1.5 rounded-lg text-xs bg-black text-white hover:bg-gray-800 transition"
      >
        Open
      </a>
    </div>
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

export default function ManagerPage() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [msg, setMsg] = useState("");

  const [tab, setTab] = useState("dashboard");
  // dashboard | sales | arrivals | inventory | pricing | cash_reports | users | credits | customers | audit | evidence | inv_requests | payments

  const [dash, setDash] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);

  // ---------- SALES ----------
  const [sales, setSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [salesQ, setSalesQ] = useState("");

  const [cancelOpen, setCancelOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelSaleId, setCancelSaleId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  // ---------- INVENTORY / PRODUCTS ----------
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingInv, setLoadingInv] = useState(false);
  const [loadingProd, setLoadingProd] = useState(false);
  const [invQ, setInvQ] = useState("");

  // ✅ NEW: show archived products toggle for product list
  const [showArchivedProducts, setShowArchivedProducts] = useState(false);
  const [prodQ, setProdQ] = useState("");

  // ✅ Archive / restore modal state
  const [archOpen, setArchOpen] = useState(false);
  const [archBusy, setArchBusy] = useState(false);
  const [archMode, setArchMode] = useState("archive"); // "archive" | "restore"
  const [archProduct, setArchProduct] = useState(null);
  const [archReason, setArchReason] = useState("");

  // ---------- ARRIVALS ----------
  const [arrivals, setArrivals] = useState([]);
  const [loadingArrivals, setLoadingArrivals] = useState(false);

  // ---------- PAYMENTS ----------
  const [payments, setPayments] = useState([]);
  const [paymentsSummary, setPaymentsSummary] = useState(null);
  const [paymentsBreakdown, setPaymentsBreakdown] = useState(null);
  const [payQ, setPayQ] = useState("");
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loadingPaySummary, setLoadingPaySummary] = useState(false);
  const [loadingPayBreakdown, setLoadingPayBreakdown] = useState(false);

  // ---------- EVIDENCE ----------
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
  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.MANAGER_DASHBOARD, {
        method: "GET",
      });
      setDash(data?.dashboard || null);
    } catch (e) {
      setDash(null);
      setMsg(e?.data?.error || e?.message || "Failed to load dashboard");
    } finally {
      setDashLoading(false);
    }
  }, []);

  const loadSales = useCallback(async () => {
    setLoadingSales(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.SALES_LIST, { method: "GET" });
      setSales(normalizeList(data, ["sales"]));
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Failed to load sales");
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
      setInventory(normalizeList(data, ["inventory"]));
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Failed to load inventory");
      setInventory([]);
    } finally {
      setLoadingInv(false);
    }
  }, []);

  const loadProducts = useCallback(
    async (opts = {}) => {
      const includeInactive =
        typeof opts.includeInactive === "boolean"
          ? opts.includeInactive
          : showArchivedProducts;

      setLoadingProd(true);
      setMsg("");
      try {
        const path = includeInactive
          ? `${ENDPOINTS.PRODUCTS_LIST}?includeInactive=true`
          : ENDPOINTS.PRODUCTS_LIST;

        const data = await apiFetch(path, { method: "GET" });
        const items = normalizeList(data, ["products", "pricing"]);
        setProducts(items);
      } catch (e) {
        setMsg(e?.data?.error || e?.message || "Failed to load products");
        setProducts([]);
      } finally {
        setLoadingProd(false);
      }
    },
    [showArchivedProducts],
  );

  const loadPayments = useCallback(async () => {
    setLoadingPayments(true);
    try {
      const data = await apiFetch(ENDPOINTS.PAYMENTS_LIST, { method: "GET" });
      setPayments(normalizeList(data, ["payments"]));
    } catch (e) {
      setPayments([]);
      const text = e?.data?.error || e?.message || "";
      if (String(text).toLowerCase().includes("not found")) return;
      setMsg(e?.data?.error || e?.message || "Failed to load payments");
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
      setPaymentsSummary(data?.summary || data || null);
    } catch (e) {
      setPaymentsSummary(null);
      const text = e?.data?.error || e?.message || "";
      if (String(text).toLowerCase().includes("not found")) return;
      setMsg(e?.data?.error || e?.message || "Failed to load payments summary");
    } finally {
      setLoadingPaySummary(false);
    }
  }, []);

  const loadPaymentsBreakdown = useCallback(async () => {
    setLoadingPayBreakdown(true);
    try {
      const data = await apiFetch(ENDPOINTS.PAYMENTS_BREAKDOWN, {
        method: "GET",
      });
      setPaymentsBreakdown(data?.breakdown || data || null);
    } catch (e) {
      setPaymentsBreakdown(null);
      const text = e?.data?.error || e?.message || "";
      if (String(text).toLowerCase().includes("not found")) return;
      setMsg(
        e?.data?.error || e?.message || "Failed to load payments breakdown",
      );
    } finally {
      setLoadingPayBreakdown(false);
    }
  }, []);

  const loadArrivals = useCallback(async () => {
    setLoadingArrivals(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.INVENTORY_ARRIVALS_LIST, {
        method: "GET",
      });
      setArrivals(normalizeList(data, ["arrivals"]));
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Failed to load arrivals");
      setArrivals([]);
    } finally {
      setLoadingArrivals(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;

    if (tab === "dashboard" || tab === "sales") loadSales();

    if (tab === "dashboard" || tab === "inventory") {
      loadInventory();
      // for inventory, we want products list too (active only by default)
      loadProducts({ includeInactive: showArchivedProducts });
    }

    if (tab === "dashboard") {
      loadDashboard();
      loadPaymentsSummary();
      loadPayments();
      loadPaymentsBreakdown();
    }

    if (tab === "arrivals") loadArrivals();

    if (tab === "payments") {
      loadPayments();
      loadPaymentsSummary();
      loadPaymentsBreakdown();
    }
  }, [
    isAuthorized,
    tab,
    loadDashboard,
    loadSales,
    loadInventory,
    loadProducts,
    showArchivedProducts,
    loadPaymentsSummary,
    loadPayments,
    loadPaymentsBreakdown,
    loadArrivals,
  ]);

  // When toggle changes while on inventory tab, reload products accordingly
  useEffect(() => {
    if (!isAuthorized) return;
    if (tab !== "inventory") return;
    loadProducts({ includeInactive: showArchivedProducts });
  }, [isAuthorized, tab, showArchivedProducts, loadProducts]);

  // ---------------- CANCEL SALE ----------------
  function openCancel(saleId) {
    setCancelSaleId(Number(saleId));
    setCancelReason("");
    setCancelOpen(true);
    setMsg("");
  }

  function canCancelSale(s) {
    const st = String(s?.status || "").toUpperCase();
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
      setMsg(e?.data?.error || e?.message || "Cancel failed");
    } finally {
      setCanceling(false);
    }
  }

  // ---------------- ARCHIVE / RESTORE ----------------
  function openArchiveProduct(prod) {
    if (!prod?.id) return;
    setArchMode("archive");
    setArchProduct(prod);
    setArchReason("");
    setArchOpen(true);
    setMsg("");
  }

  function openRestoreProduct(prod) {
    if (!prod?.id) return;
    setArchMode("restore");
    setArchProduct(prod);
    setArchReason("");
    setArchOpen(true);
    setMsg("");
  }

  async function confirmArchiveRestore() {
    const pid = archProduct?.id;
    if (!pid) return;

    setArchBusy(true);
    setMsg("");
    try {
      if (archMode === "archive") {
        await apiFetch(ENDPOINTS.PRODUCT_ARCHIVE(pid), {
          method: "PATCH",
          // backend might accept reason; if it doesn't, it will still work if it ignores body
          body: archReason?.trim() ? { reason: archReason.trim() } : undefined,
        });
        setMsg(`✅ Archived product #${pid}`);
      } else {
        await apiFetch(ENDPOINTS.PRODUCT_RESTORE(pid), { method: "PATCH" });
        setMsg(`✅ Restored product #${pid}`);
      }

      setArchOpen(false);
      setArchProduct(null);
      setArchReason("");

      await Promise.all([
        loadProducts({ includeInactive: showArchivedProducts }),
        loadInventory(),
      ]);
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Action failed");
    } finally {
      setArchBusy(false);
    }
  }

  // ---------------- DERIVED ----------------
  const salesSorted = useMemo(() => {
    const list = Array.isArray(sales) ? sales : [];
    return list.slice().sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
  }, [sales]);

  const filteredSales = useMemo(() => {
    const qq = String(salesQ || "")
      .trim()
      .toLowerCase();
    if (!qq) return salesSorted;

    return salesSorted.filter((s) => {
      const id = String(s?.id ?? "");
      const status = String(s?.status ?? "").toLowerCase();
      const name = String(
        s?.customerName ?? s?.customer_name ?? "",
      ).toLowerCase();
      const phone = String(
        s?.customerPhone ?? s?.customer_phone ?? "",
      ).toLowerCase();
      return (
        id.includes(qq) ||
        status.includes(qq) ||
        name.includes(qq) ||
        phone.includes(qq)
      );
    });
  }, [salesSorted, salesQ]);

  const filteredInventory = useMemo(() => {
    const list = Array.isArray(inventory) ? inventory : [];
    const qq = String(invQ || "")
      .trim()
      .toLowerCase();
    if (!qq) return list;

    return list.filter((p) => {
      const name = String(
        p?.name || p?.productName || p?.product_name || "",
      ).toLowerCase();
      const sku = String(p?.sku || "").toLowerCase();
      return name.includes(qq) || sku.includes(qq);
    });
  }, [inventory, invQ]);

  const filteredProducts = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    const qq = String(prodQ || "")
      .trim()
      .toLowerCase();

    const byToggle = showArchivedProducts
      ? list.filter((p) => isArchivedProduct(p))
      : list.filter((p) => !isArchivedProduct(p));

    if (!qq) return byToggle;

    return byToggle.filter((p) => {
      const id = String(p?.id ?? "");
      const name = String(
        p?.name || p?.productName || p?.title || "",
      ).toLowerCase();
      const sku = String(p?.sku || "").toLowerCase();
      return id.includes(qq) || name.includes(qq) || sku.includes(qq);
    });
  }, [products, prodQ, showArchivedProducts]);

  function priceFor(invRow) {
    const pid = invRow?.productId ?? invRow?.product_id ?? invRow?.id;
    const sku = invRow?.sku;

    const prod =
      (pid != null
        ? (Array.isArray(products) ? products : []).find(
            (x) => String(x?.id) === String(pid),
          )
        : null) ||
      (sku
        ? (Array.isArray(products) ? products : []).find(
            (x) => String(x?.sku) === String(sku),
          )
        : null);

    const price =
      prod?.sellingPrice ??
      prod?.selling_price ??
      prod?.price ??
      prod?.unitPrice ??
      prod?.unit_price ??
      null;

    return price == null ? "-" : money(price);
  }

  const filteredPayments = useMemo(() => {
    const qq = String(payQ || "")
      .trim()
      .toLowerCase();
    const list = Array.isArray(payments) ? payments : [];
    if (!qq) return list;

    return list.filter((p) => {
      const id = String(p?.id ?? "");
      const saleId = String(p?.saleId ?? p?.sale_id ?? "");
      const method = String(p?.method ?? "").toLowerCase();
      const amount = String(p?.amount ?? "");
      return (
        id.includes(qq) ||
        saleId.includes(qq) ||
        method.includes(qq) ||
        amount.includes(qq)
      );
    });
  }, [payments, payQ]);

  const breakdownTodayTotals = useMemo(
    () => sumBreakdown(paymentsBreakdown?.today || []),
    [paymentsBreakdown],
  );
  const breakdownYesterday = useMemo(
    () => sumBreakdown(paymentsBreakdown?.yesterday || []),
    [paymentsBreakdown],
  );
  const breakdownAll = useMemo(
    () => sumBreakdown(paymentsBreakdown?.allTime || []),
    [paymentsBreakdown],
  );

  if (!isAuthorized) {
    return <div className="p-6 text-sm text-gray-600">Redirecting...</div>;
  }

  return (
    <div>
      <RoleBar
        title="Manager"
        subtitle={`User: ${me.email} • Location: ${me.locationId}`}
        user={me}
      />

      <div className="max-w-6xl mx-auto p-6">
        {msg ? (
          <div className="mt-4 text-sm">
            {String(msg).startsWith("✅") ? (
              <div className="p-3 rounded-lg bg-green-50 text-green-800">
                {msg}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-red-50 text-red-700">{msg}</div>
            )}
          </div>
        ) : null}

        <div className="mt-6 flex gap-2 text-sm flex-wrap items-center">
          <Tab active={tab === "dashboard"} onClick={() => setTab("dashboard")}>
            Dashboard
          </Tab>
          <Tab active={tab === "sales"} onClick={() => setTab("sales")}>
            Sales
          </Tab>
          <Tab active={tab === "arrivals"} onClick={() => setTab("arrivals")}>
            Stock arrivals
          </Tab>
          <Tab active={tab === "inventory"} onClick={() => setTab("inventory")}>
            Inventory
          </Tab>
          <Tab active={tab === "pricing"} onClick={() => setTab("pricing")}>
            Pricing
          </Tab>
          <Tab
            active={tab === "inv_requests"}
            onClick={() => setTab("inv_requests")}
          >
            Inventory Requests
          </Tab>
          <Tab active={tab === "payments"} onClick={() => setTab("payments")}>
            Payments
          </Tab>
          <Tab
            active={tab === "cash_reports"}
            onClick={() => setTab("cash_reports")}
          >
            Cash Reports
          </Tab>
          <Tab active={tab === "users"} onClick={() => setTab("users")}>
            Users
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

          <button
            onClick={() => {
              if (tab === "dashboard") {
                Promise.all([
                  loadSales(),
                  loadInventory(),
                  loadProducts({ includeInactive: showArchivedProducts }),
                  loadPaymentsSummary(),
                  loadPayments(),
                  loadPaymentsBreakdown(),
                  loadDashboard(),
                ]);
              } else if (tab === "sales") loadSales();
              else if (tab === "inventory")
                Promise.all([
                  loadInventory(),
                  loadProducts({ includeInactive: showArchivedProducts }),
                ]);
              else if (tab === "arrivals") loadArrivals();
              else if (tab === "payments")
                Promise.all([
                  loadPayments(),
                  loadPaymentsSummary(),
                  loadPaymentsBreakdown(),
                ]);
            }}
            className="ml-auto px-4 py-2 rounded-lg bg-black text-white"
          >
            Refresh
          </button>
        </div>

        {/* DASHBOARD */}
        {tab === "dashboard" ? (
          <div className="mt-6 space-y-4">
            {dashLoading ? (
              <div className="p-4 text-sm text-gray-600 bg-white rounded-xl shadow">
                Loading dashboard…
              </div>
            ) : !dash ? (
              <div className="p-4 text-sm text-gray-600 bg-white rounded-xl shadow">
                No dashboard data.
              </div>
            ) : (
              <>
                <TodayMixWidget
                  breakdown={dash?.payments?.breakdownToday || []}
                />

                <LowStockWidget
                  lowStock={dash?.inventory?.lowStock || []}
                  threshold={dash?.inventory?.lowStockThreshold ?? 5}
                  products={products}
                />

                <StuckSalesWidget
                  stuck={dash?.sales?.stuck || []}
                  rule={dash?.sales?.stuckRule}
                />
              </>
            )}
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
                          {fmt(s.createdAt || s.created_at)}
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

        {/* INVENTORY (qty) + PRODUCTS (archive/restore) */}
        {tab === "inventory" ? (
          <div className="mt-6 space-y-4">
            {/* Inventory list stays exactly for qty */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b">
                <div className="font-semibold">Inventory (Qty)</div>
                <div className="text-xs text-gray-500 mt-1">
                  Qty from GET /inventory; selling price joined from GET
                  /products.
                </div>
              </div>

              <div className="p-3 border-b">
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Search inventory by name or SKU"
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
                        <th className="text-right p-3">Selling</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventory.map((p, idx) => {
                        const pid = p.productId ?? p.product_id ?? p.id ?? "-";
                        return (
                          <tr
                            key={p.id || `${pid}-${idx}`}
                            className="border-t"
                          >
                            <td className="p-3 font-medium">{String(pid)}</td>
                            <td className="p-3">
                              {p.productName || p.product_name || p.name || "-"}
                            </td>
                            <td className="p-3 text-gray-600">
                              {p.sku || "-"}
                            </td>
                            <td className="p-3 text-right">
                              {p.qtyOnHand ??
                                p.qty_on_hand ??
                                p.qty ??
                                p.quantity ??
                                0}
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

            {/* Products list is where archived products live */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">
                    Products ({showArchivedProducts ? "Archived" : "Active"})
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    This is where you archive/restore products.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showArchivedProducts}
                      onChange={(e) =>
                        setShowArchivedProducts(e.target.checked)
                      }
                    />
                    Show archived
                  </label>

                  <button
                    onClick={() =>
                      loadProducts({ includeInactive: showArchivedProducts })
                    }
                    className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
                  >
                    Reload
                  </button>
                </div>
              </div>

              <div className="p-3 border-b">
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Search products by id / name / sku"
                  value={prodQ}
                  onChange={(e) => setProdQ(e.target.value)}
                />
              </div>

              {loadingProd ? (
                <div className="p-4 text-sm text-gray-600">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left p-3">ID</th>
                        <th className="text-left p-3">Name</th>
                        <th className="text-left p-3">SKU</th>
                        <th className="text-right p-3">Selling</th>
                        <th className="text-right p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((p) => {
                        const archived = isArchivedProduct(p);
                        const selling =
                          p?.sellingPrice ??
                          p?.selling_price ??
                          p?.price ??
                          p?.unitPrice ??
                          p?.unit_price ??
                          null;

                        return (
                          <tr key={p?.id} className="border-t">
                            <td className="p-3 font-medium">{p?.id ?? "-"}</td>
                            <td className="p-3">
                              {p?.name || p?.productName || p?.title || "-"}
                            </td>
                            <td className="p-3 text-gray-600">
                              {p?.sku || "-"}
                            </td>
                            <td className="p-3 text-right">
                              {selling == null ? "-" : money(selling)}
                            </td>
                            <td className="p-3 text-right">
                              {archived ? (
                                <button
                                  onClick={() => openRestoreProduct(p)}
                                  className="px-3 py-1.5 rounded-lg text-xs border hover:bg-gray-50"
                                >
                                  Restore
                                </button>
                              ) : (
                                <button
                                  onClick={() => openArchiveProduct(p)}
                                  className="px-3 py-1.5 rounded-lg text-xs border hover:bg-gray-50"
                                >
                                  Archive
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-sm text-gray-600">
                            No products in this view.
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

        {tab === "pricing" ? <ProductPricingPanel /> : null}

        {tab === "arrivals" ? (
          <div className="mt-6 bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">Stock arrivals</div>
                <div className="text-xs text-gray-500 mt-1">
                  View deliveries + attached documents.
                </div>
              </div>
              <button
                onClick={loadArrivals}
                className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
              >
                {loadingArrivals ? "Loading..." : "Reload"}
              </button>
            </div>

            {loadingArrivals ? (
              <div className="p-4 text-sm text-gray-600">Loading...</div>
            ) : (
              <div className="divide-y">
                {(arrivals || []).map((a) => (
                  <div key={a.id} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm">
                        <span className="font-semibold">Arrival #{a.id}</span>
                        <span className="text-gray-500">
                          {" "}
                          • product #{a.productId} • qty {a.qtyReceived}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {fmt(a.createdAt)}
                      </div>
                    </div>

                    {a.notes ? (
                      <div className="mt-2 text-sm text-gray-700">
                        Notes: {a.notes}
                      </div>
                    ) : null}

                    <div className="mt-3">
                      <div className="text-xs text-gray-500 mb-2">
                        Documents
                      </div>

                      {Array.isArray(a.documents) && a.documents.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {a.documents.map((d) => (
                            <ArrivalDocCard key={d.id || d.fileUrl} doc={d} />
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600">
                          No documents.
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {(arrivals || []).length === 0 ? (
                  <div className="p-4 text-sm text-gray-600">
                    No arrivals yet.
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {tab === "cash_reports" ? (
          <div className="mt-6">
            <CashReportsPanel title="Manager Cash Reports" />
          </div>
        ) : null}

        {tab === "payments" ? (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <div className="font-semibold">Payments</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Read-only. From GET /payments.
                  </div>
                </div>
                <button
                  onClick={() => {
                    loadPayments();
                    loadPaymentsSummary();
                    loadPaymentsBreakdown();
                  }}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm"
                >
                  Refresh
                </button>
              </div>

              <div className="p-3 border-b">
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Search by id / sale / method / amount"
                  value={payQ}
                  onChange={(e) => setPayQ(e.target.value)}
                />
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
                      {filteredPayments.map((p, idx) => (
                        <tr key={p?.id || idx} className="border-t">
                          <td className="p-3 font-medium">{p?.id ?? "-"}</td>
                          <td className="p-3">
                            #{p?.saleId ?? p?.sale_id ?? "-"}
                          </td>
                          <td className="p-3 text-right">
                            {money(p?.amount ?? 0)}
                          </td>
                          <td className="p-3">{p?.method ?? "-"}</td>
                          <td className="p-3">
                            {fmt(p?.createdAt || p?.created_at)}
                          </td>
                        </tr>
                      ))}
                      {filteredPayments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-sm text-gray-600">
                            No payments.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow p-4 space-y-4">
              <div>
                <div className="font-semibold">Summary</div>
                <div className="text-xs text-gray-500 mt-1">
                  From GET /payments/summary and /payments/breakdown
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card
                  label="Today"
                  value={
                    loadingPaySummary
                      ? "…"
                      : (paymentsSummary?.today?.count ?? 0)
                  }
                  sub={`Total: ${money(paymentsSummary?.today?.total ?? 0)}`}
                />
                <Card
                  label="Yesterday"
                  value={
                    loadingPaySummary
                      ? "…"
                      : (paymentsSummary?.yesterday?.count ?? 0)
                  }
                  sub={`Total: ${money(paymentsSummary?.yesterday?.total ?? 0)}`}
                />
                <Card
                  label="All time"
                  value={
                    loadingPaySummary
                      ? "…"
                      : (paymentsSummary?.allTime?.count ?? 0)
                  }
                  sub={`Total: ${money(paymentsSummary?.allTime?.total ?? 0)}`}
                />
              </div>

              <div className="border-t pt-4">
                <div className="font-semibold mb-2">Breakdown (Today)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Card
                    label="Cash"
                    value={
                      loadingPayBreakdown
                        ? "…"
                        : breakdownTodayTotals.CASH.count
                    }
                    sub={`Total: ${money(breakdownTodayTotals.CASH.total)}`}
                  />
                  <Card
                    label="MoMo"
                    value={
                      loadingPayBreakdown
                        ? "…"
                        : breakdownTodayTotals.MOMO.count
                    }
                    sub={`Total: ${money(breakdownTodayTotals.MOMO.total)}`}
                  />
                  <Card
                    label="Bank"
                    value={
                      loadingPayBreakdown
                        ? "…"
                        : breakdownTodayTotals.BANK.count
                    }
                    sub={`Total: ${money(breakdownTodayTotals.BANK.total)}`}
                  />
                  <Card
                    label="Card"
                    value={
                      loadingPayBreakdown
                        ? "…"
                        : breakdownTodayTotals.CARD.count
                    }
                    sub={`Total: ${money(breakdownTodayTotals.CARD.total)}`}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="font-semibold mb-2">Breakdown (Yesterday)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Card
                    label="Cash"
                    value={
                      loadingPayBreakdown ? "…" : breakdownYesterday.CASH.count
                    }
                    sub={`Total: ${money(breakdownYesterday.CASH.total)}`}
                  />
                  <Card
                    label="MoMo"
                    value={
                      loadingPayBreakdown ? "…" : breakdownYesterday.MOMO.count
                    }
                    sub={`Total: ${money(breakdownYesterday.MOMO.total)}`}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="font-semibold mb-2">Breakdown (All time)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Card
                    label="Cash"
                    value={loadingPayBreakdown ? "…" : breakdownAll.CASH.count}
                    sub={`Total: ${money(breakdownAll.CASH.total)}`}
                  />
                  <Card
                    label="MoMo"
                    value={loadingPayBreakdown ? "…" : breakdownAll.MOMO.count}
                    sub={`Total: ${money(breakdownAll.MOMO.total)}`}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "users" ? (
          <div className="mt-6">
            <ManagerUsersPanel title="Staff list (view-only)" />
          </div>
        ) : null}

        {tab === "credits" ? (
          <div className="mt-6">
            <CreditsPanel
              title="Credits (Manager)"
              capabilities={{
                canView: true,
                canCreate: false,
                canDecide: true,
                canSettle: false,
              }}
            />
          </div>
        ) : null}

        {tab === "customers" ? (
          <div className="mt-6">
            <CustomersPanel title="Customers (Manager)" />
          </div>
        ) : null}

        {tab === "audit" ? (
          <div className="mt-6">
            <AuditLogsPanel
              title="Audit logs"
              subtitle="Manager view (read-only)."
              defaultLimit={50}
            />
          </div>
        ) : null}

        {tab === "evidence" ? (
          <div className="mt-6 bg-white rounded-xl shadow p-4 space-y-3">
            <div>
              <div className="font-semibold">Evidence (investigation)</div>
              <div className="text-sm text-gray-600 mt-1">
                Open the audit trail for one record.
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
                  <option value="product">product</option>
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
                  placeholder="e.g. PRODUCT_PRICING_UPDATE"
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
            </div>
          </div>
        ) : null}

        {tab === "inv_requests" ? (
          <div className="mt-6">
            <InventoryAdjustRequestsPanel />
          </div>
        ) : null}
      </div>

      {/* CANCEL SALE MODAL */}
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

      {/* ARCHIVE / RESTORE MODAL */}
      {archOpen ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow max-w-md w-full p-4">
            <div className="font-semibold">
              {archMode === "archive" ? "Archive" : "Restore"} product #
              {archProduct?.id}
            </div>

            {archMode === "archive" ? (
              <div className="mt-3">
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Reason (optional)"
                  value={archReason}
                  onChange={(e) => setArchReason(e.target.value)}
                />
              </div>
            ) : null}

            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => {
                  setArchOpen(false);
                  setArchProduct(null);
                  setArchReason("");
                }}
                className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
                disabled={archBusy}
              >
                Close
              </button>

              <button
                onClick={confirmArchiveRestore}
                className={
                  "px-4 py-2 rounded-lg text-white text-sm " +
                  (archMode === "archive"
                    ? "bg-black hover:bg-gray-800"
                    : "bg-green-600 hover:bg-green-700")
                }
                disabled={archBusy}
              >
                {archBusy
                  ? "Working..."
                  : archMode === "archive"
                    ? "Confirm archive"
                    : "Confirm restore"}
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

function TodayMixWidget({ breakdown }) {
  const buckets = useMemo(() => {
    const out = {
      CASH: { count: 0, total: 0 },
      MOMO: { count: 0, total: 0 },
      BANK: { count: 0, total: 0 },
      CARD: { count: 0, total: 0 },
      OTHER: { count: 0, total: 0 },
    };
    for (const r of Array.isArray(breakdown) ? breakdown : []) {
      const k = normalizeMethodKey(r?.method);
      out[k].count += Number(r?.count || 0);
      out[k].total += Number(r?.total || 0);
    }
    return out;
  }, [breakdown]);

  const totalToday = Object.values(buckets).reduce(
    (s, x) => s + Number(x.total || 0),
    0,
  );

  function pct(total) {
    const t = Number(total || 0);
    if (!Number.isFinite(t) || t <= 0) return 0;
    if (totalToday <= 0) return 0;
    return Math.round((t / totalToday) * 100);
  }

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="font-semibold">Today payment mix</div>
      <div className="text-xs text-gray-500 mt-1">
        Totals + share of today’s collected money.
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        {["CASH", "MOMO", "BANK", "CARD", "OTHER"].map((k) => (
          <div key={k} className="border rounded-xl p-3">
            <div className="text-xs text-gray-500">{k}</div>
            <div className="text-lg font-semibold mt-1">{buckets[k].count}</div>
            <div className="text-sm text-gray-700 mt-1">
              Total: {money(buckets[k].total)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {pct(buckets[k].total)}%
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-sm text-gray-700">
        <b>Today total:</b> {money(totalToday)}
      </div>
    </div>
  );
}

function LowStockWidget({ lowStock, threshold, products }) {
  function nameFor(productId) {
    const pid = String(productId || "");
    const p =
      (Array.isArray(products) ? products : []).find(
        (x) => String(x?.id) === pid,
      ) || null;
    return p?.name || p?.productName || p?.title || `Product #${pid}`;
  }

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="p-4 border-b">
        <div className="font-semibold">Low stock alerts</div>
        <div className="text-xs text-gray-500 mt-1">
          Items with qty ≤ {threshold}.
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3">Product</th>
              <th className="text-right p-3">Qty</th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(lowStock) ? lowStock : []).map((r, idx) => (
              <tr key={`${r?.productId || idx}`} className="border-t">
                <td className="p-3">
                  <div className="font-medium">{nameFor(r?.productId)}</div>
                  <div className="text-xs text-gray-500">
                    ID: {r?.productId ?? "-"}
                  </div>
                </td>
                <td className="p-3 text-right font-semibold">
                  {Number(r?.qtyOnHand ?? r?.qty_on_hand ?? 0)}
                </td>
              </tr>
            ))}
            {(Array.isArray(lowStock) ? lowStock : []).length === 0 ? (
              <tr>
                <td colSpan={2} className="p-4 text-sm text-gray-600">
                  No low stock alerts.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StuckSalesWidget({ stuck, rule }) {
  function ageLabel(seconds) {
    const s = Number(seconds || 0);
    if (!Number.isFinite(s) || s <= 0) return "-";
    const mins = Math.floor(s / 60);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days}d ${hrs % 24}h`;
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m`;
  }

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="p-4 border-b">
        <div className="font-semibold">Stuck sales</div>
        <div className="text-xs text-gray-500 mt-1">
          Rule: {rule || "aging sales"}.
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3">Sale</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Total</th>
              <th className="text-left p-3">Age</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(stuck) ? stuck : []).map((s, idx) => (
              <tr key={s?.id || idx} className="border-t">
                <td className="p-3 font-medium">#{s?.id ?? "-"}</td>
                <td className="p-3">{s?.status ?? "-"}</td>
                <td className="p-3 text-right">{money(s?.totalAmount ?? 0)}</td>
                <td className="p-3">{ageLabel(s?.ageSeconds)}</td>
                <td className="p-3">{fmt(s?.createdAt)}</td>
              </tr>
            ))}

            {(Array.isArray(stuck) ? stuck : []).length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-sm text-gray-600">
                  No stuck sales (good).
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
