"use client";

import {
  ENDPOINTS,
  NOTIFY_POLL_MS,
  SECTIONS,
  SELLER_PAYMENT_METHODS,
} from "../../components/staff/seller/seller-constants";
import {
  PageSkeleton,
  SectionCard,
} from "../../components/staff/seller/seller-ui";
import {
  isToday,
  locationLabel,
  toInt,
  toStr,
} from "../../components/staff/seller/seller-utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import RoleBar from "../../components/RoleBar";
import SellerCreateSection from "../../components/staff/seller/SellerCreateSection";
import SellerCreditSetupModal from "../../components/staff/seller/SellerCreditSetupModal";
import SellerCreditsSection from "../../components/staff/seller/SellerCreditsSection";
import SellerDashboardSection from "../../components/staff/seller/SellerDashboardSection";
import SellerDeliveryNoteModal from "../../components/staff/seller/SellerDeliveryNoteModal";
import SellerInvoiceModal from "../../components/staff/seller/SellerInvoiceModal";
import SellerItemsModal from "../../components/staff/seller/SellerItemsModal";
import SellerProformaModal from "../../components/staff/seller/SellerProformaModal";
import SellerSalesSection from "../../components/staff/seller/SellerSalesSection";
import ToastStack from "../../components/ToastStack";
import { apiFetch } from "../../lib/api";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

function canUseWindow() {
  return typeof window !== "undefined";
}

function playAlertBeep({
  frequency = 880,
  duration = 180,
  volume = 0.05,
} = {}) {
  if (!canUseWindow()) return;

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gainNode.gain.value = volume;

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();

    window.setTimeout(
      () => {
        try {
          oscillator.stop();
          ctx.close?.();
        } catch {}
      },
      Math.max(100, Number(duration) || 180),
    );
  } catch {}
}

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getAvailableQty(productOrItem) {
  return (
    Number(
      productOrItem?.qtyOnHand ??
        productOrItem?.qty_on_hand ??
        productOrItem?.stockAvailable ??
        productOrItem?.stock_available ??
        0,
    ) || 0
  );
}

function isInventoryTracked(productOrItem) {
  return Boolean(
    productOrItem?.trackInventory ?? productOrItem?.track_inventory ?? true,
  );
}

function toIsoEndOfDay(dateValue) {
  const raw = String(dateValue || "").trim();
  if (!raw) return undefined;

  const d = new Date(`${raw}T23:59:59.999`);
  if (Number.isNaN(d.getTime())) return undefined;

  return d.toISOString();
}

