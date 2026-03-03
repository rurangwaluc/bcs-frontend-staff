"use client";

// frontend-staff/src/app/store-keeper/page.js

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import AsyncButton from "../../components/AsyncButton";
import RoleBar from "../../components/RoleBar";
import { apiFetch } from "../../lib/api";
import { apiUpload } from "../../lib/apiUpload";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

/**
 * Option B:
 * - Seller creates DRAFT sale
 * - Store keeper fulfills sale (POST /sales/:id/fulfill)
 * - Seller finalizes later (mark PAID / CREDIT)
 */
const ENDPOINTS = {
  PRODUCTS_LIST: "/products",
  PRODUCT_CREATE: "/products",
  INVENTORY_LIST: "/inventory",
  INVENTORY_ARRIVALS_CREATE: "/inventory/arrivals",
  INV_ADJ_REQ_CREATE: "/inventory-adjust-requests",
  INV_ADJ_REQ_MINE: "/inventory-adjust-requests/mine",
  SALES_LIST: "/sales",
  SALE_GET: (id) => `/sales/${id}`,
  SALE_FULFILL: (id) => `/sales/${id}/fulfill`,

  // notifications
  NOTIFS_LIST: "/notifications",
  NOTIFS_UNREAD: "/notifications/unread-count",
  NOTIFS_READ_ONE: (id) => `/notifications/${id}/read`,
  NOTIFS_READ_ALL: "/notifications/read-all",
  NOTIFS_STREAM: "/notifications/stream",
};

const SECTIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "inventory", label: "Inventory" },
  { key: "arrivals", label: "Stock arrivals" },
  { key: "adjustments", label: "Correction requests" },
  { key: "sales", label: "Release stock" },
];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function money(n) {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return "0";
  return Math.round(x).toLocaleString();
}

function safeDate(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

function numOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
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
  return "Store —";
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

function Card({ label, value, sub }) {
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
        "w-full text-left rounded-xl px-3 py-2.5 text-sm font-semibold transition flex items-center justify-between gap-2",
        active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50",
      )}
    >
      <span className="truncate">{label}</span>
      {badge ? (
        <span
          className={cx(
            "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold",
            active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700",
          )}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function PillTabs({ value, onChange, tabs = [] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => {
        const active = value === t.value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={cx(
              "rounded-full px-3 py-1.5 text-sm font-semibold border transition",
              active
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function PillTabsWithBadges({ value, onChange, tabs = [] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => {
        const active = value === t.value;
        const badge = Number(t.badge || 0);

        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={cx(
              "rounded-full px-3 py-1.5 text-sm font-bold border transition inline-flex items-center gap-2",
              active
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
            )}
          >
            <span>{t.label}</span>

            {/* badge ALWAYS visible */}
            <span
              className={cx(
                "rounded-full px-2 py-0.5 text-xs font-extrabold",
                active
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-700",
              )}
            >
              {badge}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }) {
  const s = String(status || "").toUpperCase();
  const cls =
    s === "DRAFT"
      ? "bg-slate-50 text-slate-700 border-slate-200"
      : s === "FULFILLED"
        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
        : s === "PENDING"
          ? "bg-amber-50 text-amber-800 border-amber-200"
          : s === "COMPLETED"
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : s === "CANCELLED"
              ? "bg-rose-50 text-rose-800 border-rose-200"
              : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-bold",
        cls,
      )}
    >
      {s || "—"}
    </span>
  );
}

/**
 * 3-state release button:
 * - Release
 * - Releasing...
 * - Released
 */
function ReleaseButton({ state, disabled, onClick }) {
  const s = state || "idle"; // idle | loading | success
  const label =
    s === "loading" ? "Releasing…" : s === "success" ? "Released" : "Release";

  const cls =
    s === "success"
      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
      : s === "loading"
        ? "bg-amber-600 text-white"
        : "bg-slate-900 hover:bg-slate-800 text-white";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || s === "loading" || s === "success"}
      className={cx(
        "rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:opacity-60 disabled:cursor-not-allowed",
        cls,
      )}
    >
      {label}
    </button>
  );
}

/* ---------- Notifications (SSE + modal + urgent toast) ---------- */

function useBeep() {
  return useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();

      o.type = "sine";
      o.frequency.value = 880;
      g.gain.value = 0.06;

      o.connect(g);
      g.connect(ctx.destination);

      o.start();
      setTimeout(() => {
        o.stop();
        ctx.close().catch(() => {});
      }, 180);
    } catch {
      // ignore
    }
  }, []);
}

