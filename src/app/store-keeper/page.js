"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import AsyncButton from "../../components/AsyncButton";
import RoleBar from "../../components/RoleBar";
import SellerDeliveryNoteModal from "../../components/staff/seller/SellerDeliveryNoteModal";
import StoreKeeperAdjustmentsSection from "../../components/staff/storekeeper/StoreKeeperAdjustmentsSection";
import StoreKeeperArrivalsSection from "../../components/staff/storekeeper/StoreKeeperArrivalsSection";
import StoreKeeperInventorySection from "../../components/staff/storekeeper/StoreKeeperInventorySection";
import StoreKeeperSalesSection from "../../components/staff/storekeeper/StoreKeeperSalesSection";
import { apiFetch } from "../../lib/api";
import { apiUpload } from "../../lib/apiUpload";
import { connectSSE } from "../../lib/sse";
import { createPortal } from "react-dom";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

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

function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function numOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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

function qtyText(v) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.round(n).toLocaleString() : "0";
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

function Skeleton({ className = "" }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70",
        className,
      )}
    />
  );
}

function PageSkeleton() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--app-bg)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-5">
        <Skeleton className="h-14 w-full rounded-3xl" />
        <div className="mt-4">
          <Skeleton className="h-20 w-full rounded-3xl" />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-28 w-full rounded-3xl" />
          <Skeleton className="h-28 w-full rounded-3xl" />
          <Skeleton className="h-28 w-full rounded-3xl" />
          <Skeleton className="h-28 w-full rounded-3xl" />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-3xl" />
          <Skeleton className="h-80 w-full rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

function Banner({ kind = "info", children }) {
  const styles =
    kind === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
      : kind === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
        : kind === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
          : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

  return (
    <div className={cx("rounded-3xl border px-4 py-3 text-sm", styles)}>
      {children}
    </div>
  );
}

function Card({ label, value, sub }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.08em] app-muted">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black text-[var(--app-fg)]">
        {value}
      </div>
      {sub ? <div className="mt-1 text-sm app-muted">{sub}</div> : null}
    </div>
  );
}