function TopSectionSwitcher({
  title,
  me,
  section,
  setSection,
  sections,
  draftCount,
  creditCount,
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-lg font-black text-[var(--app-fg)]">
              {title}
            </div>
            <div className="mt-1 text-sm app-muted">{locationLabel(me)}</div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-3 text-sm app-muted">
            <span className="font-semibold text-[var(--app-fg)]">
              Seller rule:
            </span>{" "}
            Create sales, generate customer documents, follow releases, then
            finalize payment or submit credit request.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {sections.map((s) => {
            const active = section === s.key;
            const badge =
              s.key === "dashboard"
                ? draftCount > 0
                  ? draftCount
                  : 0
                : s.key === "credits"
                  ? creditCount > 0
                    ? creditCount
                    : 0
                  : 0;

            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSection(s.key)}
                className={cx(
                  "app-focus inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition",
                  active
                    ? "border-[var(--app-fg)] bg-[var(--app-fg)] text-[var(--app-bg)] shadow-sm"
                    : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)] hover:bg-[var(--hover)]",
                )}
              >
                <span>{s.label}</span>

                {badge > 0 ? (
                  <span
                    className={cx(
                      "inline-flex min-w-[22px] items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-extrabold",
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

export default function SellerPage() {
  const router = useRouter();

  const [toasts, setToasts] = useState([]);
  const toastTimerRef = useRef(new Map());
  const userInteractedRef = useRef(false);

  function pushToast(kind, message, opts = {}) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const nextToast = {
      id,
      kind: kind || "info",
      message: message || "",
      title: opts.title || "",
      urgent: !!opts.urgent,
    };

    setToasts((prev) =>
      [nextToast, ...(Array.isArray(prev) ? prev : [])].slice(0, 4),
    );

    const ttl = nextToast.urgent ? 8000 : 6000;

    const tm = setTimeout(() => {
      setToasts((prev) =>
        (Array.isArray(prev) ? prev : []).filter((x) => x.id !== id),
      );
      toastTimerRef.current.delete(id);
    }, ttl);

    toastTimerRef.current.set(id, tm);
  }

  function notifySeller(kind, message, opts = {}) {
    pushToast(kind, message, opts);

    if (userInteractedRef.current) {
      playAlertBeep({
        frequency: opts.frequency || (opts.urgent ? 1040 : 880),
        duration: opts.duration || (opts.urgent ? 240 : 180),
        volume: opts.volume || 0.05,
      });
    }
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

  useEffect(() => {
    function markInteracted() {
      userInteractedRef.current = true;
      window.removeEventListener("pointerdown", markInteracted);
      window.removeEventListener("keydown", markInteracted);
    }

    if (!canUseWindow()) return;

    window.addEventListener("pointerdown", markInteracted);
    window.addEventListener("keydown", markInteracted);

    return () => {
      window.removeEventListener("pointerdown", markInteracted);
      window.removeEventListener("keydown", markInteracted);
    };
  }, []);

  const [bootLoading, setBootLoading] = useState(true);
  const [me, setMe] = useState(null);

  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info");

  const [section, setSection] = useState("dashboard");

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [prodQ, setProdQ] = useState("");

  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesQ, setSalesQ] = useState("");

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

  const [itemsOpen, setItemsOpen] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsSale, setItemsSale] = useState(null);

  const [creditOpen, setCreditOpen] = useState(false);
  const [creditSale, setCreditSale] = useState(null);
  const [creditSaving, setCreditSaving] = useState(false);

  const [proformaOpen, setProformaOpen] = useState(false);
  const [deliveryNoteOpen, setDeliveryNoteOpen] = useState(false);
  const [documentSale, setDocumentSale] = useState(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const lastStatusByIdRef = useRef(new Map());
  const firstSalesLoadRef = useRef(true);
  const salesPollInFlightRef = useRef(false);

  function banner(kind, text) {
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

        const allowed = new Set(["seller", "admin"]);
        if (!allowed.has(role)) {
          const map = {
            store_keeper: "/store-keeper",
            cashier: "/cashier",
            manager: "/manager",
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

  const roleLower = String(me?.role || "").toLowerCase();
  const isAuthorized =
    !!me && (roleLower === "seller" || roleLower === "admin");

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

  const applySalesNotifications = useCallback((nextList) => {
    const prev = lastStatusByIdRef.current;
    const nextMap = new Map();

    for (const s of Array.isArray(nextList) ? nextList : []) {
      const id = Number(s?.id);
      if (!Number.isFinite(id) || id <= 0) continue;

      const nextSt = String(s?.status || "").toUpperCase();
      nextMap.set(id, nextSt);

      if (firstSalesLoadRef.current) continue;

      const prevSt = String(prev.get(id) || "").toUpperCase();
      if (!prevSt || prevSt === nextSt) continue;

      if (prevSt === "DRAFT" && nextSt === "FULFILLED") {
        notifySeller(
          "success",
          `Store keeper released stock for Sale #${id}. You can now mark paid or request credit.`,
          {
            title: "Sale released",
            urgent: true,
            frequency: 980,
            duration: 220,
          },
        );
      }

      if (nextSt === "COMPLETED" && prevSt !== "COMPLETED") {
        notifySeller(
          "success",
          `Cashier recorded payment for Sale #${id}. Sale is now paid.`,
          {
            title: "Payment completed",
            urgent: true,
            frequency: 1180,
            duration: 260,
          },
        );
      }
    }

    lastStatusByIdRef.current = nextMap;
    firstSalesLoadRef.current = false;
  }, []);

  const loadSales = useCallback(async () => {
    setSalesLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.SALES_LIST, { method: "GET" });
      const list = Array.isArray(data?.sales)
        ? data.sales
        : data?.items || data?.rows || [];
      const clean = Array.isArray(list) ? list : [];
      setSales(clean);
      applySalesNotifications(clean);
    } catch (e) {
      banner("danger", e?.data?.error || e?.message || "Cannot load sales");
      setSales([]);
    } finally {
      setSalesLoading(false);
    }
  }, [applySalesNotifications]);

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
      const rows = Array.isArray(data?.customers)
        ? data.customers
        : data?.items || data?.rows || [];
      setCustomerResults(Array.isArray(rows) ? rows : []);
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

  useEffect(() => {
    if (!isAuthorized) return;
    if (section === "create") loadProducts();
    if (section === "dashboard" || section === "sales") loadSales();
  }, [isAuthorized, section, loadProducts, loadSales]);

  useEffect(() => {
    if (!isAuthorized) return;
    const watching = section === "dashboard" || section === "sales";
    if (!watching) return;

    let alive = true;

    const tick = async () => {
      if (!alive) return;
      if (salesPollInFlightRef.current) return;
      salesPollInFlightRef.current = true;

      try {
        const data = await apiFetch(ENDPOINTS.SALES_LIST, { method: "GET" });
        const list = Array.isArray(data?.sales)
          ? data.sales
          : data?.items || data?.rows || [];
        const clean = Array.isArray(list) ? list : [];
        setSales(clean);
        applySalesNotifications(clean);
      } catch {
      } finally {
        salesPollInFlightRef.current = false;
      }
    };

    const t = setInterval(tick, NOTIFY_POLL_MS);

    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [isAuthorized, section, applySalesNotifications]);

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
    return list.filter((s) => {
      const st = String(s?.status || "").toUpperCase();
      return ["PENDING", "APPROVED", "PARTIALLY_PAID"].includes(st);
    }).length;
  }, [sales]);

  function productToCartItem(p) {
    const productId = Number(p?.id);
    const sellingPrice = Number(p?.sellingPrice ?? p?.selling_price ?? 0);
    const maxDiscountPercent = Number(
      p?.maxDiscountPercent ?? p?.max_discount_percent ?? 0,
    );
    const qtyOnHand = getAvailableQty(p);
    const trackInventory = isInventoryTracked(p);

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
      qtyOnHand,
      trackInventory,
    };
  }

  function addProductToSaleCart(product) {
    const productId = Number(product?.id);
    if (!Number.isFinite(productId)) return;

    const qtyOnHand = getAvailableQty(product);
    const trackInventory = isInventoryTracked(product);

    if (trackInventory && qtyOnHand <= 0) {
      pushToast("warn", `${product?.name || "Product"} is out of stock.`);
      return;
    }

    setSaleCart((prev) => {
      const exists = prev.find((x) => Number(x.productId) === productId);

      if (exists) {
        const nextQty = Number(exists.qty ?? 0) + 1;

        if (trackInventory && nextQty > qtyOnHand) {
          pushToast(
            "warn",
            `${product?.name || "Product"} has only ${qtyOnHand} item(s) in stock.`,
          );
          return prev;
        }

        return prev.map((x) =>
          Number(x.productId) === productId
            ? {
                ...x,
                qty: nextQty,
                qtyOnHand,
                trackInventory,
              }
            : x,
        );
      }

      return [...prev, productToCartItem(product)];
    });
  }

  function updateCart(productId, patch) {
    setSaleCart((prev) =>
      prev.map((it) => {
        if (Number(it.productId) !== Number(productId)) return it;

        const next = { ...it, ...patch };
        const qtyOnHand = getAvailableQty(next);
        const trackInventory = isInventoryTracked(next);

        let qty = Number(next.qty ?? 1) || 1;
        if (qty < 1) qty = 1;

        if (trackInventory && qtyOnHand > 0 && qty > qtyOnHand) {
          qty = qtyOnHand;
        }

        return {
          ...next,
          qty,
          qtyOnHand,
          trackInventory,
        };
      }),
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

  async function createCustomerFromInputs() {
    if (createCustomerBtn === "loading") return;

    const name = toStr(customerName);
    const phone = toStr(customerPhone);
    const tin = toStr(customerTin);
    const address = toStr(customerAddress);

    if (name.length < 2) {
      pushToast("warn", "Customer name is required.");
      return;
    }

    if (phone.length < 6) {
      pushToast("warn", "Customer phone is required.");
      return;
    }

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
        pushToast("danger", "Failed to create customer.");
        return;
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
      if (typedName.length < 2) {
        pushToast("warn", "Customer name is required.");
        return;
      }

      if (typedPhone.length < 6) {
        pushToast("warn", "Customer phone is required.");
        return;
      }
    }

    if (saleCart.length === 0) {
      pushToast("warn", "Cart is empty. Add products.");
      return;
    }

    for (const it of saleCart) {
      const qty = toInt(it.qty);
      if (qty <= 0) {
        pushToast("warn", `Bad qty for ${it.productName}.`);
        return;
      }

      const tracked = isInventoryTracked(it);
      const availableQty = getAvailableQty(it);
      if (tracked && qty > availableQty) {
        pushToast(
          "danger",
          `${it.productName}: available ${availableQty}, entered ${qty}.`,
        );
        return;
      }

      const selling = toInt(it.sellingPrice);
      const unit = toInt(it.unitPrice);
      if (unit > selling) {
        pushToast(
          "warn",
          `Unit price above selling price for ${it.productName}.`,
        );
        return;
      }

      const maxPct = Number(it.maxDiscountPercent ?? 0) || 0;
      const pct = Number(it.discountPercent ?? 0) || 0;
      if (pct > maxPct) {
        pushToast(
          "warn",
          `Discount too high for ${it.productName}. Max ${maxPct}%.`,
        );
        return;
      }
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

  async function openSaleDocument(saleId, type) {
    const sid = Number(saleId);
    if (!sid) return;

    setDocumentLoading(true);

    try {
      const data = await apiFetch(ENDPOINTS.SALE_GET(sid), { method: "GET" });
      const sale = data?.sale || data || null;

      setDocumentSale(sale);

      if (type === "proforma") {
        setProformaOpen(true);
      } else if (type === "delivery") {
        setDeliveryNoteOpen(true);
      }
    } catch (e) {
      pushToast(
        "danger",
        e?.data?.error || e?.message || "Cannot load sale document",
      );
    } finally {
      setDocumentLoading(false);
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

      pushToast("success", `Sale #${sid} marked paid (${method})`);
      await loadSales();

      setMarkBtnState((p) => ({ ...p, [sid]: "success" }));
      setTimeout(() => setMarkBtnState((p) => ({ ...p, [sid]: "idle" })), 900);
    } catch (e) {
      setMarkBtnState((p) => ({ ...p, [sid]: "idle" }));
      pushToast("danger", e?.data?.error || e?.message || "Mark paid failed");
    }
  }

  function openCreditModal(sale) {
    setCreditSale({
      ...(sale || null),
      _defaults: {
        creditMode: "OPEN_BALANCE",
        amountPaidNow: "",
        paymentMethodNow: "CASH",
        cashSessionId: "",
        dueDate: "",
        note: "",
        installmentCount: "",
        installmentAmount: "",
        firstInstallmentDate: "",
      },
    });
    setCreditOpen(true);
  }

  const confirmCredit = useCallback(
    async (payload = {}) => {
      const sid = Number(creditSale?.id);
      if (!sid) return;

      setCreditSaving(true);
      setMsg("");

      try {
        const dueDateIso = payload?.dueDate
          ? toIsoEndOfDay(payload.dueDate)
          : undefined;

        const firstInstallmentDateIso = payload?.firstInstallmentDate
          ? toIsoEndOfDay(payload.firstInstallmentDate)
          : undefined;

        const body = {
          saleId: sid,
          creditMode: String(
            payload?.creditMode || "OPEN_BALANCE",
          ).toUpperCase(),
          amountPaidNow: Number(payload?.amountPaidNow || 0),
          paymentMethodNow: String(
            payload?.paymentMethodNow || "CASH",
          ).toUpperCase(),
          dueDate: dueDateIso,
          note: toStr(payload?.note) || undefined,
        };

        if (payload?.cashSessionId) {
          body.cashSessionId = Number(payload.cashSessionId);
        }

        if (body.creditMode === "INSTALLMENT_PLAN") {
          body.installmentCount = Number(payload?.installmentCount || 0);
          body.installmentAmount = Number(payload?.installmentAmount || 0);
          body.firstInstallmentDate = firstInstallmentDateIso;
        }

        const res = await apiFetch("/credits", {
          method: "POST",
          body,
        });

        pushToast(
          "success",
          res?.message || `Credit request created for sale #${sid}`,
        );

        setCreditOpen(false);
        setCreditSale(null);
        await loadSales();
      } catch (e) {
        pushToast(
          "danger",
          e?.data?.error || e?.message || "Create credit request failed",
        );
      } finally {
        setCreditSaving(false);
      }
    },
    [creditSale, loadSales],
  );

  async function openSaleInvoice(saleId) {
    const sid = Number(saleId);
    if (!sid) return;

    setDocumentLoading(true);

    try {
      const data = await apiFetch(ENDPOINTS.SALE_GET(sid), { method: "GET" });
      const sale = data?.sale || data || null;

      setDocumentSale(sale);
      setInvoiceOpen(true);
    } catch (e) {
      pushToast(
        "danger",
        e?.data?.error || e?.message || "Cannot load invoice",
      );
    } finally {
      setDocumentLoading(false);
    }
  }

  if (bootLoading) return <PageSkeleton />;

  if (!isAuthorized) {
    return <div className="p-6 text-sm app-muted">Redirecting…</div>;
  }

  const subtitle = `User: ${me?.email || "—"} • ${locationLabel(me)}`;
  const title = roleLower === "admin" ? "Seller (Admin)" : "Seller";

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--app-bg)]">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <RoleBar title={title} subtitle={subtitle} user={me} />

      <SellerItemsModal
        open={itemsOpen}
        loading={itemsLoading}
        sale={itemsSale}
        onClose={() => setItemsOpen(false)}
      />

      <SellerCreditSetupModal
        key={creditSale?.id || "credit"}
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

      <SellerProformaModal
        open={proformaOpen}
        sale={documentSale}
        loading={documentLoading}
        me={me}
        onClose={() => {
          if (documentLoading) return;
          setProformaOpen(false);
          setDocumentSale(null);
        }}
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

      <SellerInvoiceModal
        open={invoiceOpen}
        sale={documentSale}
        loading={documentLoading}
        me={me}
        onClose={() => {
          if (documentLoading) return;
          setInvoiceOpen(false);
          setDocumentSale(null);
        }}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-5">
        {msg ? (
          <div className="mb-4">
            <div
              className={[
                "rounded-3xl border px-4 py-3 text-sm",
                msgKind === "success"
                  ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
                  : msgKind === "warn"
                    ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
                    : msgKind === "danger"
                      ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
                      : "border-[var(--border)] bg-[var(--card)] text-[var(--app-fg)]",
              ].join(" ")}
            >
              {msg}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4">
          <TopSectionSwitcher
            title={title}
            me={me}
            section={section}
            setSection={setSection}
            sections={SECTIONS}
            draftCount={draftCount}
            creditCount={creditCount}
          />

          <main className="grid gap-4">
            {section === "dashboard" ? (
              <SellerDashboardSection
                salesLoading={salesLoading}
                todaySalesCount={todaySalesCount}
                todaySalesTotal={todaySalesTotal}
                draftCount={draftCount}
                releasedCount={releasedCount}
                loadSales={loadSales}
                setSection={setSection}
              />
            ) : null}

            {section === "create" ? (
              <SellerCreateSection
                productsLoading={productsLoading}
                loadProducts={loadProducts}
                prodQ={prodQ}
                setProdQ={setProdQ}
                filteredProducts={filteredProducts}
                addProductToSaleCart={addProductToSaleCart}
                customerQ={customerQ}
                setCustomerQ={setCustomerQ}
                selectedCustomer={selectedCustomer}
                customerLoading={customerLoading}
                customerResults={customerResults}
                setSelectedCustomer={setSelectedCustomer}
                customerName={customerName}
                setCustomerName={setCustomerName}
                customerPhone={customerPhone}
                setCustomerPhone={setCustomerPhone}
                customerTin={customerTin}
                setCustomerTin={setCustomerTin}
                customerAddress={customerAddress}
                setCustomerAddress={setCustomerAddress}
                createCustomerBtn={createCustomerBtn}
                createCustomerFromInputs={createCustomerFromInputs}
                note={note}
                setNote={setNote}
                saleCart={saleCart}
                cartSubtotal={cartSubtotal}
                updateCart={updateCart}
                removeFromCart={removeFromCart}
                previewLineTotal={previewLineTotal}
                createSale={createSale}
                createSaleBtn={createSaleBtn}
              />
            ) : null}

            {section === "sales" ? (
              <SellerSalesSection
                showAllSales={showAllSales}
                salesLoading={salesLoading}
                loadSales={loadSales}
                salesQ={salesQ}
                setSalesQ={setSalesQ}
                salesToShow={salesToShow}
                salePayMethod={salePayMethod}
                setSalePayMethod={setSalePayMethod}
                markBtnState={markBtnState}
                markSalePaid={markSalePaid}
                openCreditModal={openCreditModal}
                openSaleItems={openSaleItems}
                openProforma={(id) => openSaleDocument(id, "proforma")}
                openDeliveryNote={(id) => openSaleDocument(id, "delivery")}
                paymentMethods={SELLER_PAYMENT_METHODS}
                openInvoice={openSaleInvoice}
              />
            ) : null}

            {section === "credits" ? (
              <SectionCard
                title="Credits"
                hint="Credit history, approval status, payment progress, and installments."
              >
                <SellerCreditsSection />
              </SectionCard>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}
