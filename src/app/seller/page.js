// ✅ PASTE THIS WHOLE FILE INTO:
// frontend-staff/src/app/seller/page.js

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CreditsPanel from "../../components/CreditsPanel";
import RoleBar from "../../components/RoleBar";
import AsyncButton from "../../components/AsyncButton";
import { apiFetch } from "../../lib/api";
import { getMe } from "../../lib/auth";

/**
 * Backend contract:
 * POST /sales/:id/mark
 * body: { status: "PAID" | "PENDING", paymentMethod?: "CASH"|"MOMO"|"BANK" }
 *
 * UI rules:
 * - DISPLAY "PENDING" as "CREDIT"
 * - SEND "PENDING" to backend
 *
 * Dashboard rules:
 * - Today's sales/total/credit = based on createdAt
 * - Money received today by method = based on updatedAt (when seller marked paid)
 */

const ENDPOINTS = {
  PRODUCTS_LIST: "/products",
  SALES_LIST: "/sales",
  SALES_CREATE: "/sales",
  SALE_MARK: (id) => `/sales/${id}/mark`,
  CUSTOMERS_SEARCH: (q) => `/customers/search?q=${encodeURIComponent(q)}`,
  CUSTOMERS_CREATE: "/customers",
  CUSTOMER_HISTORY: (id) => `/customers/${id}/history`,
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
  if (name) return code ? `${name} (${code})` : name;
  if (id != null && id !== "") return `Location #${id}`;
  return "Location —";
}

/* ---------- UI atoms ---------- */

