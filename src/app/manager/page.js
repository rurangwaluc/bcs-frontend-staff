// ✅ PASTE THIS WHOLE FILE INTO:
// frontend-staff/src/app/manager/page.js

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import AsyncButton from "../../components/AsyncButton";
import AuditLogsPanel from "../../components/AuditLogsPanel";
import CashReportsPanel from "../../components/CashReportsPanel";
import CreditsPanel from "../../components/CreditsPanel";
import InventoryAdjustRequestsPanel from "../../components/InventoryAdjustRequestsPanel";
import ManagerUsersPanel from "../../components/ManagerUsersPanel";
import NotificationsBell from "../../components/NotificationsBell";
import ProductPricingPanel from "../../components/ProductPricingPanel";
import RoleBar from "../../components/RoleBar";
import SuppliersPanel from "../../components/SuppliersPanel";
import { apiFetch } from "../../lib/api";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

const ENDPOINTS = {
  // Manager dashboard
  MANAGER_DASHBOARD: "/manager/dashboard",

  // Sales
  SALES_LIST: "/sales",
  SALE_GET: (id) => `/sales/${id}`,
  SALE_CANCEL: (id) => `/sales/${id}/cancel`,

  // Inventory / products
  INVENTORY_LIST: "/inventory",
  PRODUCTS_LIST: "/products",
  INVENTORY_ARRIVALS_LIST: "/inventory/arrivals",

  PRODUCT_ARCHIVE: (id) => `/products/${id}/archive`,
  PRODUCT_RESTORE: (id) => `/products/${id}/restore`,

  // Payments
  PAYMENTS_LIST: "/payments",
  PAYMENTS_SUMMARY: "/payments/summary",
  PAYMENTS_BREAKDOWN: "/payments/breakdown",

  // Inventory adjust requests (for badge)
  INV_ADJ_REQ_LIST: "/inventory/adjust-requests",

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
  { key: "pricing", label: "Pricing" },
  { key: "inv_requests", label: "Inventory requests" },
  { key: "arrivals", label: "Stock arrivals" },
  { key: "suppliers", label: "Suppliers" },
  { key: "cash_reports", label: "Cash reports" },
  { key: "credits", label: "Credits" },
  { key: "staff", label: "Staff" },
];

const ADVANCED_SECTIONS = [
  { key: "audit", label: "Audit" },
  { key: "evidence", label: "Proof & History" },
];

const PAGE_SIZE = 10;

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
  if (p.isActive === false) return true;
  if (p.is_active === false) return true;
  if (p.isArchived === true) return true;
  if (p.is_archived === true) return true;
  if (p.archivedAt || p.archived_at) return true;
  if (String(p.status || "").toUpperCase() === "ARCHIVED") return true;
  return false;
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

/* ---------- UI atoms ---------- */

function Skeleton({ className = "" }) {
  return (
    <div
      className={cx("animate-pulse rounded-xl bg-slate-200/70", className)}
    />
  );
}

function PageSkeleton() {
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
              <Skeleton className="h-80 w-full rounded-2xl" />
              <Skeleton className="h-80 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
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

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold text-slate-600">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {sub ? <div className="mt-1 text-xs text-slate-600">{sub}</div> : null}
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
        "inline-flex items-center rounded-xl border px-2.5 py-1 text-[11px] font-bold",
        cls,
      )}
    >
      {children}
    </span>
  );
}

function statusTone(status) {
  const s = String(status || "").toUpperCase();
  if (s === "COMPLETED" || s === "PAID" || s === "APPROVED") return "success";
  if (s.includes("AWAIT") || s === "PENDING" || s === "OPEN") return "warn";
  if (s === "CANCELLED" || s === "DECLINED" || s === "VOID") return "danger";
  return "neutral";
}

function normalizeItemsForSummary(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((it) => {
      const name =
        String(
          it?.productName ??
            it?.name ??
            it?.product?.name ??
            it?.title ??
            "Item",
        ).trim() || "Item";
      const qty = Number(it?.qty ?? it?.quantity ?? it?.count ?? 0) || 0;
      const unitPrice =
        Number(
          it?.unitPrice ??
            it?.unit_price ??
            it?.price ??
            it?.sellingPrice ??
            it?.selling_price ??
            0,
        ) || 0;
      return { name, qty, unitPrice };
    })
    .filter((x) => x.qty > 0);
}

function firstItemLabel(items) {
  const list = normalizeItemsForSummary(items);
  if (!list.length) return { name: "—", qty: 0 };
  return { name: list[0].name, qty: list[0].qty };
}

function productNameById(products, productId) {
  const pid = String(productId ?? "");
  const p = (Array.isArray(products) ? products : []).find(
    (x) => String(x?.id) === pid,
  );
  return p?.name || p?.productName || p?.title || null;
}

/* ---------- lightweight beep + browser notifications ---------- */

function safePlayBeep({ volume = 0.06, durationMs = 160, freq = 920 } = {}) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    gain.gain.value = volume;
    osc.frequency.value = freq;
    osc.type = "sine";

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    setTimeout(
      () => {
        try {
          osc.stop();
          ctx.close?.();
        } catch {
          // ignore
        }
      },
      Math.max(80, Number(durationMs) || 160),
    );
  } catch {
    // ignore
  }
}

function isDocumentFocused() {
  if (typeof document === "undefined") return true;
  return (
    document.visibilityState === "visible" && (document.hasFocus?.() ?? true)
  );
}

/* ---------- Widgets ---------- */

