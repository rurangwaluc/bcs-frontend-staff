// ✅ PASTE THIS WHOLE FILE INTO:
// frontend-staff/src/app/seller/page.js

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import AsyncButton from "../../components/AsyncButton";
import CreditsPanel from "../../components/CreditsPanel";
import RoleBar from "../../components/RoleBar";
import ToastStack from "../../components/ToastStack";
import { apiFetch } from "../../lib/api";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

/**
 * SELLER FLOW (matches your backend):
 * - Create sale => DRAFT
 * - Store keeper fulfills => FULFILLED
 * - Seller:
 *    - Mark CREDIT => POST /sales/:id/mark { status: "PENDING" }
 *      ✅ Backend auto-creates credit row in markSale() when nextStatus === "PENDING"
 *    - Mark PAID   => POST /sales/:id/mark { status: "PAID", paymentMethod }
 *      ✅ Backend converts to AWAITING_PAYMENT_RECORD
 *      ✅ Cashier later records the actual payment and sale becomes COMPLETED
 *
 * Important constraints (backend):
 * - Installments are NOT possible yet because payments has uniqSale index (payments_sale_unique).
 * - This UI displays credit “Paid/Remaining” using listSales.amountPaid (SUM(payments.amount)).
 */

const ENDPOINTS = {
  PRODUCTS_LIST: "/products",
  SALES_LIST: "/sales",
  SALES_CREATE: "/sales",
  SALE_GET: (id) => `/sales/${id}`,
  SALE_MARK: (id) => `/sales/${id}/mark`,
  CUSTOMERS_SEARCH: (q) => `/customers/search?q=${encodeURIComponent(q)}`,
  CUSTOMERS_CREATE: "/customers",
};

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "MOMO", label: "MoMo" },
  { value: "BANK", label: "Bank" },
];

const SECTIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "create", label: "Create sale" },
  { key: "sales", label: "My sales" },
  { key: "credits", label: "Credits" },
];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function toInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : 0;
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

function isSameLocalDay(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function isToday(dateLike) {
  if (!dateLike) return false;
  return isSameLocalDay(dateLike, new Date());
}

function locationLabel(me) {
  const loc = me?.location || null;

  const name =
    (loc?.name != null ? toStr(loc.name) : "") ||
    (me?.locationName != null ? toStr(me.locationName) : "") ||
    "";

  const code =
    (loc?.code != null ? toStr(loc.code) : "") ||
    (me?.locationCode != null ? toStr(me.locationCode) : "") ||
    "";

  if (name && code) return `${name} (${code})`;
  if (name) return name;
  return "Store —";
}

function nowLocalDatetimeValue() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate(),
  )}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
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
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-3 h-4 w-52" />
            <div className="mt-6 grid gap-3">
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

function TextArea({ className = "", ...props }) {
  return (
    <textarea
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

/* ---------- Status UI ---------- */

function statusUi(statusRaw) {
  const st = String(statusRaw || "").toUpperCase();

  // Seller credit
  if (st === "PENDING") return { label: "CREDIT", tone: "warn" };

  // Seller paid => backend sets AWAITING_PAYMENT_RECORD
  if (st === "AWAITING_PAYMENT_RECORD")
    return { label: "WAITING CASHIER", tone: "warn" };

  if (st === "DRAFT") return { label: "WAITING RELEASE", tone: "info" };
  if (st === "FULFILLED") return { label: "RELEASED", tone: "success" };
  if (st === "COMPLETED") return { label: "PAID", tone: "success" };
  if (st === "CANCELLED") return { label: "CANCELLED", tone: "danger" };

  return { label: st || "—", tone: "neutral" };
}

function StatusBadge({ status }) {
  const { label, tone } = statusUi(status);

  const cls =
    tone === "success"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : tone === "warn"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : tone === "danger"
          ? "bg-rose-50 text-rose-800 border-rose-200"
          : tone === "info"
            ? "bg-sky-50 text-sky-800 border-sky-200"
            : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-extrabold",
        cls,
      )}
    >
      {label}
    </span>
  );
}

/* ---------- Sale items modal ---------- */