function Skeleton({ className = "" }) {
  return <div className={cx("animate-pulse rounded-xl bg-slate-200/70", className)} />;
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

function OverflowCard({ children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="relative">
        <div className="overflow-x-auto">{children}</div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent" />
      </div>
    </div>
  );
}

function MobileList({ items, renderItem, emptyText }) {
  if (!items?.length) return <div className="text-sm text-slate-600">{emptyText}</div>;
  return <div className="grid gap-3">{items.map(renderItem)}</div>;
}

/* ---------- Page ---------- */

export default function SellerPage() {
  const router = useRouter();

  const [bootLoading, setBootLoading] = useState(true);
  const [me, setMe] = useState(null);

  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info");

  const [section, setSection] = useState("dashboard");

  function toast(kind, text) {
    setMsgKind(kind);
    setMsg(text || "");
  }

  // ROLE GUARD + skeleton
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

  const isAuthorized = !!me && String(me?.role || "").toLowerCase() === "seller";

  // DATA
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [prodQ, setProdQ] = useState("");

  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesQ, setSalesQ] = useState("");

  // Create sale
  const [customerQ, setCustomerQ] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [customerLoading, setCustomerLoading] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState(null); // {id,name,phone}
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");

  const [saleDiscountPercent, setSaleDiscountPercent] = useState("");
  const [saleDiscountAmount, setSaleDiscountAmount] = useState("");

  const [saleCart, setSaleCart] = useState([]);

  // 3-state buttons
  const [createCustomerBtn, setCreateCustomerBtn] = useState("idle");
  const [createSaleBtn, setCreateSaleBtn] = useState("idle");
  const [markBtnState, setMarkBtnState] = useState({}); // { [saleId]: "idle"|"loading"|"success" }

  // history modal
  const [histOpen, setHistOpen] = useState(false);
  const [histLoading, setHistLoading] = useState(false);
  const [histRows, setHistRows] = useState([]);
  const [histTotals, setHistTotals] = useState(null);

  // per sale chosen method when marking paid
  const [salePayMethod, setSalePayMethod] = useState({}); // { [saleId]: "CASH" }

  // loaders
  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.PRODUCTS_LIST, { method: "GET" });
      const list = Array.isArray(data?.products) ? data.products : data?.items || data?.rows || [];
      setProducts(Array.isArray(list) ? list : []);
    } catch (e) {
      toast("danger", e?.data?.error || e?.message || "Cannot load products");
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const loadSales = useCallback(async () => {
    setSalesLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.SALES_LIST, { method: "GET" });
      const list = Array.isArray(data?.sales) ? data.sales : data?.items || data?.rows || [];
      setSales(Array.isArray(list) ? list : []);
    } catch (e) {
      toast("danger", e?.data?.error || e?.message || "Cannot load sales");
      setSales([]);
    } finally {
      setSalesLoading(false);
    }
  }, []);

  // search customers (debounced)
  const searchCustomers = useCallback(async (q) => {
    const qq = String(q || "").trim();
    if (!qq) {
      setCustomerResults([]);
      return;
    }
    setCustomerLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.CUSTOMERS_SEARCH(qq), { method: "GET" });
      setCustomerResults(Array.isArray(data?.customers) ? data.customers : []);
    } catch (e) {
      setCustomerResults([]);
      toast("danger", e?.data?.error || e?.message || "Customer search failed");
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

    loadProducts();

    if (section === "dashboard") loadSales();
    if (section === "sales") loadSales();
  }, [isAuthorized, section, loadProducts, loadSales]);

  /* ---------- Helpers ---------- */

  const filteredProducts = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    const q = String(prodQ || "").trim().toLowerCase();
    if (!q) return list;

    return list.filter((p) => {
      const name = String(p?.name ?? "").toLowerCase();
      const sku = String(p?.sku ?? "").toLowerCase();
      return name.includes(q) || sku.includes(q);
    });
  }, [products, prodQ]);

  const filteredSales = useMemo(() => {
    const list = Array.isArray(sales) ? sales : [];
    const q = String(salesQ || "").trim().toLowerCase();
    if (!q) return list;

    return list.filter((s) => {
      const id = String(s?.id ?? "");
      const st = String(s?.status ?? "");
      const statusReadable = st.toUpperCase() === "PENDING" ? "CREDIT" : st;

      const name = String(s?.customerName ?? s?.customer_name ?? "").toLowerCase();
      const phone = String(s?.customerPhone ?? s?.customer_phone ?? "").toLowerCase();
      const pm = String(getPaymentMethodFromSale(s) || "").toLowerCase();

      return (
        id.includes(q) ||
        String(statusReadable).toLowerCase().includes(q) ||
        name.includes(q) ||
        phone.includes(q) ||
        pm.includes(q)
      );
    });
  }, [sales, salesQ]);

  function productToCartItem(p) {
    const productId = Number(p?.id);
    const sellingPrice = Number(p?.sellingPrice ?? p?.selling_price ?? 0);
    const maxDiscountPercent = Number(p?.maxDiscountPercent ?? p?.max_discount_percent ?? 0);

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
    if (!productId) return toast("warn", "Missing product id.");

    if (saleCart.some((x) => Number(x.productId) === productId)) {
      return toast("warn", "Already added.");
    }

    setSaleCart((prev) => [...prev, productToCartItem(p)]);
    toast("success", "Added to cart.");
  }

  function updateSaleQty(productId, qtyStr) {
    const qty = Number(qtyStr);
    setSaleCart((prev) =>
      prev.map((it) => {
        if (Number(it.productId) !== Number(productId)) return it;
        const safe = Number.isFinite(qty) ? qty : it.qty;
        const clamped = Math.max(1, Math.floor(safe));
        return { ...it, qty: clamped };
      }),
    );
  }

  function updateSaleItem(productId, patch) {
    setSaleCart((prev) =>
      prev.map((it) => (Number(it.productId) === Number(productId) ? { ...it, ...patch } : it)),
    );
  }

  function removeFromSaleCart(productId) {
    setSaleCart((prev) => prev.filter((it) => Number(it.productId) !== Number(productId)));
  }

  function previewLineTotal(it) {
    const qty = Number(it.qty) || 0;
    const unitPrice = Number(it.unitPrice) || 0;
    const base = qty * unitPrice;

    const pct = Math.max(0, Math.min(100, Number(it.discountPercent) || 0));
    const pctDisc = Math.round((base * pct) / 100);

    const amtDisc = Math.max(0, Number(it.discountAmount) || 0);
    const disc = Math.min(base, pctDisc + amtDisc);

    return Math.max(0, base - disc);
  }

  function getPaymentMethodFromSale(s) {
    const raw = s?.paymentMethod ?? s?.payment_method ?? null;
    return raw ? String(raw).toUpperCase() : null;
  }

  function isSameLocalDay(a, b) {
    const da = new Date(a);
    const db = new Date(b);
    if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
    return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
  }

  function isToday(dateLike) {
    if (!dateLike) return false;
    return isSameLocalDay(dateLike, new Date());
  }

  const paidStatuses = useMemo(() => new Set(["AWAITING_PAYMENT_RECORD", "COMPLETED"]), []);

  const salesToday = useMemo(() => {
    const list = Array.isArray(sales) ? sales : [];
    return list.filter((s) => isToday(s?.createdAt || s?.created_at));
  }, [sales]);

  const todaySalesCount = useMemo(() => {
    return salesToday.filter((s) => String(s?.status || "").toUpperCase() !== "CANCELLED").length;
  }, [salesToday]);

  const todaySalesTotal = useMemo(() => {
    return salesToday.reduce((sum, s) => {
      const st = String(s?.status || "").toUpperCase();
      if (st === "CANCELLED") return sum;
      const v = Number(s?.totalAmount ?? s?.total ?? 0);
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);
  }, [salesToday]);

  const todayCreditTotal = useMemo(() => {
    return salesToday.reduce((sum, s) => {
      const st = String(s?.status || "").toUpperCase();
      if (st !== "PENDING") return sum;
      const v = Number(s?.totalAmount ?? s?.total ?? 0);
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);
  }, [salesToday]);

  const todayCreditCount = useMemo(() => {
    return salesToday.filter((s) => String(s?.status || "").toUpperCase() === "PENDING").length;
  }, [salesToday]);

  const paidLikeToday = useMemo(() => {
    const list = Array.isArray(sales) ? sales : [];
    return list.filter((s) => {
      const st = String(s?.status || "").toUpperCase();
      if (!paidStatuses.has(st)) return false;
      const paidMoment = s?.updatedAt || s?.updated_at || null;
      return isToday(paidMoment);
    });
  }, [sales, paidStatuses]);

  const todayMoneyPaidLike = useMemo(() => {
    return paidLikeToday.reduce((sum, s) => {
      const v = Number(s?.totalAmount ?? s?.total ?? 0);
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);
  }, [paidLikeToday]);

  const todayPaidCash = useMemo(() => sumByMethod(paidLikeToday, "CASH"), [paidLikeToday]);
  const todayPaidMoMo = useMemo(() => sumByMethod(paidLikeToday, "MOMO"), [paidLikeToday]);
  const todayPaidBank = useMemo(() => sumByMethod(paidLikeToday, "BANK"), [paidLikeToday]);
  const todayPaidUnknown = useMemo(() => {
    return paidLikeToday.reduce((sum, s) => {
      const pm = getPaymentMethodFromSale(s);
      if (pm === "CASH" || pm === "MOMO" || pm === "BANK") return sum;
      const v = Number(s?.totalAmount ?? s?.total ?? 0);
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);
  }, [paidLikeToday]);

  function sumByMethod(list, method) {
    return (list || []).reduce((sum, s) => {
      const pm = getPaymentMethodFromSale(s);
      if (pm !== method) return sum;
      const v = Number(s?.totalAmount ?? s?.total ?? 0);
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);
  }

  /* ---------- Actions ---------- */

  async function createCustomerFromInputs() {
    if (createCustomerBtn === "loading") return;
    setMsg("");

    const name = String(customerName || "").trim();
    const phone = String(customerPhone || "").trim();

    if (name.length < 2) return toast("warn", "Customer name is required.");
    if (phone.length < 6) return toast("warn", "Customer phone is required.");

    setCreateCustomerBtn("loading");
    try {
      const data = await apiFetch(ENDPOINTS.CUSTOMERS_CREATE, {
        method: "POST",
        body: { name, phone },
      });

      const c = data?.customer || null;
      if (!c?.id) {
        setCreateCustomerBtn("idle");
        return toast("danger", "Failed to create customer.");
      }

      setSelectedCustomer({ id: c.id, name: c.name, phone: c.phone });
      setCustomerQ(`${c.name || ""} ${c.phone || ""}`.trim());
      setCustomerResults([]);

      toast("success", "Customer created and selected.");
      setCreateCustomerBtn("success");
      setTimeout(() => setCreateCustomerBtn("idle"), 900);
    } catch (e) {
      setCreateCustomerBtn("idle");
      toast("danger", e?.data?.error || e?.message || "Customer create failed");
    }
  }

  async function openCustomerHistory(customerId) {
    const id = Number(customerId);
    if (!id) return toast("warn", "Select a customer first.");

    setHistOpen(true);
    setHistLoading(true);
    setHistRows([]);
    setHistTotals(null);

    try {
      const data = await apiFetch(ENDPOINTS.CUSTOMER_HISTORY(id), { method: "GET" });
      setHistRows(Array.isArray(data?.sales) ? data.sales : []);
      setHistTotals(data?.totals || null);
    } catch (e) {
      toast("danger", e?.data?.error || e?.message || "History load failed");
      setHistOpen(false);
    } finally {
      setHistLoading(false);
    }
  }

  async function createSale(e) {
    e.preventDefault();
    if (createSaleBtn === "loading") return;
    setMsg("");

    const typedName = String(customerName || "").trim();
    const typedPhone = String(customerPhone || "").trim();

    if (!selectedCustomer?.id) {
      if (!typedName || typedName.length < 2) return toast("warn", "Type customer name or pick from search.");
      if (!typedPhone || typedPhone.length < 6) return toast("warn", "Type customer phone or pick from search.");
    }

    if (saleCart.length === 0) return toast("warn", "Cart is empty. Add products.");

    const strictMax = saleCart.reduce((min, it) => {
      const v = Number(it.maxDiscountPercent ?? 0);
      return Math.min(min, Number.isFinite(v) ? v : 0);
    }, 100);

    const reqSaleDiscPct = Number(saleDiscountPercent ?? 0);
    const reqSaleDiscAmt = Number(saleDiscountAmount ?? 0);

    if (Number.isFinite(reqSaleDiscPct) && reqSaleDiscPct > strictMax) {
      return toast("warn", `Sale discount is too high. Max is ${strictMax}%.`);
    }

    for (const it of saleCart) {
      const itemPct = Number(it.discountPercent ?? 0);
      const maxPct = Number(it.maxDiscountPercent ?? 0);
      if (Number.isFinite(itemPct) && itemPct > maxPct) {
        return toast("warn", `Discount too high for ${it.productName}. Max is ${maxPct}%.`);
      }

      const unitPrice = Number(it.unitPrice ?? 0);
      const selling = Number(it.sellingPrice ?? 0);
      if (Number.isFinite(unitPrice) && Number.isFinite(selling) && unitPrice > selling) {
        return toast("warn", `Unit price cannot be above selling price for ${it.productName}.`);
      }
    }

    const payload = {
      customerId: selectedCustomer?.id ? Number(selectedCustomer.id) : undefined,
      customerName: typedName ? typedName : null,
      customerPhone: typedPhone ? typedPhone : null,
      note: note ? String(note).slice(0, 200) : null,
      discountPercent: reqSaleDiscPct || undefined,
      discountAmount: reqSaleDiscAmt > 0 ? reqSaleDiscAmt : undefined,
      items: saleCart.map((it) => {
        const out = { productId: Number(it.productId), qty: Number(it.qty) };
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
    try {
      const data = await apiFetch(ENDPOINTS.SALES_CREATE, { method: "POST", body: payload });
      const newSaleId = data?.sale?.id || data?.id || null;

      toast("success", newSaleId ? `Sale created (Draft) #${newSaleId}` : "Sale created (Draft)");

      // reset
      setSelectedCustomer(null);
      setCustomerQ("");
      setCustomerResults([]);
      setCustomerName("");
      setCustomerPhone("");
      setNote("");
      setSaleDiscountPercent("");
      setSaleDiscountAmount("");
      setSaleCart([]);

      setCreateSaleBtn("success");
      setTimeout(() => setCreateSaleBtn("idle"), 900);

      // go to sales
      setSection("sales");
      await loadSales();
    } catch (e2) {
      setCreateSaleBtn("idle");
      toast("danger", e2?.data?.error || e2?.message || "Sale create failed");
    }
  }

  async function markSale(saleId, newStatus, paymentMethod) {
    const sid = Number(saleId);
    if (!sid) return;

    setMarkBtnState((p) => ({ ...p, [sid]: "loading" }));
    try {
      const upper = String(newStatus || "").toUpperCase();
      const body = upper === "PAID" ? { status: "PAID", paymentMethod } : { status: "PENDING" };

      await apiFetch(ENDPOINTS.SALE_MARK(sid), { method: "POST", body });

      const uiLabel = upper === "PENDING" ? "CREDIT" : "PAID";
      const pm = upper === "PAID" ? ` (${paymentMethod || "-"})` : "";
      toast("success", `Sale #${sid} marked ${uiLabel}${pm}`);

      await loadSales();

      setMarkBtnState((p) => ({ ...p, [sid]: "success" }));
      setTimeout(() => setMarkBtnState((p) => ({ ...p, [sid]: "idle" })), 900);
    } catch (e) {
      setMarkBtnState((p) => ({ ...p, [sid]: "idle" }));
      const debug = e?.data?.debug ? ` (${JSON.stringify(e.data.debug)})` : "";
      toast("danger", (e?.data?.error || e?.message || "Mark failed") + debug);
    }
  }

  /* ---------- Render ---------- */

  if (bootLoading) return <PageSkeleton />;
  if (!isAuthorized) return <div className="p-6 text-sm text-slate-600">Redirecting…</div>;

  const subtitle = `User: ${me?.email || "—"} • ${locationLabel(me)}`;

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      <RoleBar title="Seller" subtitle={subtitle} user={me} />

      <div className="mx-auto max-w-7xl px-4 sm:px-5 py-6">
        {msg ? (
          <div className="mb-4">
            <Banner kind={msgKind}>{msg}</Banner>
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
          {/* Sidebar */}
          <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 h-fit">
            <div className="text-sm font-semibold text-slate-900">Seller</div>
            <div className="mt-1 text-xs text-slate-600">{locationLabel(me)}</div>

            {/* Mobile section picker */}
            <div className="mt-4 lg:hidden">
              <div className="text-xs font-semibold text-slate-600 mb-2">Section</div>
              <Select value={section} onChange={(e) => setSection(e.target.value)}>
                {SECTIONS.map((s) => (
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
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-600">
              Flow: Draft → Store Keeper fulfill → you mark Paid or Credit.
            </div>
          </aside>

          {/* Main */}
          <main className="grid gap-4">
            {/* ✅ DASHBOARD (KPI cards are ONLY here now, like cashier) */}
            {section === "dashboard" ? (
              <div className="grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <Card label="Today sales" value={salesLoading ? "…" : String(todaySalesCount)} sub="Created today" />
                  <Card label="Today total" value={salesLoading ? "…" : money(todaySalesTotal)} sub="RWF" />
                  <Card
                    label="Today credit"
                    value={salesLoading ? "…" : money(todayCreditTotal)}
                    sub={`RWF • Count: ${salesLoading ? "…" : todayCreditCount}`}
                  />
                  <Card label="Money received today" value={salesLoading ? "…" : money(todayMoneyPaidLike)} sub="Marked paid today" />
                </div>

                <SectionCard
                  title="Paid today by method"
                  hint="This uses updated time (when you mark paid)."
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <Card label="Cash" value={salesLoading ? "…" : money(todayPaidCash)} sub="RWF" />
                    <Card label="MoMo" value={salesLoading ? "…" : money(todayPaidMoMo)} sub="RWF" />
                    <Card label="Bank" value={salesLoading ? "…" : money(todayPaidBank)} sub="RWF" />
                    <Card label="No method" value={salesLoading ? "…" : money(todayPaidUnknown)} sub="RWF" />
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSection("create")}
                      className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
                    >
                      <div className="text-sm font-semibold text-slate-900">Create sale</div>
                      <div className="mt-1 text-xs text-slate-600">Make a draft sale.</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSection("sales")}
                      className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
                    >
                      <div className="text-sm font-semibold text-slate-900">My sales</div>
                      <div className="mt-1 text-xs text-slate-600">Mark paid or credit.</div>
                    </button>
                  </div>
                </SectionCard>
              </div>
            ) : null}

            {/* CREATE */}
            {section === "create" ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
                    <Input placeholder="Search by name or SKU" value={prodQ} onChange={(e) => setProdQ(e.target.value)} />

                    <div className="block xl:hidden">
                      {productsLoading ? (
                        <div className="grid gap-3">
                          <Skeleton className="h-24 w-full" />
                          <Skeleton className="h-24 w-full" />
                          <Skeleton className="h-24 w-full" />
                        </div>
                      ) : (
                        <MobileList
                          items={filteredProducts.slice(0, 80)}
                          emptyText="No products."
                          renderItem={(p) => {
                            const selling = Number(p?.sellingPrice ?? p?.selling_price ?? 0) || 0;
                            const maxp = Number(p?.maxDiscountPercent ?? p?.max_discount_percent ?? 0) || 0;
                            return (
                              <div key={p?.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-sm font-bold text-slate-900">{p?.name || "—"}</div>
                                    <div className="mt-1 text-xs text-slate-600">SKU: {p?.sku || "—"}</div>
                                    <div className="mt-2 text-xs text-slate-600">
                                      Selling: <b>{money(selling)}</b> • Max discount: <b>{maxp}%</b>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                                    onClick={() => addProductToSaleCart(p)}
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>
                            );
                          }}
                        />
                      )}
                    </div>

                    <div className="hidden xl:block">
                      {productsLoading ? (
                        <div className="grid gap-3">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-12 w-full" />
                          <Skeleton className="h-12 w-full" />
                        </div>
                      ) : (
                        <OverflowCard>
                          <table className="min-w-[860px] w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                              <tr className="border-b border-slate-200">
                                <th className="p-3 text-left text-xs font-semibold">Product</th>
                                <th className="p-3 text-left text-xs font-semibold">SKU</th>
                                <th className="p-3 text-right text-xs font-semibold">Selling</th>
                                <th className="p-3 text-right text-xs font-semibold">Max %</th>
                                <th className="p-3 text-right text-xs font-semibold">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredProducts.map((p, idx) => {
                                const selling = Number(p?.sellingPrice ?? p?.selling_price ?? 0) || 0;
                                const maxp = Number(p?.maxDiscountPercent ?? p?.max_discount_percent ?? 0) || 0;

                                return (
                                  <tr key={p?.id || idx} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="p-3 font-semibold text-slate-900">{p?.name || "—"}</td>
                                    <td className="p-3 text-slate-600">{p?.sku || "—"}</td>
                                    <td className="p-3 text-right font-semibold">{money(selling)}</td>
                                    <td className="p-3 text-right">{maxp}%</td>
                                    <td className="p-3 text-right">
                                      <button
                                        type="button"
                                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                                        onClick={() => addProductToSaleCart(p)}
                                      >
                                        Add
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                              {filteredProducts.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="p-4 text-sm text-slate-600">
                                    No products.
                                  </td>
                                </tr>
                              ) : null}
                            </tbody>
                          </table>
                        </OverflowCard>
                      )}
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Create sale (Draft)" hint="Pick customer and items, then create draft.">
                  <div className="grid gap-3">
                    <div className="text-sm font-semibold text-slate-900">Customer</div>

                    <Input
                      placeholder="Search customer (name or phone)"
                      value={customerQ}
                      onChange={(e) => setCustomerQ(e.target.value)}
                    />

                    {customerQ.trim() && !selectedCustomer ? (
                      <div className="rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="max-h-56 overflow-auto">
                          {customerLoading ? (
                            <div className="p-3 text-sm text-slate-600">Searching…</div>
                          ) : customerResults.length ? (
                            customerResults.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                className="w-full text-left p-3 hover:bg-slate-50 border-b last:border-b-0"
                                onClick={() => {
                                  setSelectedCustomer(c);
                                  setCustomerName(c.name || "");
                                  setCustomerPhone(c.phone || "");
                                  setCustomerQ(`${c.name || ""} ${c.phone || ""}`.trim());
                                  setCustomerResults([]);
                                }}
                              >
                                <div className="text-sm font-semibold text-slate-900">{c.name || "—"}</div>
                                <div className="text-xs text-slate-600">{c.phone || "—"}</div>
                              </button>
                            ))
                          ) : (
                            <div className="p-3 text-sm text-slate-600">
                              No customer found. Type name + phone below and create.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        placeholder="Customer name"
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          setSelectedCustomer(null);
                        }}
                      />
                      <Input
                        placeholder="Customer phone"
                        value={customerPhone}
                        onChange={(e) => {
                          setCustomerPhone(e.target.value);
                          setSelectedCustomer(null);
                        }}
                      />
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <AsyncButton
                        variant="primary"
                        state={createCustomerBtn}
                        text="Create"
                        loadingText="Creating…"
                        successText="Created"
                        onClick={createCustomerFromInputs}
                        disabled={!customerName.trim() || !customerPhone.trim()}
                      />

                      <button
                        type="button"
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        disabled={!selectedCustomer?.id}
                        onClick={() => openCustomerHistory(selectedCustomer?.id)}
                      >
                        View history
                      </button>

                      <button
                        type="button"
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => {
                          setSelectedCustomer(null);
                          setCustomerQ("");
                          setCustomerResults([]);
                          setCustomerName("");
                          setCustomerPhone("");
                          toast("info", "");
                        }}
                      >
                        Clear
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        placeholder="Sale discount % (optional)"
                        value={saleDiscountPercent}
                        onChange={(e) => setSaleDiscountPercent(e.target.value)}
                      />
                      <Input
                        placeholder="Sale discount amount (optional)"
                        value={saleDiscountAmount}
                        onChange={(e) => setSaleDiscountAmount(e.target.value)}
                      />
                    </div>

                    <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />

                    <div className="mt-2">
                      <div className="text-sm font-semibold text-slate-900">Cart</div>
                      <div className="mt-2">
                        <OverflowCard>
                          <table className="min-w-[980px] w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                              <tr className="border-b border-slate-200">
                                <th className="p-3 text-left text-xs font-semibold">Product</th>
                                <th className="p-3 text-left text-xs font-semibold">SKU</th>
                                <th className="p-3 text-right text-xs font-semibold">Qty</th>
                                <th className="p-3 text-right text-xs font-semibold">Selling</th>
                                <th className="p-3 text-right text-xs font-semibold">Unit</th>
                                <th className="p-3 text-right text-xs font-semibold">Disc %</th>
                                <th className="p-3 text-right text-xs font-semibold">Disc amt</th>
                                <th className="p-3 text-right text-xs font-semibold">Line</th>
                                <th className="p-3 text-right text-xs font-semibold">Remove</th>
                              </tr>
                            </thead>
                            <tbody>
                              {saleCart.map((it) => (
                                <tr key={it.productId} className="border-b border-slate-100">
                                  <td className="p-3 font-semibold text-slate-900">{it.productName}</td>
                                  <td className="p-3 text-slate-600">{it.sku}</td>

                                  <td className="p-3 text-right">
                                    <input
                                      type="number"
                                      min="1"
                                      value={it.qty}
                                      onChange={(e) => updateSaleQty(it.productId, e.target.value)}
                                      className="w-20 rounded-xl border border-slate-300 px-2 py-1 text-right text-sm"
                                    />
                                  </td>

                                  <td className="p-3 text-right">{money(it.sellingPrice)}</td>

                                  <td className="p-3 text-right">
                                    <input
                                      type="number"
                                      min="0"
                                      max={it.sellingPrice || undefined}
                                      value={it.unitPrice}
                                      onChange={(e) =>
                                        updateSaleItem(it.productId, { unitPrice: Number(e.target.value || 0) })
                                      }
                                      className="w-24 rounded-xl border border-slate-300 px-2 py-1 text-right text-sm"
                                    />
                                  </td>

                                  <td className="p-3 text-right">
                                    <input
                                      type="number"
                                      min="0"
                                      max={it.maxDiscountPercent ?? 0}
                                      value={it.discountPercent}
                                      onChange={(e) =>
                                        updateSaleItem(it.productId, { discountPercent: Number(e.target.value || 0) })
                                      }
                                      className="w-20 rounded-xl border border-slate-300 px-2 py-1 text-right text-sm"
                                    />
                                    <div className="mt-1 text-[10px] text-slate-500">max {it.maxDiscountPercent}%</div>
                                  </td>

                                  <td className="p-3 text-right">
                                    <input
                                      type="number"
                                      min="0"
                                      value={it.discountAmount}
                                      onChange={(e) =>
                                        updateSaleItem(it.productId, { discountAmount: Number(e.target.value || 0) })
                                      }
                                      className="w-24 rounded-xl border border-slate-300 px-2 py-1 text-right text-sm"
                                    />
                                  </td>

                                  <td className="p-3 text-right font-bold">{money(previewLineTotal(it))}</td>

                                  <td className="p-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => removeFromSaleCart(it.productId)}
                                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              ))}

                              {saleCart.length === 0 ? (
                                <tr>
                                  <td colSpan={9} className="p-4 text-sm text-slate-600">
                                    Cart is empty. Add products from left.
                                  </td>
                                </tr>
                              ) : null}
                            </tbody>
                          </table>
                        </OverflowCard>
                      </div>
                    </div>

                    <form onSubmit={createSale} className="mt-2">
                      <AsyncButton
                        type="submit"
                        variant="primary"
                        state={createSaleBtn}
                        text="Create"
                        loadingText="Creating…"
                        successText="Created"
                        disabled={saleCart.length === 0}
                      />
                    </form>
                  </div>
                </SectionCard>
              </div>
            ) : null}

            {/* SALES */}
            {section === "sales" ? (
              <SectionCard
                title="My sales"
                hint="When fulfilled: mark Paid or Credit."
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
                    placeholder="Search: id, credit, momo, name, phone"
                    value={salesQ}
                    onChange={(e) => setSalesQ(e.target.value)}
                  />

                  <div className="hidden xl:block">
                    {salesLoading ? (
                      <div className="grid gap-3">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : (
                      <OverflowCard>
                        <table className="min-w-[1100px] w-full text-sm">
                          <thead className="bg-slate-50 text-slate-600">
                            <tr className="border-b border-slate-200">
                              <th className="p-3 text-left text-xs font-semibold">ID</th>
                              <th className="p-3 text-left text-xs font-semibold">Status</th>
                              <th className="p-3 text-left text-xs font-semibold">Total</th>
                              <th className="p-3 text-left text-xs font-semibold">Customer</th>
                              <th className="p-3 text-left text-xs font-semibold">Created</th>
                              <th className="p-3 text-right text-xs font-semibold">Finalize</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredSales.map((s) => {
                              const st = String(s?.status || "").toUpperCase();
                              const statusUi = st === "PENDING" ? "CREDIT" : st;

                              const cname = s?.customerName ?? s?.customer_name ?? "—";
                              const cphone = s?.customerPhone ?? s?.customer_phone ?? "";

                              const total = Number(s?.totalAmount ?? s?.total ?? 0) || 0;
                              const canFinalize = st === "FULFILLED" || st === "PENDING";
                              const selectedMethod = salePayMethod[s.id] || "CASH";
                              const btnState = markBtnState[s.id] || "idle";

                              return (
                                <tr key={s?.id} className="border-b border-slate-100 hover:bg-slate-50">
                                  <td className="p-3 font-semibold text-slate-900">#{s?.id}</td>
                                  <td className="p-3">{statusUi}</td>
                                  <td className="p-3 font-semibold">{money(total)}</td>
                                  <td className="p-3">
                                    <div className="font-semibold text-slate-900">{cname}</div>
                                    <div className="text-xs text-slate-600">{cphone}</div>
                                  </td>
                                  <td className="p-3">{safeDate(s?.createdAt || s?.created_at)}</td>
                                  <td className="p-3 text-right">
                                    {!canFinalize ? (
                                      <span className="text-xs text-slate-600">{statusHint(st)}</span>
                                    ) : (
                                      <div className="flex items-center justify-end gap-2">
                                        <Select
                                          className="w-28"
                                          value={selectedMethod}
                                          onChange={(e) =>
                                            setSalePayMethod((prev) => ({ ...prev, [s.id]: e.target.value }))
                                          }
                                        >
                                          {PAYMENT_METHODS.map((m) => (
                                            <option key={m.value} value={m.value}>
                                              {m.label}
                                            </option>
                                          ))}
                                        </Select>

                                        <Select
                                          className="w-44"
                                          defaultValue=""
                                          onChange={(e) => {
                                            const newStatus = e.target.value;
                                            if (!newStatus) return;

                                            const upper = String(newStatus).toUpperCase();
                                            const pmToSend = upper === "PAID" ? selectedMethod : undefined;

                                            markSale(s.id, newStatus, pmToSend);
                                            e.target.value = "";
                                          }}
                                        >
                                          <option value="">{st === "FULFILLED" ? "Finalize…" : "Mark paid…"}</option>
                                          {st === "FULFILLED" ? (
                                            <>
                                              <option value="PAID">PAID</option>
                                              <option value="PENDING">CREDIT</option>
                                            </>
                                          ) : (
                                            <option value="PAID">PAID</option>
                                          )}
                                        </Select>

                                        <AsyncButton
                                          variant="secondary"
                                          size="sm"
                                          state={btnState}
                                          text="Save"
                                          loadingText="Saving…"
                                          successText="Saved"
                                          onClick={() => toast("info", "Use the dropdown to finalize.")}
                                        />
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}

                            {filteredSales.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="p-4 text-sm text-slate-600">
                                  No sales found.
                                </td>
                              </tr>
                            ) : null}
                          </tbody>
                        </table>
                      </OverflowCard>
                    )}
                  </div>

                  {/* Mobile list */}
                  <div className="block xl:hidden">
                    {salesLoading ? (
                      <div className="grid gap-3">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                      </div>
                    ) : (
                      <MobileList
                        items={filteredSales}
                        emptyText="No sales found."
                        renderItem={(s) => {
                          const st = String(s?.status || "").toUpperCase();
                          const statusUi = st === "PENDING" ? "CREDIT" : st;

                          const cname = s?.customerName ?? s?.customer_name ?? "—";
                          const cphone = s?.customerPhone ?? s?.customer_phone ?? "";
                          const total = Number(s?.totalAmount ?? s?.total ?? 0) || 0;

                          const canFinalize = st === "FULFILLED" || st === "PENDING";
                          const selectedMethod = salePayMethod[s.id] || "CASH";
                          const btnState = markBtnState[s.id] || "idle";

                          return (
                            <div key={s?.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="text-sm font-bold text-slate-900">Sale #{s?.id}</div>
                              <div className="mt-1 text-xs text-slate-600">
                                {cname}{cphone ? ` • ${cphone}` : ""}
                              </div>
                              <div className="mt-2 text-xs text-slate-600">
                                Status: <b>{statusUi}</b> • Total: <b>{money(total)}</b>
                              </div>
                              <div className="mt-2 text-xs text-slate-500">Created: {safeDate(s?.createdAt || s?.created_at)}</div>

                              {!canFinalize ? (
                                <div className="mt-3 text-xs text-slate-600">{statusHint(st)}</div>
                              ) : (
                                <div className="mt-3 grid gap-2">
                                  <Select
                                    value={selectedMethod}
                                    onChange={(e) => setSalePayMethod((prev) => ({ ...prev, [s.id]: e.target.value }))}
                                  >
                                    {PAYMENT_METHODS.map((m) => (
                                      <option key={m.value} value={m.value}>
                                        {m.label}
                                      </option>
                                    ))}
                                  </Select>

                                  <Select
                                    defaultValue=""
                                    onChange={(e) => {
                                      const newStatus = e.target.value;
                                      if (!newStatus) return;

                                      const upper = String(newStatus).toUpperCase();
                                      const pmToSend = upper === "PAID" ? selectedMethod : undefined;

                                      markSale(s.id, newStatus, pmToSend);
                                      e.target.value = "";
                                    }}
                                  >
                                    <option value="">{st === "FULFILLED" ? "Finalize…" : "Mark paid…"}</option>
                                    {st === "FULFILLED" ? (
                                      <>
                                        <option value="PAID">PAID</option>
                                        <option value="PENDING">CREDIT</option>
                                      </>
                                    ) : (
                                      <option value="PAID">PAID</option>
                                    )}
                                  </Select>

                                  <AsyncButton
                                    variant="secondary"
                                    state={btnState}
                                    text="Save"
                                    loadingText="Saving…"
                                    successText="Saved"
                                    onClick={() => toast("info", "Use the dropdown to finalize.")}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        }}
                      />
                    )}
                  </div>
                </div>
              </SectionCard>
            ) : null}

            {/* CREDITS */}
            {section === "credits" ? (
              <SectionCard title="Credits (Seller)" hint="View your credit sales and status.">
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

      {/* Customer history modal */}
      {histOpen ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-3xl rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">Customer history</div>
                <div className="text-xs text-slate-600 truncate">
                  {selectedCustomer?.name || "—"} • {selectedCustomer?.phone || "—"}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setHistOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="p-4">
              {histLoading ? (
                <div className="grid gap-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : (
                <>
                  {histTotals ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                      <Card label="Total purchases" value={money(histTotals.totalAmount || 0)} sub="RWF" />
                      <Card label="Total paid" value={money(histTotals.totalPaid || 0)} sub="RWF" />
                      <Card label="Open credit" value={money(histTotals.openCredit || 0)} sub="RWF" />
                    </div>
                  ) : null}

                  <OverflowCard>
                    <table className="min-w-[780px] w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr className="border-b border-slate-200">
                          <th className="p-3 text-left text-xs font-semibold">Sale</th>
                          <th className="p-3 text-left text-xs font-semibold">Status</th>
                          <th className="p-3 text-right text-xs font-semibold">Total</th>
                          <th className="p-3 text-left text-xs font-semibold">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {histRows.map((r) => (
                          <tr key={r?.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-3 font-semibold text-slate-900">#{r?.id}</td>
                            <td className="p-3">{String(r?.status || "—")}</td>
                            <td className="p-3 text-right font-bold">{money(r?.totalAmount || 0)}</td>
                            <td className="p-3">{safeDate(r?.createdAt || r?.created_at)}</td>
                          </tr>
                        ))}

                        {histRows.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-4 text-sm text-slate-600">
                              No history found.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </OverflowCard>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function statusHint(status) {
  if (status === "DRAFT") return "Waiting store keeper";
  if (status === "AWAITING_PAYMENT_RECORD") return "Waiting cashier record";
  if (status === "COMPLETED") return "Completed";
  if (status === "CANCELLED") return "Cancelled";
  return "No action";
}