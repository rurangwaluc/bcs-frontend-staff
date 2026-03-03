// ✅ PASTE THIS WHOLE FILE INTO:
// frontend-staff/src/app/admin/page.js

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AdminUsersPanel from "../../components/AdminUsersPanel";
import AuditLogsPanel from "../../components/AuditLogsPanel";
import CashReportsPanel from "../../components/CashReportsPanel";
import CreditsPanel from "../../components/CreditsPanel";
import ReportsPanel from "../../components/ReportsPanel";
import RoleBar from "../../components/RoleBar";

import TodayMixWidget from "../../components/TodayMixWidget";
import LowStockWidget from "../../components/LowStockWidget";
import StuckSalesWidget from "../../components/StuckSalesWidget";
import Last10PaymentsWidget from "../../components/Last10PaymentsWidget";

import AsyncButton from "../../components/AsyncButton";
import { apiFetch } from "../../lib/api";
import { getMe } from "../../lib/auth";

/**
 * Admin endpoints (must exist in backend)
 */
const ENDPOINTS = {
  ADMIN_DASH: "/admin/dashboard",

  SALES_LIST: "/sales",
  INVENTORY_LIST: "/inventory",
  PRODUCTS_LIST: "/products",

  PAYMENTS_LIST: "/payments",
  PAYMENTS_SUMMARY: "/payments/summary",

  CREDITS_OPEN: "/credits/open",
  USERS_LIST: "/users",

  PRODUCT_DELETE: (id) => `/products/${id}`,
};

const SECTIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "cash", label: "Cash reports" },
  { key: "sales", label: "Sales" },
  { key: "inventory", label: "Inventory" },
  { key: "payments", label: "Payments" },
  { key: "credits", label: "Credits" },
  { key: "users", label: "Staff" },
  { key: "reports", label: "Reports" },
];

const ADVANCED = [
  { key: "audit", label: "Audit" },
  { key: "evidence", label: "Proof & history" },
];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function money(n) {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return "0";
  return Math.round(x).toLocaleString();
}

function fmt(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
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

function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function sortByCreatedAtDesc(a, b) {
  const ta = new Date(a?.createdAt || a?.created_at || 0).getTime() || 0;
  const tb = new Date(b?.createdAt || b?.created_at || 0).getTime() || 0;
  if (tb !== ta) return tb - ta;
  return String(b?.id ?? "").localeCompare(String(a?.id ?? ""));
}

function locationLabel(me) {
  const loc = me?.location || null;

  const name =
    (loc?.name != null ? String(loc.name).trim() : "") ||
    (me?.locationName != null ? String(me.locationName).trim() : "") ||
    "";

  const code =
    (loc?.code != null ? String(loc.code).trim() : "") ||
    (me?.locationCode != null ? String(me.locationCode).trim() : "") ||
    "";

  const id = loc?.id ?? me?.locationId ?? me?.location_id ?? null;

  if (name && code) return `${name} (${code})`;
  if (name) return name;
  if (id != null && id !== "") return `Location #${id}`;
  return "Location —";
}

function buildEvidenceUrl({ entity, entityId, from, to, action, userId, q, limit }) {
  const params = new URLSearchParams();
  if (entity) params.set("entity", String(entity));
  if (entityId) params.set("entityId", String(entityId));
  if (from) params.set("from", String(from));
  if (to) params.set("to", String(to));
  if (action) params.set("action", String(action));
  if (userId) params.set("userId", String(userId));
  if (q) params.set("q", String(q));
  const lim = Number(limit);
  if (Number.isFinite(lim) && lim > 0) params.set("limit", String(lim));
  return `/evidence?${params.toString()}`;
}

/* ---------- UI atoms ---------- */

function Skeleton({ className = "" }) {
  return <div className={cx("animate-pulse rounded-xl bg-slate-200/70", className)} />;
}

function TableSkeletonRows({ cols = 6, rows = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-slate-100">
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="p-3">
              <div className="h-4 w-full max-w-[220px] rounded bg-slate-200/70 animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function Banner({ kind = "info", children }) {
  const styles =
    kind === "success"
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : kind === "warn"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : kind === "danger"
          ? "bg-rose-50 text-rose-900 border-rose-200"
          : "bg-slate-50 text-slate-800 border-slate-200";

  return <div className={cx("rounded-2xl border px-4 py-3 text-sm", styles)}>{children}</div>;
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none",
        "focus:ring-2 focus:ring-slate-300",
        className,
      )}
    />
  );
}

function Select({ className = "", ...props }) {
  return (
    <select
      {...props}
      className={cx(
        "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none",
        "focus:ring-2 focus:ring-slate-300",
        className,
      )}
    />
  );
}

