"use client";

import {
  ADVANCED_SECTIONS,
  ENDPOINTS,
  PAGE_SIZE,
  SECTIONS,
} from "../../components/staff/manager/manager-constants";
import {
  Banner,
  Input,
  PageSkeleton,
  SectionCard,
  Select,
  TinyPill,
} from "../../components/staff/manager/manager-ui";
import {
  buildEvidenceUrl,
  firstItemLabel,
  fmt,
  getCustomerAddress,
  getCustomerTin,
  isArchivedProduct,
  isDocumentFocused,
  locationLabel,
  makeCandidateLabel,
  money,
  normalizeList,
  productNameById,
  safePlayBeep,
  sumBreakdown,
  toStr,
} from "../../components/staff/manager/manager-utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import AuditLogsPanel from "../../components/AuditLogsPanel";
import CashReportsPanel from "../../components/CashReportsPanel";
import InventoryAdjustRequestsPanel from "../../components/InventoryAdjustRequestsPanel";
import ManagerArchiveRestoreProductModal from "../../components/staff/manager/ManagerArchiveRestoreProductModal";
import ManagerArrivalsSection from "../../components/staff/manager/ManagerArrivalsSection";
import ManagerCancelSaleModal from "../../components/staff/manager/ManagerCancelSaleModal";
import ManagerControlStrip from "../../components/staff/manager/ManagerControlStrip";
import ManagerCreditsSection from "../../components/staff/manager/ManagerCreditsSection";
import ManagerDashboardSection from "../../components/staff/manager/ManagerDashboardSection";
import ManagerInventorySection from "../../components/staff/manager/ManagerInventorySection";
import ManagerPaymentsSection from "../../components/staff/manager/ManagerPaymentsSection";
import ManagerSalesSection from "../../components/staff/manager/ManagerSalesSection";
import ManagerTopSectionSwitcher from "../../components/staff/manager/ManagerTopSectionSwitcher";
import ManagerUsersPanel from "../../components/ManagerUsersPanel";
import NotificationsBell from "../../components/NotificationsBell";
import ProductPricingPanel from "../../components/ProductPricingPanel";
import RoleBar from "../../components/RoleBar";
import SuppliersPanel from "../../components/SuppliersPanel";
import { apiFetch } from "../../lib/api";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

