"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import AdminUsersPanel from "../../components/AdminUsersPanel";
import AsyncButton from "../../components/AsyncButton";
import AuditLogsPanel from "../../components/AuditLogsPanel";
import CashReportsPanel from "../../components/CashReportsPanel";
import CreditsPanel from "../../components/CreditsPanel";
import InventoryAdjustRequestsPanel from "../../components/InventoryAdjustRequestsPanel";
import Last10PaymentsWidget from "../../components/Last10PaymentsWidget";
import LowStockWidget from "../../components/LowStockWidget";
import NotificationsBell from "../../components/NotificationsBell";
import ProductPricingPanel from "../../components/ProductPricingPanel";
import ReportsPanel from "../../components/ReportsPanel";
import RoleBar from "../../components/RoleBar";
import StuckSalesWidget from "../../components/StuckSalesWidget";
import SuppliersPanel from "../../components/SuppliersPanel";
import TodayMixWidget from "../../components/TodayMixWidget";
import { apiFetch } from "../../lib/api";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

/**
 * Admin endpoints
 */
const ENDPOINTS = {
  // Admin dashboard
  ADMIN_DASH: "/admin/dashboard",

  // Sales
  SALES_LIST: "/sales",
  SALE_CANCEL: (id) => `/sales/${id}/cancel`,

  // Inventory / products
  INVENTORY_LIST: "/inventory",
  PRODUCTS_LIST: "/products",
  INVENTORY_ARRIVALS_LIST: "/inventory/arrivals",
  INV_ADJ_REQ_LIST: "/inventory/adjust-requests",

  PRODUCT_ARCHIVE: (id) => `/products/${id}/archive`,
  PRODUCT_RESTORE: (id) => `/products/${id}/restore`,
  PRODUCT_DELETE: (id) => `/products/${id}`,

  // Payments
  PAYMENTS_LIST: "/payments",
  PAYMENTS_SUMMARY: "/payments/summary",

  // Credits
  CREDITS_OPEN: "/credits/open",

  // Users
  USERS_LIST: "/users",

  // Suppliers
  SUPPLIERS_LIST: "/suppliers",
  SUPPLIER_BILLS_LIST: "/supplier-bills",
  SUPPLIER_SUMMARY: "/supplier/summary",
  SUPPLIER_CREATE: "/suppliers",
  SUPPLIER_BILL_CREATE: "/supplier-bills",
};

const SECTIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "sales", label: "Sales" },
  { key: "payments", label: "Payments" },
  { key: "inventory", label: "Inventory" },
  { key: "arrivals", label: "Stock arrivals" },
  { key: "pricing", label: "Pricing" },
  { key: "inv_requests", label: "Inventory requests" },
  { key: "suppliers", label: "Suppliers" },
  { key: "cash", label: "Cash reports" },
  { key: "credits", label: "Credits" },
  { key: "users", label: "Staff" },
  { key: "reports", label: "Reports" },
];

const ADVANCED = [
  { key: "audit", label: "Audit" },
  { key: "evidence", label: "Proof & history" },
];

const PAGE_SIZE = 10;

/* ---------------- helpers ---------------- */

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
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
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
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

  if (name && code) return `${name} (${code})`;
  if (name) return name;
  return "Location";
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
  if (from) params.set("from", String(from));
  if (to) params.set("to", String(to));
  if (action) params.set("action", String(action));
  if (userId) params.set("userId", String(userId));
  if (q) params.set("q", String(q));
  const lim = Number(limit);
  if (Number.isFinite(lim) && lim > 0) params.set("limit", String(lim));
  return `/evidence?${params.toString()}`;
}

function StatusBadge({ status }) {
  const s = String(status || "").toUpperCase();
  const tone =
    s.includes("CANCEL") || s === "VOID"
      ? "danger"
      : s.includes("COMPLETE") || s === "PAID"
        ? "success"
        : s.includes("AWAIT") || s.includes("PEND") || s.includes("DRAFT")
          ? "warn"
          : "neutral";

  const cls =
    tone === "success"
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : tone === "warn"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : tone === "danger"
          ? "bg-rose-50 text-rose-900 border-rose-200"
          : "bg-slate-50 text-slate-800 border-slate-200";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-xl border px-2.5 py-1 text-[11px] font-extrabold",
        cls,
      )}
    >
      {s || "—"}
    </span>
  );
}

function isArchivedProduct(p) {
  if (!p) return false;
  if (p.isActive === false) return true;
  if (p.is_active === false) return true;
  if (p.isArchived === true) return true;
  if (p.is_archived === true) return true;
  if (p.archivedAt || p.archived_at) return true;
  if (String(p.status || "").toUpperCase() === "ARCHIVED") return true;
  return false;
}

/* ---------------- UI atoms ---------------- */