function PayBreakdownCard({ title, loading, buckets }) {
  const order = ["CASH", "MOMO", "BANK", "CARD", "OTHER"];
  const total = order.reduce((s, k) => s + Number(buckets?.[k]?.total || 0), 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-xs text-slate-600">
        Total: {loading ? "…" : money(total)}
      </div>

      <div className="mt-3 grid gap-2">
        {order.map((k) => (
          <div key={k} className="flex items-center justify-between text-sm">
            <div className="text-slate-700">{k}</div>
            <div className="text-slate-900 font-semibold">
              {loading ? "…" : money(buckets?.[k]?.total || 0)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TodayMixWidget({ breakdown }) {
  const buckets = useMemo(() => sumBreakdown(breakdown || []), [breakdown]);
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
    <SectionCard title="Today payment mix" hint="How money came in today.">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {["CASH", "MOMO", "BANK", "CARD", "OTHER"].map((k) => (
          <div
            key={k}
            className="rounded-2xl border border-slate-200 bg-white p-3"
          >
            <div className="text-xs font-semibold text-slate-600">{k}</div>
            <div className="mt-1 text-lg font-bold text-slate-900">
              {buckets[k].count}
            </div>
            <div className="text-sm text-slate-700 mt-1">
              Total: {money(buckets[k].total)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {pct(buckets[k].total)}%
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-sm text-slate-700">
        <b>Today total:</b> {money(totalToday)}
      </div>
    </SectionCard>
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
    <SectionCard title="Low stock" hint={`Items with qty ≤ ${threshold}.`}>
      <div className="grid gap-2">
        {(Array.isArray(lowStock) ? lowStock : []).map((r, idx) => (
          <div
            key={`${r?.productId || idx}`}
            className="rounded-2xl border border-slate-200 bg-white p-3"
          >
            <div className="text-sm font-semibold text-slate-900">
              {nameFor(r?.productId)}
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Qty: <b>{Number(r?.qtyOnHand ?? r?.qty_on_hand ?? 0)}</b>
            </div>
          </div>
        ))}

        {(Array.isArray(lowStock) ? lowStock : []).length === 0 ? (
          <div className="text-sm text-slate-600">No low stock alerts.</div>
        ) : null}
      </div>
    </SectionCard>
  );
}

function StuckSalesWidget({ stuck, rule, saleDetailsById, ensureSaleDetails }) {
  function ageLabel(seconds) {
    const s = Number(seconds || 0);
    if (!Number.isFinite(s) || s <= 0) return "—";
    const mins = Math.floor(s / 60);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days}d ${hrs % 24}h`;
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m`;
  }

  const rows = Array.isArray(stuck) ? stuck : [];

  return (
    <SectionCard title="Stuck sales" hint={`Rule: ${rule || "aging sales"}.`}>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {rows.map((s, idx) => {
          const id = s?.id;
          const details = id ? saleDetailsById?.[id] : null;
          const items = details?.items || s?.items || [];
          const top = firstItemLabel(items);

          return (
            <div
              key={id || idx}
              className="rounded-2xl border border-slate-200 bg-white p-4"
              onMouseEnter={() => {
                if (id) ensureSaleDetails?.(id);
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-sm font-extrabold text-slate-900">
                      Sale #{id ?? "—"}
                    </div>
                    <Pill tone={statusTone(s?.status)}>
                      {String(s?.status ?? "—")}
                    </Pill>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    Age: <b>{ageLabel(s?.ageSeconds)}</b>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    Created: {fmt(s?.createdAt)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-600">
                    Total
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {money(s?.totalAmount ?? 0)}
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] font-semibold text-slate-600">
                  Top item
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900 truncate">
                  {top.name}
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  Qty: <b>{top.qty || 0}</b>
                </div>
              </div>
            </div>
          );
        })}

        {rows.length === 0 ? (
          <div className="text-sm text-slate-600">No stuck sales (good).</div>
        ) : null}
      </div>
    </SectionCard>
  );
}

/* ---------- Page ---------- */

export default function ManagerPage() {
  const router = useRouter();

  const [bootLoading, setBootLoading] = useState(true);
  const [me, setMe] = useState(null);

  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info");

  const [section, setSection] = useState("dashboard");
  const [showAdvanced, setShowAdvanced] = useState(false);

  function toast(kind, text) {
    setMsgKind(kind);
    setMsg(text || "");
  }

  // header controls
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [refreshState, setRefreshState] = useState("idle"); // idle|loading|success

  // dashboard
  const [dash, setDash] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);

  // sales
  const [sales, setSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [salesQ, setSalesQ] = useState("");
  const [salesPage, setSalesPage] = useState(1);

  const [saleDetailsById, setSaleDetailsById] = useState({});
  const [saleDetailsLoadingById, setSaleDetailsLoadingById] = useState({});

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelingState, setCancelingState] = useState("idle"); // idle|loading|success
  const [cancelSaleId, setCancelSaleId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  // inventory/products
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingInv, setLoadingInv] = useState(false);
  const [loadingProd, setLoadingProd] = useState(false);
  const [invQ, setInvQ] = useState("");

  const [showArchivedProducts, setShowArchivedProducts] = useState(false);
  const [prodQ, setProdQ] = useState("");

  const [archOpen, setArchOpen] = useState(false);
  const [archMode, setArchMode] = useState("archive"); // archive|restore
  const [archProduct, setArchProduct] = useState(null);
  const [archReason, setArchReason] = useState("");
  const [archState, setArchState] = useState("idle"); // idle|loading|success

  // arrivals
  const [arrivals, setArrivals] = useState([]);
  const [loadingArrivals, setLoadingArrivals] = useState(false);

  // payments
  const [payments, setPayments] = useState([]);
  const [paymentsSummary, setPaymentsSummary] = useState(null);
  const [paymentsBreakdown, setPaymentsBreakdown] = useState(null);
  const [payQ, setPayQ] = useState("");
  const [payView, setPayView] = useState("overview"); // overview|list
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loadingPaySummary, setLoadingPaySummary] = useState(false);
  const [loadingPayBreakdown, setLoadingPayBreakdown] = useState(false);

  // inventory requests badge
  const [invReqPendingCount, setInvReqPendingCount] = useState(0);
  const [invReqCountLoading, setInvReqCountLoading] = useState(false);
  const invReqInFlightRef = useRef(false);

  // sound + desktop notifications gate
  const userInteractedRef = useRef(false);
  const prevInvReqPendingRef = useRef(0);

  // evidence (advanced)
  const [evEntity, setEvEntity] = useState("sale");
  const [evEntityId, setEvEntityId] = useState("");
  const [evFrom, setEvFrom] = useState("");
  const [evTo, setEvTo] = useState("");
  const [evUserId, setEvUserId] = useState("");
  const [evQ, setEvQ] = useState("");
  const [evLimit, setEvLimit] = useState(200);

  const [evCandidates, setEvCandidates] = useState([]);
  const [evCandidatesLoading, setEvCandidatesLoading] = useState(false);

  const [evStaff, setEvStaff] = useState([]);
  const [evStaffLoading, setEvStaffLoading] = useState(false);

  // role guard
  useEffect(() => {
    let alive = true;

    async function run() {
      setBootLoading(true);
      try {
        const data = await getMe();
        if (!alive) return;

        const user = data?.user || null;
        setMe(user);

        const role = String(user?.role || "").toLowerCase();
        if (!role) return router.replace("/login");

        if (role !== "manager") {
          const map = {
            owner: "/owner",
            admin: "/admin",
            store_keeper: "/store-keeper",
            seller: "/seller",
            cashier: "/cashier",
          };
          router.replace(map[role] || "/");
          return;
        }
      } catch {
        if (!alive) return;
        router.replace("/login");
        return;
      } finally {
        if (!alive) return;
        setBootLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [router]);

  const isAuthorized =
    !!me && String(me?.role || "").toLowerCase() === "manager";

  // enable sound + notification permission only after first user interaction
  useEffect(() => {
    function onInteract() {
      userInteractedRef.current = true;

      try {
        if ("Notification" in window && Notification.permission === "default") {
          Notification.requestPermission().catch(() => {});
        }
      } catch {
        // ignore
      }

      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
    }

    window.addEventListener("pointerdown", onInteract);
    window.addEventListener("keydown", onInteract);

    return () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
  }, []);

  /* ---------- loaders ---------- */

  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    toast("info", "");
    try {
      const data = await apiFetch(ENDPOINTS.MANAGER_DASHBOARD, {
        method: "GET",
      });
      setDash(data?.dashboard || null);
    } catch (e) {
      setDash(null);
      toast("danger", e?.data?.error || e?.message || "Cannot load dashboard");
    } finally {
      setDashLoading(false);
    }
  }, []);

  const loadSales = useCallback(async () => {
    setLoadingSales(true);
    toast("info", "");
    try {
      const data = await apiFetch(ENDPOINTS.SALES_LIST, { method: "GET" });
      setSales(normalizeList(data, ["sales"]));
    } catch (e) {
      toast("danger", e?.data?.error || e?.message || "Cannot load sales");
      setSales([]);
    } finally {
      setLoadingSales(false);
    }
  }, []);

  const loadInventory = useCallback(async () => {
    setLoadingInv(true);
    toast("info", "");
    try {
      const data = await apiFetch(ENDPOINTS.INVENTORY_LIST, { method: "GET" });
      setInventory(normalizeList(data, ["inventory"]));
    } catch (e) {
      toast("danger", e?.data?.error || e?.message || "Cannot load inventory");
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
      toast("info", "");
      try {
        const path = includeInactive
          ? `${ENDPOINTS.PRODUCTS_LIST}?includeInactive=true`
          : ENDPOINTS.PRODUCTS_LIST;

        const data = await apiFetch(path, { method: "GET" });
        const items = normalizeList(data, ["products", "pricing"]);
        setProducts(items);
      } catch (e) {
        toast("danger", e?.data?.error || e?.message || "Cannot load products");
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
      toast("danger", e?.data?.error || e?.message || "Cannot load payments");
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
      toast(
        "danger",
        e?.data?.error || e?.message || "Cannot load payment summary",
      );
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
      toast(
        "danger",
        e?.data?.error || e?.message || "Cannot load payment breakdown",
      );
    } finally {
      setLoadingPayBreakdown(false);
    }
  }, []);

  const loadArrivals = useCallback(async () => {
    setLoadingArrivals(true);
    toast("info", "");
    try {
      const data = await apiFetch(ENDPOINTS.INVENTORY_ARRIVALS_LIST, {
        method: "GET",
      });
      setArrivals(normalizeList(data, ["arrivals"]));
    } catch (e) {
      toast("danger", e?.data?.error || e?.message || "Cannot load arrivals");
      setArrivals([]);
    } finally {
      setLoadingArrivals(false);
    }
  }, []);

  const ensureSaleDetails = useCallback(
    async (saleId) => {
      const id = Number(saleId);
      if (!Number.isInteger(id) || id <= 0) return;

      if (saleDetailsById[id]) return;
      if (saleDetailsLoadingById[id]) return;

      setSaleDetailsLoadingById((p) => ({ ...p, [id]: true }));
      try {
        const data = await apiFetch(ENDPOINTS.SALE_GET(id), { method: "GET" });
        const sale = data?.sale || data || null;
        setSaleDetailsById((p) => ({ ...p, [id]: sale || { id, items: [] } }));
      } catch {
        setSaleDetailsById((p) => ({ ...p, [id]: { id, items: [] } }));
      } finally {
        setSaleDetailsLoadingById((p) => {
          const copy = { ...p };
          delete copy[id];
          return copy;
        });
      }
    },
    [saleDetailsById, saleDetailsLoadingById],
  );

  const loadInvReqPendingCount = useCallback(async () => {
    if (invReqInFlightRef.current) return;

    invReqInFlightRef.current = true;
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

      // ✅ only update when changed (prevents “constant refresh feel”)
      setInvReqPendingCount((prev) => (prev === n ? prev : n));
    } catch {
      // keep old value
    } finally {
      invReqInFlightRef.current = false;
      setInvReqCountLoading(false);
    }
  }, []);

  /* ---------- controlled polling (NOT always) ---------- */
  useEffect(() => {
    if (!isAuthorized) return;

    // ✅ poll only where it matters, slower interval
    const shouldPoll = section === "dashboard" || section === "inv_requests";
    if (!shouldPoll) return;

    loadInvReqPendingCount();

    const t = setInterval(() => {
      loadInvReqPendingCount();
    }, 60_000);

    return () => clearInterval(t);
  }, [isAuthorized, section, loadInvReqPendingCount]);

  // Beep + browser notification when pending approvals increases
  useEffect(() => {
    if (!isAuthorized) return;

    const prev = Number(prevInvReqPendingRef.current || 0);
    const cur = Number(invReqPendingCount || 0);

    if (cur > prev) {
      if (userInteractedRef.current) {
        safePlayBeep({ volume: 0.06, freq: 920, durationMs: 160 });
      }

      if (!isDocumentFocused()) {
        try {
          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification("Inventory approvals pending", {
              body: `${cur} pending request${cur === 1 ? "" : "s"} need approval.`,
            });
          }
        } catch {
          // ignore
        }
      }
    }

    prevInvReqPendingRef.current = cur;
  }, [invReqPendingCount, isAuthorized]);

  /* ---------- refresh button ---------- */
  const refreshCurrent = useCallback(async () => {
    toast("info", "");
    setRefreshState("loading");

    try {
      const componentTabs = new Set([
        "cash_reports",
        "credits",
        "staff",
        "audit",
        "evidence",
        "pricing",
        "inv_requests",
        "suppliers",
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
          loadDashboard(),
          loadSales(),
          loadInventory(),
          loadProducts({ includeInactive: showArchivedProducts }),
          loadPaymentsSummary(),
          loadPayments(),
          loadPaymentsBreakdown(),
          loadArrivals(),
          loadInvReqPendingCount(),
        ]);

        const stuck = Array.isArray(dash?.sales?.stuck) ? dash.sales.stuck : [];
        await Promise.all(
          stuck
            .slice(0, 12)
            .map((x) => (x?.id ? ensureSaleDetails(x.id) : Promise.resolve())),
        );

        setRefreshState("success");
        setTimeout(() => setRefreshState("idle"), 900);
        return;
      }

      if (section === "sales") await loadSales();
      if (section === "inventory") {
        await Promise.all([
          loadInventory(),
          loadProducts({ includeInactive: showArchivedProducts }),
        ]);
      }
      if (section === "payments")
        await Promise.all([
          loadPayments(),
          loadPaymentsSummary(),
          loadPaymentsBreakdown(),
        ]);
      if (section === "arrivals") await loadArrivals();

      setRefreshState("success");
      setTimeout(() => setRefreshState("idle"), 900);
    } catch (e) {
      setRefreshState("idle");
      toast("danger", e?.data?.error || e?.message || "Refresh failed");
    }
  }, [
    section,
    showArchivedProducts,
    loadDashboard,
    loadSales,
    loadInventory,
    loadProducts,
    loadPaymentsSummary,
    loadPayments,
    loadPaymentsBreakdown,
    loadArrivals,
    dash,
    ensureSaleDetails,
    loadInvReqPendingCount,
  ]);

  /* ---------- load per section ---------- */
  useEffect(() => {
    if (!isAuthorized) return;

    if (section === "dashboard") {
      loadDashboard();
      loadSales();
      loadInventory();
      loadProducts({ includeInactive: showArchivedProducts });
      loadPaymentsSummary();
      loadPayments();
      loadPaymentsBreakdown();
      loadArrivals();
      loadInvReqPendingCount();
    }

    if (section === "sales") loadSales();

    if (section === "inventory") {
      loadInventory();
      loadProducts({ includeInactive: showArchivedProducts });
    }

    if (section === "payments") {
      loadPayments();
      loadPaymentsSummary();
      loadPaymentsBreakdown();
    }

    if (section === "arrivals") loadArrivals();

    if (section === "inv_requests") loadInvReqPendingCount();
  }, [
    isAuthorized,
    section,
    loadDashboard,
    loadSales,
    loadInventory,
    loadProducts,
    showArchivedProducts,
    loadPaymentsSummary,
    loadPayments,
    loadPaymentsBreakdown,
    loadArrivals,
    loadInvReqPendingCount,
  ]);

  // reload products when toggle changes in inventory
  useEffect(() => {
    if (!isAuthorized) return;
    if (section !== "inventory") return;
    loadProducts({ includeInactive: showArchivedProducts });
  }, [isAuthorized, section, showArchivedProducts, loadProducts]);

  // reset sales page when search changes
  useEffect(() => {
    setSalesPage(1);
  }, [salesQ]);

  // prefetch sale details for visible sales (items + top product/qty)
  useEffect(() => {
    if (section !== "sales") return;

    const qq = String(salesQ || "")
      .trim()
      .toLowerCase();
    const list = (Array.isArray(sales) ? sales : [])
      .slice()
      .sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0))
      .filter((s) => {
        if (!qq) return true;

        const hay = [
          s?.id,
          s?.status,
          s?.customerName ?? s?.customer_name,
          s?.customerPhone ?? s?.customer_phone,
          s?.customerTin ?? s?.customer_tin,
          s?.customerAddress ?? s?.customer_address,
          s?.customer?.tin,
          s?.customer?.address,
          s?.customer?.customerTin,
          s?.customer?.customer_tin,
          s?.customer?.customerAddress,
          s?.customer?.customer_address,
          s?.customer?.taxId,
          s?.customer?.tax_id,
          s?.customer?.tinNumber,
          s?.customer?.tin_number,
        ]
          .map((x) => String(x ?? ""))
          .join(" ")
          .toLowerCase();

        return hay.includes(qq);
      })
      .slice(0, salesPage * PAGE_SIZE)
      .slice(0, 20);

    list.forEach((s) => {
      if (s?.id) ensureSaleDetails(s.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, sales, salesQ, salesPage]);

  /* ---------- derived values ---------- */

  const unpricedCount = useMemo(() => {
    // ✅ count unpriced among ACTIVE products (archived do not matter for pricing gaps)
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

  const dashTodayTotal = useMemo(() => {
    const rows =
      dash?.payments?.breakdownToday || paymentsBreakdown?.today || [];
    const b = sumBreakdown(rows);
    return Object.values(b).reduce((s, x) => s + Number(x.total || 0), 0);
  }, [dash, paymentsBreakdown]);

  const dashLowStockCount = useMemo(() => {
    return Array.isArray(dash?.inventory?.lowStock)
      ? dash.inventory.lowStock.length
      : 0;
  }, [dash]);

  const dashStuckSalesCount = useMemo(() => {
    return Array.isArray(dash?.sales?.stuck) ? dash.sales.stuck.length : 0;
  }, [dash]);

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
      const hay = [
        s?.id,
        s?.status,
        s?.customerName ?? s?.customer_name,
        s?.customerPhone ?? s?.customer_phone,
        s?.customerTin ?? s?.customer_tin,
        s?.customerAddress ?? s?.customer_address,
        s?.customer?.tin,
        s?.customer?.address,
        s?.customer?.customerTin,
        s?.customer?.customer_tin,
        s?.customer?.customerAddress,
        s?.customer?.customer_address,
        s?.customer?.taxId,
        s?.customer?.tax_id,
        s?.customer?.tinNumber,
        s?.customer?.tin_number,
      ]
        .map((x) => String(x ?? ""))
        .join(" ")
        .toLowerCase();
      return hay.includes(qq);
    });
  }, [salesSorted, salesQ]);

  const salesShown = useMemo(
    () => filteredSales.slice(0, salesPage * PAGE_SIZE),
    [filteredSales, salesPage],
  );
  const canLoadMoreSales = useMemo(
    () => salesShown.length < filteredSales.length,
    [salesShown.length, filteredSales.length],
  );

  const paymentsWithItems = useMemo(() => {
    const list = Array.isArray(payments) ? payments : [];
    return list.map((p) => {
      const saleId = p?.saleId ?? p?.sale_id ?? null;
      const sale = saleId != null ? saleDetailsById?.[Number(saleId)] : null;
      const items = sale?.items || [];
      const top = firstItemLabel(items);
      return { p, saleId, topItemName: top.name, topItemQty: top.qty };
    });
  }, [payments, saleDetailsById]);

  // prefetch sale details for payments list (top 25)
  useEffect(() => {
    if (section !== "payments") return;
    if (payView !== "list") return;

    const list = (Array.isArray(payments) ? payments : []).slice(0, 25);
    list.forEach((p) => {
      const sid = p?.saleId ?? p?.sale_id ?? null;
      if (sid != null) ensureSaleDetails(sid);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, payView, payments]);

  const arrivalsNormalized = useMemo(() => {
    const list = Array.isArray(arrivals) ? arrivals : [];
    return list.map((a) => {
      const pid = a?.productId ?? a?.product_id ?? null;

      const productName =
        toStr(a?.productName || a?.product_name) ||
        (pid != null ? productNameById(products, pid) : null) ||
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

  function badgeForSectionKey(key) {
    if (key === "pricing") return pricingBadge;
    if (key === "arrivals") return arrivalsBadge;
    if (key === "inv_requests") return invReqBadge;
    return null;
  }

  function getCustomerTin(s) {
    const tin =
      toStr(s?.customerTin ?? s?.customer_tin) ||
      toStr(s?.customer?.tin) ||
      toStr(s?.customer?.customerTin ?? s?.customer?.customer_tin) ||
      toStr(s?.customer?.taxId ?? s?.customer?.tax_id) ||
      toStr(s?.customer?.tinNumber ?? s?.customer?.tin_number);
    return tin;
  }

  function getCustomerAddress(s) {
    const addr =
      toStr(s?.customerAddress ?? s?.customer_address) ||
      toStr(s?.customer?.address) ||
      toStr(s?.customer?.customerAddress ?? s?.customer?.customer_address) ||
      toStr(s?.customer?.location ?? s?.customer?.location_text);
    return addr;
  }

  /* ---------- actions ---------- */

  function canCancelSale(s) {
    const st = String(s?.status || "").toUpperCase();
    return st !== "COMPLETED";
  }

  function openCancel(saleId) {
    setCancelSaleId(Number(saleId));
    setCancelReason("");
    setCancelOpen(true);
    setCancelingState("idle");
    toast("info", "");
  }

  async function confirmCancel() {
    if (!cancelSaleId) return;

    setCancelingState("loading");
    toast("info", "");

    try {
      await apiFetch(ENDPOINTS.SALE_CANCEL(cancelSaleId), {
        method: "POST",
        body: cancelReason?.trim()
          ? { reason: cancelReason.trim() }
          : undefined,
      });

      toast("success", `Sale #${cancelSaleId} cancelled`);
      setCancelingState("success");
      setTimeout(() => setCancelingState("idle"), 900);

      setCancelOpen(false);
      setCancelSaleId(null);
      setCancelReason("");

      await loadSales();
    } catch (e) {
      setCancelingState("idle");
      toast("danger", e?.data?.error || e?.message || "Cancel failed");
    }
  }

  function openArchiveProduct(prod) {
    if (!prod?.id) return;
    setArchMode("archive");
    setArchProduct(prod);
    setArchReason("");
    setArchOpen(true);
    setArchState("idle");
    toast("info", "");
  }

  function openRestoreProduct(prod) {
    if (!prod?.id) return;
    setArchMode("restore");
    setArchProduct(prod);
    setArchReason("");
    setArchOpen(true);
    setArchState("idle");
    toast("info", "");
  }

  async function confirmArchiveRestore() {
    const pid = archProduct?.id;
    if (!pid) return;

    setArchState("loading");
    toast("info", "");

    try {
      if (archMode === "archive") {
        await apiFetch(ENDPOINTS.PRODUCT_ARCHIVE(pid), {
          method: "PATCH",
          body: archReason?.trim() ? { reason: archReason.trim() } : undefined,
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

  /* ---------- evidence helpers ---------- */

  function makeCandidateLabel(entity, row) {
    const when = fmt(
      row?.createdAt || row?.created_at || row?.openedAt || row?.opened_at,
    );

    if (entity === "sale") {
      const name = (
        row?.customerName ||
        row?.customer_name ||
        "Customer"
      ).trim();
      const total = money(row?.totalAmount ?? row?.total ?? 0);
      return `Sale — ${name} — ${total} — ${when}`;
    }
    if (entity === "payment") {
      const amount = money(row?.amount ?? 0);
      const method = row?.method || "Payment";
      return `Payment — ${amount} — ${method} — ${when}`;
    }
    if (entity === "refund") {
      const amount = money(row?.amount ?? 0);
      const reason = row?.reason ? ` — ${String(row.reason).slice(0, 40)}` : "";
      return `Refund — ${amount}${reason} — ${when}`;
    }
    if (entity === "cash_session") {
      const status = row?.status || "Session";
      return `Cash session — ${status} — ${when}`;
    }
    if (entity === "expense") {
      const amount = money(row?.amount ?? 0);
      const note = row?.note ? ` — ${String(row.note).slice(0, 40)}` : "";
      return `Expense — ${amount}${note} — ${when}`;
    }
    if (entity === "deposit") {
      const amount = money(row?.amount ?? 0);
      return `Deposit — ${amount} — ${when}`;
    }
    if (entity === "credit") {
      const amount = money(row?.amount ?? 0);
      const name = (row?.customerName || "Customer").trim();
      const status = row?.status || "Credit";
      return `Credit — ${name} — ${amount} — ${status} — ${when}`;
    }
    if (entity === "product") {
      const name = (
        row?.name ||
        row?.productName ||
        row?.title ||
        "Product"
      ).trim();
      const sku = row?.sku ? ` — SKU ${row.sku}` : "";
      return `Product — ${name}${sku}`;
    }
    if (entity === "inventory") {
      const name = (
        row?.productName ||
        row?.product_name ||
        row?.name ||
        "Item"
      ).trim();
      const sku = row?.sku ? ` — SKU ${row.sku}` : "";
      const qty =
        row?.qtyOnHand ?? row?.qty_on_hand ?? row?.qty ?? row?.quantity;
      return qty != null
        ? `Inventory — ${name}${sku} — Qty ${qty}`
        : `Inventory — ${name}${sku}`;
    }
    if (entity === "user") {
      const name = (row?.name || "Staff").trim();
      const email = row?.email ? ` — ${row.email}` : "";
      return `Staff — ${name}${email}`;
    }
    return `Record — ${when}`;
  }

  async function loadEvidenceCandidates(entity) {
    setEvCandidatesLoading(true);
    try {
      const map = {
        sale: ENDPOINTS.SALES_LIST,
        payment: ENDPOINTS.PAYMENTS_LIST,
        refund: "/refunds",
        cash_session: "/cash-sessions",
        credit: "/credits",
        product: ENDPOINTS.PRODUCTS_LIST,
        inventory: ENDPOINTS.INVENTORY_LIST,
        user: "/users",
        expense: "/cash/expenses",
        deposit: "/cash/deposits",
      };

      const path = map[entity];
      if (!path) {
        setEvCandidates([]);
        return;
      }

      const data = await apiFetch(path, { method: "GET" });

      const list =
        (Array.isArray(data?.sales) && data.sales) ||
        (Array.isArray(data?.payments) && data.payments) ||
        (Array.isArray(data?.refunds) && data.refunds) ||
        (Array.isArray(data?.sessions) && data.sessions) ||
        (Array.isArray(data?.credits) && data.credits) ||
        (Array.isArray(data?.products) && data.products) ||
        (Array.isArray(data?.inventory) && data.inventory) ||
        (Array.isArray(data?.users) && data.users) ||
        (Array.isArray(data?.rows) && data.rows) ||
        (Array.isArray(data?.items) && data.items) ||
        [];

      const top = list
        .slice()
        .sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0))
        .slice(0, 30)
        .map((row) => ({ id: row?.id, label: makeCandidateLabel(entity, row) }))
        .filter((x) => x.id != null);

      setEvCandidates(top);

      if (evEntityId && !top.some((x) => String(x.id) === String(evEntityId))) {
        setEvEntityId("");
      }
    } catch {
      setEvCandidates([]);
    } finally {
      setEvCandidatesLoading(false);
    }
  }

  async function loadEvidenceStaff() {
    setEvStaffLoading(true);
    try {
      const data = await apiFetch("/users", { method: "GET" });
      const list = Array.isArray(data?.users) ? data.users : [];
      setEvStaff(list.map((u) => ({ id: u.id, name: u.name, email: u.email })));
    } catch {
      setEvStaff([]);
    } finally {
      setEvStaffLoading(false);
    }
  }

  useEffect(() => {
    if (section !== "evidence") return;
    loadEvidenceStaff();
    loadEvidenceCandidates(evEntity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, evEntity, refreshNonce]);

  /* ---------- guard ---------- */

  if (bootLoading) return <PageSkeleton />;
  if (!isAuthorized)
    return <div className="p-6 text-sm text-slate-600">Redirecting…</div>;

  const subtitle = `User: ${me?.email || "—"} • ${locationLabel(me)}`;

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      <RoleBar
        title="Manager"
        subtitle={subtitle}
        user={me}
        right={
          <div className="flex items-center gap-2">
            {/* Bell uses SSE internally. If your /api proxy is wrong, fix .env.local or next.config.js. */}
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
            <div className="text-sm font-semibold text-slate-900">Manager</div>
            <div className="mt-1 text-xs text-slate-600">
              {locationLabel(me)}
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
                {[...SECTIONS, ...(showAdvanced ? ADVANCED_SECTIONS : [])].map(
                  (s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ),
                )}
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
                    {ADVANCED_SECTIONS.map((s) => (
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
                  Advanced is for checking “who did what”.
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
                Tip: click once anywhere to enable sound + desktop notifications
                (browser policy).
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="grid gap-4">
            {/* DASHBOARD */}
            {section === "dashboard" ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <StatCard
                    label="Money today"
                    value={dashLoading ? "…" : money(dashTodayTotal)}
                    sub="All methods"
                  />
                  <StatCard
                    label="Low stock"
                    value={dashLoading ? "…" : String(dashLowStockCount)}
                    sub="Need restock"
                  />
                  <StatCard
                    label="Stuck sales"
                    value={dashLoading ? "…" : String(dashStuckSalesCount)}
                    sub="Need action"
                  />
                  <StatCard
                    label="Pricing gaps"
                    value={pricingBadge ? pricingBadge : "0"}
                    sub="Unpriced products"
                  />
                </div>

                {dashLoading ? (
                  <SectionCard title="Dashboard" hint="Loading…">
                    <div className="grid gap-3">
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  </SectionCard>
                ) : !dash ? (
                  <Banner kind="warn">No dashboard data.</Banner>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <TodayMixWidget
                      breakdown={dash?.payments?.breakdownToday || []}
                    />
                    <LowStockWidget
                      lowStock={dash?.inventory?.lowStock || []}
                      threshold={dash?.inventory?.lowStockThreshold ?? 5}
                      products={products}
                    />

                    <div className="xl:col-span-2">
                      <StuckSalesWidget
                        stuck={dash?.sales?.stuck || []}
                        rule={dash?.sales?.stuckRule}
                        saleDetailsById={saleDetailsById}
                        ensureSaleDetails={ensureSaleDetails}
                      />
                    </div>

                    <div className="xl:col-span-2">
                      <SectionCard
                        title="Manager quick actions"
                        hint="Fast navigation to what blocks operations."
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <button
                            type="button"
                            onClick={() => setSection("inv_requests")}
                            className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-bold text-slate-900">
                                Inventory requests
                              </div>
                              {invReqPendingCount > 0 ? (
                                <Pill tone="warn">
                                  {invReqPendingCount} pending
                                </Pill>
                              ) : (
                                <Pill tone="success">Clear</Pill>
                              )}
                            </div>
                            <div className="mt-1 text-xs text-slate-600">
                              Approve/decline adjustments.
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSection("pricing")}
                            className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-bold text-slate-900">
                                Pricing
                              </div>
                              {unpricedCount > 0 ? (
                                <Pill tone="warn">
                                  {unpricedCount} unpriced
                                </Pill>
                              ) : (
                                <Pill tone="success">All priced</Pill>
                              )}
                            </div>
                            <div className="mt-1 text-xs text-slate-600">
                              Fix missing selling prices.
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSection("arrivals")}
                            className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
                          >
                            <div className="text-sm font-bold text-slate-900">
                              Stock arrivals
                            </div>
                            <div className="mt-1 text-xs text-slate-600">
                              See recent incoming stock.
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSection("suppliers")}
                            className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
                          >
                            <div className="text-sm font-bold text-slate-900">
                              Suppliers
                            </div>
                            <div className="mt-1 text-xs text-slate-600">
                              Bills + balances.
                            </div>
                          </button>
                        </div>
                      </SectionCard>
                    </div>
                  </div>
                )}
              </>
            ) : null}

            {/* SALES */}
            {section === "sales" ? (
              <SectionCard
                title="Sales"
                hint="Shows 10 sales. Load more adds 10. Search is instant."
                right={
                  <AsyncButton
                    variant="secondary"
                    size="sm"
                    state={loadingSales ? "loading" : "idle"}
                    text="Reload"
                    loadingText="Loading…"
                    successText="Done"
                    onClick={loadSales}
                  />
                }
              >
                <div className="grid gap-3">
                  <Input
                    placeholder="Search: id, status, customer name, phone, tin, address"
                    value={salesQ}
                    onChange={(e) => setSalesQ(e.target.value)}
                  />

                  {loadingSales ? (
                    <div className="grid gap-3">
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {salesShown.map((s) => {
                          const sid = s?.id;
                          const st = String(s?.status || "—");
                          const details = sid ? saleDetailsById[sid] : null;
                          const its = details?.items || s?.items || [];
                          const isItemsLoading = sid
                            ? !!saleDetailsLoadingById[sid]
                            : false;

                          const customerName =
                            (
                              s?.customerName ||
                              s?.customer_name ||
                              ""
                            ).trim() || "—";
                          const customerPhone = toStr(
                            s?.customerPhone || s?.customer_phone,
                          );
                          const customerTin = getCustomerTin(s);
                          const customerAddress = getCustomerAddress(s);

                          const top = firstItemLabel(its);

                          return (
                            <div
                              key={sid}
                              className="rounded-2xl border border-slate-200 bg-white p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <div className="text-sm font-extrabold text-slate-900">
                                      Sale #{sid ?? "—"}
                                    </div>
                                    <Pill tone={statusTone(st)}>{st}</Pill>
                                  </div>
                                  <div className="mt-1 text-xs text-slate-600">
                                    Time:{" "}
                                    <b>{fmt(s?.createdAt || s?.created_at)}</b>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <div className="text-xs font-semibold text-slate-600">
                                    Total
                                  </div>
                                  <div className="text-lg font-extrabold text-slate-900">
                                    {money(s?.totalAmount ?? s?.total ?? 0)}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    RWF
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                  <div className="text-[11px] font-semibold text-slate-600">
                                    Top item
                                  </div>
                                  <div className="mt-1 text-sm font-semibold text-slate-900 truncate">
                                    {isItemsLoading ? "Loading…" : top.name}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-600">
                                    Qty:{" "}
                                    <b>{isItemsLoading ? "…" : top.qty || 0}</b>
                                  </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                  <div className="text-[11px] font-semibold text-slate-600">
                                    Customer
                                  </div>
                                  <div className="mt-1 text-sm font-semibold text-slate-900 truncate">
                                    {customerName}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-600">
                                    {customerPhone ? (
                                      <span>
                                        Phone: <b>{customerPhone}</b>
                                      </span>
                                    ) : (
                                      <span>Phone: —</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                                  <div>
                                    TIN: <b>{customerTin || "—"}</b>
                                  </div>
                                  <div className="truncate">
                                    Address: <b>{customerAddress || "—"}</b>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 flex items-center justify-between gap-2">
                                <div className="flex gap-2">
                                  {sid && !details && !isItemsLoading ? (
                                    <AsyncButton
                                      variant="secondary"
                                      size="sm"
                                      state="idle"
                                      text="Load items"
                                      loadingText="Loading…"
                                      successText="Done"
                                      onClick={() => ensureSaleDetails(sid)}
                                    />
                                  ) : null}
                                </div>

                                <AsyncButton
                                  variant="danger"
                                  size="sm"
                                  state="idle"
                                  text="Cancel"
                                  loadingText="Cancelling…"
                                  successText="Done"
                                  disabled={!canCancelSale(s)}
                                  onClick={() => openCancel(sid)}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {salesShown.length === 0 ? (
                        <div className="text-sm text-slate-600">
                          No sales found.
                        </div>
                      ) : null}

                      {canLoadMoreSales ? (
                        <button
                          type="button"
                          onClick={() => setSalesPage((p) => p + 1)}
                          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                        >
                          Load more
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              </SectionCard>
            ) : null}

            {/* PAYMENTS */}
            {section === "payments" ? (
              <div className="grid gap-4">
                <SectionCard
                  title="Payments"
                  hint="Overview + list. List shows top product + qty from the sale."
                  right={
                    <AsyncButton
                      variant="primary"
                      size="sm"
                      state={
                        loadingPayments ||
                        loadingPaySummary ||
                        loadingPayBreakdown
                          ? "loading"
                          : "idle"
                      }
                      text="Refresh"
                      loadingText="Refreshing…"
                      successText="Done"
                      onClick={() => {
                        loadPayments();
                        loadPaymentsSummary();
                        loadPaymentsBreakdown();
                      }}
                    />
                  }
                >
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPayView("overview")}
                      className={cx(
                        "rounded-xl border px-4 py-2 text-sm font-semibold",
                        payView === "overview"
                          ? "bg-slate-900 text-white border-slate-900"
                          : "hover:bg-slate-50",
                      )}
                    >
                      Overview
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayView("list")}
                      className={cx(
                        "rounded-xl border px-4 py-2 text-sm font-semibold",
                        payView === "list"
                          ? "bg-slate-900 text-white border-slate-900"
                          : "hover:bg-slate-50",
                      )}
                    >
                      List
                    </button>
                  </div>

                  {payView === "overview" ? (
                    <div className="mt-4 grid gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <StatCard
                          label="Today"
                          value={
                            loadingPaySummary
                              ? "…"
                              : String(paymentsSummary?.today?.count ?? 0)
                          }
                          sub={`Total: ${money(paymentsSummary?.today?.total ?? 0)} RWF`}
                        />
                        <StatCard
                          label="Yesterday"
                          value={
                            loadingPaySummary
                              ? "…"
                              : String(paymentsSummary?.yesterday?.count ?? 0)
                          }
                          sub={`Total: ${money(paymentsSummary?.yesterday?.total ?? 0)} RWF`}
                        />
                        <StatCard
                          label="All time"
                          value={
                            loadingPaySummary
                              ? "…"
                              : String(paymentsSummary?.allTime?.count ?? 0)
                          }
                          sub={`Total: ${money(paymentsSummary?.allTime?.total ?? 0)} RWF`}
                        />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <PayBreakdownCard
                          title="Today"
                          loading={loadingPayBreakdown}
                          buckets={breakdownTodayTotals}
                        />
                        <PayBreakdownCard
                          title="Yesterday"
                          loading={loadingPayBreakdown}
                          buckets={breakdownYesterday}
                        />
                        <PayBreakdownCard
                          title="All time"
                          loading={loadingPayBreakdown}
                          buckets={breakdownAll}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-3">
                      <Input
                        placeholder="Search: payment id, sale id, method, amount"
                        value={payQ}
                        onChange={(e) => setPayQ(e.target.value)}
                      />

                      {loadingPayments ? (
                        <div className="grid gap-3">
                          <Skeleton className="h-24 w-full" />
                          <Skeleton className="h-24 w-full" />
                          <Skeleton className="h-24 w-full" />
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                            {paymentsWithItems
                              .filter(({ p }) => {
                                const qq = String(payQ || "")
                                  .trim()
                                  .toLowerCase();
                                if (!qq) return true;
                                const id = String(p?.id ?? "");
                                const saleId = String(
                                  p?.saleId ?? p?.sale_id ?? "",
                                );
                                const method = String(
                                  p?.method ?? "",
                                ).toLowerCase();
                                const amount = String(p?.amount ?? "");
                                return (
                                  id.includes(qq) ||
                                  saleId.includes(qq) ||
                                  method.includes(qq) ||
                                  amount.includes(qq)
                                );
                              })
                              .slice(0, 60)
                              .map(
                                (
                                  { p, saleId, topItemName, topItemQty },
                                  idx,
                                ) => {
                                  const method = String(
                                    p?.method ?? "—",
                                  ).toUpperCase();
                                  const amount = Number(p?.amount ?? 0) || 0;
                                  const time = p?.createdAt || p?.created_at;

                                  return (
                                    <div
                                      key={p?.id || idx}
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
                                            Sale: <b>#{saleId ?? "—"}</b> •
                                            Time: <b>{fmt(time)}</b>
                                          </div>
                                        </div>

                                        <div className="text-right">
                                          <div className="text-xs font-semibold text-slate-600">
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

                                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                        <div className="text-[11px] font-semibold text-slate-600">
                                          Top item
                                        </div>
                                        <div className="mt-1 text-sm font-semibold text-slate-900 truncate">
                                          {topItemName || "—"}
                                        </div>
                                        <div className="mt-1 text-xs text-slate-600">
                                          Qty: <b>{topItemQty || 0}</b>
                                        </div>
                                      </div>

                                      {toStr(p?.note) ? (
                                        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                                          <b>Note:</b> {toStr(p.note)}
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                },
                              )}
                          </div>

                          {paymentsWithItems.length === 0 ? (
                            <div className="text-sm text-slate-600">
                              No payments.
                            </div>
                          ) : null}

                          {paymentsWithItems.length > 60 ? (
                            <div className="text-xs text-slate-600">
                              Showing first 60 results (to keep it fast).
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  )}
                </SectionCard>
              </div>
            ) : null}

            {/* INVENTORY */}
            {section === "inventory" ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <SectionCard
                  title="Inventory"
                  hint="Name, SKU, qty, selling price."
                  right={
                    <AsyncButton
                      variant="secondary"
                      size="sm"
                      state={loadingInv || loadingProd ? "loading" : "idle"}
                      text="Reload"
                      loadingText="Loading…"
                      successText="Done"
                      onClick={() => {
                        loadInventory();
                        loadProducts({ includeInactive: showArchivedProducts });
                      }}
                    />
                  }
                >
                  <Input
                    placeholder="Search by name or SKU"
                    value={invQ}
                    onChange={(e) => setInvQ(e.target.value)}
                  />

                  <div className="mt-3">
                    {loadingInv || loadingProd ? (
                      <div className="grid gap-3">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {(Array.isArray(inventory) ? inventory : [])
                          .filter((p) => {
                            const qq = String(invQ || "")
                              .trim()
                              .toLowerCase();
                            if (!qq) return true;
                            const name = String(
                              p?.name ||
                                p?.productName ||
                                p?.product_name ||
                                "",
                            ).toLowerCase();
                            const sku = String(p?.sku || "").toLowerCase();
                            return name.includes(qq) || sku.includes(qq);
                          })
                          .map((p, idx) => {
                            const pid =
                              p?.productId ?? p?.product_id ?? p?.id ?? "—";
                            const name =
                              p?.productName ||
                              p?.product_name ||
                              p?.name ||
                              "—";
                            const sku = p?.sku || "—";
                            const qty =
                              p?.qtyOnHand ??
                              p?.qty_on_hand ??
                              p?.qty ??
                              p?.quantity ??
                              0;

                            const selling = (() => {
                              const prod =
                                (pid != null
                                  ? (Array.isArray(products)
                                      ? products
                                      : []
                                    ).find((x) => String(x?.id) === String(pid))
                                  : null) ||
                                (sku
                                  ? (Array.isArray(products)
                                      ? products
                                      : []
                                    ).find(
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

                              return price == null ? "—" : money(price);
                            })();

                            return (
                              <div
                                key={p?.id || `${pid}-${idx}`}
                                className="rounded-2xl border border-slate-200 bg-white p-4"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-sm font-bold text-slate-900 truncate">
                                      {name}
                                    </div>
                                    <div className="mt-1 text-xs text-slate-600">
                                      SKU: <b>{sku}</b>
                                    </div>
                                  </div>

                                  <div className="flex gap-4">
                                    <div className="text-right">
                                      <div className="text-xs font-semibold text-slate-600">
                                        Qty
                                      </div>
                                      <div className="text-sm font-bold text-slate-900">
                                        {Number(qty)}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs font-semibold text-slate-600">
                                        Selling
                                      </div>
                                      <div className="text-sm font-bold text-slate-900">
                                        {selling}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                        {(Array.isArray(inventory) ? inventory : []).length ===
                        0 ? (
                          <div className="text-sm text-slate-600">
                            No inventory items.
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </SectionCard>

                <SectionCard
                  title={`Products (${showArchivedProducts ? "Archived" : "Active"})`}
                  hint="Archive or restore products."
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
                    {loadingProd ? (
                      <div className="grid gap-3">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {(Array.isArray(products) ? products : [])
                          .filter((p) => {
                            const qq = String(prodQ || "")
                              .trim()
                              .toLowerCase();
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
                            return (
                              id.includes(qq) ||
                              name.includes(qq) ||
                              sku.includes(qq)
                            );
                          })
                          .map((p) => {
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
                                key={p?.id}
                                className="rounded-2xl border border-slate-200 bg-white p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <div className="text-sm font-bold text-slate-900 truncate">
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

                                  <div className="shrink-0">
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
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                        {(Array.isArray(products) ? products : []).length ===
                        0 ? (
                          <div className="text-sm text-slate-600">
                            No products.
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </SectionCard>
              </div>
            ) : null}

            {/* PRICING */}
            {section === "pricing" ? (
              <SectionCard
                title="Pricing"
                hint="Set selling prices."
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

            {/* INVENTORY REQUESTS */}
            {section === "inv_requests" ? (
              <SectionCard
                title="Inventory requests"
                hint="Approve or decline requests. Badge shows pending (PENDING) only."
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
                <InventoryAdjustRequestsPanel key={`invreq-${refreshNonce}`} />
              </SectionCard>
            ) : null}

            {/* ARRIVALS */}
            {section === "arrivals" ? (
              <SectionCard
                title="Stock arrivals"
                hint="Shows product name + qty. Grid view."
                right={
                  <AsyncButton
                    variant="secondary"
                    size="sm"
                    state={loadingArrivals ? "loading" : "idle"}
                    text="Reload"
                    loadingText="Loading…"
                    successText="Done"
                    onClick={loadArrivals}
                  />
                }
              >
                {loadingArrivals ? (
                  <div className="grid gap-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
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
                                <b>Notes:</b> {raw.notes}
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
                                          process.env
                                            .NEXT_PUBLIC_API_BASE_URL ||
                                          process.env.NEXT_PUBLIC_API_BASE ||
                                          "http://localhost:4000";
                                        return /^https?:\/\//i.test(rawUrl)
                                          ? rawUrl
                                          : `${String(API_BASE).replace(/\/$/, "")}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;
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

                    {arrivalsNormalized.length === 0 ? (
                      <div className="text-sm text-slate-600">
                        No arrivals yet.
                      </div>
                    ) : null}
                  </div>
                )}
              </SectionCard>
            ) : null}

            {/* SUPPLIERS */}
            {section === "suppliers" ? (
              <SuppliersPanel
                title="Suppliers"
                subtitle="Manager: bills only. Supplier creation and payments are handled by Owner/Admin."
                capabilities={{
                  canCreateSupplier: false,
                  canCreateBill: true,
                  canRecordBillPayment: false,
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

            {/* CASH REPORTS */}
            {section === "cash_reports" ? (
              <SectionCard
                title="Cash reports"
                hint="Cash summary for this location."
              >
                <CashReportsPanel
                  key={`cash-${refreshNonce}`}
                  title="Manager Cash Reports"
                />
              </SectionCard>
            ) : null}

            {/* CREDITS */}
            {section === "credits" ? (
              <SectionCard
                title="Credits"
                hint="Approve or decline credit requests."
              >
                <CreditsPanel
                  key={`credits-${refreshNonce}`}
                  title="Credits (Manager)"
                  capabilities={{
                    canView: true,
                    canCreate: false,
                    canDecide: true,
                    canSettle: false,
                  }}
                />
              </SectionCard>
            ) : null}

            {/* STAFF */}
            {section === "staff" ? (
              <SectionCard
                title="Staff"
                hint="Online status depends on backend lastSeenAt."
              >
                <ManagerUsersPanel
                  key={`staff-${refreshNonce}`}
                  title="Staff list (view-only)"
                />
                <div className="mt-3 text-xs text-slate-600">
                  For real “Online / Last seen”, backend must send lastSeenAt.
                </div>
              </SectionCard>
            ) : null}

            {/* ADVANCED: AUDIT */}
            {section === "audit" ? (
              <SectionCard title="Actions history" hint="Read-only logs.">
                <AuditLogsPanel
                  key={`audit-${refreshNonce}`}
                  title="Actions history"
                  subtitle="Manager view (read-only)."
                  defaultLimit={50}
                  currentLocationLabel={locationLabel(me)}
                />
              </SectionCard>
            ) : null}

            {/* ADVANCED: EVIDENCE */}
            {section === "evidence" ? (
              <SectionCard
                key={`evidence-${refreshNonce}`}
                title="Proof & History"
                hint="Use this only when something looks wrong. It shows what happened, when it happened, and who did it."
              >
                <div className="grid gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
                    <div className="font-semibold text-slate-900">
                      What is this?
                    </div>
                    <div className="mt-1 text-slate-700">
                      This is a <b>proof page</b>. It helps you confirm what
                      changed, who did it, and when it happened.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-600 mb-1">
                        What are you checking?
                      </div>
                      <Select
                        value={evEntity}
                        onChange={(e) => setEvEntity(e.target.value)}
                        aria-label="Select record type"
                      >
                        <option value="sale">Sales</option>
                        <option value="payment">Payments</option>
                        <option value="refund">Refunds</option>
                        <option value="credit">Credits</option>
                        <option value="cash_session">Cash sessions</option>
                        <option value="expense">Expenses</option>
                        <option value="deposit">Deposits</option>
                        <option value="inventory">Inventory</option>
                        <option value="product">Products</option>
                        <option value="user">Staff</option>
                      </Select>
                    </div>

                    <div className="md:col-span-2">
                      <div className="text-xs font-semibold text-slate-600 mb-1">
                        Choose the record
                      </div>
                      {Array.isArray(evCandidates) &&
                      evCandidates.length > 0 ? (
                        <Select
                          value={String(evEntityId || "")}
                          onChange={(e) => setEvEntityId(e.target.value)}
                          aria-label="Select a record"
                        >
                          <option value="">Select one…</option>
                          {evCandidates.map((c) => (
                            <option key={String(c.id)} value={String(c.id)}>
                              {c.label}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600">
                          {evCandidatesLoading
                            ? "Loading…"
                            : "No records found."}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-600 mb-1">
                        From
                      </div>
                      <Input
                        type="date"
                        value={evFrom}
                        onChange={(e) => setEvFrom(e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-600 mb-1">
                        To
                      </div>
                      <Input
                        type="date"
                        value={evTo}
                        onChange={(e) => setEvTo(e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-xs font-semibold text-slate-600 mb-1">
                        Staff member (optional)
                      </div>
                      {Array.isArray(evStaff) && evStaff.length > 0 ? (
                        <Select
                          value={evUserId}
                          onChange={(e) => setEvUserId(e.target.value)}
                        >
                          <option value="">Any staff</option>
                          {evStaff.map((u) => (
                            <option key={String(u.id)} value={String(u.id)}>
                              {u.name} — {u.email}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600">
                          {evStaffLoading
                            ? "Loading…"
                            : "Staff list not available."}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <div className="text-xs font-semibold text-slate-600 mb-1">
                        Search words (optional)
                      </div>
                      <Input
                        placeholder="Example: cancelled, price change"
                        value={evQ}
                        onChange={(e) => setEvQ(e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-600 mb-1">
                        Results limit
                      </div>
                      <Select
                        value={String(evLimit)}
                        onChange={(e) =>
                          setEvLimit(Number(e.target.value || 200))
                        }
                      >
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
                          toast("warn", "Please choose a record first.");
                          return;
                        }
                        router.push(
                          buildEvidenceUrl({
                            entity: evEntity,
                            entityId: id,
                            from: evFrom,
                            to: evTo,
                            userId: evUserId,
                            q: evQ,
                            limit: evLimit,
                          }),
                        );
                      }}
                    >
                      View proof →
                    </button>

                    <button
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                      onClick={() => {
                        setEvEntity("sale");
                        setEvEntityId("");
                        setEvFrom("");
                        setEvTo("");
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

      {/* CANCEL SALE MODAL */}
      {cancelOpen ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="text-sm font-semibold text-slate-900">
                Cancel sale #{cancelSaleId}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Rule: do NOT cancel COMPLETED sales.
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
                    setCancelingState("idle");
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                  disabled={cancelingState === "loading"}
                >
                  Close
                </button>

                <AsyncButton
                  variant="danger"
                  state={cancelingState}
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
    </div>
  );
}