function SectionCard({ title, hint, right, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {hint ? <div className="mt-1 text-xs text-slate-600">{hint}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function NavItem({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "w-full text-left rounded-xl px-3 py-2.5 text-sm font-semibold transition",
        active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50",
      )}
    >
      {label}
    </button>
  );
}

function Badge({ kind = "gray", children }) {
  const cls =
    kind === "green"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : kind === "amber"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : kind === "red"
          ? "bg-rose-50 text-rose-800 border-rose-200"
          : "bg-slate-50 text-slate-700 border-slate-200";

  return <span className={cx("inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-semibold", cls)}>{children}</span>;
}

function SaleStatusBadge({ status }) {
  const s = String(status || "").toUpperCase();
  if (s.includes("CANCEL")) return <Badge kind="red">Cancelled</Badge>;
  if (s.includes("COMPLETE") || s === "PAID") return <Badge kind="green">Completed</Badge>;
  if (s.includes("AWAIT") || s.includes("PENDING") || s.includes("DRAFT")) return <Badge kind="amber">{s || "Pending"}</Badge>;
  return <Badge kind="gray">{s || "—"}</Badge>;
}

function InventoryStatusBadge({ row, product }) {
  // Not guessing. If backend gives status fields, we show them.
  const archived =
    product?.isArchived === true ||
    product?.is_archived === true ||
    product?.isActive === false ||
    product?.is_active === false ||
    String(product?.status || "").toUpperCase() === "ARCHIVED";

  if (archived) return <Badge kind="amber">Archived</Badge>;
  return <Badge kind="green">Active</Badge>;
}

/* ---------- Page ---------- */

export default function AdminPage() {
  const router = useRouter();

  const [bootLoading, setBootLoading] = useState(true);
  const [me, setMe] = useState(null);

  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info");

  const [section, setSection] = useState("dashboard");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [refreshNonce, setRefreshNonce] = useState(0);
  const [refreshState, setRefreshState] = useState("idle"); // idle | loading | success

  function toast(kind, text) {
    setMsgKind(kind);
    setMsg(text || "");
  }

  // Role guard (admin only)
  useEffect(() => {
    let alive = true;

    (async () => {
      setBootLoading(true);
      try {
        const data = await getMe();
        if (!alive) return;

        const user = data?.user || null;
        setMe(user);

        const role = String(user?.role || "").toLowerCase();
        if (!role) return router.replace("/login");

        if (role !== "admin") {
          const map = { owner: "/owner", manager: "/manager", store_keeper: "/store-keeper", cashier: "/cashier", seller: "/seller" };
          router.replace(map[role] || "/");
          return;
        }
      } catch {
        if (!alive) return;
        router.replace("/login");
      } finally {
        if (!alive) return;
        setBootLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  const isAuthorized = !!me && String(me?.role || "").toLowerCase() === "admin";

  // dashboard
  const [dash, setDash] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);

  const loadAdminDash = useCallback(async () => {
    setDashLoading(true);
    toast("info", "");
    try {
      const data = await apiFetch(ENDPOINTS.ADMIN_DASH, { method: "GET" });
      setDash(data?.dashboard || null);
    } catch (e) {
      setDash(null);
      toast("danger", e?.data?.error || e?.message || "Failed to load admin dashboard");
    } finally {
      setDashLoading(false);
    }
  }, []);

  // sales
  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);

  const [salesQ, setSalesQ] = useState("");
  const [salesStatusFilter, setSalesStatusFilter] = useState("ALL"); // ALL | TODAY | AWAITING | COMPLETED | CANCELLED
  const [salesFrom, setSalesFrom] = useState("");
  const [salesTo, setSalesTo] = useState("");

  const loadSales = useCallback(async () => {
    setSalesLoading(true);
    toast("info", "");
    try {
      const data = await apiFetch(ENDPOINTS.SALES_LIST, { method: "GET" });
      setSales(normalizeList(data, ["sales"]));
    } catch (e) {
      setSales([]);
      toast("danger", e?.data?.error || e?.message || "Failed to load sales");
    } finally {
      setSalesLoading(false);
    }
  }, []);

  const salesSorted = useMemo(() => (Array.isArray(sales) ? sales : []).slice().sort(sortByCreatedAtDesc), [sales]);

  function dateOnly(v) {
    if (!v) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  const filteredSales = useMemo(() => {
    let list = salesSorted;

    // status filters
    if (salesStatusFilter === "TODAY") {
      list = list.filter((s) => isToday(s.createdAt || s.created_at));
    } else if (salesStatusFilter === "AWAITING") {
      list = list.filter((s) => String(s.status || "").toUpperCase().includes("AWAIT"));
    } else if (salesStatusFilter === "COMPLETED") {
      list = list.filter((s) => {
        const st = String(s.status || "").toUpperCase();
        return st.includes("COMPLETE") || st === "PAID";
      });
    } else if (salesStatusFilter === "CANCELLED") {
      list = list.filter((s) => String(s.status || "").toUpperCase().includes("CANCEL"));
    }

    // date range filter (if provided)
    const fromMs = salesFrom ? dateOnly(salesFrom) : null;
    const toMs = salesTo ? dateOnly(salesTo) : null;

    if (fromMs != null || toMs != null) {
      list = list.filter((s) => {
        const t = dateOnly(s.createdAt || s.created_at);
        if (t == null) return true;
        if (fromMs != null && t < fromMs) return false;
        if (toMs != null && t > toMs) return false;
        return true;
      });
    }

    // free text search
    const qq = String(salesQ || "").trim().toLowerCase();
    if (!qq) return list;

    return list.filter((s) => {
      const id = String(s?.id ?? "");
      const status = String(s?.status ?? "").toLowerCase();
      const customerName = String(s?.customerName ?? s?.customer_name ?? "").toLowerCase();
      const customerPhone = String(s?.customerPhone ?? s?.customer_phone ?? "").toLowerCase();

      // If backend provides these, we will show them:
      const cashierName = String(s?.cashierName ?? s?.cashier_name ?? s?.cashier ?? "").toLowerCase();
      const staffName = String(s?.staffName ?? s?.staff_name ?? s?.createdByName ?? "").toLowerCase();

      const total = String(s?.totalAmount ?? s?.total ?? "");
      const paid = String(s?.amountPaid ?? s?.amount_paid ?? "");
      return (
        id.includes(qq) ||
        status.includes(qq) ||
        customerName.includes(qq) ||
        customerPhone.includes(qq) ||
        cashierName.includes(qq) ||
        staffName.includes(qq) ||
        total.includes(qq) ||
        paid.includes(qq)
      );
    });
  }, [salesSorted, salesQ, salesStatusFilter, salesFrom, salesTo]);

  const salesToday = useMemo(() => (Array.isArray(sales) ? sales : []).filter((s) => isToday(s.createdAt || s.created_at)), [sales]);
  const salesTodayTotal = useMemo(() => salesToday.reduce((sum, s) => sum + Number(s.totalAmount ?? s.total ?? 0), 0), [salesToday]);
  // Awaiting payment (same meaning as your old page)
  const awaitingPayment = useMemo(() => {
  const list = Array.isArray(sales) ? sales : [];
  return list.filter((s) => String(s?.status || "").toUpperCase().includes("AWAIT"));
  }, [sales]);

  // inventory + products
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [invLoading, setInvLoading] = useState(false);
  const [prodLoading, setProdLoading] = useState(false);
  const [invQ, setInvQ] = useState("");

  const loadInventory = useCallback(async () => {
    setInvLoading(true);
    toast("info", "");
    try {
      const data = await apiFetch(ENDPOINTS.INVENTORY_LIST, { method: "GET" });
      setInventory(normalizeList(data, ["inventory"]));
    } catch (e) {
      setInventory([]);
      toast("danger", e?.data?.error || e?.message || "Failed to load inventory");
    } finally {
      setInvLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setProdLoading(true);
    toast("info", "");
    try {
      const data = await apiFetch(ENDPOINTS.PRODUCTS_LIST, { method: "GET" });
      setProducts(normalizeList(data, ["products", "pricing", "items", "rows"]));
    } catch (e) {
      setProducts([]);
      const text = e?.data?.error || e?.message || "";
      if (!String(text).toLowerCase().includes("not found")) {
        toast("danger", e?.data?.error || e?.message || "Failed to load products");
      }
    } finally {
      setProdLoading(false);
    }
  }, []);

  function productFromInventoryRow(invRow) {
    const pid = invRow?.productId ?? invRow?.product_id ?? invRow?.id;
    const sku = invRow?.sku;

    const list = Array.isArray(products) ? products : [];
    const byId = pid != null ? list.find((x) => String(x?.id) === String(pid)) : null;
    const bySku = !byId && sku ? list.find((x) => String(x?.sku) === String(sku)) : null;
    return byId || bySku || null;
  }

  function priceFor(invRow) {
    const prod = productFromInventoryRow(invRow);
    const price =
      prod?.sellingPrice ??
      prod?.selling_price ??
      prod?.price ??
      prod?.unitPrice ??
      prod?.unit_price ??
      null;

    return price == null ? "—" : money(price);
  }

  function costFor(invRow) {
    const prod = productFromInventoryRow(invRow);
    const cost = prod?.purchasePrice ?? prod?.costPrice ?? prod?.cost_price ?? null;
    return cost == null ? "—" : money(cost);
  }

  const filteredInventory = useMemo(() => {
    const qq = String(invQ || "").trim().toLowerCase();
    const list = Array.isArray(inventory) ? inventory : [];
    if (!qq) return list;

    return list.filter((p) => {
      const name = String(p?.name || p?.productName || p?.product_name || "").toLowerCase();
      const sku = String(p?.sku || "").toLowerCase();
      const pid = String(p?.productId ?? p?.product_id ?? p?.id ?? "").toLowerCase();
      return name.includes(qq) || sku.includes(qq) || pid.includes(qq);
    });
  }, [inventory, invQ]);

  // delete modal
  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [delProduct, setDelProduct] = useState(null);

  function openDelete(invRow) {
    const p = productFromInventoryRow(invRow);
    if (!p?.id) {
      toast("warn", "Cannot delete: missing product id.");
      return;
    }
    setDelProduct(p);
    setDelOpen(true);
    toast("info", "");
  }

  async function confirmDelete() {
    const pid = delProduct?.id;
    if (!pid) return;

    setDelBusy(true);
    toast("info", "");
    try {
      await apiFetch(ENDPOINTS.PRODUCT_DELETE(pid), { method: "DELETE" });
      toast("success", "Deleted product.");
      setDelOpen(false);
      setDelProduct(null);
      await Promise.all([loadProducts(), loadInventory()]);
    } catch (e) {
      toast("danger", e?.data?.error || e?.message || "Delete failed");
    } finally {
      setDelBusy(false);
    }
  }

  // payments
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsSummary, setPaymentsSummary] = useState(null);
  const [paySummaryLoading, setPaySummaryLoading] = useState(false);

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.PAYMENTS_LIST, { method: "GET" });
      setPayments(normalizeList(data, ["payments"]));
    } catch (e) {
      setPayments([]);
      const text = e?.data?.error || e?.message || "";
      if (!String(text).toLowerCase().includes("not found")) {
        toast("danger", e?.data?.error || e?.message || "Failed to load payments");
      }
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  const loadPaymentsSummary = useCallback(async () => {
    setPaySummaryLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.PAYMENTS_SUMMARY, { method: "GET" });
      setPaymentsSummary(data?.summary || data || null);
    } catch (e) {
      setPaymentsSummary(null);
      const text = e?.data?.error || e?.message || "";
      if (!String(text).toLowerCase().includes("not found")) {
        toast("danger", e?.data?.error || e?.message || "Failed to load payment summary");
      }
    } finally {
      setPaySummaryLoading(false);
    }
  }, []);

  const paidToday = useMemo(() => (Array.isArray(payments) ? payments : []).filter((p) => isToday(p.createdAt || p.created_at)), [payments]);
  const paidTodayTotal = useMemo(() => paidToday.reduce((sum, p) => sum + Number(p.amount || 0), 0), [paidToday]);

  // credits open
  const [openCredits, setOpenCredits] = useState([]);
  const [creditsLoading, setCreditsLoading] = useState(false);

  const loadCreditsOpen = useCallback(async () => {
    setCreditsLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.CREDITS_OPEN, { method: "GET" });
      setOpenCredits(normalizeList(data, ["credits", "openCredits"]));
    } catch {
      setOpenCredits([]);
    } finally {
      setCreditsLoading(false);
    }
  }, []);

  // users
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    toast("info", "");
    try {
      const data = await apiFetch(ENDPOINTS.USERS_LIST, { method: "GET" });
      setUsers(normalizeList(data, ["users"]));
    } catch (e) {
      setUsers([]);
      toast("danger", e?.data?.error || e?.message || "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // evidence form
  const [evEntity, setEvEntity] = useState("sale");
  const [evEntityId, setEvEntityId] = useState("");
  const [evFrom, setEvFrom] = useState("");
  const [evTo, setEvTo] = useState("");
  const [evAction, setEvAction] = useState("");
  const [evUserId, setEvUserId] = useState("");
  const [evQ, setEvQ] = useState("");
  const [evLimit, setEvLimit] = useState(200);

  // ✅ IMPORTANT FIX:
  // This effect DOES NOT return a Promise anymore.
  useEffect(() => {
    if (!isAuthorized) return;

    let alive = true;

    (async () => {
      try {
        if (section === "dashboard") {
          await Promise.all([loadAdminDash(), loadSales(), loadInventory(), loadProducts(), loadPaymentsSummary(), loadPayments()]);
          return;
        }
        if (section === "sales") await loadSales();
        if (section === "inventory") await Promise.all([loadInventory(), loadProducts()]);
        if (section === "payments") await Promise.all([loadPaymentsSummary(), loadPayments()]);
        if (section === "credits") await loadCreditsOpen();
        if (section === "users") await loadUsers();
      } finally {
        // do nothing
      }
    })();

    return () => {
      alive = false;
      void alive;
    };
  }, [
    isAuthorized,
    section,
    loadAdminDash,
    loadSales,
    loadInventory,
    loadProducts,
    loadPaymentsSummary,
    loadPayments,
    loadCreditsOpen,
    loadUsers,
  ]);

  const refreshCurrent = useCallback(async () => {
    toast("info", "");
    setRefreshState("loading");

    try {
      const componentTabs = new Set(["cash", "audit", "reports"]);
      if (componentTabs.has(section)) {
        setRefreshNonce((n) => n + 1);
        setRefreshState("success");
        setTimeout(() => setRefreshState("idle"), 900);
        return;
      }

      if (section === "dashboard") {
        await Promise.all([loadAdminDash(), loadSales(), loadInventory(), loadProducts(), loadPaymentsSummary(), loadPayments()]);
      } else if (section === "sales") {
        await loadSales();
      } else if (section === "inventory") {
        await Promise.all([loadInventory(), loadProducts()]);
      } else if (section === "payments") {
        await Promise.all([loadPaymentsSummary(), loadPayments()]);
      } else if (section === "credits") {
        await loadCreditsOpen();
      } else if (section === "users") {
        await loadUsers();
      }

      setRefreshState("success");
      setTimeout(() => setRefreshState("idle"), 900);
    } catch (e) {
      setRefreshState("idle");
      toast("danger", e?.data?.error || e?.message || "Refresh failed");
    }
  }, [
    section,
    loadAdminDash,
    loadSales,
    loadInventory,
    loadProducts,
    loadPaymentsSummary,
    loadPayments,
    loadCreditsOpen,
    loadUsers,
  ]);

  if (bootLoading) {
    return (
      <div className="min-h-screen bg-slate-50 overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-5 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="mt-3 h-4 w-52" />
              <div className="mt-6 grid gap-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <div>
              <Skeleton className="h-12 w-full rounded-2xl" />
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) return <div className="p-6 text-sm text-slate-600">Redirecting…</div>;

  const subtitle = `User: ${me?.email || "—"} • ${locationLabel(me)}`;

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      <RoleBar title="Admin" subtitle={subtitle} user={me} />

      <div className="mx-auto max-w-7xl px-4 sm:px-5 py-6">
        {msg ? (
          <div className="mb-4">
            <Banner kind={msgKind}>{msg}</Banner>
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
          {/* Sidebar */}
          <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 h-fit">
            <div className="text-sm font-semibold text-slate-900">Admin</div>
            <div className="mt-1 text-xs text-slate-600">{locationLabel(me)}</div>

            {/* Mobile picker */}
            <div className="mt-4 lg:hidden">
              <div className="text-xs font-semibold text-slate-600 mb-2">Section</div>
              <Select value={section} onChange={(e) => setSection(e.target.value)}>
                {[...SECTIONS, ...(showAdvanced ? ADVANCED : [])].map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Desktop nav */}
            <div className="mt-4 hidden lg:grid gap-2">
              {SECTIONS.map((s) => (
                <NavItem key={s.key} active={section === s.key} label={s.label} onClick={() => setSection(s.key)} />
              ))}

              <div className="mt-2 pt-3 border-t border-slate-200">
                <label className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-700">
                  <span>Advanced</span>
                  <input type="checkbox" checked={showAdvanced} onChange={(e) => setShowAdvanced(e.target.checked)} />
                </label>

                {showAdvanced ? (
                  <div className="mt-2 grid gap-2">
                    {ADVANCED.map((s) => (
                      <NavItem key={s.key} active={section === s.key} label={s.label} onClick={() => setSection(s.key)} />
                    ))}
                  </div>
                ) : null}

                <div className="mt-3 text-xs text-slate-600">Advanced is for investigations.</div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200">
              <AsyncButton
                state={refreshState}
                text="Refresh"
                loadingText="Refreshing…"
                successText="Done"
                onClick={refreshCurrent}
                className="w-full"
              />
              <div className="mt-3 text-xs text-slate-600">Tip: open Dashboard first.</div>
            </div>
          </aside>

          {/* Main */}
          <main className="grid gap-4">
            {/* DASHBOARD */}
            {section === "dashboard" ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <SectionCard title="Sales today" hint={`Total: ${money(salesTodayTotal)}`}>
                    <div className="text-3xl font-bold text-slate-900">{dashLoading ? "…" : String(dash?.sales?.today?.count ?? salesToday.length)}</div>
                  </SectionCard>

                  <SectionCard title="Awaiting payment" hint="Cashier must record payment">
                    <div className="text-3xl font-bold text-slate-900">{dashLoading ? "…" : String(dash?.sales?.awaitingPayment ?? awaitingPayment.length)}</div>
                  </SectionCard>

                  <SectionCard title="Draft sales" hint="Not finished">
                    <div className="text-3xl font-bold text-slate-900">{dashLoading ? "…" : String(dash?.sales?.draft ?? 0)}</div>
                  </SectionCard>

                  <SectionCard title="Payments today" hint={`Total: ${money(dash?.payments?.today?.total ?? paidTodayTotal ?? 0)}`}>
                    <div className="text-3xl font-bold text-slate-900">{dashLoading ? "…" : String(dash?.payments?.today?.count ?? paidToday.length)}</div>
                  </SectionCard>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <SectionCard title="Today payment mix" hint="How money came in today.">
                    {dashLoading ? <Skeleton className="h-56 w-full" /> : <TodayMixWidget breakdown={dash?.payments?.breakdownToday || []} />}
                  </SectionCard>

                  <SectionCard title="Low stock" hint="Items that need restock.">
                    {dashLoading ? (
                      <Skeleton className="h-56 w-full" />
                    ) : (
                      <LowStockWidget lowStock={dash?.inventory?.lowStock || []} threshold={dash?.inventory?.lowStockThreshold ?? 5} products={products} />
                    )}
                  </SectionCard>

                  <SectionCard title="Stuck sales" hint="Sales that need attention.">
                    {dashLoading ? <Skeleton className="h-56 w-full" /> : <StuckSalesWidget stuck={dash?.sales?.stuck || []} rule={dash?.sales?.stuckRule} />}
                  </SectionCard>

                  <SectionCard title="Last 10 payments" hint="Most recent payments.">
                    {dashLoading ? <Skeleton className="h-56 w-full" /> : <Last10PaymentsWidget rows={dash?.payments?.last10 || []} />}
                  </SectionCard>
                </div>
              </>
            ) : null}

            {/* CASH */}
            {section === "cash" ? (
              <SectionCard title="Cash reports" hint="Cash summary for this location.">
                <CashReportsPanel key={`cash-${refreshNonce}`} title="Admin Cash Oversight" />
              </SectionCard>
            ) : null}

            {/* SALES (REAL WORLD) */}
            {section === "sales" ? (
              <SectionCard
                title="Sales"
                hint="Search, filter, and open proof for disputes."
                right={
                  <button
                    onClick={loadSales}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                  >
                    Reload
                  </button>
                }
              >
                <div className="grid gap-3">
                  <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
                    <div className="lg:col-span-2">
                      <div className="text-xs font-semibold text-slate-600 mb-1">Search</div>
                      <Input placeholder="Customer, phone, status, total…" value={salesQ} onChange={(e) => setSalesQ(e.target.value)} />
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-600 mb-1">Filter</div>
                      <Select value={salesStatusFilter} onChange={(e) => setSalesStatusFilter(e.target.value)}>
                        <option value="ALL">All sales</option>
                        <option value="TODAY">Today</option>
                        <option value="AWAITING">Awaiting payment</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </Select>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-600 mb-1">From</div>
                      <Input type="date" value={salesFrom} onChange={(e) => setSalesFrom(e.target.value)} />
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-600 mb-1">To</div>
                      <Input type="date" value={salesTo} onChange={(e) => setSalesTo(e.target.value)} />
                    </div>

                    <div className="flex items-end gap-2">
                      <button
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 w-full"
                        onClick={() => {
                          setSalesQ("");
                          setSalesStatusFilter("ALL");
                          setSalesFrom("");
                          setSalesTo("");
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr className="border-b border-slate-200">
                          <th className="text-left p-3 text-xs font-semibold">Sale</th>
                          <th className="text-left p-3 text-xs font-semibold">Status</th>
                          <th className="text-right p-3 text-xs font-semibold">Total</th>
                          <th className="text-right p-3 text-xs font-semibold">Paid</th>
                          <th className="text-left p-3 text-xs font-semibold">Customer</th>
                          <th className="text-left p-3 text-xs font-semibold">Staff</th>
                          <th className="text-left p-3 text-xs font-semibold">Time</th>
                          <th className="text-right p-3 text-xs font-semibold">Proof</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesLoading ? (
                          <TableSkeletonRows cols={8} rows={8} />
                        ) : (
                          <>
                            {filteredSales.map((s) => {
                              const total = Number(s?.totalAmount ?? s?.total ?? 0) || 0;
                              const paid = Number(s?.amountPaid ?? s?.amount_paid ?? 0) || 0;

                              const customerName = (s?.customerName || s?.customer_name || "").trim() || "Walk-in customer";
                              const customerPhone = (s?.customerPhone || s?.customer_phone || "").trim();

                              // If backend provides staff/cashier names, we show them. Otherwise, we show "—".
                              const staffName = String(
                                  s?.sellerName ||
                                  s?.seller?.name ||
                                  ""
                                ).trim() || "Unknown staff";
                              const createdAt = s?.createdAt || s?.created_at;

                              return (
                                <tr key={s?.id} className="border-b border-slate-100 hover:bg-slate-50">
                                  <td className="p-3 font-semibold text-slate-900">#{String(s?.id ?? "—")}</td>
                                  <td className="p-3">
                                    <SaleStatusBadge status={s?.status} />
                                  </td>
                                  <td className="p-3 text-right font-semibold">{money(total)}</td>
                                  <td className="p-3 text-right">{money(paid)}</td>
                                  <td className="p-3">
                                    <div className="font-semibold text-slate-900">{customerName}</div>
                                    {customerPhone ? <div className="text-xs text-slate-500">{customerPhone}</div> : null}
                                  </td>
                                  <td className="p-3">{staffName}</td>
                                  <td className="p-3">{fmt(createdAt)}</td>
                                  <td className="p-3 text-right">
                                    <button
                                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                                      onClick={() => {
                                        if (!s?.id) return;
                                        router.push(
                                          buildEvidenceUrl({
                                            entity: "sale",
                                            entityId: String(s.id),
                                            from: salesFrom || "",
                                            to: salesTo || "",
                                            limit: 200,
                                          }),
                                        );
                                      }}
                                    >
                                      Open proof
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}

                            {filteredSales.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="p-6 text-sm text-slate-600">
                                  No sales found.
                                </td>
                              </tr>
                            ) : null}
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="text-xs text-slate-600">
                    Note: “Staff” shows only if backend provides a name field (cashierName / staffName / createdByName).
                  </div>
                </div>
              </SectionCard>
            ) : null}

            {/* INVENTORY (REAL WORLD) */}
            {section === "inventory" ? (
              <SectionCard
                title="Inventory"
                hint="Search items, check stock, and manage products."
                right={
                  <button
                    onClick={() => Promise.all([loadInventory(), loadProducts()])}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                  >
                    Reload
                  </button>
                }
              >
                <div className="grid gap-3">
                  <Input placeholder="Search by name, SKU, product number…" value={invQ} onChange={(e) => setInvQ(e.target.value)} />

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr className="border-b border-slate-200">
                          <th className="text-left p-3 text-xs font-semibold">Item</th>
                          <th className="text-left p-3 text-xs font-semibold">SKU</th>
                          <th className="text-right p-3 text-xs font-semibold">On hand</th>
                          <th className="text-right p-3 text-xs font-semibold">Cost</th>
                          <th className="text-right p-3 text-xs font-semibold">Selling</th>
                          <th className="text-left p-3 text-xs font-semibold">Status</th>
                          <th className="text-right p-3 text-xs font-semibold">Proof</th>
                          <th className="text-right p-3 text-xs font-semibold">Admin</th>
                        </tr>
                      </thead>

                      <tbody>
                        {invLoading || prodLoading ? (
                          <TableSkeletonRows cols={8} rows={8} />
                        ) : (
                          <>
                            {filteredInventory.map((row, idx) => {
                              const pid = row?.productId ?? row?.product_id ?? row?.id ?? null;
                              const name = row?.productName || row?.product_name || row?.name || "—";
                              const sku = row?.sku || "—";
                              const qty = Number(row?.qtyOnHand ?? row?.qty_on_hand ?? row?.qty ?? row?.quantity ?? 0) || 0;

                              const prod = productFromInventoryRow(row);

                              return (
                                <tr key={row?.id || `${pid}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50">
                                  <td className="p-3">
                                    <div className="font-semibold text-slate-900 truncate">{name}</div>
                                    {pid != null ? <div className="text-xs text-slate-500">Product #{String(pid)}</div> : null}
                                  </td>
                                  <td className="p-3 text-slate-600">{sku}</td>
                                  <td className="p-3 text-right font-semibold">{qty}</td>
                                  <td className="p-3 text-right">{costFor(row)}</td>
                                  <td className="p-3 text-right font-semibold">{priceFor(row)}</td>
                                  <td className="p-3">
                                    <InventoryStatusBadge row={row} product={prod} />
                                  </td>
                                  <td className="p-3 text-right">
                                    {pid != null ? (
                                      <button
                                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                                        onClick={() => {
                                          router.push(
                                            buildEvidenceUrl({
                                              entity: "product",
                                              entityId: String(pid),
                                              limit: 200,
                                            }),
                                          );
                                        }}
                                      >
                                        Open proof
                                      </button>
                                    ) : (
                                      <span className="text-xs text-slate-400">—</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-right">
                                    <button
                                      onClick={() => openDelete(row)}
                                      className="rounded-xl bg-rose-600 text-white px-3 py-2 text-xs font-semibold hover:bg-rose-700"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}

                            {filteredInventory.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="p-6 text-sm text-slate-600">
                                  No inventory rows.
                                </td>
                              </tr>
                            ) : null}
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                    Delete is permanent. If the database has sales linked to this product, delete may fail.
                    If that happens, use archive (soft delete) instead.
                  </div>
                </div>
              </SectionCard>
            ) : null}

            {/* PAYMENTS */}
            {section === "payments" ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                <SectionCard
                  title="Payments summary"
                  hint="Read-only."
                  right={
                    <button
                      onClick={() => Promise.all([loadPaymentsSummary(), loadPayments()])}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                    >
                      Reload
                    </button>
                  }
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SectionCard title="Today" hint={`Total: ${money(paymentsSummary?.today?.total ?? 0)}`}>
                      <div className="text-3xl font-bold text-slate-900">
                        {paySummaryLoading ? "…" : String(paymentsSummary?.today?.count ?? 0)}
                      </div>
                    </SectionCard>
                    <SectionCard title="All time" hint={`Total: ${money(paymentsSummary?.allTime?.total ?? 0)}`}>
                      <div className="text-3xl font-bold text-slate-900">
                        {paySummaryLoading ? "…" : String(paymentsSummary?.allTime?.count ?? 0)}
                      </div>
                    </SectionCard>
                  </div>
                </SectionCard>

                <SectionCard title="Payments list" hint="Latest payments (read-only).">
                  <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10">
                        <tr className="border-b border-slate-200">
                          <th className="text-left p-3 text-xs font-semibold">Payment</th>
                          <th className="text-left p-3 text-xs font-semibold">Sale</th>
                          <th className="text-right p-3 text-xs font-semibold">Amount</th>
                          <th className="text-left p-3 text-xs font-semibold">Method</th>
                          <th className="text-left p-3 text-xs font-semibold">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentsLoading ? (
                          <TableSkeletonRows cols={5} rows={10} />
                        ) : (
                          <>
                            {(Array.isArray(payments) ? payments : []).map((p) => (
                              <tr key={p?.id} className="border-b border-slate-100">
                                <td className="p-3 font-semibold text-slate-900">#{String(p?.id ?? "—")}</td>
                                <td className="p-3">{p?.saleId ?? p?.sale_id ?? "—"}</td>
                                <td className="p-3 text-right font-semibold">{money(p?.amount ?? 0)}</td>
                                <td className="p-3">{p?.method ?? "—"}</td>
                                <td className="p-3">{fmt(p?.createdAt || p?.created_at)}</td>
                              </tr>
                            ))}
                            {(Array.isArray(payments) ? payments : []).length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-6 text-sm text-slate-600">
                                  No payments found.
                                </td>
                              </tr>
                            ) : null}
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              </div>
            ) : null}

            {/* CREDITS */}
            {section === "credits" ? (
              <SectionCard title="Credits" hint="Admin can approve/decline and settle credits.">
                <CreditsPanel
                  key={`credits-${refreshNonce}`}
                  title="Credits (Admin)"
                  capabilities={{ canView: true, canCreate: false, canDecide: true, canSettle: true }}
                />
                {creditsLoading ? <div className="mt-3 text-xs text-slate-600">Loading…</div> : null}
              </SectionCard>
            ) : null}

            {/* USERS */}
            {section === "users" ? (
              <SectionCard title="Staff" hint="Manage staff accounts.">
                <AdminUsersPanel users={users} loading={usersLoading} />
              </SectionCard>
            ) : null}

            {/* REPORTS */}
            {section === "reports" ? (
              <SectionCard title="Reports" hint="Quick overview.">
                <ReportsPanel key={`reports-${refreshNonce}`} />
              </SectionCard>
            ) : null}

            {/* ADVANCED: AUDIT */}
            {section === "audit" ? (
              <SectionCard title="Audit history" hint="Read-only log of actions.">
                <AuditLogsPanel
                  key={`audit-${refreshNonce}`}
                  title="Actions history"
                  subtitle="Admin view (read-only)."
                  currentLocationLabel={locationLabel(me)}
                />
              </SectionCard>
            ) : null}

            {/* ADVANCED: EVIDENCE */}
            {section === "evidence" ? (
              <SectionCard
                title="Proof & history"
                hint="Use this when something looks wrong. It helps you see what changed, who did it, and when."
              >
                <div className="grid gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
                    <div className="font-semibold text-slate-900">How to use</div>
                    <div className="mt-1 text-slate-700">
                      Choose what you want to check, enter the record code, then open the proof page.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-600 mb-1">What are you checking?</div>
                      <Select value={evEntity} onChange={(e) => setEvEntity(e.target.value)}>
                        <option value="sale">Sales</option>
                        <option value="payment">Payments</option>
                        <option value="credit">Credits</option>
                        <option value="refund">Refunds</option>
                        <option value="cash_session">Cash sessions</option>
                        <option value="expense">Expenses</option>
                        <option value="deposit">Deposits</option>
                        <option value="user">Staff</option>
                        <option value="inventory">Inventory</option>
                        <option value="product">Products</option>
                      </Select>
                    </div>

                    <div className="md:col-span-2">
                      <div className="text-xs font-semibold text-slate-600 mb-1">Record code</div>
                      <Input placeholder="Paste the record code" value={evEntityId} onChange={(e) => setEvEntityId(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-600 mb-1">From (optional)</div>
                      <Input type="date" value={evFrom} onChange={(e) => setEvFrom(e.target.value)} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-600 mb-1">To (optional)</div>
                      <Input type="date" value={evTo} onChange={(e) => setEvTo(e.target.value)} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-600 mb-1">Action (optional)</div>
                      <Input placeholder="Example: SALE_CANCEL" value={evAction} onChange={(e) => setEvAction(e.target.value)} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-600 mb-1">Staff code (optional)</div>
                      <Input placeholder="Who did it" value={evUserId} onChange={(e) => setEvUserId(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <div className="text-xs font-semibold text-slate-600 mb-1">Search words (optional)</div>
                      <Input placeholder="Example: cancelled, price change" value={evQ} onChange={(e) => setEvQ(e.target.value)} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-600 mb-1">Rows</div>
                      <Select value={String(evLimit)} onChange={(e) => setEvLimit(Number(e.target.value || 200))}>
                        <option value="50">50</option>
                        <option value="100">100</option>
                        <option value="200">200</option>
                        <option value="300">300</option>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-800"
                      onClick={() => {
                        const id = String(evEntityId || "").trim();
                        if (!id) {
                          toast("warn", "Record code is required.");
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
                      Open proof →
                    </button>

                    <button
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                      onClick={() => {
                        setEvEntity("sale");
                        setEvEntityId("");
                        setEvFrom("");
                        setEvTo("");
                        setEvAction("");
                        setEvUserId("");
                        setEvQ("");
                        setEvLimit(200);
                        toast("info", "");
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </SectionCard>
            ) : null}
          </main>
        </div>
      </div>

      {/* DELETE MODAL */}
      {delOpen ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="text-sm font-semibold text-slate-900">Delete product</div>
              <div className="text-xs text-slate-600 mt-1">
                Product #{delProduct?.id} • {(delProduct?.name || delProduct?.productName || delProduct?.title || "—")}
              </div>
            </div>

            <div className="p-4">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                This is permanent. If the database has sales linked to this product, delete may fail.
              </div>

              <div className="mt-4 flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setDelOpen(false);
                    setDelProduct(null);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                  disabled={delBusy}
                >
                  Close
                </button>

                <button
                  onClick={confirmDelete}
                  className="rounded-xl bg-rose-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-rose-700 disabled:opacity-60"
                  disabled={delBusy}
                >
                  {delBusy ? "Deleting…" : "Confirm delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}