function Skeleton({ className = "" }) {
  return (
    <div
      className={cx("animate-pulse rounded-xl bg-slate-200/70", className)}
    />
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

  return (
    <div className={cx("rounded-2xl border px-4 py-3 text-sm", styles)}>
      {children}
    </div>
  );
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
          {hint ? (
            <div className="mt-1 text-xs text-slate-600">{hint}</div>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Pill({ tone = "neutral", children }) {
  const cls =
    tone === "success"
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : tone === "warn"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : tone === "danger"
          ? "bg-rose-50 text-rose-900 border-rose-200"
          : tone === "info"
            ? "bg-sky-50 text-sky-900 border-sky-200"
            : "bg-slate-50 text-slate-800 border-slate-200";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-xl border px-2.5 py-1 text-[11px] font-extrabold",
        cls,
      )}
    >
      {children}
    </span>
  );
}

function NavItem({ active, label, onClick, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "w-full text-left rounded-xl px-3 py-2.5 text-sm font-semibold transition",
        "flex items-center justify-between gap-2",
        active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50",
      )}
    >
      <span className="truncate">{label}</span>
      {badge != null ? (
        <span
          className={cx(
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-extrabold border",
            active
              ? "bg-white/10 text-white border-white/20"
              : "bg-slate-50 text-slate-900 border-slate-200",
          )}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

/* ---------------- Page ---------------- */

export default function AdminPage() {
  const router = useRouter();

  const [bootLoading, setBootLoading] = useState(true);
  const [me, setMe] = useState(null);

  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info");

  const [section, setSection] = useState("dashboard");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [refreshNonce, setRefreshNonce] = useState(0);
  const [refreshState, setRefreshState] = useState("idle"); // idle|loading|success

  // UI “act as role” (UX only; not backend impersonation)
  const [actAs, setActAs] = useState("admin"); // admin|seller|cashier|store_keeper|manager

  function toast(kind, text) {
    setMsgKind(kind);
    setMsg(text || "");
  }

  // ✅ Guard: admin only
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
          const map = {
            owner: "/owner",
            manager: "/manager",
            store_keeper: "/store-keeper",
            cashier: "/cashier",
            seller: "/seller",
          };
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

  const subtitle = useMemo(
    () => `User: ${me?.email || "—"} • ${locationLabel(me)}`,
    [me],
  );

  /* ---------------- data: dashboard ---------------- */
  const [dash, setDash] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);

  const loadAdminDash = useCallback(async () => {
    setDashLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.ADMIN_DASH, { method: "GET" });
      setDash(data?.dashboard || null);
    } catch (e) {
      setDash(null);
      toast(
        "danger",
        e?.data?.error || e?.message || "Failed to load admin dashboard",
      );
    } finally {
      setDashLoading(false);
    }
  }, []);

  /* ---------------- data: sales ---------------- */
  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);

  const [salesQ, setSalesQ] = useState("");
  const [salesStatusFilter, setSalesStatusFilter] = useState("ALL");
  const [salesFrom, setSalesFrom] = useState("");
  const [salesTo, setSalesTo] = useState("");

  const [salesPage, setSalesPage] = useState(1);

  const loadSales = useCallback(async () => {
    setSalesLoading(true);
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

  function dateOnlyMs(v) {
    if (!v) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  const salesSorted = useMemo(
    () => (Array.isArray(sales) ? sales : []).slice().sort(sortByCreatedAtDesc),
    [sales],
  );

  const filteredSalesAll = useMemo(() => {
    let list = salesSorted;

    if (salesStatusFilter === "TODAY") {
      list = list.filter((s) => isToday(s.createdAt || s.created_at));
    } else if (salesStatusFilter === "AWAITING") {
      list = list.filter((s) =>
        String(s?.status || "")
          .toUpperCase()
          .includes("AWAIT"),
      );
    } else if (salesStatusFilter === "COMPLETED") {
      list = list.filter((s) => {
        const st = String(s?.status || "").toUpperCase();
        return st.includes("COMPLETE") || st === "PAID";
      });
    } else if (salesStatusFilter === "CANCELLED") {
      list = list.filter((s) =>
        String(s?.status || "")
          .toUpperCase()
          .includes("CANCEL"),
      );
    }

    const fromMs = salesFrom ? dateOnlyMs(salesFrom) : null;
    const toMs = salesTo ? dateOnlyMs(salesTo) : null;
    if (fromMs != null || toMs != null) {
      list = list.filter((s) => {
        const t = dateOnlyMs(s.createdAt || s.created_at);
        if (t == null) return true;
        if (fromMs != null && t < fromMs) return false;
        if (toMs != null && t > toMs) return false;
        return true;
      });
    }

    const qq = String(salesQ || "")
      .trim()
      .toLowerCase();
    if (!qq) return list;

    return list.filter((s) => {
      const hay = [
        s?.id,
        s?.status,
        s?.customerName ?? s?.customer_name,
        s?.customerPhone ?? s?.customer_phone,
        s?.sellerName ?? s?.seller_name,
        s?.cashierName ?? s?.cashier_name,
        s?.amountPaid ?? s?.amount_paid,
        s?.totalAmount ?? s?.total,
      ]
        .map((x) => String(x ?? ""))
        .join(" ")
        .toLowerCase();
      return hay.includes(qq);
    });
  }, [salesSorted, salesQ, salesStatusFilter, salesFrom, salesTo]);

  useEffect(() => {
    setSalesPage(1);
  }, [salesQ, salesStatusFilter, salesFrom, salesTo]);

  const filteredSales = useMemo(
    () => filteredSalesAll.slice(0, salesPage * PAGE_SIZE),
    [filteredSalesAll, salesPage],
  );
  const canLoadMoreSales = filteredSales.length < filteredSalesAll.length;

  const salesFilteredTotals = useMemo(() => {
    let totalSum = 0;
    let paidSum = 0;
    for (const s of filteredSalesAll) {
      totalSum += Number(s?.totalAmount ?? s?.total ?? 0) || 0;
      paidSum += Number(s?.amountPaid ?? s?.amount_paid ?? 0) || 0;
    }
    return { count: filteredSalesAll.length, totalSum, paidSum };
  }, [filteredSalesAll]);

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
        (sum, s) => sum + Number(s?.totalAmount ?? s?.total ?? 0),
        0,
      ),
    [salesToday],
  );

  const awaitingPaymentCount = useMemo(() => {
    const list = Array.isArray(sales) ? sales : [];
    return list.filter((s) =>
      String(s?.status || "")
        .toUpperCase()
        .includes("AWAIT"),
    ).length;
  }, [sales]);

  // cancel modal
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelSaleId, setCancelSaleId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelState, setCancelState] = useState("idle");

  function openCancel(id) {
    if (!id) return;
    setCancelSaleId(Number(id));
    setCancelReason("");
    setCancelState("idle");
    setCancelOpen(true);
    setMsg("");
  }

  async function confirmCancel() {
    if (!cancelSaleId) return;

    setCancelState("loading");
    setMsg("");
    try {
      await apiFetch(ENDPOINTS.SALE_CANCEL(cancelSaleId), {
        method: "POST",
        body: toStr(cancelReason) ? { reason: toStr(cancelReason) } : undefined,
      });
      toast("success", `Sale #${cancelSaleId} cancelled`);
      setCancelState("success");
      setTimeout(() => setCancelState("idle"), 900);
      setCancelOpen(false);
      setCancelSaleId(null);
      setCancelReason("");
      await loadSales();
    } catch (e) {
      setCancelState("idle");
      toast("danger", e?.data?.error || e?.message || "Cancel failed");
    }
  }

  /* ---------------- data: inventory + products ---------------- */
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [invLoading, setInvLoading] = useState(false);
  const [prodLoading, setProdLoading] = useState(false);

  const [invQ, setInvQ] = useState("");
  const [showArchivedProducts, setShowArchivedProducts] = useState(false);
  const [prodQ, setProdQ] = useState("");

  const loadInventory = useCallback(async () => {
    setInvLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.INVENTORY_LIST, { method: "GET" });
      setInventory(normalizeList(data, ["inventory"]));
    } catch (e) {
      setInventory([]);
      toast(
        "danger",
        e?.data?.error || e?.message || "Failed to load inventory",
      );
    } finally {
      setInvLoading(false);
    }
  }, []);

  const loadProducts = useCallback(
    async (opts = {}) => {
      const includeInactive =
        typeof opts.includeInactive === "boolean"
          ? opts.includeInactive
          : showArchivedProducts;

      setProdLoading(true);
      try {
        const path = includeInactive
          ? `${ENDPOINTS.PRODUCTS_LIST}?includeInactive=true`
          : ENDPOINTS.PRODUCTS_LIST;

        const data = await apiFetch(path, { method: "GET" });
        setProducts(
          normalizeList(data, ["products", "pricing", "items", "rows"]),
        );
      } catch (e) {
        setProducts([]);
        const text = e?.data?.error || e?.message || "";
        if (!String(text).toLowerCase().includes("not found")) {
          toast(
            "danger",
            e?.data?.error || e?.message || "Failed to load products",
          );
        }
      } finally {
        setProdLoading(false);
      }
    },
    [showArchivedProducts],
  );

  function productFromInventoryRow(invRow) {
    const pid = invRow?.productId ?? invRow?.product_id ?? invRow?.id;
    const sku = invRow?.sku;

    const list = Array.isArray(products) ? products : [];
    const byId =
      pid != null ? list.find((x) => String(x?.id) === String(pid)) : null;
    const bySku =
      !byId && sku ? list.find((x) => String(x?.sku) === String(sku)) : null;
    return byId || bySku || null;
  }

  function sellingPriceForRow(invRow) {
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

  const unpricedCount = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    let c = 0;
    for (const p of list) {
      if (isArchivedProduct(p)) continue;
      const price =
        p?.sellingPrice ??
        p?.selling_price ??
        p?.price ??
        p?.unitPrice ??
        p?.unit_price ??
        null;
      if (
        price == null ||
        !Number.isFinite(Number(price)) ||
        Number(price) <= 0
      )
        c += 1;
    }
    return c;
  }, [products]);

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
      const pid = String(
        p?.productId ?? p?.product_id ?? p?.id ?? "",
      ).toLowerCase();
      return name.includes(qq) || sku.includes(qq) || pid.includes(qq);
    });
  }, [inventory, invQ]);

  const filteredProducts = useMemo(() => {
    const qq = String(prodQ || "")
      .trim()
      .toLowerCase();
    const list = Array.isArray(products) ? products : [];
    return list
      .filter((p) => {
        const byToggle = showArchivedProducts
          ? isArchivedProduct(p)
          : !isArchivedProduct(p);
        if (!byToggle) return false;
        if (!qq) return true;

        const id = String(p?.id ?? "");
        const name = String(
          p?.name || p?.productName || p?.title || "",
        ).toLowerCase();
        const sku = String(p?.sku || "").toLowerCase();
        return id.includes(qq) || name.includes(qq) || sku.includes(qq);
      })
      .slice()
      .sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
  }, [products, prodQ, showArchivedProducts]);

  // archive/restore modal
  const [archOpen, setArchOpen] = useState(false);
  const [archMode, setArchMode] = useState("archive"); // archive|restore
  const [archProduct, setArchProduct] = useState(null);
  const [archReason, setArchReason] = useState("");
  const [archState, setArchState] = useState("idle");

  function openArchiveProduct(prod) {
    if (!prod?.id) return;
    setArchMode("archive");
    setArchProduct(prod);
    setArchReason("");
    setArchState("idle");
    setArchOpen(true);
    setMsg("");
  }

  function openRestoreProduct(prod) {
    if (!prod?.id) return;
    setArchMode("restore");
    setArchProduct(prod);
    setArchReason("");
    setArchState("idle");
    setArchOpen(true);
    setMsg("");
  }

  async function confirmArchiveRestore() {
    const pid = archProduct?.id;
    if (!pid) return;

    setArchState("loading");
    setMsg("");
    try {
      if (archMode === "archive") {
        await apiFetch(ENDPOINTS.PRODUCT_ARCHIVE(pid), {
          method: "PATCH",
          body: toStr(archReason) ? { reason: toStr(archReason) } : undefined,
        });
        toast("success", `Archived product #${pid}`);
      } else {
        await apiFetch(ENDPOINTS.PRODUCT_RESTORE(pid), { method: "PATCH" });
        toast("success", `Restored product #${pid}`);
      }
      setArchState("success");
      setTimeout(() => setArchState("idle"), 900);
      setArchOpen(false);
      setArchProduct(null);
      setArchReason("");
      await Promise.all([
        loadProducts({ includeInactive: showArchivedProducts }),
        loadInventory(),
      ]);
    } catch (e) {
      setArchState("idle");
      toast("danger", e?.data?.error || e?.message || "Action failed");
    }
  }

  // delete modal
  const [delOpen, setDelOpen] = useState(false);
  const [delProduct, setDelProduct] = useState(null);
  const [delState, setDelState] = useState("idle");

  function openDeleteProduct(prod) {
    if (!prod?.id) return;
    setDelProduct(prod);
    setDelState("idle");
    setDelOpen(true);
    setMsg("");
  }

  async function confirmDeleteProduct() {
    const pid = delProduct?.id;
    if (!pid) return;

    setDelState("loading");
    setMsg("");
    try {
      await apiFetch(ENDPOINTS.PRODUCT_DELETE(pid), { method: "DELETE" });
      toast("success", `Deleted product #${pid}`);
      setDelState("success");
      setTimeout(() => setDelState("idle"), 900);
      setDelOpen(false);
      setDelProduct(null);
      await Promise.all([
        loadProducts({ includeInactive: showArchivedProducts }),
        loadInventory(),
      ]);
    } catch (e) {
      setDelState("idle");
      toast("danger", e?.data?.error || e?.message || "Delete failed");
    }
  }

  /* ---------------- data: arrivals ---------------- */
  const [arrivals, setArrivals] = useState([]);
  const [arrivalsLoading, setArrivalsLoading] = useState(false);

  const loadArrivals = useCallback(async () => {
    setArrivalsLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.INVENTORY_ARRIVALS_LIST, {
        method: "GET",
      });
      setArrivals(normalizeList(data, ["arrivals"]));
    } catch (e) {
      setArrivals([]);
      toast(
        "danger",
        e?.data?.error || e?.message || "Failed to load arrivals",
      );
    } finally {
      setArrivalsLoading(false);
    }
  }, []);

  const arrivalsNormalized = useMemo(() => {
    const list = Array.isArray(arrivals) ? arrivals : [];
    const productsList = Array.isArray(products) ? products : [];

    function productNameById(pid) {
      const p = productsList.find((x) => String(x?.id) === String(pid));
      return p?.name || p?.productName || p?.title || null;
    }

    return list.map((a) => {
      const pid = a?.productId ?? a?.product_id ?? null;
      const productName =
        toStr(a?.productName || a?.product_name) ||
        (pid != null ? productNameById(pid) : null) ||
        (pid != null ? `Product #${pid}` : "—");

      const qty =
        a?.qtyReceived ?? a?.qty_received ?? a?.qty ?? a?.quantity ?? "—";

      return {
        raw: a,
        id: a?.id ?? "—",
        productName,
        qty,
        when: fmt(a?.createdAt || a?.created_at),
      };
    });
  }, [arrivals, products]);

  /* ---------------- data: payments ---------------- */
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
        toast(
          "danger",
          e?.data?.error || e?.message || "Failed to load payments",
        );
      }
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
      if (!String(text).toLowerCase().includes("not found")) {
        toast(
          "danger",
          e?.data?.error || e?.message || "Failed to load payment summary",
        );
      }
    } finally {
      setPaySummaryLoading(false);
    }
  }, []);

  /* ---------------- data: credits/users ---------------- */
  const [creditsLoading, setCreditsLoading] = useState(false);
  const loadCreditsOpen = useCallback(async () => {
    setCreditsLoading(true);
    try {
      await apiFetch(ENDPOINTS.CREDITS_OPEN, { method: "GET" });
    } catch {
      // CreditsPanel also fetches; keep state sane
    } finally {
      setCreditsLoading(false);
    }
  }, []);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
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

  /* ---------------- inventory requests badge (poll ONLY the badge) ---------------- */
  const [invReqPendingCount, setInvReqPendingCount] = useState(0);
  const [invReqCountLoading, setInvReqCountLoading] = useState(false);

  const loadInvReqPendingCount = useCallback(async () => {
    if (invReqCountLoading) return;
    setInvReqCountLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("status", "PENDING");
      qs.set("limit", "200");
      const data = await apiFetch(
        `${ENDPOINTS.INV_ADJ_REQ_LIST}?${qs.toString()}`,
        { method: "GET" },
      );
      const rows = normalizeList(data, [
        "requests",
        "adjustRequests",
        "inventoryAdjustRequests",
      ]);
      const n = Array.isArray(rows) ? rows.length : 0;
      setInvReqPendingCount(n);
    } catch {
      // keep previous
    } finally {
      setInvReqCountLoading(false);
    }
  }, [invReqCountLoading]);

  useEffect(() => {
    if (!isAuthorized) return;

    loadInvReqPendingCount();

    const t = setInterval(() => {
      // ✅ badge only (does not reload tabs)
      loadInvReqPendingCount();
    }, 30_000);

    function onVis() {
      if (typeof document !== "undefined" && !document.hidden) {
        loadInvReqPendingCount();
      }
    }

    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [isAuthorized, loadInvReqPendingCount]);

  /* ---------------- load each section ONCE when first opened ---------------- */
  const loadedSectionsRef = useRef(new Set());

  useEffect(() => {
    if (!isAuthorized) return;

    if (loadedSectionsRef.current.has(section)) return;
    loadedSectionsRef.current.add(section);

    (async () => {
      if (section === "dashboard") {
        await Promise.all([
          loadAdminDash(),
          loadSales(),
          loadInventory(),
          loadProducts({ includeInactive: showArchivedProducts }),
          loadPaymentsSummary(),
          loadPayments(),
          loadArrivals(),
          loadInvReqPendingCount(),
        ]);
        return;
      }

      if (section === "sales") await loadSales();
      if (section === "payments")
        await Promise.all([loadPaymentsSummary(), loadPayments()]);
      if (section === "inventory")
        await Promise.all([
          loadInventory(),
          loadProducts({ includeInactive: showArchivedProducts }),
        ]);
      if (section === "arrivals") await loadArrivals();
      if (section === "pricing") await loadProducts({ includeInactive: true });
      if (section === "inv_requests") await loadInvReqPendingCount();
      if (section === "credits") await loadCreditsOpen();
      if (section === "users") await loadUsers();
      if (section === "suppliers")
        await loadProducts({ includeInactive: true });
    })().catch(() => {});
  }, [
    isAuthorized,
    section,
    showArchivedProducts,
    loadAdminDash,
    loadSales,
    loadInventory,
    loadProducts,
    loadPaymentsSummary,
    loadPayments,
    loadArrivals,
    loadInvReqPendingCount,
    loadCreditsOpen,
    loadUsers,
  ]);

  const refreshCurrent = useCallback(async () => {
    setRefreshState("loading");
    setMsg("");

    try {
      const componentTabs = new Set([
        "cash",
        "audit",
        "reports",
        "pricing",
        "inv_requests",
        "suppliers",
        "credits",
        "users",
      ]);

      if (componentTabs.has(section)) {
        if (section === "inv_requests") await loadInvReqPendingCount();
        setRefreshNonce((n) => n + 1);
        setRefreshState("success");
        setTimeout(() => setRefreshState("idle"), 900);
        return;
      }

      if (section === "dashboard") {
        await Promise.all([
          loadAdminDash(),
          loadSales(),
          loadInventory(),
          loadProducts({ includeInactive: showArchivedProducts }),
          loadPaymentsSummary(),
          loadPayments(),
          loadArrivals(),
          loadInvReqPendingCount(),
        ]);
      } else if (section === "sales") {
        await loadSales();
      } else if (section === "payments") {
        await Promise.all([loadPaymentsSummary(), loadPayments()]);
      } else if (section === "inventory") {
        await Promise.all([
          loadInventory(),
          loadProducts({ includeInactive: showArchivedProducts }),
        ]);
      } else if (section === "arrivals") {
        await loadArrivals();
      }

      setRefreshState("success");
      setTimeout(() => setRefreshState("idle"), 900);
    } catch (e) {
      setRefreshState("idle");
      toast("danger", e?.data?.error || e?.message || "Refresh failed");
    }
  }, [
    section,
    showArchivedProducts,
    loadAdminDash,
    loadSales,
    loadInventory,
    loadProducts,
    loadPaymentsSummary,
    loadPayments,
    loadArrivals,
    loadInvReqPendingCount,
  ]);

  /* ---------------- sidebar badges ---------------- */
  const arrivalsBadge = useMemo(() => {
    const n = Array.isArray(arrivals) ? arrivals.length : 0;
    return n > 0 ? String(Math.min(n, 99)) : null;
  }, [arrivals]);

  const pricingBadge = useMemo(
    () => (unpricedCount > 0 ? String(Math.min(unpricedCount, 99)) : null),
    [unpricedCount],
  );

  const invReqBadge = useMemo(() => {
    const n = Number(invReqPendingCount || 0);
    return n > 0 ? String(Math.min(n, 99)) : null;
  }, [invReqPendingCount]);

  const salesBadge = useMemo(() => {
    const n = Array.isArray(sales) ? sales.length : 0;
    return n > 0 ? String(Math.min(n, 99)) : null;
  }, [sales]);

  function badgeForSectionKey(key) {
    if (key === "sales") return salesBadge;
    if (key === "arrivals") return arrivalsBadge;
    if (key === "pricing") return pricingBadge;
    if (key === "inv_requests") return invReqBadge;
    return null;
  }

  function actAsHref() {
    if (actAs === "seller") return "/seller";
    if (actAs === "cashier") return "/cashier";
    if (actAs === "store_keeper") return "/store-keeper";
    if (actAs === "manager") return "/manager";
    return "/admin";
  }

  /* ---------------- boot UI ---------------- */
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
              <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Skeleton className="h-72 w-full rounded-2xl" />
                <Skeleton className="h-72 w-full rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized)
    return <div className="p-6 text-sm text-slate-600">Redirecting…</div>;

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      <RoleBar
        title="Admin"
        subtitle={subtitle}
        user={me}
        right={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Act as role (UX only) */}
            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">
                Act as
              </span>
              <select
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                value={actAs}
                onChange={(e) => setActAs(e.target.value)}
              >
                <option value="admin">Admin</option>
                <option value="seller">Seller</option>
                <option value="cashier">Cashier</option>
                <option value="store_keeper">Store keeper</option>
                <option value="manager">Manager</option>
              </select>
              <button
                type="button"
                onClick={() => router.push(actAsHref())}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                Open
              </button>
            </div>

            <NotificationsBell enabled />
          </div>
        }
      />

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
            <div className="mt-1 text-xs text-slate-600">
              {locationLabel(me)}
            </div>

            {/* Mobile: Act as */}
            <div className="mt-4 md:hidden">
              <div className="text-xs font-semibold text-slate-600 mb-2">
                Act as
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Select
                  value={actAs}
                  onChange={(e) => setActAs(e.target.value)}
                >
                  <option value="admin">Admin</option>
                  <option value="seller">Seller</option>
                  <option value="cashier">Cashier</option>
                  <option value="store_keeper">Store keeper</option>
                  <option value="manager">Manager</option>
                </Select>
                <button
                  type="button"
                  onClick={() => router.push(actAsHref())}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                >
                  Open selected role
                </button>
              </div>
            </div>

            {/* Mobile picker */}
            <div className="mt-4 lg:hidden">
              <div className="text-xs font-semibold text-slate-600 mb-2">
                Section
              </div>
              <Select
                value={section}
                onChange={(e) => setSection(e.target.value)}
              >
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
                <NavItem
                  key={s.key}
                  active={section === s.key}
                  label={s.label}
                  badge={badgeForSectionKey(s.key)}
                  onClick={() => setSection(s.key)}
                />
              ))}

              <div className="mt-2 pt-3 border-t border-slate-200">
                <label className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-700">
                  <span>Advanced</span>
                  <input
                    type="checkbox"
                    checked={showAdvanced}
                    onChange={(e) => setShowAdvanced(e.target.checked)}
                  />
                </label>

                {showAdvanced ? (
                  <div className="mt-2 grid gap-2">
                    {ADVANCED.map((s) => (
                      <NavItem
                        key={s.key}
                        active={section === s.key}
                        label={s.label}
                        onClick={() => setSection(s.key)}
                      />
                    ))}
                  </div>
                ) : null}

                <div className="mt-3 text-xs text-slate-600">
                  Advanced is for investigations.
                </div>
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
              <div className="mt-3 text-xs text-slate-600">
                Tabs load once when opened. Use Refresh when you need updates.
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="grid gap-4">
            {/* DASHBOARD */}
            {section === "dashboard" ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-semibold text-slate-600">
                      Sales today
                    </div>
                    <div className="mt-1 text-2xl font-extrabold text-slate-900">
                      {dashLoading ? "…" : money(salesTodayTotal)}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {dashLoading ? "…" : `${salesToday.length} sale(s)`}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-semibold text-slate-600">
                      Awaiting payment
                    </div>
                    <div className="mt-1 text-2xl font-extrabold text-slate-900">
                      {dashLoading ? "…" : String(awaitingPaymentCount)}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      Needs cashier action
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-semibold text-slate-600">
                      Pricing gaps
                    </div>
                    <div className="mt-1 text-2xl font-extrabold text-slate-900">
                      {prodLoading ? "…" : String(unpricedCount)}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      Unpriced products
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-semibold text-slate-600">
                      Inventory requests
                    </div>
                    <div className="mt-1 text-2xl font-extrabold text-slate-900">
                      {invReqCountLoading ? "…" : String(invReqPendingCount)}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      Pending approvals
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <SectionCard
                    title="Today payment mix"
                    hint="How money came in today."
                  >
                    {dashLoading ? (
                      <Skeleton className="h-64 w-full" />
                    ) : (
                      <TodayMixWidget
                        breakdown={dash?.payments?.breakdownToday || []}
                      />
                    )}
                  </SectionCard>

                  <SectionCard
                    title="Low stock"
                    hint="Items that need restock."
                  >
                    {dashLoading ? (
                      <Skeleton className="h-64 w-full" />
                    ) : (
                      <LowStockWidget
                        lowStock={dash?.inventory?.lowStock || []}
                        threshold={dash?.inventory?.lowStockThreshold ?? 5}
                        products={products}
                      />
                    )}
                  </SectionCard>
                </div>

                {/* ✅ two parallel columns */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <SectionCard
                    title="Stuck sales"
                    hint="Sales that need attention."
                  >
                    {dashLoading ? (
                      <Skeleton className="h-64 w-full" />
                    ) : (
                      <StuckSalesWidget
                        stuck={dash?.sales?.stuck || []}
                        rule={dash?.sales?.stuckRule}
                      />
                    )}
                  </SectionCard>

                  <SectionCard
                    title="Last 10 payments"
                    hint="Most recent payments."
                  >
                    {dashLoading ? (
                      <Skeleton className="h-64 w-full" />
                    ) : (
                      <Last10PaymentsWidget
                        rows={dash?.payments?.last10 || []}
                      />
                    )}
                  </SectionCard>
                </div>

                {/* ✅ Admin coverage shortcuts */}
                <SectionCard
                  title="Admin coverage"
                  hint="Shortcuts for covering staff roles. If any page redirects, allow admin in that page’s guard."
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {[
                      { label: "Seller", href: "/seller" },
                      { label: "Cashier", href: "/cashier" },
                      { label: "Store keeper", href: "/store-keeper" },
                      { label: "Manager", href: "/manager" },
                      { label: "Customers", href: "/customers" },
                    ].map((x) => (
                      <button
                        key={x.href}
                        type="button"
                        onClick={() => router.push(x.href)}
                        className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
                      >
                        <div className="text-sm font-extrabold text-slate-900">
                          {x.label}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          Open {x.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </SectionCard>
              </>
            ) : null}

            {/* SALES */}
            {section === "sales" ? (
              <SectionCard
                title="Sales"
                hint="Search, filter, cancel, open proof."
                right={
                  <AsyncButton
                    variant="secondary"
                    size="sm"
                    state={salesLoading ? "loading" : "idle"}
                    text="Reload"
                    loadingText="Loading…"
                    successText="Done"
                    onClick={loadSales}
                  />
                }
              >
                <div className="grid gap-3">
                  <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
                    <div className="lg:col-span-2">
                      <div className="text-xs font-semibold text-slate-600 mb-1">
                        Search
                      </div>
                      <Input
                        placeholder="Customer, phone, staff, status, total…"
                        value={salesQ}
                        onChange={(e) => setSalesQ(e.target.value)}
                      />
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-600 mb-1">
                        Filter
                      </div>
                      <Select
                        value={salesStatusFilter}
                        onChange={(e) => setSalesStatusFilter(e.target.value)}
                      >
                        <option value="ALL">All sales</option>
                        <option value="TODAY">Today</option>
                        <option value="AWAITING">Awaiting payment</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </Select>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-600 mb-1">
                        From
                      </div>
                      <Input
                        type="date"
                        value={salesFrom}
                        onChange={(e) => setSalesFrom(e.target.value)}
                      />
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-600 mb-1">
                        To
                      </div>
                      <Input
                        type="date"
                        value={salesTo}
                        onChange={(e) => setSalesTo(e.target.value)}
                      />
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

                  <div className="flex flex-wrap gap-2">
                    <Pill tone="info">{salesFilteredTotals.count} sale(s)</Pill>
                    <Pill tone="neutral">
                      Total: {money(salesFilteredTotals.totalSum)}
                    </Pill>
                    <Pill tone="neutral">
                      Paid: {money(salesFilteredTotals.paidSum)}
                    </Pill>
                    {salesStatusFilter !== "ALL" ? (
                      <Pill tone="warn">Filter: {salesStatusFilter}</Pill>
                    ) : null}
                  </div>

                  {/* Desktop (no horizontal scroll) */}
                  <div className="hidden lg:block">
                    <div className="grid grid-cols-[90px_140px_120px_120px_1fr_160px_160px] gap-2 text-[11px] font-semibold text-slate-600 border-b border-slate-200 pb-2">
                      <div>Sale</div>
                      <div>Status</div>
                      <div className="text-right">Total</div>
                      <div className="text-right">Paid</div>
                      <div>Customer</div>
                      <div>Staff</div>
                      <div className="text-right">Actions</div>
                    </div>

                    {salesLoading ? (
                      <div className="mt-3 grid gap-2">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div
                            key={i}
                            className="rounded-xl border border-slate-200 bg-white p-3"
                          >
                            <Skeleton className="h-5 w-full" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 grid gap-1">
                        {filteredSales.map((s) => {
                          const total =
                            Number(s?.totalAmount ?? s?.total ?? 0) || 0;
                          const paid =
                            Number(s?.amountPaid ?? s?.amount_paid ?? 0) || 0;

                          const customerName =
                            toStr(s?.customerName ?? s?.customer_name) ||
                            "Walk-in customer";
                          const customerPhone = toStr(
                            s?.customerPhone ?? s?.customer_phone,
                          );

                          const staffName =
                            toStr(s?.sellerName ?? s?.seller_name) ||
                            toStr(s?.cashierName ?? s?.cashier_name) ||
                            "—";

                          return (
                            <div
                              key={String(s?.id)}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50"
                            >
                              <div className="grid grid-cols-[90px_140px_120px_120px_1fr_160px_160px] gap-2 items-center text-sm">
                                <div className="font-extrabold text-slate-900">
                                  #{s?.id ?? "—"}
                                </div>
                                <div className="min-w-0">
                                  <StatusBadge status={s?.status} />
                                </div>
                                <div className="text-right font-bold text-slate-900">
                                  {money(total)}
                                </div>
                                <div className="text-right text-slate-700">
                                  {money(paid)}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-900 truncate">
                                    {customerName}
                                  </div>
                                  <div className="text-xs text-slate-500 truncate">
                                    {customerPhone || "—"}
                                  </div>
                                </div>
                                <div className="text-slate-700 truncate">
                                  {staffName}
                                </div>
                                <div className="flex items-center justify-end gap-2">
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
                                    Proof
                                  </button>
                                  <button
                                    className="rounded-xl bg-rose-600 text-white px-3 py-2 text-xs font-semibold hover:bg-rose-700"
                                    onClick={() => openCancel(s?.id)}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {filteredSales.length === 0 ? (
                          <div className="p-6 text-sm text-slate-600">
                            No sales found.
                          </div>
                        ) : null}

                        {canLoadMoreSales ? (
                          <button
                            type="button"
                            onClick={() => setSalesPage((p) => p + 1)}
                            className="mt-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                          >
                            Load more (+{PAGE_SIZE})
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Mobile */}
                  <div className="grid gap-2 lg:hidden">
                    {salesLoading ? (
                      <>
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div
                            key={i}
                            className="rounded-2xl border border-slate-200 bg-white p-4"
                          >
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="mt-2 h-3 w-64" />
                            <Skeleton className="mt-4 h-10 w-full" />
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        {filteredSales.map((s) => {
                          const total =
                            Number(s?.totalAmount ?? s?.total ?? 0) || 0;
                          const paid =
                            Number(s?.amountPaid ?? s?.amount_paid ?? 0) || 0;

                          const customerName =
                            toStr(s?.customerName ?? s?.customer_name) ||
                            "Walk-in customer";
                          const customerPhone = toStr(
                            s?.customerPhone ?? s?.customer_phone,
                          );

                          const staffName =
                            toStr(s?.sellerName ?? s?.seller_name) ||
                            toStr(s?.cashierName ?? s?.cashier_name) ||
                            "—";

                          return (
                            <div
                              key={String(s?.id)}
                              className="rounded-2xl border border-slate-200 bg-white p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <div className="text-sm font-extrabold text-slate-900">
                                      Sale #{s?.id ?? "—"}
                                    </div>
                                    <StatusBadge status={s?.status} />
                                  </div>
                                  <div className="mt-1 text-xs text-slate-600">
                                    Time:{" "}
                                    <b>{fmt(s?.createdAt || s?.created_at)}</b>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <div className="text-xs text-slate-600">
                                    Total
                                  </div>
                                  <div className="text-lg font-extrabold text-slate-900">
                                    {money(total)}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                  <div className="text-[11px] font-semibold text-slate-600">
                                    Customer
                                  </div>
                                  <div className="mt-1 text-sm font-bold text-slate-900 truncate">
                                    {customerName}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-600 truncate">
                                    {customerPhone || "—"}
                                  </div>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                  <div className="text-[11px] font-semibold text-slate-600">
                                    Paid
                                  </div>
                                  <div className="mt-1 text-sm font-bold text-slate-900">
                                    {money(paid)}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-600 truncate">
                                    Staff: {staffName}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 flex items-center justify-end gap-2">
                                <button
                                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
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
                                  Proof
                                </button>
                                <button
                                  className="rounded-xl bg-rose-600 text-white px-4 py-2 text-sm font-semibold hover:bg-rose-700"
                                  onClick={() => openCancel(s?.id)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {canLoadMoreSales ? (
                          <button
                            type="button"
                            onClick={() => setSalesPage((p) => p + 1)}
                            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                          >
                            Load more (+{PAGE_SIZE})
                          </button>
                        ) : null}

                        {filteredSales.length === 0 ? (
                          <div className="p-6 text-sm text-slate-600">
                            No sales found.
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </SectionCard>
            ) : null}

            {/* PAYMENTS */}
            {section === "payments" ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                <SectionCard
                  title="Payments summary"
                  hint="Read-only overview."
                  right={
                    <AsyncButton
                      variant="secondary"
                      size="sm"
                      state={
                        paySummaryLoading || paymentsLoading
                          ? "loading"
                          : "idle"
                      }
                      text="Reload"
                      loadingText="Loading…"
                      successText="Done"
                      onClick={() =>
                        Promise.all([loadPaymentsSummary(), loadPayments()])
                      }
                    />
                  }
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-semibold text-slate-600">
                        Today
                      </div>
                      <div className="mt-1 text-2xl font-extrabold text-slate-900">
                        {paySummaryLoading
                          ? "…"
                          : String(paymentsSummary?.today?.count ?? 0)}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        Total:{" "}
                        <b>{money(paymentsSummary?.today?.total ?? 0)}</b>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-semibold text-slate-600">
                        All time
                      </div>
                      <div className="mt-1 text-2xl font-extrabold text-slate-900">
                        {paySummaryLoading
                          ? "…"
                          : String(paymentsSummary?.allTime?.count ?? 0)}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        Total:{" "}
                        <b>{money(paymentsSummary?.allTime?.total ?? 0)}</b>
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Payments list" hint="Latest payments.">
                  {paymentsLoading ? (
                    <div className="grid gap-2">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div
                          key={i}
                          className="rounded-xl border border-slate-200 bg-white p-3"
                        >
                          <Skeleton className="h-5 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : (Array.isArray(payments) ? payments : []).length === 0 ? (
                    <div className="text-sm text-slate-600">No payments.</div>
                  ) : (
                    <div className="grid gap-2">
                      {(Array.isArray(payments) ? payments : [])
                        .slice()
                        .sort(sortByCreatedAtDesc)
                        .slice(0, 60)
                        .map((p) => {
                          const saleId = p?.saleId ?? p?.sale_id ?? "—";
                          const method = toStr(p?.method).toUpperCase() || "—";
                          const amount = Number(p?.amount ?? 0) || 0;
                          const time = p?.createdAt || p?.created_at;

                          return (
                            <div
                              key={String(p?.id)}
                              className="rounded-2xl border border-slate-200 bg-white p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <div className="text-sm font-extrabold text-slate-900">
                                      Payment #{p?.id ?? "—"}
                                    </div>
                                    <Pill tone="info">{method}</Pill>
                                  </div>
                                  <div className="mt-1 text-xs text-slate-600">
                                    Sale: <b>#{saleId}</b> • Time:{" "}
                                    <b>{fmt(time)}</b>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-slate-600">
                                    Amount
                                  </div>
                                  <div className="text-lg font-extrabold text-slate-900">
                                    {money(amount)}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    RWF
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </SectionCard>
              </div>
            ) : null}

            {/* INVENTORY + PRODUCTS */}
            {section === "inventory" ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <SectionCard
                  title="Inventory"
                  hint="Stock on hand + selling price preview."
                  right={
                    <AsyncButton
                      variant="secondary"
                      size="sm"
                      state={invLoading || prodLoading ? "loading" : "idle"}
                      text="Reload"
                      loadingText="Loading…"
                      successText="Done"
                      onClick={() =>
                        Promise.all([
                          loadInventory(),
                          loadProducts({
                            includeInactive: showArchivedProducts,
                          }),
                        ])
                      }
                    />
                  }
                >
                  <Input
                    placeholder="Search by name, SKU, product number…"
                    value={invQ}
                    onChange={(e) => setInvQ(e.target.value)}
                  />

                  <div className="mt-3">
                    {invLoading || prodLoading ? (
                      <div className="grid gap-2">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className="rounded-xl border border-slate-200 bg-white p-3"
                          >
                            <Skeleton className="h-5 w-full" />
                          </div>
                        ))}
                      </div>
                    ) : filteredInventory.length === 0 ? (
                      <div className="text-sm text-slate-600">
                        No inventory rows.
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {filteredInventory.slice(0, 60).map((row, idx) => {
                          const pid =
                            row?.productId ??
                            row?.product_id ??
                            row?.id ??
                            null;
                          const name =
                            row?.productName ||
                            row?.product_name ||
                            row?.name ||
                            "—";
                          const sku = row?.sku || "—";
                          const qty =
                            Number(
                              row?.qtyOnHand ??
                                row?.qty_on_hand ??
                                row?.qty ??
                                row?.quantity ??
                                0,
                            ) || 0;
                          const selling = sellingPriceForRow(row);

                          return (
                            <div
                              key={row?.id || `${pid}-${idx}`}
                              className="rounded-2xl border border-slate-200 bg-white p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-extrabold text-slate-900 truncate">
                                    {name}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-600">
                                    SKU: <b>{sku}</b>{" "}
                                    {pid != null ? (
                                      <span>
                                        • Product: <b>#{String(pid)}</b>
                                      </span>
                                    ) : null}
                                  </div>
                                </div>

                                <div className="text-right">
                                  <div className="text-xs text-slate-600">
                                    On hand
                                  </div>
                                  <div className="text-lg font-extrabold text-slate-900">
                                    {qty}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                  <div className="text-[11px] font-semibold text-slate-600">
                                    Selling price
                                  </div>
                                  <div className="mt-1 text-sm font-extrabold text-slate-900">
                                    {selling}
                                  </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                  <div className="text-[11px] font-semibold text-slate-600">
                                    Proof
                                  </div>
                                  <div className="mt-2 flex justify-end">
                                    {pid != null ? (
                                      <button
                                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                                        onClick={() =>
                                          router.push(
                                            buildEvidenceUrl({
                                              entity: "product",
                                              entityId: String(pid),
                                              limit: 200,
                                            }),
                                          )
                                        }
                                      >
                                        Open proof
                                      </button>
                                    ) : (
                                      <span className="text-xs text-slate-400">
                                        —
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {filteredInventory.length > 60 ? (
                          <div className="text-xs text-slate-600">
                            Showing first 60 items (use search to narrow).
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </SectionCard>

                <SectionCard
                  title={`Products (${showArchivedProducts ? "Archived" : "Active"})`}
                  hint="Archive/restore products. Delete is permanent."
                  right={
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={showArchivedProducts}
                        onChange={(e) =>
                          setShowArchivedProducts(e.target.checked)
                        }
                      />
                      Show archived
                    </label>
                  }
                >
                  <Input
                    placeholder="Search products (id, name, sku)"
                    value={prodQ}
                    onChange={(e) => setProdQ(e.target.value)}
                  />

                  <div className="mt-3">
                    {prodLoading ? (
                      <div className="grid gap-2">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className="rounded-xl border border-slate-200 bg-white p-3"
                          >
                            <Skeleton className="h-5 w-full" />
                          </div>
                        ))}
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="text-sm text-slate-600">No products.</div>
                    ) : (
                      <div className="grid gap-2">
                        {filteredProducts.slice(0, 50).map((p) => {
                          const archived = isArchivedProduct(p);
                          const selling =
                            p?.sellingPrice ??
                            p?.selling_price ??
                            p?.price ??
                            p?.unitPrice ??
                            p?.unit_price ??
                            null;

                          const isUnpriced =
                            selling == null ||
                            !Number.isFinite(Number(selling)) ||
                            Number(selling) <= 0;

                          return (
                            <div
                              key={String(p?.id)}
                              className="rounded-2xl border border-slate-200 bg-white p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <div className="text-sm font-extrabold text-slate-900 truncate">
                                      {p?.name ||
                                        p?.productName ||
                                        p?.title ||
                                        "—"}
                                    </div>
                                    {archived ? (
                                      <Pill tone="danger">ARCHIVED</Pill>
                                    ) : (
                                      <Pill tone="success">ACTIVE</Pill>
                                    )}
                                    {isUnpriced ? (
                                      <Pill tone="warn">UNPRICED</Pill>
                                    ) : null}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-600">
                                    SKU: <b>{p?.sku || "—"}</b> • Selling:{" "}
                                    <b>
                                      {selling == null ? "—" : money(selling)}
                                    </b>
                                  </div>
                                </div>

                                <div className="shrink-0 flex items-center gap-2 flex-wrap justify-end">
                                  <button
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                                    onClick={() =>
                                      router.push(
                                        buildEvidenceUrl({
                                          entity: "product",
                                          entityId: String(p.id),
                                          limit: 200,
                                        }),
                                      )
                                    }
                                  >
                                    Proof
                                  </button>

                                  <AsyncButton
                                    variant="secondary"
                                    size="sm"
                                    state="idle"
                                    text={archived ? "Restore" : "Archive"}
                                    loadingText="Working…"
                                    successText="Done"
                                    onClick={() =>
                                      archived
                                        ? openRestoreProduct(p)
                                        : openArchiveProduct(p)
                                    }
                                  />

                                  <button
                                    className="rounded-xl bg-rose-600 text-white px-3 py-2 text-xs font-semibold hover:bg-rose-700"
                                    onClick={() => openDeleteProduct(p)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                      Delete is permanent. If delete fails due to linked sales,
                      use Archive.
                    </div>
                  </div>
                </SectionCard>
              </div>
            ) : null}

            {/* ARRIVALS */}
            {section === "arrivals" ? (
              <SectionCard
                title="Stock arrivals"
                hint="Incoming stock records + attached documents."
                right={
                  <AsyncButton
                    variant="secondary"
                    size="sm"
                    state={arrivalsLoading ? "loading" : "idle"}
                    text="Reload"
                    loadingText="Loading…"
                    successText="Done"
                    onClick={loadArrivals}
                  />
                }
              >
                {arrivalsLoading ? (
                  <div className="grid gap-2">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-slate-200 bg-white p-3"
                      >
                        <Skeleton className="h-5 w-full" />
                      </div>
                    ))}
                  </div>
                ) : arrivalsNormalized.length === 0 ? (
                  <div className="text-sm text-slate-600">No arrivals yet.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {arrivalsNormalized.map((a) => {
                      const raw = a.raw;
                      return (
                        <details
                          key={String(a.id)}
                          className="rounded-2xl border border-slate-200 bg-white p-4"
                        >
                          <summary className="cursor-pointer list-none">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-extrabold text-slate-900 truncate">
                                  {a.productName}
                                </div>
                                <div className="mt-1 text-xs text-slate-600">
                                  Qty: <b>{String(a.qty)}</b>
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {a.when}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-slate-600">
                                  Arrival
                                </div>
                                <div className="text-sm font-bold text-slate-900">
                                  #{a.id}
                                </div>
                              </div>
                            </div>
                          </summary>

                          <div className="mt-4 grid gap-3">
                            {raw?.notes ? (
                              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                                <b>Notes:</b> {String(raw.notes)}
                              </div>
                            ) : null}

                            <div>
                              <div className="text-xs font-semibold text-slate-600">
                                Files
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {Array.isArray(raw?.documents) &&
                                raw.documents.length > 0 ? (
                                  raw.documents.map((d) => (
                                    <a
                                      key={d?.id || d?.fileUrl || d?.url}
                                      href={(() => {
                                        const rawUrl =
                                          d?.fileUrl || d?.url || "";
                                        if (!rawUrl) return "#";
                                        const API_BASE =
                                          process.env.NEXT_PUBLIC_API_BASE ||
                                          process.env
                                            .NEXT_PUBLIC_API_BASE_URL ||
                                          "http://localhost:4000";
                                        return /^https?:\/\//i.test(rawUrl)
                                          ? rawUrl
                                          : `${API_BASE}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;
                                      })()}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                                    >
                                      Open file
                                    </a>
                                  ))
                                ) : (
                                  <div className="text-sm text-slate-600">
                                    No files.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </details>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
            ) : null}

            {/* PRICING */}
            {section === "pricing" ? (
              <SectionCard
                title="Pricing"
                hint="Set purchase/selling price and max discount."
                right={
                  unpricedCount > 0 ? (
                    <Pill tone="warn">{unpricedCount} unpriced</Pill>
                  ) : (
                    <Pill tone="success">All priced</Pill>
                  )
                }
              >
                <ProductPricingPanel key={`pricing-${refreshNonce}`} />
              </SectionCard>
            ) : null}

            {/* INVENTORY REQUESTS (2 columns) */}
            {section === "inv_requests" ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                <SectionCard
                  title="Inventory requests"
                  hint="Approve or decline stock adjustments."
                  right={
                    <div className="flex items-center gap-2">
                      {invReqPendingCount > 0 ? (
                        <Pill tone="warn">{invReqPendingCount} pending</Pill>
                      ) : (
                        <Pill tone="success">Clear</Pill>
                      )}
                      <AsyncButton
                        variant="secondary"
                        size="sm"
                        state={invReqCountLoading ? "loading" : "idle"}
                        text="Refresh count"
                        loadingText="Refreshing…"
                        successText="Done"
                        onClick={loadInvReqPendingCount}
                      />
                    </div>
                  }
                >
                  <InventoryAdjustRequestsPanel
                    key={`invreq-${refreshNonce}`}
                  />
                </SectionCard>

                <SectionCard
                  title="Approval checklist"
                  hint="Keep adjustments clean and auditable."
                >
                  <div className="grid gap-3 text-sm text-slate-700">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-semibold text-slate-600">
                        Rule
                      </div>
                      <div className="mt-1 font-semibold text-slate-900">
                        Approve only if stock movement is verifiable.
                      </div>
                      <div className="mt-2 text-xs text-slate-600">
                        Require: invoice / supplier note / arrival record /
                        signed count sheet.
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-semibold text-slate-600">
                        Before approving
                      </div>
                      <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
                        <li>Check product ID + SKU match.</li>
                        <li>Confirm quantity makes sense (not extreme).</li>
                        <li>Confirm reason is specific (not “fix”).</li>
                        <li>Use Proof & history if suspicious.</li>
                      </ul>
                    </div>

                    <button
                      type="button"
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                      onClick={() => setSection("evidence")}
                    >
                      Open Proof & history →
                    </button>
                  </div>
                </SectionCard>
              </div>
            ) : null}

            {/* SUPPLIERS */}
            {section === "suppliers" ? (
              <SuppliersPanel
                title="Suppliers"
                subtitle="Admin: create suppliers + bills + payments."
                capabilities={{
                  canCreateSupplier: true,
                  canCreateBill: true,
                  canRecordBillPayment: true,
                }}
                endpoints={{
                  SUPPLIERS_LIST: ENDPOINTS.SUPPLIERS_LIST,
                  SUPPLIER_CREATE: ENDPOINTS.SUPPLIER_CREATE,
                  SUPPLIER_SUMMARY: ENDPOINTS.SUPPLIER_SUMMARY,
                  SUPPLIER_BILLS_LIST: ENDPOINTS.SUPPLIER_BILLS_LIST,
                  SUPPLIER_BILL_CREATE: ENDPOINTS.SUPPLIER_BILL_CREATE,
                }}
              />
            ) : null}

            {/* CASH */}
            {section === "cash" ? (
              <SectionCard
                title="Cash reports"
                hint="Cash summary for this location."
              >
                <CashReportsPanel
                  key={`cash-${refreshNonce}`}
                  title="Admin Cash Oversight"
                />
              </SectionCard>
            ) : null}

            {/* CREDITS */}
            {section === "credits" ? (
              <SectionCard
                title="Credits"
                hint="Approve/decline and settle credits."
              >
                <CreditsPanel
                  key={`credits-${refreshNonce}`}
                  title="Credits (Admin)"
                  capabilities={{
                    canView: true,
                    canCreate: false,
                    canDecide: true,
                    canSettle: true,
                  }}
                />
                {creditsLoading ? (
                  <div className="mt-3 text-xs text-slate-600">Loading…</div>
                ) : null}
              </SectionCard>
            ) : null}

            {/* USERS */}
            {section === "users" ? (
              <SectionCard title="Staff" hint="Admin manages users.">
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
              <SectionCard
                title="Audit history"
                hint="Read-only log of actions."
              >
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
                hint="Investigate: what changed, who did it, and when."
              >
                <EvidenceForm router={router} toast={toast} />
              </SectionCard>
            ) : null}
          </main>
        </div>
      </div>

      {/* CANCEL MODAL */}
      {cancelOpen ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="text-sm font-semibold text-slate-900">
                Cancel sale #{cancelSaleId}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Rule: don’t cancel COMPLETED sales.
              </div>
            </div>

            <div className="p-4">
              <Input
                placeholder="Reason (optional)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />

              <div className="mt-4 flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setCancelOpen(false);
                    setCancelSaleId(null);
                    setCancelReason("");
                    setCancelState("idle");
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                  disabled={cancelState === "loading"}
                >
                  Close
                </button>

                <AsyncButton
                  variant="danger"
                  state={cancelState}
                  text="Confirm cancel"
                  loadingText="Cancelling…"
                  successText="Cancelled"
                  onClick={confirmCancel}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ARCHIVE / RESTORE MODAL */}
      {archOpen ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="text-sm font-semibold text-slate-900">
                {archMode === "archive" ? "Archive" : "Restore"} product #
                {archProduct?.id}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Product:{" "}
                {archProduct?.name ||
                  archProduct?.productName ||
                  archProduct?.title ||
                  "—"}
              </div>
            </div>

            <div className="p-4">
              {archMode === "archive" ? (
                <Input
                  placeholder="Reason (optional)"
                  value={archReason}
                  onChange={(e) => setArchReason(e.target.value)}
                />
              ) : (
                <div className="text-sm text-slate-700">
                  This will make the product active again.
                </div>
              )}

              <div className="mt-4 flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setArchOpen(false);
                    setArchProduct(null);
                    setArchReason("");
                    setArchState("idle");
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                  disabled={archState === "loading"}
                >
                  Close
                </button>

                <AsyncButton
                  variant={archMode === "archive" ? "primary" : "success"}
                  state={archState}
                  text={
                    archMode === "archive"
                      ? "Confirm archive"
                      : "Confirm restore"
                  }
                  loadingText="Working…"
                  successText="Done"
                  onClick={confirmArchiveRestore}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* DELETE MODAL */}
      {delOpen ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="text-sm font-semibold text-slate-900">
                Delete product #{delProduct?.id}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                {delProduct?.name ||
                  delProduct?.productName ||
                  delProduct?.title ||
                  "—"}
              </div>
            </div>

            <div className="p-4">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                This is permanent. If delete fails due to linked sales, use
                Archive instead.
              </div>

              <div className="mt-4 flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setDelOpen(false);
                    setDelProduct(null);
                    setDelState("idle");
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                  disabled={delState === "loading"}
                >
                  Close
                </button>

                <AsyncButton
                  variant="danger"
                  state={delState}
                  text="Confirm delete"
                  loadingText="Deleting…"
                  successText="Deleted"
                  onClick={confirmDeleteProduct}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ---------- Evidence form ---------- */
function EvidenceForm({ router, toast }) {
  const [evEntity, setEvEntity] = useState("sale");
  const [evEntityId, setEvEntityId] = useState("");
  const [evFrom, setEvFrom] = useState("");
  const [evTo, setEvTo] = useState("");
  const [evAction, setEvAction] = useState("");
  const [evUserId, setEvUserId] = useState("");
  const [evQ, setEvQ] = useState("");
  const [evLimit, setEvLimit] = useState(200);

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
        <div className="font-semibold text-slate-900">How to use</div>
        <div className="mt-1 text-slate-700">
          Choose entity, enter record code, then open proof.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-600 mb-1">
            Entity
          </div>
          <select
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            value={evEntity}
            onChange={(e) => setEvEntity(e.target.value)}
          >
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
          </select>
        </div>

        <div className="md:col-span-2">
          <div className="text-xs font-semibold text-slate-600 mb-1">
            Record code
          </div>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="Example: sale id / product id / payment id…"
            value={evEntityId}
            onChange={(e) => setEvEntityId(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-600 mb-1">From</div>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            type="date"
            value={evFrom}
            onChange={(e) => setEvFrom(e.target.value)}
          />
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-600 mb-1">To</div>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            type="date"
            value={evTo}
            onChange={(e) => setEvTo(e.target.value)}
          />
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-600 mb-1">
            Action
          </div>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="Example: PRICE_UPDATE"
            value={evAction}
            onChange={(e) => setEvAction(e.target.value)}
          />
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-600 mb-1">
            Staff code
          </div>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="User id"
            value={evUserId}
            onChange={(e) => setEvUserId(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <div className="text-xs font-semibold text-slate-600 mb-1">
            Search words
          </div>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="Example: cancelled, price change"
            value={evQ}
            onChange={(e) => setEvQ(e.target.value)}
          />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-600 mb-1">Rows</div>
          <select
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            value={String(evLimit)}
            onChange={(e) => setEvLimit(Number(e.target.value || 200))}
          >
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="300">300</option>
          </select>
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
  );
}