export default function ManagerPage() {
  const router = useRouter();

  const [bootLoading, setBootLoading] = useState(true);
  const [me, setMe] = useState(null);

  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info");

  const [section, setSection] = useState("dashboard");
  const [showAdvanced, setShowAdvanced] = useState(false);

  function toast(kind, text) {
    setMsgKind(kind || "info");
    setMsg(text || "");
  }

  const [refreshNonce, setRefreshNonce] = useState(0);
  const [refreshState, setRefreshState] = useState("idle");

  const [dash, setDash] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);

  const [sales, setSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [salesQ, setSalesQ] = useState("");
  const [salesPage, setSalesPage] = useState(1);

  const [saleDetailsById, setSaleDetailsById] = useState({});
  const [saleDetailsLoadingById, setSaleDetailsLoadingById] = useState({});

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelingState, setCancelingState] = useState("idle");
  const [cancelSaleId, setCancelSaleId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingInv, setLoadingInv] = useState(false);
  const [loadingProd, setLoadingProd] = useState(false);
  const [invQ, setInvQ] = useState("");
  const [prodQ, setProdQ] = useState("");
  const [showArchivedProducts, setShowArchivedProducts] = useState(false);

  const [archOpen, setArchOpen] = useState(false);
  const [archMode, setArchMode] = useState("archive");
  const [archProduct, setArchProduct] = useState(null);
  const [archReason, setArchReason] = useState("");
  const [archState, setArchState] = useState("idle");

  const [arrivals, setArrivals] = useState([]);
  const [loadingArrivals, setLoadingArrivals] = useState(false);

  const [payments, setPayments] = useState([]);
  const [paymentsSummary, setPaymentsSummary] = useState(null);
  const [paymentsBreakdown, setPaymentsBreakdown] = useState(null);
  const [payQ, setPayQ] = useState("");
  const [payView, setPayView] = useState("overview");
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loadingPaySummary, setLoadingPaySummary] = useState(false);
  const [loadingPayBreakdown, setLoadingPayBreakdown] = useState(false);

  const [invReqPendingCount, setInvReqPendingCount] = useState(0);
  const [invReqCountLoading, setInvReqCountLoading] = useState(false);
  const invReqInFlightRef = useRef(false);

  const userInteractedRef = useRef(false);
  const prevInvReqPendingRef = useRef(0);

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

  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
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
      try {
        const path = includeInactive
          ? `${ENDPOINTS.PRODUCTS_LIST}?includeInactive=true`
          : ENDPOINTS.PRODUCTS_LIST;

        const data = await apiFetch(path, { method: "GET" });
        setProducts(normalizeList(data, ["products", "pricing"]));
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
      if (!String(text).toLowerCase().includes("not found")) {
        toast("danger", e?.data?.error || e?.message || "Cannot load payments");
      }
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
      if (!String(text).toLowerCase().includes("not found")) {
        toast(
          "danger",
          e?.data?.error || e?.message || "Cannot load payment summary",
        );
      }
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
      if (!String(text).toLowerCase().includes("not found")) {
        toast(
          "danger",
          e?.data?.error || e?.message || "Cannot load payment breakdown",
        );
      }
    } finally {
      setLoadingPayBreakdown(false);
    }
  }, []);

  const loadArrivals = useCallback(async () => {
    setLoadingArrivals(true);
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
      setInvReqPendingCount((prev) => (prev === n ? prev : n));
    } catch {
      // keep old value
    } finally {
      invReqInFlightRef.current = false;
      setInvReqCountLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;

    const shouldPoll = section === "dashboard" || section === "inv_requests";
    if (!shouldPoll) return;

    loadInvReqPendingCount();

    const t = setInterval(() => {
      loadInvReqPendingCount();
    }, 60000);

    return () => clearInterval(t);
  }, [isAuthorized, section, loadInvReqPendingCount]);

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

  const refreshCurrent = useCallback(async () => {
    setRefreshState("loading");
    setMsg("");

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

      if (section === "payments") {
        await Promise.all([
          loadPayments(),
          loadPaymentsSummary(),
          loadPaymentsBreakdown(),
        ]);
      }

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

  useEffect(() => {
    if (!isAuthorized) return;
    if (section !== "inventory") return;
    loadProducts({ includeInactive: showArchivedProducts });
  }, [isAuthorized, section, showArchivedProducts, loadProducts]);

  useEffect(() => {
    setSalesPage(1);
  }, [salesQ]);

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
  }, [section, sales, salesQ, salesPage, ensureSaleDetails]);

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
      ) {
        c += 1;
      }
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

  useEffect(() => {
    if (section !== "payments") return;
    if (payView !== "list") return;

    const list = (Array.isArray(payments) ? payments : []).slice(0, 25);
    list.forEach((p) => {
      const sid = p?.saleId ?? p?.sale_id ?? null;
      if (sid != null) ensureSaleDetails(sid);
    });
  }, [section, payView, payments, ensureSaleDetails]);

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

  function canCancelSale(s) {
    const st = String(s?.status || "").toUpperCase();
    return st !== "COMPLETED";
  }

  function openCancel(saleId) {
    setCancelSaleId(Number(saleId));
    setCancelReason("");
    setCancelOpen(true);
    setCancelingState("idle");
    setMsg("");
  }

  async function confirmCancel() {
    if (!cancelSaleId) return;

    setCancelingState("loading");
    setMsg("");

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
    setMsg("");
  }

  function openRestoreProduct(prod) {
    if (!prod?.id) return;
    setArchMode("restore");
    setArchProduct(prod);
    setArchReason("");
    setArchOpen(true);
    setArchState("idle");
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
  }, [section, evEntity, refreshNonce]);

  if (bootLoading) return <PageSkeleton />;

  if (!isAuthorized) {
    return <div className="p-6 text-sm app-muted">Redirecting…</div>;
  }

  const subtitle = `User: ${me?.email || "—"} • ${locationLabel(me)}`;

  function badgeToneForSectionKey(key) {
    if (key === "pricing") return unpricedCount > 0 ? "warn" : "success";
    if (key === "arrivals") return arrivalsBadge ? "info" : "neutral";
    if (key === "inv_requests")
      return invReqPendingCount > 0 ? "danger" : "success";
    return "neutral";
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--app-bg)]">
      <RoleBar
        title="Manager"
        subtitle={subtitle}
        user={me}
        right={
          <div className="flex items-center gap-2">
            <NotificationsBell enabled />
          </div>
        }
      />

      <ManagerControlStrip
        locationLabel={locationLabel(me)}
        pendingInventoryRequests={invReqPendingCount}
        unpricedCount={unpricedCount}
        arrivalsCount={Array.isArray(arrivals) ? arrivals.length : 0}
        stuckSalesCount={dashStuckSalesCount}
        refreshState={refreshState}
        onRefresh={refreshCurrent}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-5">
        {msg ? (
          <div className="mb-4">
            <Banner kind={msgKind}>{msg}</Banner>
          </div>
        ) : null}

        <div className="grid gap-4">
          <ManagerTopSectionSwitcher
            section={section}
            setSection={setSection}
            sections={SECTIONS}
            advancedSections={ADVANCED_SECTIONS}
            showAdvanced={showAdvanced}
            setShowAdvanced={setShowAdvanced}
            badgeForSectionKey={badgeForSectionKey}
            badgeToneForSectionKey={badgeToneForSectionKey}
          />

          <main className="grid gap-4">
            {section === "dashboard" ? (
              <ManagerDashboardSection
                dashLoading={dashLoading}
                dash={dash}
                dashTodayTotal={dashTodayTotal}
                dashLowStockCount={dashLowStockCount}
                dashStuckSalesCount={dashStuckSalesCount}
                unpricedCount={unpricedCount}
                breakdownTodayTotals={breakdownTodayTotals}
                onRefresh={refreshCurrent}
                refreshLoading={refreshState === "loading"}
                onGoToSection={setSection}
                money={money}
                fmt={fmt}
                productLabel={(item) =>
                  item?.productName ||
                  item?.product_name ||
                  item?.name ||
                  (item?.productId
                    ? productNameById(products, item.productId)
                    : null) ||
                  `Product #${item?.productId ?? "—"}`
                }
                topItemLabel={(sale) => {
                  const details = sale?.id ? saleDetailsById?.[sale.id] : null;
                  const mergedSale = {
                    ...sale,
                    items: details?.items || sale?.items || [],
                  };
                  return firstItemLabel(
                    mergedSale.items || mergedSale?.items || [],
                  );
                }}
              />
            ) : null}

            {section === "sales" ? (
              <ManagerSalesSection
                loadingSales={loadingSales}
                loadSales={loadSales}
                salesQ={salesQ}
                setSalesQ={setSalesQ}
                salesShown={salesShown}
                canLoadMoreSales={canLoadMoreSales}
                setSalesPage={setSalesPage}
                saleDetailsById={saleDetailsById}
                saleDetailsLoadingById={saleDetailsLoadingById}
                ensureSaleDetails={ensureSaleDetails}
                fmt={fmt}
                money={money}
                getCustomerTin={getCustomerTin}
                getCustomerAddress={getCustomerAddress}
                canCancelSale={canCancelSale}
                openCancel={openCancel}
              />
            ) : null}

            {section === "payments" ? (
              <ManagerPaymentsSection
                payView={payView}
                setPayView={setPayView}
                payQ={payQ}
                setPayQ={setPayQ}
                loadPayments={loadPayments}
                loadPaymentsSummary={loadPaymentsSummary}
                loadPaymentsBreakdown={loadPaymentsBreakdown}
                loadingPayments={loadingPayments}
                loadingPaySummary={loadingPaySummary}
                loadingPayBreakdown={loadingPayBreakdown}
                paymentsSummary={paymentsSummary}
                breakdownTodayTotals={breakdownTodayTotals}
                breakdownYesterday={breakdownYesterday}
                breakdownAll={breakdownAll}
                paymentsWithItems={paymentsWithItems}
                fmt={fmt}
                money={money}
              />
            ) : null}

            {section === "inventory" ? (
              <ManagerInventorySection
                inventory={inventory}
                products={products}
                loadingInv={loadingInv}
                loadingProd={loadingProd}
                invQ={invQ}
                setInvQ={setInvQ}
                prodQ={prodQ}
                setProdQ={setProdQ}
                showArchivedProducts={showArchivedProducts}
                setShowArchivedProducts={setShowArchivedProducts}
                loadInventory={loadInventory}
                loadProducts={loadProducts}
                money={money}
                isArchivedProduct={isArchivedProduct}
                openArchiveProduct={openArchiveProduct}
                openRestoreProduct={openRestoreProduct}
              />
            ) : null}

            {section === "pricing" ? (
              <SectionCard
                title="Pricing"
                hint="Set selling prices."
                right={
                  unpricedCount > 0 ? (
                    <TinyPill tone="warn">{unpricedCount} unpriced</TinyPill>
                  ) : (
                    <TinyPill tone="success">All priced</TinyPill>
                  )
                }
              >
                <ProductPricingPanel key={`pricing-${refreshNonce}`} />
              </SectionCard>
            ) : null}

            {section === "inv_requests" ? (
              <SectionCard
                title="Inventory requests"
                hint="Approve or decline requests. Badge shows pending only."
                right={
                  <div className="flex items-center gap-2">
                    {invReqPendingCount > 0 ? (
                      <TinyPill tone="warn">
                        {invReqPendingCount} pending
                      </TinyPill>
                    ) : (
                      <TinyPill tone="success">Clear</TinyPill>
                    )}
                  </div>
                }
              >
                <InventoryAdjustRequestsPanel key={`invreq-${refreshNonce}`} />
              </SectionCard>
            ) : null}

            {section === "arrivals" ? (
              <ManagerArrivalsSection
                arrivalsNormalized={arrivalsNormalized}
                loadingArrivals={loadingArrivals}
                loadArrivals={loadArrivals}
              />
            ) : null}

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

            {section === "credits" ? (
              <ManagerCreditsSection key={`credits-${refreshNonce}`} />
            ) : null}

            {section === "staff" ? (
              <SectionCard
                title="Staff"
                hint="Online status depends on backend lastSeenAt."
              >
                <ManagerUsersPanel
                  key={`staff-${refreshNonce}`}
                  title="Staff list (view-only)"
                />
                <div className="mt-3 text-xs app-muted">
                  For real “Online / Last seen”, backend must send lastSeenAt.
                </div>
              </SectionCard>
            ) : null}

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

            {section === "evidence" ? (
              <SectionCard
                key={`evidence-${refreshNonce}`}
                title="Proof & History"
                hint="Use this when something looks wrong and you need proof of what happened."
              >
                <div className="grid gap-4">
                  <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4 text-sm text-[var(--app-fg)]">
                    <div className="font-black">What is this?</div>
                    <div className="mt-1">
                      This is a proof page. It helps confirm what changed, who
                      did it, and when it happened.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                        Record type
                      </div>
                      <Select
                        value={evEntity}
                        onChange={(e) => setEvEntity(e.target.value)}
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
                      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                        Record
                      </div>
                      {Array.isArray(evCandidates) &&
                      evCandidates.length > 0 ? (
                        <Select
                          value={String(evEntityId || "")}
                          onChange={(e) => setEvEntityId(e.target.value)}
                        >
                          <option value="">Select one…</option>
                          {evCandidates.map((c) => (
                            <option key={String(c.id)} value={String(c.id)}>
                              {c.label}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-sm app-muted">
                          {evCandidatesLoading
                            ? "Loading…"
                            : "No records found."}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                        From
                      </div>
                      <Input
                        type="date"
                        value={evFrom}
                        onChange={(e) => setEvFrom(e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                        To
                      </div>
                      <Input
                        type="date"
                        value={evTo}
                        onChange={(e) => setEvTo(e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                        Staff member
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
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-sm app-muted">
                          {evStaffLoading
                            ? "Loading…"
                            : "Staff list not available."}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="md:col-span-2">
                      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                        Search words
                      </div>
                      <Input
                        placeholder="Example: cancelled, price change"
                        value={evQ}
                        onChange={(e) => setEvQ(e.target.value)}
                      />
                    </div>

                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
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
                      type="button"
                      className="rounded-2xl bg-[var(--app-fg)] px-4 py-2.5 text-sm font-bold text-[var(--app-bg)] transition hover:opacity-90"
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
                      type="button"
                      className="rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
                      onClick={() => {
                        setEvEntity("sale");
                        setEvEntityId("");
                        setEvFrom("");
                        setEvTo("");
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
              </SectionCard>
            ) : null}
          </main>
        </div>
      </div>

      <ManagerCancelSaleModal
        open={cancelOpen}
        cancelSaleId={cancelSaleId}
        cancelReason={cancelReason}
        setCancelReason={setCancelReason}
        cancelingState={cancelingState}
        onClose={() => {
          setCancelOpen(false);
          setCancelSaleId(null);
          setCancelReason("");
          setCancelingState("idle");
        }}
        onConfirm={confirmCancel}
      />

      <ManagerArchiveRestoreProductModal
        open={archOpen}
        archMode={archMode}
        archProduct={archProduct}
        archReason={archReason}
        setArchReason={setArchReason}
        archState={archState}
        onClose={() => {
          setArchOpen(false);
          setArchProduct(null);
          setArchReason("");
          setArchState("idle");
        }}
        onConfirm={confirmArchiveRestore}
      />
    </div>
  );
}