function SectionCard({ title, hint, right, children }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
        <div className="min-w-0">
          <div className="text-base font-black text-[var(--app-fg)]">
            {title}
          </div>
          {hint ? <div className="mt-1 text-sm app-muted">{hint}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function TopSectionSwitcher({
  section,
  setSection,
  draftSalesCount,
  pendingAdjRequests,
}) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-black uppercase tracking-[0.08em] text-[var(--app-fg)]">
            Store keeper workspace
          </div>
          <div className="mt-1 text-sm app-muted">
            Inventory work should use the full page width.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => {
            const active = section === s.key;
            const badge =
              s.key === "sales"
                ? draftSalesCount
                : s.key === "adjustments"
                  ? pendingAdjRequests
                  : 0;

            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSection(s.key)}
                className={cx(
                  "app-focus inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition",
                  active
                    ? "border-[var(--app-fg)] bg-[var(--app-fg)] text-[var(--app-bg)]"
                    : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)] hover:bg-[var(--hover)]",
                )}
              >
                <span>{s.label}</span>
                {badge > 0 ? (
                  <span
                    className={cx(
                      "rounded-full px-2 py-0.5 text-[11px] font-extrabold",
                      active
                        ? "bg-white/15 text-white"
                        : "bg-[var(--danger-fg)] text-white",
                    )}
                  >
                    {badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function useBeep() {
  return useCallback(() => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;

      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();

      o.type = "sine";
      o.frequency.value = 880;
      g.gain.value = 0.06;

      o.connect(g);
      g.connect(ctx.destination);

      o.start();

      setTimeout(() => {
        try {
          o.stop();
        } catch {}
        ctx.close().catch(() => {});
      }, 180);
    } catch {}
  }, []);
}

function UrgentToast({ open, title, body, onClose }) {
  if (!open) return null;

  return createPortal(
    <div className="pointer-events-none fixed right-4 top-4 z-[2147483647] w-[92vw] max-w-sm">
      <div className="pointer-events-auto rounded-3xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-extrabold text-[var(--danger-fg)]">
              {title || "Urgent alert"}
            </div>
            {body ? (
              <div className="mt-1 break-words text-sm text-[var(--danger-fg)]">
                {body}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-[var(--danger-border)] bg-[var(--card)] px-3 py-1.5 text-xs font-extrabold text-[var(--danger-fg)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
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

  return createPortal(
    <div className="fixed inset-0 z-[2147483647] flex items-start justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative mt-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-4">
          <div className="min-w-0">
            <div className="text-sm font-extrabold text-[var(--app-fg)]">
              Alerts
            </div>
            <div className="mt-1 text-xs app-muted">
              <b>{Number(unreadCount || 0)}</b> unread
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onReadAll}
              className="rounded-2xl border border-[var(--border)] px-3 py-2 text-sm font-bold text-[var(--app-fg)] hover:bg-[var(--hover)] disabled:opacity-60"
              disabled={loading}
            >
              Read all
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-[var(--app-fg)] px-3 py-2 text-sm font-bold text-[var(--app-bg)]"
            >
              Close
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4">
          {loading ? (
            <div className="grid gap-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (rows || []).length === 0 ? (
            <div className="text-sm app-muted">No alerts yet.</div>
          ) : (
            <div className="grid gap-2">
              {(rows || []).map((n) => {
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
                        ? "border-[var(--warn-border)] bg-[var(--warn-bg)]"
                        : "border-[var(--border)] bg-[var(--card)]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-extrabold text-[var(--app-fg)]">
                            {title}
                          </div>

                          {priority === "high" ? (
                            <span className="rounded-full bg-[var(--danger-fg)] px-2 py-0.5 text-xs font-extrabold text-white">
                              Urgent
                            </span>
                          ) : null}

                          {isUnread ? (
                            <span className="rounded-full bg-[var(--app-fg)] px-2 py-0.5 text-xs font-extrabold text-[var(--app-bg)]">
                              New
                            </span>
                          ) : null}
                        </div>

                        {body ? (
                          <div className="mt-1 break-words text-sm text-[var(--app-fg)]">
                            {body}
                          </div>
                        ) : null}

                        <div className="mt-2 text-xs app-muted">
                          {safeDate(n?.createdAt || n?.created_at)}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isUnread ? (
                          <button
                            type="button"
                            onClick={() => onReadOne(n?.id)}
                            className="rounded-2xl border border-[var(--border)] px-3 py-2 text-xs font-extrabold text-[var(--app-fg)] hover:bg-[var(--hover)]"
                          >
                            Mark read
                          </button>
                        ) : (
                          <span className="text-xs app-muted">Read</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-[var(--border)] p-4 text-xs app-muted">
          Urgent alerts also show a popup and play a sound.
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SaleModal({ open, sale, loading, onClose }) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] p-4">
          <div className="min-w-0">
            <div className="text-sm font-bold text-[var(--app-fg)]">
              Sale #{sale?.id ?? "—"} {loading ? "…" : ""}
            </div>
            <div className="mt-1 truncate text-xs app-muted">
              Status: {String(sale?.status || "—").toUpperCase()}
            </div>
          </div>

          <button
            type="button"
            className="rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--app-fg)] hover:bg-[var(--hover)]"
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
              <div className="text-sm font-bold text-[var(--app-fg)]">
                Items
              </div>

              <div className="mt-3 grid gap-2">
                {(Array.isArray(sale?.items) ? sale.items : []).map(
                  (it, idx) => (
                    <div
                      key={it?.id || idx}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-[var(--app-fg)]">
                          {it?.productName ||
                            it?.name ||
                            `#${it?.productId ?? "—"}`}
                        </div>
                        <div className="text-xs app-muted">
                          {it?.sku ? `SKU: ${it.sku}` : "SKU: —"}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-lg font-extrabold text-[var(--app-fg)]">
                          {qtyText(it?.qty ?? 0)}
                        </div>
                        <div className="text-xs app-muted">qty</div>
                      </div>
                    </div>
                  ),
                )}

                {(Array.isArray(sale?.items) ? sale.items : []).length === 0 ? (
                  <div className="text-sm app-muted">No items.</div>
                ) : null}
              </div>

              <div className="mt-4 text-xs app-muted">
                Store keeper releases stock. Seller finishes payment later.
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function useNotificationBeep() {
  const beep = useBeep();
  const lastPlayAtRef = useRef(0);

  return useCallback(() => {
    const now = Date.now();
    if (now - lastPlayAtRef.current < 2500) return;
    lastPlayAtRef.current = now;
    beep();
  }, [beep]);
}

export default function StoreKeeperPage() {
  const router = useRouter();
  const notifyBeep = useNotificationBeep();

  const [bootLoading, setBootLoading] = useState(true);
  const [me, setMe] = useState(null);

  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info");
  const [section, setSection] = useState("dashboard");

  const [alertsOpen, setAlertsOpen] = useState(false);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [urgentOpen, setUrgentOpen] = useState(false);
  const [urgentTitle, setUrgentTitle] = useState("");
  const [urgentBody, setUrgentBody] = useState("");

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const [inventory, setInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [invQ, setInvQ] = useState("");

  const [pName, setPName] = useState("");
  const [pSku, setPSku] = useState("");
  const [pUnit, setPUnit] = useState("PIECE");
  const [pNotes, setPNotes] = useState("");
  const [pInitialQty, setPInitialQty] = useState("");
  const [createProductBtn, setCreateProductBtn] = useState("idle");

  const [pCategory, setPCategory] = useState("GENERAL_HARDWARE");
  const [pSubcategory, setPSubcategory] = useState("");
  const [pBrand, setPBrand] = useState("");
  const [pModel, setPModel] = useState("");
  const [pSize, setPSize] = useState("");
  const [pColor, setPColor] = useState("");
  const [pMaterial, setPMaterial] = useState("");
  const [pVariantSummary, setPVariantSummary] = useState("");
  const [pBarcode, setPBarcode] = useState("");
  const [pSupplierSku, setPSupplierSku] = useState("");
  const [pStockUnit, setPStockUnit] = useState("PIECE");
  const [pSalesUnit, setPSalesUnit] = useState("");
  const [pPurchaseUnit, setPPurchaseUnit] = useState("");
  const [pReorderLevel, setPReorderLevel] = useState("");
  const [pTrackInventory, setPTrackInventory] = useState(true);

  const [arrProductId, setArrProductId] = useState("");
  const [arrQty, setArrQty] = useState("");
  const [arrNotes, setArrNotes] = useState("");
  const [arrFiles, setArrFiles] = useState([]);
  const [arrivalBtn, setArrivalBtn] = useState("idle");

  const [adjProductId, setAdjProductId] = useState("");
  const [adjDirection, setAdjDirection] = useState("ADD");
  const [adjQtyAbs, setAdjQtyAbs] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [adjBtn, setAdjBtn] = useState("idle");

  const [myAdjRequests, setMyAdjRequests] = useState([]);
  const [myAdjLoading, setMyAdjLoading] = useState(false);

  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesQ, setSalesQ] = useState("");
  const [salesTab, setSalesTab] = useState("TO_RELEASE");
  const [releaseBtnState, setReleaseBtnState] = useState({});

  const [viewSale, setViewSale] = useState(null);
  const [viewSaleLoading, setViewSaleLoading] = useState(false);

  const [deliveryNoteOpen, setDeliveryNoteOpen] = useState(false);
  const [documentSale, setDocumentSale] = useState(null);
  const [documentLoading, setDocumentLoading] = useState(false);

  function toast(kind, text) {
    setMsgKind(kind || "info");
    setMsg(text || "");
  }

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
        if (!role) {
          router.replace("/login");
          return;
        }

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

  const loadUnread = useCallback(async () => {
    try {
      const data = await apiFetch(ENDPOINTS.NOTIFS_UNREAD, { method: "GET" });
      const n = Number(data?.unread ?? 0);
      setUnread(Number.isFinite(n) ? n : 0);
    } catch {}
  }, []);

  const loadNotifs = useCallback(async () => {
    setNotifsLoading(true);
    try {
      const data = await apiFetch(`${ENDPOINTS.NOTIFS_LIST}?limit=50`, {
        method: "GET",
      });
      const list = Array.isArray(data?.rows) ? data.rows : [];
      setNotifs(list);
    } catch {
      setNotifs([]);
    } finally {
      setNotifsLoading(false);
    }
  }, []);

  const markReadOne = useCallback(
    async (id) => {
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
      } catch {}
    },
    [loadUnread],
  );

  const markAllRead = useCallback(async () => {
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
    } catch {}
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;

    loadUnread();

    const conn = connectSSE(ENDPOINTS.NOTIFS_STREAM, {
      onHello: (data) => {
        const n = Number(data?.unread ?? 0);
        if (Number.isFinite(n)) setUnread(n);
      },
      onNotification: (n) => {
        if (!n) return;

        setNotifs((prev) => {
          const arr = Array.isArray(prev) ? prev : [];
          const id = n?.id == null ? null : String(n.id);
          if (id && arr.some((x) => String(x?.id) === id)) return arr;
          return [n, ...arr].slice(0, 80);
        });

        loadUnread();

        const priority = String(n?.priority || "normal").toLowerCase();
        if (priority === "high") {
          setUrgentTitle(toStr(n?.title) || "Urgent alert");
          setUrgentBody(toStr(n?.body) || "");
          setUrgentOpen(true);
          notifyBeep();
        }
      },
      onError: () => {},
    });

    return () => {
      conn.close();
    };
  }, [isAuthorized, loadUnread, notifyBeep]);

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

  const openSaleDetails = useCallback(async (saleId) => {
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
  }, []);

  const openDeliveryNote = useCallback(async (saleId) => {
    const id = Number(saleId);
    if (!id) return;

    setDocumentLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.SALE_GET(id), { method: "GET" });
      setDocumentSale(data?.sale || null);
      setDeliveryNoteOpen(true);
    } catch (e) {
      toast(
        "danger",
        e?.data?.error || e?.message || "Cannot load delivery note",
      );
      setDocumentSale(null);
      setDeliveryNoteOpen(false);
    } finally {
      setDocumentLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;

    loadProducts();
    loadInventory();
    loadSales();

    if (section === "adjustments" || section === "dashboard") {
      loadMyAdjustRequests();
    }
  }, [
    isAuthorized,
    section,
    loadProducts,
    loadInventory,
    loadSales,
    loadMyAdjustRequests,
  ]);

  const totalProducts = products.length;

  const pendingAdjRequests = useMemo(
    () =>
      (Array.isArray(myAdjRequests) ? myAdjRequests : []).filter(
        (r) => String(r?.status || "").toUpperCase() === "PENDING",
      ).length,
    [myAdjRequests],
  );

  const draftSalesCount = useMemo(
    () =>
      (Array.isArray(sales) ? sales : []).filter(
        (s) => String(s?.status || "").toUpperCase() === "DRAFT",
      ).length,
    [sales],
  );

  const stockSnapshot = useMemo(() => {
    const list = Array.isArray(inventory) ? inventory : [];
    return list
      .map((x) => ({
        id: x?.id,
        name: x?.displayName || x?.name,
        sku: x?.sku,
        qty: Number(x?.qtyOnHand ?? x?.qty_on_hand ?? 0) || 0,
      }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    const qq = String(invQ || "")
      .trim()
      .toLowerCase();
    const list = Array.isArray(inventory) ? inventory : [];
    if (!qq) return list;

    return list.filter((x) => {
      const id = String(x?.id || "");
      const name = String(x?.name || x?.displayName || "").toLowerCase();
      const sku = String(x?.sku || "").toLowerCase();
      const category = String(x?.category || "").toLowerCase();
      const brand = String(x?.brand || "").toLowerCase();
      const barcode = String(x?.barcode || "").toLowerCase();
      const model = String(x?.model || "").toLowerCase();

      return (
        id.includes(qq) ||
        name.includes(qq) ||
        sku.includes(qq) ||
        category.includes(qq) ||
        brand.includes(qq) ||
        barcode.includes(qq) ||
        model.includes(qq)
      );
    });
  }, [inventory, invQ]);

  const filteredSales = useMemo(() => {
    const list = Array.isArray(sales) ? sales : [];
    const qq = String(salesQ || "")
      .trim()
      .toLowerCase();

    let base = list;

    if (salesTab === "TO_RELEASE") {
      base = base.filter(
        (s) => String(s?.status || "").toUpperCase() === "DRAFT",
      );
    }

    if (salesTab === "RELEASED") {
      base = base.filter(
        (s) => String(s?.status || "").toUpperCase() === "FULFILLED",
      );
    }

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

  const releasedCount = useMemo(
    () =>
      (Array.isArray(sales) ? sales : []).filter(
        (s) => String(s?.status || "").toUpperCase() === "FULFILLED",
      ).length,
    [sales],
  );

  const lastTenCount = useMemo(
    () => Math.min(10, Array.isArray(sales) ? sales.length : 0),
    [sales],
  );

  const filteredSalesLastTen = useMemo(
    () => (Array.isArray(filteredSales) ? filteredSales : []).slice(0, 10),
    [filteredSales],
  );

  const resetProductForm = useCallback(() => {
    setPName("");
    setPSku("");
    setPUnit("PIECE");
    setPNotes("");
    setPInitialQty("");
    setPCategory("GENERAL_HARDWARE");
    setPSubcategory("");
    setPBrand("");
    setPModel("");
    setPSize("");
    setPColor("");
    setPMaterial("");
    setPVariantSummary("");
    setPBarcode("");
    setPSupplierSku("");
    setPStockUnit("PIECE");
    setPSalesUnit("");
    setPPurchaseUnit("");
    setPReorderLevel("");
    setPTrackInventory(true);
  }, []);

  const createProduct = useCallback(
    async (e) => {
      e.preventDefault();
      if (createProductBtn === "loading") return;

      const name = String(pName || "").trim();
      const sku = String(pSku || "").trim();
      const category = String(pCategory || "")
        .trim()
        .toUpperCase();
      const stockUnit = String(pStockUnit || pUnit || "PIECE")
        .trim()
        .toUpperCase();

      if (!name) return toast("warn", "Write product name.");
      if (!sku) return toast("warn", "Write SKU.");
      if (!category) return toast("warn", "Choose category.");
      if (!stockUnit) return toast("warn", "Choose stock unit.");

      const initialQty = numOrNull(pInitialQty);
      if (pInitialQty !== "" && (initialQty == null || initialQty < 0)) {
        return toast("warn", "Initial qty must be 0 or more.");
      }

      const reorderLevelValue = numOrNull(pReorderLevel);
      if (
        pReorderLevel !== "" &&
        (reorderLevelValue == null || reorderLevelValue < 0)
      ) {
        return toast("warn", "Reorder level must be 0 or more.");
      }

      setCreateProductBtn("loading");

      try {
        const payload = {
          name,
          category,
          sku,
          unit: stockUnit,
          stockUnit,
          openingQty: initialQty ?? 0,
          reorderLevel: reorderLevelValue ?? 0,

          subcategory: toStr(pSubcategory) || undefined,
          barcode: toStr(pBarcode) || undefined,
          supplierSku: toStr(pSupplierSku) || undefined,
          brand: toStr(pBrand) || undefined,
          model: toStr(pModel) || undefined,
          size: toStr(pSize) || undefined,
          color: toStr(pColor) || undefined,
          material: toStr(pMaterial) || undefined,
          variantSummary: toStr(pVariantSummary) || undefined,
          salesUnit: toStr(pSalesUnit).toUpperCase() || undefined,
          purchaseUnit: toStr(pPurchaseUnit).toUpperCase() || undefined,
          notes: toStr(pNotes) || undefined,
          sellingPrice: 0,
          costPrice: 0,
          maxDiscountPercent: 0,
          trackInventory: pTrackInventory !== false,
        };

        const data = await apiFetch(ENDPOINTS.PRODUCT_CREATE, {
          method: "POST",
          body: payload,
        });

        const createdId = data?.product?.id;

        toast("success", "Product created.");
        resetProductForm();

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
        console.error("create product error", e2?.data || e2);
      }
    },
    [
      createProductBtn,
      pName,
      pSku,
      pCategory,
      pInitialQty,
      pReorderLevel,
      pSubcategory,
      pBarcode,
      pSupplierSku,
      pBrand,
      pModel,
      pSize,
      pColor,
      pMaterial,
      pVariantSummary,
      pUnit,
      pStockUnit,
      pSalesUnit,
      pPurchaseUnit,
      pNotes,
      pTrackInventory,
      loadProducts,
      loadInventory,
      resetProductForm,
    ],
  );

  const createArrival = useCallback(
    async (e) => {
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
            notes: arrNotes?.trim()
              ? String(arrNotes).trim().slice(0, 4000)
              : undefined,
            items: [
              {
                productId: pid,
                qtyReceived: Math.round(qty),
                bonusQty: 0,
                unitCost: 0,
                note: arrNotes?.trim()
                  ? String(arrNotes).trim().slice(0, 300)
                  : undefined,
              },
            ],
          },
        });

        toast("success", "Arrival saved.");
        setArrQty("");
        setArrNotes("");
        setArrFiles([]);

        await loadInventory();
        await loadProducts();

        setArrivalBtn("success");
        setTimeout(() => setArrivalBtn("idle"), 900);
      } catch (e2) {
        setArrivalBtn("idle");
        toast(
          "danger",
          e2?.data?.error || e2?.message || "Save arrival failed",
        );
        console.error("arrival error", e2?.data || e2);
      }
    },
    [
      arrivalBtn,
      arrProductId,
      arrQty,
      arrFiles,
      arrNotes,
      loadInventory,
      loadProducts,
    ],
  );

  const createAdjustRequest = useCallback(
    async (e) => {
      e.preventDefault();
      if (adjBtn === "loading") return;

      const pid = Number(adjProductId);
      const qtyAbs = numOrNull(adjQtyAbs);

      if (!pid) return toast("warn", "Pick a product.");
      if (qtyAbs == null || qtyAbs <= 0) {
        return toast("warn", "Write a correct qty.");
      }
      if (!String(adjReason || "").trim()) {
        return toast("warn", "Write a reason.");
      }

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
    },
    [
      adjBtn,
      adjProductId,
      adjQtyAbs,
      adjReason,
      adjDirection,
      loadMyAdjustRequests,
    ],
  );

  const releaseStock = useCallback(
    async (saleId) => {
      const id = Number(saleId);
      if (!id) return toast("warn", "Bad sale id.");
      if (releaseBtnState[id] === "loading") return;

      setReleaseBtnState((p) => ({ ...p, [id]: "loading" }));
      try {
        await apiFetch(ENDPOINTS.SALE_FULFILL(id), {
          method: "POST",
          body: {},
        });

        toast("success", `Sale #${id} released.`);
        notifyBeep();

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
    },
    [
      releaseBtnState,
      loadSales,
      loadInventory,
      viewSale,
      openSaleDetails,
      notifyBeep,
    ],
  );

  if (bootLoading) return <PageSkeleton />;

  if (!isAuthorized) {
    return <div className="p-6 text-sm app-muted">Redirecting…</div>;
  }

  const subtitle = `User: ${me?.email || "—"} • ${locationLabel(me)}`;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--app-bg)]">
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

      <SellerDeliveryNoteModal
        open={deliveryNoteOpen}
        sale={documentSale}
        loading={documentLoading}
        me={me}
        onClose={() => {
          if (documentLoading) return;
          setDeliveryNoteOpen(false);
          setDocumentSale(null);
        }}
      />

      <RoleBar
        title="Store keeper"
        subtitle={subtitle}
        user={me}
        links={[
          { href: "/comms", label: "Comms" },
          { href: "/customers", label: "Customers" },
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-5">
        {msg ? (
          <div className="mb-4">
            <Banner kind={msgKind}>{msg}</Banner>
          </div>
        ) : null}

        <div className="grid gap-4">
          <TopSectionSwitcher
            section={section}
            setSection={setSection}
            draftSalesCount={draftSalesCount}
            pendingAdjRequests={pendingAdjRequests}
          />

          <main className="grid gap-4">
            {section === "dashboard" ? (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <SectionCard
                    title="Today focus"
                    hint="These actions protect stock accuracy and keep seller flow moving."
                    right={
                      <AsyncButton
                        variant="secondary"
                        size="sm"
                        state={
                          productsLoading || inventoryLoading || salesLoading
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
                          loadNotifs();
                          loadMyAdjustRequests();
                        }}
                      />
                    }
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setSection("sales")}
                        className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-5 text-left transition hover:bg-[var(--hover)]"
                      >
                        <div className="text-base font-black text-[var(--app-fg)]">
                          Release stock
                        </div>
                        <div className="mt-2 text-sm app-muted">
                          Release stock for draft sales.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSection("arrivals")}
                        className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-5 text-left transition hover:bg-[var(--hover)]"
                      >
                        <div className="text-base font-black text-[var(--app-fg)]">
                          Record arrivals
                        </div>
                        <div className="mt-2 text-sm app-muted">
                          Add new stock with supporting documents.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSection("adjustments")}
                        className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-5 text-left transition hover:bg-[var(--hover)]"
                      >
                        <div className="text-base font-black text-[var(--app-fg)]">
                          Request correction
                        </div>
                        <div className="mt-2 text-sm app-muted">
                          Report recount or damage through approval flow.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSection("inventory")}
                        className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-5 text-left transition hover:bg-[var(--hover)]"
                      >
                        <div className="text-base font-black text-[var(--app-fg)]">
                          Check inventory
                        </div>
                        <div className="mt-2 text-sm app-muted">
                          Search quantity and product details quickly.
                        </div>
                      </button>
                    </div>
                  </SectionCard>

                  <SectionCard
                    title="Stock snapshot"
                    hint="Top items by quantity on hand for a quick operational pulse."
                    right={
                      <button
                        type="button"
                        onClick={() => {
                          setAlertsOpen(true);
                          loadNotifs();
                        }}
                        className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-sm font-bold text-[var(--app-fg)] hover:bg-[var(--hover)]"
                      >
                        Alerts {unread > 0 ? `(${unread})` : ""}
                      </button>
                    }
                  >
                    {inventoryLoading ? (
                      <div className="grid gap-3">
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                      </div>
                    ) : stockSnapshot.length === 0 ? (
                      <div className="text-sm app-muted">No inventory yet.</div>
                    ) : (
                      <div className="grid gap-2">
                        {stockSnapshot.map((x) => (
                          <div
                            key={String(x.id)}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-[var(--app-fg)]">
                                {toStr(x.name) || "—"}
                              </div>
                              <div className="text-xs app-muted">
                                #{x.id}
                                {x.sku ? ` • ${x.sku}` : ""}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-lg font-extrabold text-[var(--app-fg)]">
                                {qtyText(x.qty)}
                              </div>
                              <div className="text-xs app-muted">on hand</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </SectionCard>
                </div>
              </>
            ) : null}

            {section === "inventory" ? (
              <StoreKeeperInventorySection
                productsLoading={productsLoading}
                inventoryLoading={inventoryLoading}
                loadProducts={loadProducts}
                loadInventory={loadInventory}
                pName={pName}
                setPName={setPName}
                pSku={pSku}
                setPSku={setPSku}
                pUnit={pUnit}
                setPUnit={setPUnit}
                pNotes={pNotes}
                setPNotes={setPNotes}
                pInitialQty={pInitialQty}
                setPInitialQty={setPInitialQty}
                createProduct={createProduct}
                createProductBtn={createProductBtn}
                invQ={invQ}
                setInvQ={setInvQ}
                filteredInventory={filteredInventory}
                pCategory={pCategory}
                setPCategory={setPCategory}
                pSubcategory={pSubcategory}
                setPSubcategory={setPSubcategory}
                pBrand={pBrand}
                setPBrand={setPBrand}
                pModel={pModel}
                setPModel={setPModel}
                pSize={pSize}
                setPSize={setPSize}
                pColor={pColor}
                setPColor={setPColor}
                pMaterial={pMaterial}
                setPMaterial={setPMaterial}
                pVariantSummary={pVariantSummary}
                setPVariantSummary={setPVariantSummary}
                pBarcode={pBarcode}
                setPBarcode={setPBarcode}
                pSupplierSku={pSupplierSku}
                setPSupplierSku={setPSupplierSku}
                pStockUnit={pStockUnit}
                setPStockUnit={setPStockUnit}
                pSalesUnit={pSalesUnit}
                setPSalesUnit={setPSalesUnit}
                pPurchaseUnit={pPurchaseUnit}
                setPPurchaseUnit={setPPurchaseUnit}
                pReorderLevel={pReorderLevel}
                setPReorderLevel={setPReorderLevel}
                pTrackInventory={pTrackInventory}
                setPTrackInventory={setPTrackInventory}
              />
            ) : null}

            {section === "arrivals" ? (
              <StoreKeeperArrivalsSection
                products={products}
                inventory={inventory}
                productsLoading={productsLoading}
                inventoryLoading={inventoryLoading}
                loadProducts={loadProducts}
                loadInventory={loadInventory}
                arrProductId={arrProductId}
                setArrProductId={setArrProductId}
                arrQty={arrQty}
                setArrQty={setArrQty}
                arrNotes={arrNotes}
                setArrNotes={setArrNotes}
                arrFiles={arrFiles}
                setArrFiles={setArrFiles}
                createArrival={createArrival}
                arrivalBtn={arrivalBtn}
              />
            ) : null}

            {section === "adjustments" ? (
              <StoreKeeperAdjustmentsSection
                products={products}
                inventory={inventory}
                myAdjRequests={myAdjRequests}
                myAdjLoading={myAdjLoading}
                loadMyAdjustRequests={loadMyAdjustRequests}
                adjProductId={adjProductId}
                setAdjProductId={setAdjProductId}
                adjDirection={adjDirection}
                setAdjDirection={setAdjDirection}
                adjQtyAbs={adjQtyAbs}
                setAdjQtyAbs={setAdjQtyAbs}
                adjReason={adjReason}
                setAdjReason={setAdjReason}
                createAdjustRequest={createAdjustRequest}
                adjBtn={adjBtn}
              />
            ) : null}

            {section === "sales" ? (
              <StoreKeeperSalesSection
                salesLoading={salesLoading}
                loadSales={loadSales}
                salesQ={salesQ}
                setSalesQ={setSalesQ}
                salesTab={salesTab}
                setSalesTab={setSalesTab}
                draftSalesCount={draftSalesCount}
                releasedCount={releasedCount}
                lastTenCount={lastTenCount}
                filteredSalesLastTen={filteredSalesLastTen}
                releaseBtnState={releaseBtnState}
                releaseStock={releaseStock}
                openSaleDetails={openSaleDetails}
                openDeliveryNote={openDeliveryNote}
              />
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