function UrgentToast({ open, title, body, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed top-4 right-4 z-[9999] w-[92vw] max-w-sm">
      <div className="rounded-2xl border border-rose-200 bg-rose-50 shadow-lg p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-bold text-rose-900 truncate">
              {title || "Urgent alert"}
            </div>
            {body ? (
              <div className="mt-1 text-sm text-rose-900/90">{body}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function AlertsModal({
  open,
  onClose,
  unreadCount,
  loading,
  rows,
  onReadOne,
  onReadAll,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden mt-10">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900">Alerts</div>
            <div className="mt-1 text-xs text-slate-600">
              {unreadCount ? <b>{unreadCount}</b> : 0} unread
            </div>
          </div>

          <div className="shrink-0 flex gap-2">
            <button
              type="button"
              onClick={onReadAll}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
              disabled={loading}
            >
              Read all
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-900 text-white px-3 py-2 text-sm font-semibold hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="grid gap-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-slate-600">No alerts yet.</div>
          ) : (
            <div className="grid gap-2">
              {rows.map((n) => {
                const isUnread = n?.isRead === false || n?.is_read === false;
                const priority = String(n?.priority || "normal").toLowerCase();
                const title = toStr(n?.title) || "Alert";
                const body = toStr(n?.body);

                return (
                  <div
                    key={String(n?.id)}
                    className={cx(
                      "rounded-2xl border p-3",
                      isUnread
                        ? "border-amber-200 bg-amber-50"
                        : "border-slate-200 bg-white",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-sm font-bold text-slate-900 truncate">
                            {title}
                          </div>
                          {priority === "high" ? (
                            <span className="rounded-full bg-rose-600 text-white px-2 py-0.5 text-xs font-bold">
                              URGENT
                            </span>
                          ) : null}
                          {isUnread ? (
                            <span className="rounded-full bg-slate-900 text-white px-2 py-0.5 text-xs font-bold">
                              NEW
                            </span>
                          ) : null}
                        </div>

                        {body ? (
                          <div className="mt-1 text-sm text-slate-700">
                            {body}
                          </div>
                        ) : null}
                        <div className="mt-2 text-xs text-slate-500">
                          {safeDate(n?.createdAt || n?.created_at)}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isUnread ? (
                          <button
                            type="button"
                            onClick={() => onReadOne(n?.id)}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50"
                          >
                            Mark read
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">Read</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 text-xs text-slate-600">
          Tip: urgent alerts also show a red popup and sound.
        </div>
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */

function getQtyOnHandForProduct(inventory, productId) {
  const pid = Number(productId);
  if (!pid) return null;
  const row = (Array.isArray(inventory) ? inventory : []).find(
    (r) => Number(r.id) === pid,
  );
  if (!row) return null;
  const qty = Number(row.qtyOnHand ?? row.qty_on_hand ?? 0);
  return Number.isFinite(qty) ? qty : 0;
}

/* ---------- Page ---------- */

export default function StoreKeeperPage() {
  const router = useRouter();
  const beep = useBeep();

  const [bootLoading, setBootLoading] = useState(true);
  const [me, setMe] = useState(null);

  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info");

  const [section, setSection] = useState("dashboard");

  function toast(kind, text) {
    setMsgKind(kind);
    setMsg(text || "");
  }

  // role guard + skeleton
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

        if (role !== "store_keeper") {
          const map = {
            cashier: "/cashier",
            seller: "/seller",
            manager: "/manager",
            admin: "/admin",
            owner: "/owner",
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
    !!me && String(me?.role || "").toLowerCase() === "store_keeper";

  /* ---------- Notifications state ---------- */
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);

  const [urgentOpen, setUrgentOpen] = useState(false);
  const [urgentTitle, setUrgentTitle] = useState("");
  const [urgentBody, setUrgentBody] = useState("");

  const sseRef = useRef(null);

  const loadUnread = useCallback(async () => {
    try {
      const data = await apiFetch(ENDPOINTS.NOTIFS_UNREAD, { method: "GET" });
      const n = Number(data?.count ?? data?.unread ?? 0);
      setUnread(Number.isFinite(n) ? n : 0);
    } catch {
      // ignore
    }
  }, []);

  const loadNotifs = useCallback(async () => {
    setNotifsLoading(true);
    try {
      const data = await apiFetch(`${ENDPOINTS.NOTIFS_LIST}?limit=50`, {
        method: "GET",
      });
      const list = Array.isArray(data?.notifications)
        ? data.notifications
        : Array.isArray(data?.rows)
          ? data.rows
          : [];
      setNotifs(list);
    } catch {
      setNotifs([]);
    } finally {
      setNotifsLoading(false);
    }
  }, []);

  async function markReadOne(id) {
    const nid = Number(id);
    if (!Number.isFinite(nid) || nid <= 0) return;

    try {
      await apiFetch(ENDPOINTS.NOTIFS_READ_ONE(nid), { method: "PATCH" });
      setNotifs((prev) =>
        (Array.isArray(prev) ? prev : []).map((x) =>
          String(x?.id) === String(nid)
            ? { ...x, isRead: true, is_read: true }
            : x,
        ),
      );
      await loadUnread();
    } catch {
      // ignore
    }
  }

  async function markAllRead() {
    try {
      await apiFetch(ENDPOINTS.NOTIFS_READ_ALL, { method: "PATCH" });
      setNotifs((prev) =>
        (Array.isArray(prev) ? prev : []).map((x) => ({
          ...x,
          isRead: true,
          is_read: true,
        })),
      );
      setUnread(0);
    } catch {
      // ignore
    }
  }

  // SSE connect (real-time)
  useEffect(() => {
    if (!isAuthorized) return;

    // initial fetch
    loadUnread();

    // connect stream
    try {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }

      const es = new EventSource(ENDPOINTS.NOTIFS_STREAM);
      sseRef.current = es;

      es.onmessage = (evt) => {
        if (!evt?.data) return;

        let payload = null;
        try {
          payload = JSON.parse(evt.data);
        } catch {
          return;
        }

        // expected: { type: "notification", notification: {...} } or direct notification
        const n = payload?.notification || payload;
        if (!n) return;

        // prepend list
        setNotifs((prev) => {
          const arr = Array.isArray(prev) ? prev : [];
          const id = n?.id == null ? null : String(n.id);
          if (id && arr.some((x) => String(x?.id) === id)) return arr;
          return [n, ...arr].slice(0, 80);
        });

        // unread refresh
        loadUnread();

        // urgent behavior
        const priority = String(n?.priority || "normal").toLowerCase();
        if (priority === "high") {
          setUrgentTitle(toStr(n?.title) || "Urgent alert");
          setUrgentBody(toStr(n?.body) || "");
          setUrgentOpen(true);
          beep();
        }
      };

      es.onerror = () => {
        // browser auto-retries; keep silent
      };
    } catch {
      // ignore
    }

    return () => {
      try {
        if (sseRef.current) sseRef.current.close();
      } catch {
        // ignore
      }
      sseRef.current = null;
    };
  }, [isAuthorized, loadUnread, beep]);

  function openAlerts() {
    setAlertsOpen(true);
    loadNotifs();
    loadUnread();
  }

  /* ---------- data ---------- */

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const [inventory, setInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [invQ, setInvQ] = useState("");

  // create product
  const [pName, setPName] = useState("");
  const [pSku, setPSku] = useState("");
  const [pUnit, setPUnit] = useState("pcs");
  const [pNotes, setPNotes] = useState("");
  const [pInitialQty, setPInitialQty] = useState("");
  const [createProductBtn, setCreateProductBtn] = useState("idle");

  // arrivals
  const [arrProductId, setArrProductId] = useState("");
  const [arrQty, setArrQty] = useState("");
  const [arrNotes, setArrNotes] = useState("");
  const [arrFiles, setArrFiles] = useState([]);
  const [arrivalBtn, setArrivalBtn] = useState("idle");

  // adjustments
  const [adjProductId, setAdjProductId] = useState("");
  const [adjDirection, setAdjDirection] = useState("ADD");
  const [adjQtyAbs, setAdjQtyAbs] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [adjBtn, setAdjBtn] = useState("idle");

  const [myAdjRequests, setMyAdjRequests] = useState([]);
  const [myAdjLoading, setMyAdjLoading] = useState(false);

  // sales release
  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesQ, setSalesQ] = useState("");

  // tab filter instead of dropdown
  const [salesTab, setSalesTab] = useState("TO_RELEASE"); // TO_RELEASE | RELEASED | ALL

  const [releaseBtnState, setReleaseBtnState] = useState({}); // per sale: idle/loading/success

  const [viewSale, setViewSale] = useState(null);
  const [viewSaleLoading, setViewSaleLoading] = useState(false);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.PRODUCTS_LIST, { method: "GET" });
      const list = Array.isArray(data?.products)
        ? data.products
        : data?.items || data?.rows || [];
      setProducts(Array.isArray(list) ? list : []);
    } catch (e) {
      toast("danger", e?.data?.error || e?.message || "Cannot load products");
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const loadInventory = useCallback(async () => {
    setInventoryLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.INVENTORY_LIST, { method: "GET" });
      const list = Array.isArray(data?.inventory)
        ? data.inventory
        : data?.items || data?.rows || [];
      setInventory(Array.isArray(list) ? list : []);
    } catch (e) {
      toast("danger", e?.data?.error || e?.message || "Cannot load inventory");
      setInventory([]);
    } finally {
      setInventoryLoading(false);
    }
  }, []);

  const loadMyAdjustRequests = useCallback(async () => {
    setMyAdjLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.INV_ADJ_REQ_MINE, {
        method: "GET",
      });
      const list = Array.isArray(data?.requests)
        ? data.requests
        : data?.items || data?.rows || [];
      setMyAdjRequests(Array.isArray(list) ? list : []);
    } catch (e) {
      toast(
        "danger",
        e?.data?.error || e?.message || "Cannot load correction requests",
      );
      setMyAdjRequests([]);
    } finally {
      setMyAdjLoading(false);
    }
  }, []);

  const loadSales = useCallback(async () => {
    setSalesLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.SALES_LIST, { method: "GET" });
      const list = Array.isArray(data?.sales)
        ? data.sales
        : data?.items || data?.rows || [];
      setSales(Array.isArray(list) ? list : []);
    } catch (e) {
      toast("danger", e?.data?.error || e?.message || "Cannot load sales");
      setSales([]);
    } finally {
      setSalesLoading(false);
    }
  }, []);

  async function openSaleDetails(saleId) {
    const id = Number(saleId);
    if (!id) return;

    setViewSaleLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.SALE_GET(id), { method: "GET" });
      setViewSale(data?.sale || null);
    } catch (e) {
      toast(
        "danger",
        e?.data?.error || e?.message || "Cannot load sale details",
      );
      setViewSale(null);
    } finally {
      setViewSaleLoading(false);
    }
  }

  // initial load + per section
  useEffect(() => {
    if (!isAuthorized) return;

    loadProducts();
    loadInventory();

    if (section === "adjustments") loadMyAdjustRequests();
    if (section === "sales") loadSales();
  }, [
    isAuthorized,
    section,
    loadProducts,
    loadInventory,
    loadMyAdjustRequests,
    loadSales,
  ]);

  // KPIs
  const totalProducts = products.length;

  const pendingAdjRequests = useMemo(() => {
    return (Array.isArray(myAdjRequests) ? myAdjRequests : []).filter(
      (r) => String(r.status || "").toUpperCase() === "PENDING",
    ).length;
  }, [myAdjRequests]);

  const draftSalesCount = useMemo(() => {
    return (Array.isArray(sales) ? sales : []).filter(
      (s) => String(s.status || "").toUpperCase() === "DRAFT",
    ).length;
  }, [sales]);

  // Dashboard stock snapshot (meaningful, per product)
  const stockSnapshot = useMemo(() => {
    const list = Array.isArray(inventory) ? inventory : [];
    // sort: highest qty first
    const sorted = list
      .map((x) => ({
        id: x?.id,
        name: x?.name,
        sku: x?.sku,
        qty: Number(x?.qtyOnHand ?? x?.qty_on_hand ?? 0) || 0,
      }))
      .sort((a, b) => b.qty - a.qty);

    return sorted.slice(0, 10);
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    const qq = String(invQ || "")
      .trim()
      .toLowerCase();
    const list = Array.isArray(inventory) ? inventory : [];
    if (!qq) return list;
    return list.filter((x) => {
      const id = String(x.id || "");
      const name = String(x.name || "").toLowerCase();
      const sku = String(x.sku || "").toLowerCase();
      return id.includes(qq) || name.includes(qq) || sku.includes(qq);
    });
  }, [inventory, invQ]);

  const filteredSales = useMemo(() => {
    const list = Array.isArray(sales) ? sales : [];
    const qq = String(salesQ || "")
      .trim()
      .toLowerCase();

    let base = list;

    if (salesTab === "TO_RELEASE")
      base = base.filter(
        (s) => String(s?.status || "").toUpperCase() === "DRAFT",
      );
    if (salesTab === "RELEASED")
      base = base.filter(
        (s) => String(s?.status || "").toUpperCase() === "FULFILLED",
      );

    if (!qq) return base;

    return base.filter((s) => {
      const id = String(s?.id ?? "").toLowerCase();
      const status = String(s?.status ?? "").toLowerCase();
      const seller = String(
        s?.sellerName ?? s?.sellerId ?? s?.seller_id ?? "",
      ).toLowerCase();
      const customerName = String(s?.customerName ?? "").toLowerCase();
      const customerPhone = String(s?.customerPhone ?? "").toLowerCase();
      return (
        id.includes(qq) ||
        status.includes(qq) ||
        seller.includes(qq) ||
        customerName.includes(qq) ||
        customerPhone.includes(qq)
      );
    });
  }, [sales, salesQ, salesTab]);

  const releasedCount = useMemo(() => {
    const list = Array.isArray(sales) ? sales : [];
    return list.filter(
      (s) => String(s?.status || "").toUpperCase() === "FULFILLED",
    ).length;
  }, [sales]);

  const lastTenCount = useMemo(() => {
    // always show "10" if there are many, else show actual count
    const n = Array.isArray(sales) ? sales.length : 0;
    return Math.min(10, n);
  }, [sales]);

  const filteredSalesLastTen = useMemo(() => {
    const list = Array.isArray(filteredSales) ? filteredSales : [];
    // IMPORTANT: assume backend already returns latest first
    return list.slice(0, 10);
  }, [filteredSales]);
  /* ---------- Actions ---------- */

  async function createProduct(e) {
    e.preventDefault();
    if (createProductBtn === "loading") return;

    const name = String(pName || "").trim();
    if (!name) return toast("warn", "Write product name.");

    const initialQty = numOrNull(pInitialQty);
    if (pInitialQty !== "" && (initialQty == null || initialQty < 0)) {
      return toast("warn", "Initial qty must be 0 or more.");
    }

    setCreateProductBtn("loading");
    try {
      const payload = {
        name,
        sku: String(pSku || "").trim() || undefined,
        unit: String(pUnit || "").trim() || "pcs",
        notes: String(pNotes || "").trim() || undefined,
        sellingPrice: 0,
        costPrice: 0,
      };

      const data = await apiFetch(ENDPOINTS.PRODUCT_CREATE, {
        method: "POST",
        body: payload,
      });
      const createdId = data?.product?.id;

      // optional: create initial arrival
      if (createdId && initialQty != null && initialQty > 0) {
        await apiFetch(ENDPOINTS.INVENTORY_ARRIVALS_CREATE, {
          method: "POST",
          body: {
            productId: Number(createdId),
            qtyReceived: Math.round(initialQty),
            notes: "Initial stock",
            documentUrls: [],
          },
        });
      }

      toast("success", "Product created.");
      setPName("");
      setPSku("");
      setPUnit("pcs");
      setPNotes("");
      setPInitialQty("");

      await loadProducts();
      await loadInventory();

      if (createdId) setArrProductId(String(createdId));

      setCreateProductBtn("success");
      setTimeout(() => setCreateProductBtn("idle"), 900);
    } catch (e2) {
      setCreateProductBtn("idle");
      toast(
        "danger",
        e2?.data?.error || e2?.message || "Create product failed",
      );
    }
  }

  async function createArrival(e) {
    e.preventDefault();
    if (arrivalBtn === "loading") return;

    const pid = Number(arrProductId);
    const qty = numOrNull(arrQty);

    if (!pid) return toast("warn", "Pick a product.");
    if (qty == null || qty <= 0) return toast("warn", "Write a correct qty.");

    setArrivalBtn("loading");
    try {
      let documentUrls = [];
      if (arrFiles.length > 0) {
        const up = await apiUpload(arrFiles);
        documentUrls = up.urls || [];
      }

      await apiFetch(ENDPOINTS.INVENTORY_ARRIVALS_CREATE, {
        method: "POST",
        body: {
          productId: pid,
          qtyReceived: Math.round(qty),
          notes: arrNotes?.trim()
            ? String(arrNotes).trim().slice(0, 200)
            : undefined,
          documentUrls,
        },
      });

      toast("success", "Arrival saved.");
      setArrQty("");
      setArrNotes("");
      setArrFiles([]);

      await loadInventory();

      setArrivalBtn("success");
      setTimeout(() => setArrivalBtn("idle"), 900);
    } catch (e2) {
      setArrivalBtn("idle");
      toast("danger", e2?.data?.error || e2?.message || "Save arrival failed");
    }
  }

  async function createAdjustRequest(e) {
    e.preventDefault();
    if (adjBtn === "loading") return;

    const pid = Number(adjProductId);
    const qtyAbs = numOrNull(adjQtyAbs);

    if (!pid) return toast("warn", "Pick a product.");
    if (qtyAbs == null || qtyAbs <= 0)
      return toast("warn", "Write a correct qty.");
    if (!String(adjReason || "").trim())
      return toast("warn", "Write a reason.");

    const signedQtyChange =
      adjDirection === "REMOVE" ? -Math.round(qtyAbs) : Math.round(qtyAbs);

    setAdjBtn("loading");
    try {
      await apiFetch(ENDPOINTS.INV_ADJ_REQ_CREATE, {
        method: "POST",
        body: {
          productId: pid,
          qtyChange: signedQtyChange,
          reason: String(adjReason).trim().slice(0, 200),
        },
      });

      toast("success", "Correction request sent. Wait for approval.");
      setAdjProductId("");
      setAdjDirection("ADD");
      setAdjQtyAbs("");
      setAdjReason("");

      await loadMyAdjustRequests();

      setAdjBtn("success");
      setTimeout(() => setAdjBtn("idle"), 900);
    } catch (e2) {
      setAdjBtn("idle");
      toast(
        "danger",
        e2?.data?.error || e2?.message || "Create request failed",
      );
    }
  }

  async function releaseStock(saleId) {
    const id = Number(saleId);
    if (!id) return toast("warn", "Bad sale id.");
    if (releaseBtnState[id] === "loading") return;

    setReleaseBtnState((p) => ({ ...p, [id]: "loading" }));
    try {
      await apiFetch(ENDPOINTS.SALE_FULFILL(id), { method: "POST", body: {} });

      toast("success", `Sale #${id} released.`);
      await loadSales();
      await loadInventory();

      if (viewSale?.id === id) await openSaleDetails(id);

      setReleaseBtnState((p) => ({ ...p, [id]: "success" }));
      setTimeout(
        () => setReleaseBtnState((p) => ({ ...p, [id]: "idle" })),
        900,
      );
    } catch (e) {
      setReleaseBtnState((p) => ({ ...p, [id]: "idle" }));
      toast("danger", e?.data?.error || e?.message || "Release failed");
    }
  }

  if (bootLoading) return <PageSkeleton />;
  if (!isAuthorized)
    return <div className="p-6 text-sm text-slate-600">Redirecting…</div>;

  const subtitle = `User: ${me?.email || "—"} • ${locationLabel(me)}`;

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      <UrgentToast
        open={urgentOpen}
        title={urgentTitle}
        body={urgentBody}
        onClose={() => setUrgentOpen(false)}
      />

      <AlertsModal
        open={alertsOpen}
        onClose={() => setAlertsOpen(false)}
        unreadCount={unread}
        loading={notifsLoading}
        rows={Array.isArray(notifs) ? notifs : []}
        onReadOne={markReadOne}
        onReadAll={markAllRead}
      />

      <RoleBar title="Store keeper" subtitle={subtitle} user={me} />

      <div className="mx-auto max-w-7xl px-4 sm:px-5 py-6">
        {/* Top actions bar (Alerts always on top, never behind) */}
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={openAlerts}
            className="relative rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-slate-50"
            title="Alerts"
          >
            🔔 Alerts
            {unread > 0 ? (
              <span className="absolute -top-2 -right-2 rounded-full bg-rose-600 text-white text-xs font-bold px-2 py-0.5">
                {unread}
              </span>
            ) : null}
          </button>
        </div>

        {msg ? (
          <div className="mb-4">
            <Banner kind={msgKind}>{msg}</Banner>
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
          {/* Sidebar */}
          <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 h-fit">
            <div className="text-sm font-bold text-slate-900">Store keeper</div>
            <div className="mt-1 text-xs text-slate-600">
              {locationLabel(me)}
            </div>

            <div className="mt-4 lg:hidden">
              <div className="text-xs font-semibold text-slate-600 mb-2">
                Section
              </div>
              <Select
                value={section}
                onChange={(e) => setSection(e.target.value)}
              >
                {SECTIONS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="mt-4 hidden lg:grid gap-2">
              {SECTIONS.map((s) => (
                <NavItem
                  key={s.key}
                  active={section === s.key}
                  label={s.label}
                  onClick={() => setSection(s.key)}
                  badge={
                    s.key === "sales" && draftSalesCount > 0
                      ? String(draftSalesCount)
                      : null
                  }
                />
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-600">
              Rule: You manage stock only. Prices belong to manager/admin.
            </div>
          </aside>

          {/* Main */}
          <main className="grid gap-4">
            {/* DASHBOARD */}
            {section === "dashboard" ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <Card
                    label="Products"
                    value={productsLoading ? "…" : String(totalProducts)}
                    sub="Items in catalog"
                  />
                  <Card
                    label="To release"
                    value={salesLoading ? "…" : String(draftSalesCount)}
                    sub="Draft sales waiting"
                  />
                  <Card
                    label="My correction requests"
                    value={myAdjLoading ? "…" : String(myAdjRequests.length)}
                    sub="All requests you sent"
                  />
                  <Card
                    label="Pending decisions"
                    value={myAdjLoading ? "…" : String(pendingAdjRequests)}
                    sub="Waiting approval"
                  />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <SectionCard
                    title="Today focus"
                    hint="These actions protect sales and reduce mistakes."
                    right={
                      <AsyncButton
                        variant="secondary"
                        size="sm"
                        state={
                          productsLoading || inventoryLoading
                            ? "loading"
                            : "idle"
                        }
                        text="Refresh"
                        loadingText="Refreshing…"
                        successText="Done"
                        onClick={() => {
                          loadProducts();
                          loadInventory();
                          loadSales();
                          loadUnread();
                        }}
                      />
                    }
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSection("sales")}
                        className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
                      >
                        <div className="text-sm font-bold text-slate-900">
                          Release stock
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          Release stock for draft sales.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSection("arrivals")}
                        className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
                      >
                        <div className="text-sm font-bold text-slate-900">
                          Record arrivals
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          Add new stock with documents.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSection("adjustments")}
                        className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
                      >
                        <div className="text-sm font-bold text-slate-900">
                          Request correction
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          Fix wrong stock via approval.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSection("inventory")}
                        className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
                      >
                        <div className="text-sm font-bold text-slate-900">
                          Check inventory
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          Search qty by product.
                        </div>
                      </button>
                    </div>
                  </SectionCard>

                  <SectionCard
                    title="Stock snapshot"
                    hint="Top items by qty on hand (quick check)."
                  >
                    {inventoryLoading ? (
                      <div className="grid gap-3">
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                      </div>
                    ) : stockSnapshot.length === 0 ? (
                      <div className="text-sm text-slate-600">
                        No inventory yet.
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {stockSnapshot.map((x) => (
                          <div
                            key={String(x.id)}
                            className="rounded-2xl border border-slate-200 bg-white p-3 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-900 truncate">
                                {toStr(x.name) || "—"}
                              </div>
                              <div className="text-xs text-slate-500">
                                #{x.id}
                                {x.sku ? ` • ${x.sku}` : ""}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-lg font-extrabold text-slate-900">
                                {money(x.qty)}
                              </div>
                              <div className="text-xs text-slate-500">
                                on hand
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </SectionCard>
                </div>
              </>
            ) : null}

            {/* INVENTORY */}
            {section === "inventory" ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <SectionCard
                  title="Create product"
                  hint="No prices here. Manager sets prices later."
                >
                  <form onSubmit={createProduct} className="grid gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        placeholder="Product name"
                        value={pName}
                        onChange={(e) => setPName(e.target.value)}
                      />
                      <Input
                        placeholder="SKU (optional)"
                        value={pSku}
                        onChange={(e) => setPSku(e.target.value)}
                      />
                      <Input
                        placeholder="Unit (pcs, kg)"
                        value={pUnit}
                        onChange={(e) => setPUnit(e.target.value)}
                      />
                      <Input
                        placeholder="Initial qty (optional)"
                        value={pInitialQty}
                        onChange={(e) => setPInitialQty(e.target.value)}
                      />
                      <div className="sm:col-span-2">
                        <Input
                          placeholder="Notes (optional)"
                          value={pNotes}
                          onChange={(e) => setPNotes(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="sm:max-w-sm">
                      <AsyncButton
                        type="submit"
                        variant="primary"
                        state={createProductBtn}
                        text="Create product"
                        loadingText="Creating…"
                        successText="Created"
                      />
                    </div>
                  </form>
                </SectionCard>

                <SectionCard
                  title="Inventory"
                  hint="Search by name or SKU."
                  right={
                    <AsyncButton
                      variant="secondary"
                      size="sm"
                      state={inventoryLoading ? "loading" : "idle"}
                      text="Refresh"
                      loadingText="Refreshing…"
                      successText="Done"
                      onClick={loadInventory}
                    />
                  }
                >
                  <Input
                    placeholder="Search inventory…"
                    value={invQ}
                    onChange={(e) => setInvQ(e.target.value)}
                  />

                  <div className="mt-3 grid gap-2">
                    {inventoryLoading ? (
                      <>
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </>
                    ) : filteredInventory.length === 0 ? (
                      <div className="text-sm text-slate-600">
                        No inventory items.
                      </div>
                    ) : (
                      filteredInventory.map((p) => {
                        const qty =
                          Number(p?.qtyOnHand ?? p?.qty_on_hand ?? 0) || 0;
                        return (
                          <div
                            key={String(p?.id)}
                            className="rounded-2xl border border-slate-200 bg-white p-3 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-900 truncate">
                                {toStr(p?.name) || "—"}
                              </div>
                              <div className="text-xs text-slate-500">
                                #{p?.id}
                                {p?.sku ? ` • ${p.sku}` : ""}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-lg font-extrabold text-slate-900">
                                {money(qty)}
                              </div>
                              <div className="text-xs text-slate-500">
                                on hand
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </SectionCard>
              </div>
            ) : null}

            {/* ARRIVALS */}
            {section === "arrivals" ? (
              <SectionCard
                title="Record stock arrival"
                hint="Adds qty and saves documents (invoice, receipt, etc.)."
              >
                <form onSubmit={createArrival} className="grid gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <div className="text-xs font-semibold text-slate-600 mb-1">
                        Product
                      </div>
                      <Select
                        value={arrProductId}
                        onChange={(e) => setArrProductId(e.target.value)}
                      >
                        <option value="">Select product…</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            #{p.id} • {p.name} {p.sku ? `(${p.sku})` : ""}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-600 mb-1">
                        Qty received
                      </div>
                      <Input
                        placeholder="Example: 20"
                        value={arrQty}
                        onChange={(e) => setArrQty(e.target.value)}
                      />
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-600 mb-1">
                        Notes
                      </div>
                      <Input
                        placeholder="Optional"
                        value={arrNotes}
                        onChange={(e) => setArrNotes(e.target.value)}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <div className="rounded-2xl border border-slate-200 p-4 bg-white">
                        <div className="text-sm font-bold text-slate-900">
                          Documents
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          PDF or images.
                        </div>

                        <input
                          id="arrival-files"
                          type="file"
                          multiple
                          accept=".pdf,image/*"
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setArrFiles(files);
                          }}
                        />

                        <label
                          htmlFor="arrival-files"
                          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold hover:bg-slate-50 cursor-pointer"
                        >
                          Choose files
                        </label>

                        {arrFiles.length > 0 ? (
                          <div className="mt-3 grid gap-2">
                            {arrFiles.map((f, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                              >
                                <div className="text-sm text-slate-700 truncate">
                                  {f.name}
                                </div>
                                <button
                                  type="button"
                                  className="text-xs font-bold text-rose-700 hover:underline"
                                  onClick={() =>
                                    setArrFiles((prev) =>
                                      prev.filter((_, idx) => idx !== i),
                                    )
                                  }
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-2 text-xs text-slate-500">
                            No files selected.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <AsyncButton
                      type="submit"
                      variant="primary"
                      state={arrivalBtn}
                      text="Save arrival"
                      loadingText="Saving…"
                      successText="Saved"
                    />

                    <button
                      type="button"
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        setArrQty("");
                        setArrNotes("");
                        setArrFiles([]);
                      }}
                    >
                      Clear form
                    </button>
                  </div>
                </form>
              </SectionCard>
            ) : null}

            {/* ADJUSTMENTS */}
            {section === "adjustments" ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <SectionCard
                  title="Request correction"
                  hint="This does NOT change stock now. It needs approval."
                >
                  <form onSubmit={createAdjustRequest} className="grid gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <div className="text-xs font-semibold text-slate-600 mb-1">
                          Product
                        </div>
                        <Select
                          value={adjProductId}
                          onChange={(e) => setAdjProductId(e.target.value)}
                        >
                          <option value="">Select product…</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              #{p.id} • {p.name} {p.sku ? `(${p.sku})` : ""}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-slate-600 mb-1">
                          Direction
                        </div>
                        <Select
                          value={adjDirection}
                          onChange={(e) => setAdjDirection(e.target.value)}
                        >
                          <option value="ADD">Increase (+)</option>
                          <option value="REMOVE">Decrease (-)</option>
                        </Select>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-slate-600 mb-1">
                          Qty
                        </div>
                        <Input
                          placeholder="Example: 3"
                          value={adjQtyAbs}
                          onChange={(e) => setAdjQtyAbs(e.target.value)}
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                          {(() => {
                            const current = getQtyOnHandForProduct(
                              inventory,
                              adjProductId,
                            );
                            const qtyAbs = Number(adjQtyAbs);
                            const signed =
                              adjDirection === "REMOVE" ? -qtyAbs : qtyAbs;

                            if (current === null)
                              return <div>Current qty: —</div>;
                            if (!Number.isFinite(qtyAbs) || qtyAbs <= 0)
                              return (
                                <div>
                                  Current qty: <b>{current}</b>
                                </div>
                              );

                            const predicted = current + signed;
                            return (
                              <div>
                                Current qty: <b>{current}</b> → After approval:{" "}
                                <b>
                                  {predicted < 0
                                    ? "❌ would be negative"
                                    : predicted}
                                </b>
                                <div className="mt-1 text-xs text-slate-600">
                                  Change:{" "}
                                  <b>
                                    {signed > 0 ? `+${signed}` : String(signed)}
                                  </b>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <div className="text-xs font-semibold text-slate-600 mb-1">
                          Reason
                        </div>
                        <Input
                          placeholder="Damaged, recount, found stock…"
                          value={adjReason}
                          onChange={(e) => setAdjReason(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="sm:max-w-sm">
                      <AsyncButton
                        type="submit"
                        variant="primary"
                        state={adjBtn}
                        text="Send request"
                        loadingText="Sending…"
                        successText="Sent"
                      />
                    </div>
                  </form>
                </SectionCard>

                <SectionCard
                  title="My requests"
                  hint="Pending = waiting decision."
                  right={
                    <AsyncButton
                      variant="secondary"
                      size="sm"
                      state={myAdjLoading ? "loading" : "idle"}
                      text="Refresh"
                      loadingText="Refreshing…"
                      successText="Done"
                      onClick={loadMyAdjustRequests}
                    />
                  }
                >
                  {myAdjLoading ? (
                    <div className="grid gap-3">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : (Array.isArray(myAdjRequests) ? myAdjRequests : [])
                      .length === 0 ? (
                    <div className="text-sm text-slate-600">
                      No requests yet.
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {(Array.isArray(myAdjRequests) ? myAdjRequests : []).map(
                        (r) => {
                          const qty =
                            Number(r?.qtyChange ?? r?.qty_change ?? 0) || 0;
                          const st = String(r?.status || "").toUpperCase();
                          const badge =
                            st === "PENDING"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : st === "APPROVED"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-rose-50 text-rose-800 border-rose-200";

                          return (
                            <div
                              key={String(r?.id)}
                              className="rounded-2xl border border-slate-200 bg-white p-3 flex items-start justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-slate-900 truncate">
                                  {toStr(r?.productName) || "Unknown product"}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  Request #{r?.id} •{" "}
                                  {safeDate(r?.createdAt ?? r?.created_at)}
                                </div>
                                <div className="mt-2 text-sm text-slate-700">
                                  Qty change:{" "}
                                  <b>{qty > 0 ? `+${qty}` : String(qty)}</b>
                                </div>
                              </div>

                              <div className="shrink-0 text-right">
                                <span
                                  className={cx(
                                    "inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-bold",
                                    badge,
                                  )}
                                >
                                  {st || "—"}
                                </span>
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  )}
                </SectionCard>
              </div>
            ) : null}

            {/* SALES */}
            {section === "sales" ? (
              <SectionCard
                title="Release stock"
                hint="Release only draft sales. This removes stock."
                right={
                  <AsyncButton
                    variant="secondary"
                    size="sm"
                    state={salesLoading ? "loading" : "idle"}
                    text="Refresh"
                    loadingText="Refreshing…"
                    successText="Done"
                    onClick={loadSales}
                  />
                }
              >
                <div className="grid gap-3">
                  {/* Tabs + Search */}
                  <div className="grid gap-2">
                    <PillTabsWithBadges
                      value={salesTab}
                      onChange={setSalesTab}
                      tabs={[
                        {
                          value: "TO_RELEASE",
                          label: "To release",
                          badge: draftSalesCount,
                        },
                        {
                          value: "RELEASED",
                          label: "Released",
                          badge: releasedCount,
                        },
                        { value: "ALL", label: "All", badge: lastTenCount },
                      ]}
                    />

                    <Input
                      placeholder="Search by customer, phone, sale id…"
                      value={salesQ}
                      onChange={(e) => setSalesQ(e.target.value)}
                    />

                    <div className="text-xs text-slate-500">
                      Showing latest <b>10</b> results (most recent first).
                    </div>
                  </div>

                  {/* Content */}
                  {salesLoading ? (
                    <div className="grid gap-3">
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  ) : filteredSalesLastTen.length === 0 ? (
                    <div className="text-sm text-slate-600">
                      No sales found.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {filteredSalesLastTen.map((s) => {
                        const status = String(s?.status || "").toUpperCase();
                        const canRelease = status === "DRAFT";

                        const sellerLabel =
                          toStr(s?.sellerName) ||
                          toStr(s?.sellerEmail) ||
                          `Staff #${toStr(s?.sellerId || s?.seller_id) || "—"}`;

                        const customerName =
                          toStr(s?.customerName) || "Walk-in";
                        const customerPhone = toStr(s?.customerPhone);
                        const customerLabel = [customerName, customerPhone]
                          .filter(Boolean)
                          .join(" • ");

                        const created = safeDate(s?.createdAt || s?.created_at);
                        const total = money(s?.totalAmount ?? s?.total ?? 0);

                        return (
                          <div
                            key={String(s?.id)}
                            className="rounded-2xl border border-slate-200 bg-white p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="text-sm font-extrabold text-slate-900">
                                    Sale ID: {s?.id ?? "—"}
                                  </div>
                                  <StatusBadge status={status} />
                                </div>

                                <div className="mt-2 text-sm text-slate-700">
                                  Customer:{" "}
                                  <b className="break-words">{customerLabel}</b>
                                </div>

                                <div className="mt-1 text-sm text-slate-700">
                                  Seller:{" "}
                                  <b className="break-words">{sellerLabel}</b>
                                </div>

                                <div className="mt-2 text-xs text-slate-500">
                                  Created: {created}
                                </div>
                              </div>

                              <div className="shrink-0 text-right">
                                <div className="text-lg font-extrabold text-slate-900">
                                  {total}
                                </div>
                                <div className="text-xs text-slate-500">
                                  total
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2 items-center">
                              <ReleaseButton
                                state={releaseBtnState[s?.id] || "idle"}
                                disabled={!canRelease}
                                onClick={() => releaseStock(s?.id)}
                              />

                              <button
                                type="button"
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                                onClick={() => openSaleDetails(s?.id)}
                              >
                                View items
                              </button>

                              {!canRelease ? (
                                <span className="text-xs text-slate-500">
                                  Release allowed only for <b>DRAFT</b>.
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </SectionCard>
            ) : null}
          </main>
        </div>
      </div>

      <SaleModal
        open={!!viewSale}
        sale={viewSale}
        loading={viewSaleLoading}
        onClose={() => setViewSale(null)}
      />
    </div>
  );
}

function SaleModal({ open, sale, loading, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900">
              Sale #{sale?.id ?? "—"} {loading ? "…" : ""}
            </div>
            <div className="text-xs text-slate-600 mt-1 truncate">
              Status: {String(sale?.status || "—").toUpperCase()} • Total:{" "}
              {money(sale?.totalAmount ?? 0)}
            </div>
          </div>

          <button
            type="button"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="grid gap-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <>
              <div className="text-sm font-bold text-slate-900">Items</div>

              <div className="mt-3 grid gap-2">
                {(Array.isArray(sale?.items) ? sale.items : []).map(
                  (it, idx) => (
                    <div
                      key={it?.id || idx}
                      className="rounded-2xl border border-slate-200 bg-white p-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">
                          {it?.productName ||
                            it?.name ||
                            `#${it?.productId ?? "—"}`}
                        </div>
                        <div className="text-xs text-slate-500">
                          {it?.sku ? `SKU: ${it.sku}` : "SKU: —"}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-lg font-extrabold text-slate-900">
                          {Number(it?.qty ?? 0)}
                        </div>
                        <div className="text-xs text-slate-500">qty</div>
                      </div>
                    </div>
                  ),
                )}

                {(Array.isArray(sale?.items) ? sale.items : []).length === 0 ? (
                  <div className="text-sm text-slate-600">No items.</div>
                ) : null}
              </div>

              <div className="mt-4 text-xs text-slate-600">
                Store keeper releases stock. Seller finishes payment later.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