function ItemsModal({ open, loading, sale, onClose }) {
  if (!open) return null;

  const items = Array.isArray(sale?.items) ? sale.items : [];

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
              Status: {String(sale?.status || "—").toUpperCase()}
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
          ) : items.length === 0 ? (
            <div className="text-sm text-slate-600">No items.</div>
          ) : (
            <div className="grid gap-2">
              {items.map((it, idx) => (
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
                      {toInt(it?.qty ?? 0)}
                    </div>
                    <div className="text-xs text-slate-500">qty</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 text-xs text-slate-600">
            Tip: Released sales can be marked PAID or CREDIT.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Credit modal for seller ---------- */
/**
 * This modal is UI-only for issue/expectedPayDate/installment.
 * Backend credit issue date is createdAt; paid date is settledAt.
 *
 * ✅ No useEffect state resets (avoids the warning).
 * ✅ Modal is remounted with a key from parent for clean defaults.
 */
function CreditSetupModal({ open, sale, onClose, onConfirm, loading }) {
  const saleId = sale?.id ?? null;

  const getLocalDateTime = useCallback(() => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(
      now.getHours(),
    )}:${pad(now.getMinutes())}`;
  }, []);

  const [form, setForm] = useState(() => ({
    issueDate: "",
    expectedPayDate: "",
    installment: "",
    note: "",
  }));

  // ✅ Create a stable “defaults key” so ESLint is happy and reset happens only when needed
  const defaultsKey = useMemo(() => {
    const d = sale?._defaults || {};
    // stringify only the fields we care about
    return JSON.stringify({
      saleId,
      issueDate: d.issueDate || "",
      expectedPayDate: d.expectedPayDate || "",
      installment: d.installment || "",
      note: d.note || "",
    });
  }, [saleId, sale?._defaults]);

  useEffect(() => {
    if (!open) return;

    const d = sale?._defaults || {};
    setForm({
      issueDate: (d.issueDate && String(d.issueDate)) || getLocalDateTime(),
      expectedPayDate: (d.expectedPayDate && String(d.expectedPayDate)) || "",
      installment: (d.installment && String(d.installment)) || "",
      note: (d.note && String(d.note)) || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultsKey, getLocalDateTime]);

  if (!open) return null;

  const total = Number(sale?.totalAmount ?? sale?.total ?? 0) || 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-extrabold text-slate-900">
              Mark CREDIT • Sale #{sale?.id ?? "—"}
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Total: <b>{money(total)}</b> RWF
            </div>
          </div>
          <button
            type="button"
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            disabled={loading}
          >
            Close
          </button>
        </div>

        <div className="p-4 grid gap-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <b>Important:</b> Issue date and paid date are stored by backend on
            the credit record. Installments are not supported until you remove{" "}
            <b>payments_sale_unique</b> and implement a partial payment
            endpoint.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1">
                Issue date (UI only)
              </div>
              <Input
                type="datetime-local"
                value={form.issueDate}
                onChange={(e) =>
                  setForm((p) => ({ ...p, issueDate: e.target.value }))
                }
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1">
                Expected paying date (UI only)
              </div>
              <Input
                type="date"
                value={form.expectedPayDate}
                onChange={(e) =>
                  setForm((p) => ({ ...p, expectedPayDate: e.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-600 mb-1">
              First installment amount (UI only)
            </div>
            <Input
              type="number"
              min="0"
              value={form.installment}
              onChange={(e) =>
                setForm((p) => ({ ...p, installment: e.target.value }))
              }
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-600 mb-1">
              Note (optional)
            </div>
            <TextArea
              rows={2}
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <AsyncButton
              variant="primary"
              state={loading ? "loading" : "idle"}
              text="Confirm CREDIT"
              loadingText="Saving…"
              successText="Saved"
              onClick={() =>
                onConfirm?.({
                  issueDate: form.issueDate,
                  expectedPayDate: form.expectedPayDate,
                  installmentAmount: form.installment
                    ? Number(form.installment)
                    : 0,
                  note: form.note,
                })
              }
            />
            <button
              type="button"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
/* ---------- Page ---------- */

export default function SellerPage() {
  const router = useRouter();

  // toast stack
  const [toasts, setToasts] = useState([]);
  const toastTimerRef = useRef(new Map());

  function pushToast(kind, message) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const t = { id, kind: kind || "info", message: message || "" };

    setToasts((prev) => [t, ...(Array.isArray(prev) ? prev : [])].slice(0, 4));

    const tm = setTimeout(() => {
      setToasts((prev) =>
        (Array.isArray(prev) ? prev : []).filter((x) => x.id !== id),
      );
      toastTimerRef.current.delete(id);
    }, 6000);

    toastTimerRef.current.set(id, tm);
  }

  function dismissToast(id) {
    const tm = toastTimerRef.current.get(id);
    if (tm) clearTimeout(tm);
    toastTimerRef.current.delete(id);
    setToasts((prev) =>
      (Array.isArray(prev) ? prev : []).filter((x) => x.id !== id),
    );
  }

  useEffect(() => {
    return () => {
      for (const tm of toastTimerRef.current.values()) clearTimeout(tm);
      toastTimerRef.current.clear();
    };
  }, []);

  const [bootLoading, setBootLoading] = useState(true);
  const [me, setMe] = useState(null);

  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info");

  const [section, setSection] = useState("dashboard");

  function banner(kind, text) {
    setMsgKind(kind);
    setMsg(text || "");
  }

  // ROLE GUARD
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

        if (role !== "seller") {
          const map = {
            store_keeper: "/store-keeper",
            cashier: "/cashier",
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
    !!me && String(me?.role || "").toLowerCase() === "seller";

  // DATA
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [prodQ, setProdQ] = useState("");

  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesQ, setSalesQ] = useState("");

  // customer search + create
  const [customerQ, setCustomerQ] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [customerLoading, setCustomerLoading] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerTin, setCustomerTin] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  const [note, setNote] = useState("");

  const [saleCart, setSaleCart] = useState([]);
  const [createSaleBtn, setCreateSaleBtn] = useState("idle");
  const [createCustomerBtn, setCreateCustomerBtn] = useState("idle");

  const [markBtnState, setMarkBtnState] = useState({});
  const [salePayMethod, setSalePayMethod] = useState({});

  // Sale items modal
  const [itemsOpen, setItemsOpen] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsSale, setItemsSale] = useState(null);

  // Credit modal
  const [creditOpen, setCreditOpen] = useState(false);
  const [creditSale, setCreditSale] = useState(null);
  const [creditSaving, setCreditSaving] = useState(false);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.PRODUCTS_LIST, { method: "GET" });
      const list = Array.isArray(data?.products)
        ? data.products
        : data?.items || data?.rows || [];
      setProducts(Array.isArray(list) ? list : []);
    } catch (e) {
      banner("danger", e?.data?.error || e?.message || "Cannot load products");
      setProducts([]);
    } finally {
      setProductsLoading(false);
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
      banner("danger", e?.data?.error || e?.message || "Cannot load sales");
      setSales([]);
    } finally {
      setSalesLoading(false);
    }
  }, []);

  // customer search (debounced)
  const searchCustomers = useCallback(async (q) => {
    const qq = String(q || "").trim();
    if (!qq) {
      setCustomerResults([]);
      return;
    }
    setCustomerLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.CUSTOMERS_SEARCH(qq), {
        method: "GET",
      });
      const rows = Array.isArray(data?.customers) ? data.customers : [];
      setCustomerResults(rows);
    } catch {
      setCustomerResults([]);
    } finally {
      setCustomerLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchCustomers(customerQ), 250);
    return () => clearTimeout(t);
  }, [customerQ, searchCustomers]);

  // load per section
  useEffect(() => {
    if (!isAuthorized) return;
    if (section === "create") loadProducts();
    if (section === "dashboard" || section === "sales") loadSales();
  }, [isAuthorized, section, loadProducts, loadSales]);

  /* ---------- derived ---------- */

  const filteredProducts = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    const q = String(prodQ || "")
      .trim()
      .toLowerCase();
    if (!q) return list;
    return list.filter((p) => {
      const name = String(p?.name ?? "").toLowerCase();
      const sku = String(p?.sku ?? "").toLowerCase();
      return name.includes(q) || sku.includes(q);
    });
  }, [products, prodQ]);

  const filteredSales = useMemo(() => {
    const list = Array.isArray(sales) ? sales : [];
    const q = String(salesQ || "")
      .trim()
      .toLowerCase();
    if (!q) return list;

    return list.filter((s) => {
      const id = String(s?.id ?? "");
      const st = String(s?.status ?? "");
      const statusReadable = st.toUpperCase() === "PENDING" ? "CREDIT" : st;

      const name = String(
        s?.customerName ?? s?.customer_name ?? "",
      ).toLowerCase();
      const phone = String(
        s?.customerPhone ?? s?.customer_phone ?? "",
      ).toLowerCase();
      const pm = String(
        s?.paymentMethod ?? s?.payment_method ?? "",
      ).toLowerCase();

      return (
        id.includes(q) ||
        String(statusReadable).toLowerCase().includes(q) ||
        name.includes(q) ||
        phone.includes(q) ||
        pm.includes(q)
      );
    });
  }, [sales, salesQ]);

  const salesSorted = useMemo(() => {
    const list = Array.isArray(filteredSales) ? filteredSales : [];
    return list.slice().sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
  }, [filteredSales]);

  const showAllSales = String(salesQ || "").trim().length > 0;
  const salesToShow = useMemo(() => {
    return showAllSales ? salesSorted.slice(0, 200) : salesSorted.slice(0, 10);
  }, [salesSorted, showAllSales]);

  const todaySales = useMemo(() => {
    const list = Array.isArray(sales) ? sales : [];
    return list.filter((s) => isToday(s?.createdAt || s?.created_at));
  }, [sales]);

  const todaySalesCount = useMemo(() => {
    return todaySales.filter(
      (s) => String(s?.status || "").toUpperCase() !== "CANCELLED",
    ).length;
  }, [todaySales]);

  const todaySalesTotal = useMemo(() => {
    return todaySales.reduce((sum, s) => {
      const st = String(s?.status || "").toUpperCase();
      if (st === "CANCELLED") return sum;
      const v = Number(s?.totalAmount ?? s?.total ?? 0);
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);
  }, [todaySales]);

  const draftCount = useMemo(() => {
    const list = Array.isArray(sales) ? sales : [];
    return list.filter((s) => String(s?.status || "").toUpperCase() === "DRAFT")
      .length;
  }, [sales]);

  const releasedCount = useMemo(() => {
    const list = Array.isArray(sales) ? sales : [];
    return list.filter(
      (s) => String(s?.status || "").toUpperCase() === "FULFILLED",
    ).length;
  }, [sales]);

  const creditCount = useMemo(() => {
    const list = Array.isArray(sales) ? sales : [];
    return list.filter(
      (s) => String(s?.status || "").toUpperCase() === "PENDING",
    ).length;
  }, [sales]);

  /* ---------- cart helpers ---------- */

  function productToCartItem(p) {
    const productId = Number(p?.id);
    const sellingPrice = Number(p?.sellingPrice ?? p?.selling_price ?? 0);
    const maxDiscountPercent = Number(
      p?.maxDiscountPercent ?? p?.max_discount_percent ?? 0,
    );

    const sp = Number.isFinite(sellingPrice) ? sellingPrice : 0;
    const md = Number.isFinite(maxDiscountPercent) ? maxDiscountPercent : 0;

    return {
      productId,
      productName: p?.name || "—",
      sku: p?.sku || "—",
      sellingPrice: sp,
      maxDiscountPercent: md,
      qty: 1,
      unitPrice: sp,
      discountPercent: 0,
      discountAmount: 0,
    };
  }

  function addProductToSaleCart(p) {
    const productId = Number(p?.id);
    if (!productId) return pushToast("warn", "Missing product id.");
    if (saleCart.some((x) => Number(x.productId) === productId)) {
      return pushToast("warn", "Already added.");
    }
    setSaleCart((prev) => [...prev, productToCartItem(p)]);
    pushToast("success", "Added to cart.");
  }

  function updateCart(productId, patch) {
    setSaleCart((prev) =>
      prev.map((it) =>
        Number(it.productId) === Number(productId) ? { ...it, ...patch } : it,
      ),
    );
  }

  function removeFromCart(productId) {
    setSaleCart((prev) =>
      prev.filter((it) => Number(it.productId) !== Number(productId)),
    );
  }

  function previewLineTotal(it) {
    const qty = Math.max(1, toInt(it.qty));
    const unitPrice = Math.max(0, toInt(it.unitPrice));
    const base = qty * unitPrice;

    const pct = Math.max(0, Math.min(100, Number(it.discountPercent) || 0));
    const pctDisc = Math.round((base * pct) / 100);

    const amtDisc = Math.max(0, Number(it.discountAmount) || 0);
    const disc = Math.min(base, pctDisc + amtDisc);

    return Math.max(0, base - disc);
  }

  const cartSubtotal = useMemo(() => {
    return saleCart.reduce((sum, it) => sum + previewLineTotal(it), 0);
  }, [saleCart]);

  /* ---------- actions ---------- */

  async function createCustomerFromInputs() {
    if (createCustomerBtn === "loading") return;

    const name = toStr(customerName);
    const phone = toStr(customerPhone);
    const tin = toStr(customerTin);
    const address = toStr(customerAddress);

    if (name.length < 2) return pushToast("warn", "Customer name is required.");
    if (phone.length < 6)
      return pushToast("warn", "Customer phone is required.");

    setCreateCustomerBtn("loading");
    setMsg("");

    try {
      const body = { name, phone };
      if (tin) body.tin = tin;
      if (address) body.address = address;

      const data = await apiFetch(ENDPOINTS.CUSTOMERS_CREATE, {
        method: "POST",
        body,
      });
      const c = data?.customer || null;

      if (!c?.id) {
        setCreateCustomerBtn("idle");
        return pushToast("danger", "Failed to create customer.");
      }

      setSelectedCustomer({
        id: c.id,
        name: c.name,
        phone: c.phone,
        tin: c.tin ?? tin ?? "",
        address: c.address ?? address ?? "",
      });

      setCustomerQ(`${c.name || ""} ${c.phone || ""}`.trim());
      setCustomerResults([]);
      pushToast("success", "Customer created and selected.");

      setCreateCustomerBtn("success");
      setTimeout(() => setCreateCustomerBtn("idle"), 900);
    } catch (e) {
      setCreateCustomerBtn("idle");
      pushToast(
        "danger",
        e?.data?.error || e?.message || "Customer create failed",
      );
    }
  }

  async function createSale(e) {
    e.preventDefault();
    if (createSaleBtn === "loading") return;

    const typedName = toStr(customerName);
    const typedPhone = toStr(customerPhone);

    if (!selectedCustomer?.id) {
      if (typedName.length < 2)
        return pushToast("warn", "Customer name is required.");
      if (typedPhone.length < 6)
        return pushToast("warn", "Customer phone is required.");
    }

    if (saleCart.length === 0)
      return pushToast("warn", "Cart is empty. Add products.");

    // basic constraints
    for (const it of saleCart) {
      const qty = toInt(it.qty);
      if (qty <= 0) return pushToast("warn", `Bad qty for ${it.productName}.`);

      const selling = toInt(it.sellingPrice);
      const unit = toInt(it.unitPrice);
      if (unit > selling)
        return pushToast(
          "warn",
          `Unit price above selling price for ${it.productName}.`,
        );

      const maxPct = Number(it.maxDiscountPercent ?? 0) || 0;
      const pct = Number(it.discountPercent ?? 0) || 0;
      if (pct > maxPct)
        return pushToast(
          "warn",
          `Discount too high for ${it.productName}. Max ${maxPct}%.`,
        );
    }

    const payload = {
      customerId: selectedCustomer?.id
        ? Number(selectedCustomer.id)
        : undefined,
      customerName: typedName ? typedName : null,
      customerPhone: typedPhone ? typedPhone : null,
      note: toStr(note) ? toStr(note).slice(0, 200) : null,
      items: saleCart.map((it) => {
        const out = { productId: Number(it.productId), qty: toInt(it.qty) };
        const up = Number(it.unitPrice);
        if (Number.isFinite(up)) out.unitPrice = up;

        const dp = Number(it.discountPercent);
        if (Number.isFinite(dp) && dp > 0) out.discountPercent = dp;

        const da = Number(it.discountAmount);
        if (Number.isFinite(da) && da > 0) out.discountAmount = da;

        return out;
      }),
    };

    setCreateSaleBtn("loading");
    setMsg("");

    try {
      const data = await apiFetch(ENDPOINTS.SALES_CREATE, {
        method: "POST",
        body: payload,
      });
      const newSaleId = data?.sale?.id || data?.id || null;

      pushToast(
        "success",
        newSaleId
          ? `Sale created (Draft) #${newSaleId}`
          : "Sale created (Draft)",
      );

      // reset
      setSelectedCustomer(null);
      setCustomerQ("");
      setCustomerResults([]);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerTin("");
      setCustomerAddress("");
      setNote("");
      setSaleCart([]);

      setCreateSaleBtn("success");
      setTimeout(() => setCreateSaleBtn("idle"), 900);

      setSection("sales");
      await loadSales();
    } catch (e2) {
      setCreateSaleBtn("idle");
      pushToast(
        "danger",
        e2?.data?.error || e2?.message || "Sale create failed",
      );
    }
  }

  async function openSaleItems(saleId) {
    const sid = Number(saleId);
    if (!sid) return;

    setItemsOpen(true);
    setItemsLoading(true);
    setItemsSale({ id: sid });

    try {
      const data = await apiFetch(ENDPOINTS.SALE_GET(sid), { method: "GET" });
      setItemsSale(data?.sale || data || { id: sid });
    } catch (e) {
      pushToast(
        "danger",
        e?.data?.error || e?.message || "Cannot load sale items",
      );
      setItemsSale({ id: sid });
    } finally {
      setItemsLoading(false);
    }
  }

  async function markSalePaid(saleId, paymentMethod) {
    const sid = Number(saleId);
    if (!sid) return;

    setMarkBtnState((p) => ({ ...p, [sid]: "loading" }));
    setMsg("");

    try {
      const method = String(paymentMethod || "CASH").toUpperCase();

      await apiFetch(ENDPOINTS.SALE_MARK(sid), {
        method: "POST",
        body: { status: "PAID", paymentMethod: method },
      });

      pushToast("success", `Sale #${sid} marked PAID (${method})`);
      await loadSales();

      setMarkBtnState((p) => ({ ...p, [sid]: "success" }));
      setTimeout(() => setMarkBtnState((p) => ({ ...p, [sid]: "idle" })), 900);
    } catch (e) {
      setMarkBtnState((p) => ({ ...p, [sid]: "idle" }));
      pushToast("danger", e?.data?.error || e?.message || "Mark PAID failed");
    }
  }

  function openCreditModal(sale) {
    setCreditSale({
      ...(sale || null),
      _defaults: {
        issueDate: nowLocalDatetimeValue(),
        expectedPayDate: "",
        installment: "",
        note: "",
      },
    });
    setCreditOpen(true);
  }

  async function confirmCredit({ note }) {
    const sid = Number(creditSale?.id);
    if (!sid) return;

    setCreditSaving(true);
    setMsg("");

    try {
      // ✅ Only this call. Backend auto-creates credit row.
      await apiFetch(ENDPOINTS.SALE_MARK(sid), {
        method: "POST",
        body: { status: "PENDING" },
      });

      pushToast("success", `Sale #${sid} marked CREDIT`);
      setCreditOpen(false);
      setCreditSale(null);
      await loadSales();
    } catch (e) {
      pushToast("danger", e?.data?.error || e?.message || "Mark CREDIT failed");
    } finally {
      setCreditSaving(false);
    }
  }

  /* ---------- render ---------- */

  if (bootLoading) return <PageSkeleton />;
  if (!isAuthorized)
    return <div className="p-6 text-sm text-slate-600">Redirecting…</div>;

  const subtitle = `User: ${me?.email || "—"} • ${locationLabel(me)}`;

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      {/* ✅ Toast overlay always above UI */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <RoleBar title="Seller" subtitle={subtitle} user={me} />

      <ItemsModal
        open={itemsOpen}
        loading={itemsLoading}
        sale={itemsSale}
        onClose={() => setItemsOpen(false)}
      />

      <CreditSetupModal
        key={creditSale?.id || "credit"} // ✅ remount for clean defaults
        open={creditOpen}
        sale={creditSale}
        loading={creditSaving}
        onClose={() => {
          if (creditSaving) return;
          setCreditOpen(false);
          setCreditSale(null);
        }}
        onConfirm={confirmCredit}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-5 py-6">
        {msg ? (
          <div className="mb-4">
            <div
              className={cx(
                "rounded-2xl border px-4 py-3 text-sm",
                msgKind === "success"
                  ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                  : msgKind === "warn"
                    ? "bg-amber-50 text-amber-900 border-amber-200"
                    : msgKind === "danger"
                      ? "bg-rose-50 text-rose-900 border-rose-200"
                      : "bg-slate-50 text-slate-800 border-slate-200",
              )}
            >
              {msg}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
          {/* Sidebar */}
          <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 h-fit">
            <div className="text-sm font-bold text-slate-900">Seller</div>
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
              <NavItem
                active={section === "dashboard"}
                label="Dashboard"
                onClick={() => setSection("dashboard")}
                // badge={releasedCount > 0 ? String(releasedCount) : null}
              />
              <NavItem
                active={section === "create"}
                label="Create sale"
                onClick={() => setSection("create")}
              />
              <NavItem
                active={section === "sales"}
                label="My sales"
                onClick={() => setSection("sales")}
                badge={draftCount > 0 ? String(draftCount) : null}
              />
              <NavItem
                active={section === "credits"}
                label="Credits"
                onClick={() => setSection("credits")}
                badge={creditCount > 0 ? String(creditCount) : null}
              />
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-600">
              Flow: Draft → Store keeper releases → you mark Paid or Credit.
            </div>
          </aside>

          {/* Main */}
          <main className="grid gap-4">
            {/* DASHBOARD */}
            {section === "dashboard" ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <Card
                    label="Today sales"
                    value={salesLoading ? "…" : String(todaySalesCount)}
                    sub="Created today"
                  />
                  <Card
                    label="Today total"
                    value={salesLoading ? "…" : money(todaySalesTotal)}
                    sub="RWF"
                  />
                  <Card
                    label="Waiting release"
                    value={salesLoading ? "…" : String(draftCount)}
                    sub="Draft sales"
                  />
                  <Card
                    label="Released"
                    value={salesLoading ? "…" : String(releasedCount)}
                    sub="Ready to finalize"
                  />
                </div>

                <SectionCard
                  title="Today focus"
                  hint="Finalize released sales to get paid faster."
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSection("create")}
                      className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
                    >
                      <div className="text-sm font-bold text-slate-900">
                        Create sale
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        Make a draft sale for store keeper to release.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSection("sales")}
                      className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
                    >
                      <div className="text-sm font-bold text-slate-900">
                        Finalize sales
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        Mark paid or credit once released.
                      </div>
                    </button>
                  </div>
                </SectionCard>
              </>
            ) : null}

            {/* CREATE */}
            {section === "create" ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* PRODUCTS */}
                <SectionCard
                  title="Products"
                  hint="Search and add to cart."
                  right={
                    <AsyncButton
                      variant="secondary"
                      size="sm"
                      state={productsLoading ? "loading" : "idle"}
                      text="Refresh"
                      loadingText="Refreshing…"
                      successText="Done"
                      onClick={loadProducts}
                    />
                  }
                >
                  <div className="grid gap-3">
                    <Input
                      placeholder="Search by name or SKU"
                      value={prodQ}
                      onChange={(e) => setProdQ(e.target.value)}
                    />

                    {productsLoading ? (
                      <div className="grid gap-3">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="text-sm text-slate-600">
                        No products found.
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {filteredProducts.slice(0, 40).map((p) => {
                          const selling =
                            Number(p?.sellingPrice ?? p?.selling_price ?? 0) ||
                            0;
                          const maxp =
                            Number(
                              p?.maxDiscountPercent ??
                                p?.max_discount_percent ??
                                0,
                            ) || 0;

                          return (
                            <div
                              key={String(p?.id)}
                              className="rounded-2xl border border-slate-200 bg-white p-3 flex items-start justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-slate-900 truncate">
                                  {p?.name || "—"}
                                </div>
                                <div className="mt-1 text-xs text-slate-600">
                                  SKU: {p?.sku || "—"}
                                </div>
                                <div className="mt-2 text-xs text-slate-600">
                                  Selling: <b>{money(selling)}</b> • Max
                                  discount: <b>{maxp}%</b>
                                </div>
                              </div>

                              <button
                                type="button"
                                className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-extrabold hover:bg-slate-50"
                                onClick={() => addProductToSaleCart(p)}
                              >
                                Add
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {filteredProducts.length > 40 ? (
                      <div className="text-xs text-slate-500">
                        Showing first 40 results. Refine your search to find
                        more.
                      </div>
                    ) : null}
                  </div>
                </SectionCard>

                {/* CREATE SALE */}
                <SectionCard
                  title="Create sale (Draft)"
                  hint="Customer + cart → create draft sale → store keeper releases stock."
                >
                  <form onSubmit={createSale} className="grid gap-4">
                    {/* CUSTOMER */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold text-slate-900">
                            Customer
                          </div>
                          <div className="mt-1 text-xs text-slate-600">
                            Search existing customer or create a new one.
                          </div>
                        </div>

                        {selectedCustomer?.id ? (
                          <span className="shrink-0 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 text-xs font-extrabold">
                            Selected
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 grid gap-2">
                        <Input
                          placeholder="Search customer (name, phone, TIN)"
                          value={customerQ}
                          onChange={(e) => setCustomerQ(e.target.value)}
                        />

                        {/* dropdown */}
                        {toStr(customerQ) && !selectedCustomer ? (
                          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                            <div className="max-h-64 overflow-auto">
                              {customerLoading ? (
                                <div className="p-3 text-sm text-slate-600">
                                  Searching…
                                </div>
                              ) : customerResults.length ? (
                                <div className="divide-y divide-slate-100">
                                  {customerResults.map((c) => (
                                    <div
                                      key={c.id}
                                      className="p-3 hover:bg-slate-50"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <div className="text-sm font-extrabold text-slate-900 truncate">
                                            {c.name || "—"}
                                          </div>

                                          <div className="mt-1 text-xs text-slate-600 flex flex-wrap gap-x-2 gap-y-1">
                                            <span className="font-semibold">
                                              {c.phone || "—"}
                                            </span>
                                            {c.tin ? (
                                              <span className="rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                                                TIN: {c.tin}
                                              </span>
                                            ) : null}
                                          </div>

                                          {c.address ? (
                                            <div className="mt-1 text-xs text-slate-600 line-clamp-2">
                                              {c.address}
                                            </div>
                                          ) : null}
                                        </div>

                                        <button
                                          type="button"
                                          className="shrink-0 rounded-xl bg-slate-900 text-white px-3 py-2 text-xs font-extrabold hover:bg-slate-800"
                                          onClick={() => {
                                            const name =
                                              c?.name ?? c?.customerName ?? "";
                                            const phone =
                                              c?.phone ??
                                              c?.customerPhone ??
                                              "";
                                            const tin =
                                              c?.tin ??
                                              c?.tinNumber ??
                                              c?.taxId ??
                                              "";
                                            const address =
                                              c?.address ??
                                              c?.location ??
                                              c?.customerAddress ??
                                              "";

                                            setSelectedCustomer(c);

                                            setCustomerName(name);
                                            setCustomerPhone(phone);
                                            setCustomerTin(tin);
                                            setCustomerAddress(address);

                                            setCustomerQ(
                                              `${name} ${phone}`.trim(),
                                            );
                                            setCustomerResults([]);
                                          }}
                                        >
                                          Select
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-3">
                                  <div className="text-sm font-semibold text-slate-900">
                                    No customer found
                                  </div>
                                  <div className="mt-1 text-xs text-slate-600">
                                    Fill details below and create, or use this
                                    search value to prefill.
                                  </div>

                                  <button
                                    type="button"
                                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
                                    onClick={() => {
                                      const q = toStr(customerQ);
                                      const digits = q.replace(/\D/g, "");
                                      const looksLikePhone = digits.length >= 8;

                                      setSelectedCustomer(null);
                                      setCustomerResults([]);

                                      if (looksLikePhone) {
                                        setCustomerPhone(digits);
                                        if (!toStr(customerName))
                                          setCustomerName("");
                                      } else {
                                        setCustomerName(q);
                                        if (!toStr(customerPhone))
                                          setCustomerPhone("");
                                      }

                                      setCustomerTin("");
                                      setCustomerAddress("");
                                    }}
                                  >
                                    Use search value to create customer
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : null}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs font-semibold text-slate-600 mb-1">
                              Name
                            </div>
                            <Input
                              placeholder="Customer name"
                              value={customerName}
                              onChange={(e) => {
                                setCustomerName(e.target.value);
                                setSelectedCustomer(null);
                              }}
                            />
                          </div>

                          <div>
                            <div className="text-xs font-semibold text-slate-600 mb-1">
                              Phone
                            </div>
                            <Input
                              placeholder="Customer phone"
                              value={customerPhone}
                              onChange={(e) => {
                                setCustomerPhone(e.target.value);
                                setSelectedCustomer(null);
                              }}
                            />
                          </div>

                          <div>
                            <div className="text-xs font-semibold text-slate-600 mb-1">
                              TIN
                            </div>
                            <Input
                              placeholder="TIN (optional)"
                              value={customerTin}
                              onChange={(e) => {
                                setCustomerTin(e.target.value);
                                setSelectedCustomer(null);
                              }}
                            />
                          </div>

                          <div>
                            <div className="text-xs font-semibold text-slate-600 mb-1">
                              Address
                            </div>
                            <Input
                              placeholder="Address / location (optional)"
                              value={customerAddress}
                              onChange={(e) => {
                                setCustomerAddress(e.target.value);
                                setSelectedCustomer(null);
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <AsyncButton
                            type="button"
                            variant="primary"
                            state={createCustomerBtn}
                            text="Create customer"
                            loadingText="Creating…"
                            successText="Created"
                            onClick={createCustomerFromInputs}
                            disabled={
                              !toStr(customerName) || !toStr(customerPhone)
                            }
                          />

                          <button
                            type="button"
                            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
                            onClick={() => {
                              setSelectedCustomer(null);
                              setCustomerQ("");
                              setCustomerResults([]);
                              setCustomerName("");
                              setCustomerPhone("");
                              setCustomerTin("");
                              setCustomerAddress("");
                            }}
                          >
                            Clear
                          </button>

                          {selectedCustomer?.id ? (
                            <div className="text-xs text-emerald-700 font-extrabold self-center">
                              {selectedCustomer.name} • {selectedCustomer.phone}
                              {selectedCustomer.tin
                                ? ` • TIN: ${selectedCustomer.tin}`
                                : ""}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* NOTE */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-sm font-extrabold text-slate-900">
                        Note
                      </div>
                      <div className="mt-2">
                        <TextArea
                          rows={2}
                          placeholder="Optional note (e.g., delivery, special request)"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* CART (no horizontal scroll) */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold text-slate-900">
                            Cart
                          </div>
                          <div className="mt-1 text-xs text-slate-600">
                            Adjust qty/price/discount per item.
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-xs text-slate-600">Subtotal</div>
                          <div className="text-lg font-extrabold text-slate-900">
                            {money(cartSubtotal)}
                          </div>
                        </div>
                      </div>

                      {saleCart.length === 0 ? (
                        <div className="mt-3 text-sm text-slate-600">
                          Cart is empty. Add products from the left.
                        </div>
                      ) : (
                        <div className="mt-3 grid gap-3">
                          {saleCart.map((it) => {
                            const line = previewLineTotal(it);
                            const maxPct =
                              Number(it.maxDiscountPercent ?? 0) || 0;

                            return (
                              <div
                                key={String(it.productId)}
                                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-sm font-extrabold text-slate-900 truncate">
                                      {it.productName}
                                    </div>
                                    <div className="mt-1 text-xs text-slate-600">
                                      SKU: {it.sku} • Selling:{" "}
                                      <b>{money(it.sellingPrice)}</b>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => removeFromCart(it.productId)}
                                    className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50"
                                  >
                                    Remove
                                  </button>
                                </div>

                                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  <div>
                                    <div className="text-xs font-semibold text-slate-600 mb-1">
                                      Qty
                                    </div>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={String(it.qty)}
                                      onChange={(e) =>
                                        updateCart(it.productId, {
                                          qty: Number(e.target.value || 1),
                                        })
                                      }
                                    />
                                  </div>

                                  <div>
                                    <div className="text-xs font-semibold text-slate-600 mb-1">
                                      Unit price
                                    </div>
                                    <Input
                                      type="number"
                                      min="0"
                                      max={it.sellingPrice || undefined}
                                      value={String(it.unitPrice)}
                                      onChange={(e) =>
                                        updateCart(it.productId, {
                                          unitPrice: Number(
                                            e.target.value || 0,
                                          ),
                                        })
                                      }
                                    />
                                    <div className="mt-1 text-[11px] text-slate-500">
                                      ≤ selling price
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-xs font-semibold text-slate-600 mb-1">
                                      Discount %
                                    </div>
                                    <Input
                                      type="number"
                                      min="0"
                                      max={maxPct}
                                      value={String(it.discountPercent || 0)}
                                      onChange={(e) =>
                                        updateCart(it.productId, {
                                          discountPercent: Number(
                                            e.target.value || 0,
                                          ),
                                        })
                                      }
                                    />
                                    <div className="mt-1 text-[11px] text-slate-500">
                                      max {maxPct}%
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-xs font-semibold text-slate-600 mb-1">
                                      Discount amount
                                    </div>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={String(it.discountAmount || 0)}
                                      onChange={(e) =>
                                        updateCart(it.productId, {
                                          discountAmount: Number(
                                            e.target.value || 0,
                                          ),
                                        })
                                      }
                                    />
                                  </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between">
                                  <div className="text-xs text-slate-600">
                                    Line total
                                  </div>
                                  <div className="text-lg font-extrabold text-slate-900">
                                    {money(line)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <AsyncButton
                      type="submit"
                      variant="primary"
                      state={createSaleBtn}
                      text="Create draft sale"
                      loadingText="Creating…"
                      successText="Created"
                      disabled={saleCart.length === 0}
                    />

                    <div className="text-xs text-slate-600">
                      After you create the sale, store keeper must release stock
                      before you can mark paid/credit.
                    </div>
                  </form>
                </SectionCard>
              </div>
            ) : null}

            {/* SALES */}
            {section === "sales" ? (
              <SectionCard
                title="My sales"
                hint={
                  showAllSales
                    ? "Showing matches (up to 200). Clear search to see last 10."
                    : "Showing last 10 sales (most recent first)."
                }
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
                  <Input
                    placeholder="Search: id, credit, paid, customer name, phone"
                    value={salesQ}
                    onChange={(e) => setSalesQ(e.target.value)}
                  />

                  {salesLoading ? (
                    <div className="grid gap-3">
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  ) : salesToShow.length === 0 ? (
                    <div className="text-sm text-slate-600">
                      No sales found.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {salesToShow.map((s) => {
                        const id = s?.id;
                        const st = String(s?.status || "").toUpperCase();

                        const cname =
                          s?.customerName ?? s?.customer_name ?? "Walk-in";
                        const cphone =
                          s?.customerPhone ?? s?.customer_phone ?? "";
                        const customerLabel = [toStr(cname), toStr(cphone)]
                          .filter(Boolean)
                          .join(" • ");

                        const total =
                          Number(s?.totalAmount ?? s?.total ?? 0) || 0;

                        // listSales returns COALESCE(SUM(p.amount),0) as amountPaid
                        const amountPaid = Number(s?.amountPaid ?? 0) || 0;

                        const canFinalize =
                          st === "FULFILLED" || st === "PENDING";

                        const pm = salePayMethod[id] || "CASH";
                        const btnState = markBtnState[id] || "idle";

                        const createdAt = s?.createdAt || s?.created_at;

                        // Optional: if backend attaches credit, show its dates
                        const credit = s?.credit || null;
                        const issueDate = credit?.createdAt || null;
                        const payingDate = credit?.settledAt || null;
                        const creditAmount =
                          Number(credit?.amount ?? total) || total;

                        const remaining =
                          st === "PENDING"
                            ? Math.max(0, creditAmount - amountPaid)
                            : null;

                        const itemsPreview = Array.isArray(s?.itemsPreview)
                          ? s.itemsPreview
                          : null;

                        return (
                          <div
                            key={String(id)}
                            className="rounded-2xl border border-slate-200 bg-white p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="text-sm font-extrabold text-slate-900">
                                    Sale #{id ?? "—"}
                                  </div>
                                  <StatusBadge status={st} />
                                </div>

                                <div className="mt-2 text-sm text-slate-700">
                                  Customer:{" "}
                                  <b className="break-words">
                                    {customerLabel || "—"}
                                  </b>
                                </div>

                                <div className="mt-1 text-sm text-slate-700">
                                  Total: <b>{money(total)}</b> RWF
                                </div>

                                {itemsPreview?.length ? (
                                  <div className="mt-2 text-xs text-slate-600">
                                    <b>Items:</b>{" "}
                                    {itemsPreview.slice(0, 3).map((it, idx) => (
                                      <span key={idx}>
                                        {idx ? " • " : ""}
                                        {toStr(it?.productName) ||
                                          "Item"} × {Number(it?.qty ?? 0)}
                                      </span>
                                    ))}
                                    {itemsPreview.length > 3 ? " • …" : ""}
                                  </div>
                                ) : null}

                                <div className="mt-2 text-xs text-slate-500">
                                  Created: {safeDate(createdAt)}
                                </div>
                              </div>

                              <button
                                type="button"
                                className="shrink-0 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
                                onClick={() => openSaleItems(id)}
                              >
                                View items
                              </button>
                            </div>

                            {/* CREDIT summary */}
                            {st === "PENDING" ? (
                              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                                <div className="text-xs font-extrabold text-amber-900">
                                  Credit summary
                                </div>

                                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <div className="rounded-xl border border-amber-200 bg-white p-2">
                                    <div className="text-[11px] font-semibold text-amber-900/80">
                                      Issue date
                                    </div>
                                    <div className="text-xs font-extrabold text-amber-900">
                                      {issueDate ? safeDate(issueDate) : "—"}
                                    </div>
                                  </div>

                                  <div className="rounded-xl border border-amber-200 bg-white p-2">
                                    <div className="text-[11px] font-semibold text-amber-900/80">
                                      Paid / Total
                                    </div>
                                    <div className="text-xs font-extrabold text-amber-900">
                                      {money(amountPaid)} /{" "}
                                      {money(creditAmount)} RWF
                                    </div>
                                    <div className="mt-1 text-[11px] text-amber-900/80">
                                      Remaining: <b>{money(remaining)}</b> RWF
                                    </div>
                                  </div>

                                  <div className="rounded-xl border border-amber-200 bg-white p-2">
                                    <div className="text-[11px] font-semibold text-amber-900/80">
                                      Paid date
                                    </div>
                                    <div className="text-xs font-extrabold text-amber-900">
                                      {payingDate ? safeDate(payingDate) : "—"}
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-2 text-[11px] text-amber-900/80">
                                  Installments are not enabled yet because
                                  payments has a unique index per sale.
                                </div>
                              </div>
                            ) : null}

                            {/* ACTIONS */}
                            <div className="mt-3 pt-3 border-t border-slate-200">
                              {!canFinalize ? (
                                <div className="text-sm text-slate-600">
                                  {st === "DRAFT"
                                    ? "Waiting for store keeper to release stock."
                                    : "No action required."}
                                </div>
                              ) : (
                                <div className="grid gap-2">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                      <div className="text-xs font-semibold text-slate-600 mb-1">
                                        Payment method (for PAID)
                                      </div>
                                      <Select
                                        value={pm}
                                        onChange={(e) =>
                                          setSalePayMethod((prev) => ({
                                            ...prev,
                                            [id]: e.target.value,
                                          }))
                                        }
                                      >
                                        {PAYMENT_METHODS.map((m) => (
                                          <option key={m.value} value={m.value}>
                                            {m.label}
                                          </option>
                                        ))}
                                      </Select>
                                    </div>

                                    <div className="flex items-end gap-2">
                                      <AsyncButton
                                        variant="primary"
                                        size="md"
                                        state={btnState}
                                        text={
                                          st === "PENDING"
                                            ? "Record payment (mark PAID)"
                                            : "Mark PAID"
                                        }
                                        loadingText="Saving…"
                                        successText="Saved"
                                        onClick={() => markSalePaid(id, pm)}
                                      />
                                    </div>
                                  </div>

                                  {st === "FULFILLED" ? (
                                    <button
                                      type="button"
                                      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-extrabold text-amber-900 hover:bg-amber-100"
                                      onClick={() => openCreditModal(s)}
                                    >
                                      Mark CREDIT (customer will pay later)
                                    </button>
                                  ) : null}

                                  {st === "AWAITING_PAYMENT_RECORD" ? (
                                    <div className="text-xs text-slate-600">
                                      Waiting cashier to record payment. Sale
                                      will become PAID after cashier records it.
                                    </div>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!showAllSales ? (
                    <div className="text-xs text-slate-500">
                      Tip: type in the search box to find older sales.
                    </div>
                  ) : null}
                </div>
              </SectionCard>
            ) : null}

            {/* CREDITS */}
            {section === "credits" ? (
              <SectionCard
                title="Credits"
                hint="Credit history, issue date, payment date, and details."
              >
                <CreditsPanel
                  title="Credits (Seller)"
                  capabilities={{
                    canView: true,
                    canCreate: false,
                    canDecide: false,
                    canSettle: false,
                  }}
                />
              </SectionCard>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}
