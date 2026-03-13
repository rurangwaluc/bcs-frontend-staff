"use client";

import {
  ADVANCED,
  ENDPOINTS,
  PAGE_SIZE,
  SECTIONS,
  buildEvidenceUrl,
  dateOnlyMs,
  fmt,
  isArchivedProduct,
  isToday,
  locationLabel,
  money,
  normalizeList,
  sortByCreatedAtDesc,
  toStr,
} from "../../components/admin/adminShared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import AdminDashboardSection from "../../components/admin/AdminDashboardSection";
import AdminShell from "../../components/admin/AdminShell";
import AdminUsersPanel from "../../components/AdminUsersPanel";
import AuditLogsPanel from "../../components/AuditLogsPanel";
import CashReportsPanel from "../../components/CashReportsPanel";
import CreditsPanel from "../../components/CreditsPanel";
import InventoryAdjustRequestsPanel from "../../components/InventoryAdjustRequestsPanel";
import ProductPricingPanel from "../../components/ProductPricingPanel";
import ReportsPanel from "../../components/ReportsPanel";
import SuppliersPanel from "../../components/SuppliersPanel";
import { apiFetch } from "../../lib/api";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  const [bootLoading, setBootLoading] = useState(true);
  const [me, setMe] = useState(null);

  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info");

  const [section, setSection] = useState("dashboard");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [refreshNonce, setRefreshNonce] = useState(0);
  const [refreshState, setRefreshState] = useState("idle");

  const [actAs, setActAs] = useState("admin");

  function toast(kind, text) {
    setMsgKind(kind || "info");
    setMsg(text || "");
  }

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
        if (!role) {
          router.replace("/login");
          return;
        }

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
      ) {
        c += 1;
      }
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

  const [archOpen, setArchOpen] = useState(false);
  const [archMode, setArchMode] = useState("archive");
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

  const [creditsLoading, setCreditsLoading] = useState(false);
  const loadCreditsOpen = useCallback(async () => {
    setCreditsLoading(true);
    try {
      await apiFetch(ENDPOINTS.CREDITS_OPEN, { method: "GET" });
    } catch {
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
    } finally {
      setInvReqCountLoading(false);
    }
  }, [invReqCountLoading]);

  useEffect(() => {
    if (!isAuthorized) return;

    loadInvReqPendingCount();

    const t = setInterval(() => {
      loadInvReqPendingCount();
    }, 30000);

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
      if (section === "payments") {
        await Promise.all([loadPaymentsSummary(), loadPayments()]);
      }
      if (section === "inventory") {
        await Promise.all([
          loadInventory(),
          loadProducts({ includeInactive: showArchivedProducts }),
        ]);
      }
      if (section === "arrivals") await loadArrivals();
      if (section === "pricing") await loadProducts({ includeInactive: true });
      if (section === "inv_requests") await loadInvReqPendingCount();
      if (section === "credits") await loadCreditsOpen();
      if (section === "users") await loadUsers();
      if (section === "suppliers") {
        await loadProducts({ includeInactive: true });
      }
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

  const shellProps = {
    bootLoading,
    isAuthorized,
    me,
    subtitle,
    msg,
    msgKind,
    section,
    setSection,
    showAdvanced,
    setShowAdvanced,
    refreshState,
    refreshCurrent,
    actAs,
    setActAs,
    actAsHref,
    badgeForSectionKey,
    salesBadge,
    arrivalsBadge,
    pricingBadge,
    invReqBadge,
    toast,
    router,
    SECTIONS,
    ADVANCED,
  };

  if (bootLoading || !isAuthorized) {
    return <AdminShell {...shellProps} />;
  }

  return (
    <AdminShell {...shellProps}>
      {section === "dashboard" ? (
        <AdminDashboardSection
          dash={dash}
          dashLoading={dashLoading}
          salesTodayTotal={salesTodayTotal}
          salesToday={salesToday}
          awaitingPaymentCount={awaitingPaymentCount}
          unpricedCount={unpricedCount}
          invReqPendingCount={invReqPendingCount}
          products={products}
          router={router}
          setSection={setSection}
        />
      ) : null}

      {section === "sales" ? (
        <SalesSection
          sales={filteredSales}
          salesLoading={salesLoading}
          salesQ={salesQ}
          setSalesQ={setSalesQ}
          salesStatusFilter={salesStatusFilter}
          setSalesStatusFilter={setSalesStatusFilter}
          salesFrom={salesFrom}
          setSalesFrom={setSalesFrom}
          salesTo={salesTo}
          setSalesTo={setSalesTo}
          salesFilteredTotals={salesFilteredTotals}
          canLoadMoreSales={canLoadMoreSales}
          setSalesPage={setSalesPage}
          openCancel={openCancel}
          loadSales={loadSales}
          router={router}
        />
      ) : null}

      {section === "payments" ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <div className="text-base font-black text-[var(--app-fg)]">
              Payments summary
            </div>
            <div className="mt-1 text-sm app-muted">Read-only overview.</div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <StatSurface
                label="Today"
                value={
                  paySummaryLoading
                    ? "…"
                    : String(paymentsSummary?.today?.count ?? 0)
                }
                sub={`Total: ${money(paymentsSummary?.today?.total ?? 0)}`}
              />
              <StatSurface
                label="All time"
                value={
                  paySummaryLoading
                    ? "…"
                    : String(paymentsSummary?.allTime?.count ?? 0)
                }
                sub={`Total: ${money(paymentsSummary?.allTime?.total ?? 0)}`}
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <div className="text-base font-black text-[var(--app-fg)]">
              Payments list
            </div>
            <div className="mt-1 text-sm app-muted">Latest payments.</div>

            <div className="mt-4 grid gap-3">
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
                      className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold text-[var(--app-fg)]">
                            Payment #{p?.id ?? "—"}
                          </div>
                          <div className="mt-1 text-xs app-muted">
                            Sale: <b>#{saleId}</b> • Method: <b>{method}</b> •
                            Time: <b>{fmt(time)}</b>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs app-muted">Amount</div>
                          <div className="text-lg font-extrabold text-[var(--app-fg)]">
                            {money(amount)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {!paymentsLoading &&
              (!Array.isArray(payments) || payments.length === 0) ? (
                <div className="text-sm app-muted">No payments.</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {section === "inventory" ? (
        <InventorySection
          invLoading={invLoading}
          prodLoading={prodLoading}
          invQ={invQ}
          setInvQ={setInvQ}
          filteredInventory={filteredInventory}
          sellingPriceForRow={sellingPriceForRow}
          prodQ={prodQ}
          setProdQ={setProdQ}
          filteredProducts={filteredProducts}
          showArchivedProducts={showArchivedProducts}
          setShowArchivedProducts={setShowArchivedProducts}
          openArchiveProduct={openArchiveProduct}
          openRestoreProduct={openRestoreProduct}
          openDeleteProduct={openDeleteProduct}
          router={router}
          loadInventory={loadInventory}
          loadProducts={loadProducts}
        />
      ) : null}

      {section === "arrivals" ? (
        <ArrivalsSection
          arrivalsLoading={arrivalsLoading}
          arrivalsNormalized={arrivalsNormalized}
          loadArrivals={loadArrivals}
        />
      ) : null}

      {section === "pricing" ? (
        <PanelCard
          title="Pricing"
          hint="Set purchase/selling price and max discount."
        >
          <ProductPricingPanel key={`pricing-${refreshNonce}`} />
        </PanelCard>
      ) : null}

      {section === "inv_requests" ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <PanelCard
            title="Inventory requests"
            hint="Approve or decline stock adjustments."
          >
            <InventoryAdjustRequestsPanel key={`invreq-${refreshNonce}`} />
          </PanelCard>

          <PanelCard
            title="Approval checklist"
            hint="Keep adjustments clean and auditable."
          >
            <div className="grid gap-3 text-sm text-[var(--app-fg)]">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                  Rule
                </div>
                <div className="mt-1 font-semibold">
                  Approve only if stock movement is verifiable.
                </div>
                <div className="mt-2 text-xs app-muted">
                  Require invoice, supplier note, arrival record, or signed
                  count sheet.
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                  Before approving
                </div>
                <ul className="mt-2 space-y-1 pl-5">
                  <li>Check product ID and SKU match.</li>
                  <li>Confirm quantity makes sense.</li>
                  <li>Reject vague reasons like “fix”.</li>
                  <li>Open Proof & history if suspicious.</li>
                </ul>
              </div>

              <button
                type="button"
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--app-fg)] hover:bg-[var(--hover)]"
                onClick={() => setSection("evidence")}
              >
                Open Proof & history →
              </button>
            </div>
          </PanelCard>
        </div>
      ) : null}

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

      {section === "cash" ? (
        <PanelCard title="Cash reports" hint="Cash summary for this location.">
          <CashReportsPanel
            key={`cash-${refreshNonce}`}
            title="Admin Cash Oversight"
          />
        </PanelCard>
      ) : null}

      {section === "credits" ? (
        <PanelCard title="Credits" hint="Approve/decline and settle credits.">
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
            <div className="mt-3 text-xs app-muted">Loading…</div>
          ) : null}
        </PanelCard>
      ) : null}

      {section === "users" ? (
        <PanelCard title="Staff" hint="Admin manages users.">
          <AdminUsersPanel users={users} loading={usersLoading} />
        </PanelCard>
      ) : null}

      {section === "reports" ? (
        <PanelCard title="Reports" hint="Quick overview.">
          <ReportsPanel key={`reports-${refreshNonce}`} />
        </PanelCard>
      ) : null}

      {section === "audit" ? (
        <PanelCard title="Audit history" hint="Read-only log of actions.">
          <AuditLogsPanel
            key={`audit-${refreshNonce}`}
            title="Actions history"
            subtitle="Admin view (read-only)."
            currentLocationLabel={locationLabel(me)}
          />
        </PanelCard>
      ) : null}

      {section === "evidence" ? (
        <PanelCard
          title="Proof & history"
          hint="Investigate: what changed, who did it, and when."
        >
          <EvidenceForm router={router} toast={toast} />
        </PanelCard>
      ) : null}

      {cancelOpen ? (
        <SimpleModal
          title={`Cancel sale #${cancelSaleId}`}
          subtitle="Rule: don’t cancel completed sales."
          onClose={() => {
            setCancelOpen(false);
            setCancelSaleId(null);
            setCancelReason("");
            setCancelState("idle");
          }}
          footer={
            <>
              <button
                onClick={() => {
                  setCancelOpen(false);
                  setCancelSaleId(null);
                  setCancelReason("");
                  setCancelState("idle");
                }}
                className="rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] hover:bg-[var(--hover)]"
                disabled={cancelState === "loading"}
              >
                Close
              </button>

              <button
                onClick={confirmCancel}
                className="rounded-2xl bg-[var(--danger-fg)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                disabled={cancelState === "loading"}
              >
                {cancelState === "loading" ? "Cancelling…" : "Confirm cancel"}
              </button>
            </>
          }
        >
          <FieldInput
            placeholder="Reason (optional)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </SimpleModal>
      ) : null}

      {archOpen ? (
        <SimpleModal
          title={`${archMode === "archive" ? "Archive" : "Restore"} product #${archProduct?.id}`}
          subtitle={`Product: ${archProduct?.name || archProduct?.productName || archProduct?.title || "—"}`}
          onClose={() => {
            setArchOpen(false);
            setArchProduct(null);
            setArchReason("");
            setArchState("idle");
          }}
          footer={
            <>
              <button
                onClick={() => {
                  setArchOpen(false);
                  setArchProduct(null);
                  setArchReason("");
                  setArchState("idle");
                }}
                className="rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] hover:bg-[var(--hover)]"
                disabled={archState === "loading"}
              >
                Close
              </button>

              <button
                onClick={confirmArchiveRestore}
                className="rounded-2xl bg-[var(--app-fg)] px-4 py-2.5 text-sm font-semibold text-[var(--app-bg)] hover:opacity-90 disabled:opacity-60"
                disabled={archState === "loading"}
              >
                {archState === "loading"
                  ? "Working…"
                  : archMode === "archive"
                    ? "Confirm archive"
                    : "Confirm restore"}
              </button>
            </>
          }
        >
          {archMode === "archive" ? (
            <FieldInput
              placeholder="Reason (optional)"
              value={archReason}
              onChange={(e) => setArchReason(e.target.value)}
            />
          ) : (
            <div className="text-sm app-muted">
              This will make the product active again.
            </div>
          )}
        </SimpleModal>
      ) : null}

      {delOpen ? (
        <SimpleModal
          title={`Delete product #${delProduct?.id}`}
          subtitle={
            delProduct?.name ||
            delProduct?.productName ||
            delProduct?.title ||
            "—"
          }
          onClose={() => {
            setDelOpen(false);
            setDelProduct(null);
            setDelState("idle");
          }}
          footer={
            <>
              <button
                onClick={() => {
                  setDelOpen(false);
                  setDelProduct(null);
                  setDelState("idle");
                }}
                className="rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] hover:bg-[var(--hover)]"
                disabled={delState === "loading"}
              >
                Close
              </button>

              <button
                onClick={confirmDeleteProduct}
                className="rounded-2xl bg-[var(--danger-fg)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                disabled={delState === "loading"}
              >
                {delState === "loading" ? "Deleting…" : "Confirm delete"}
              </button>
            </>
          }
        >
          <div className="rounded-2xl border border-[var(--warn-border)] bg-[var(--warn-bg)] px-4 py-3 text-sm text-[var(--warn-fg)]">
            This is permanent. If delete fails due to linked sales, use Archive
            instead.
          </div>
        </SimpleModal>
      ) : null}
    </AdminShell>
  );
}

function PanelCard({ title, hint, children }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <div className="text-base font-black text-[var(--app-fg)]">{title}</div>
        {hint ? <div className="mt-1 text-sm app-muted">{hint}</div> : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function StatSurface({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black text-[var(--app-fg)]">
        {value}
      </div>
      {sub ? <div className="mt-1 text-xs app-muted">{sub}</div> : null}
    </div>
  );
}

function FieldInput(props) {
  return (
    <input
      {...props}
      className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--app-fg)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--border-strong)]"
    />
  );
}

function SimpleModal({ title, subtitle, children, footer, onClose }) {
  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--card)] shadow-2xl">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <div className="text-base font-black text-[var(--app-fg)]">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-1 text-sm app-muted">{subtitle}</div>
          ) : null}
        </div>
        <div className="p-5">{children}</div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
          {footer}
        </div>
      </div>
      <button
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 -z-10"
      />
    </div>
  );
}

function SalesSection({
  sales,
  salesLoading,
  salesQ,
  setSalesQ,
  salesStatusFilter,
  setSalesStatusFilter,
  salesFrom,
  setSalesFrom,
  salesTo,
  setSalesTo,
  salesFilteredTotals,
  canLoadMoreSales,
  setSalesPage,
  openCancel,
  loadSales,
  router,
}) {
  return (
    <PanelCard title="Sales" hint="Search, filter, cancel, open proof.">
      <div className="grid gap-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
              Search
            </div>
            <FieldInput
              placeholder="Customer, phone, staff, status, total…"
              value={salesQ}
              onChange={(e) => setSalesQ(e.target.value)}
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
              Filter
            </div>
            <select
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--app-fg)]"
              value={salesStatusFilter}
              onChange={(e) => setSalesStatusFilter(e.target.value)}
            >
              <option value="ALL">All sales</option>
              <option value="TODAY">Today</option>
              <option value="AWAITING">Awaiting payment</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
              From
            </div>
            <FieldInput
              type="date"
              value={salesFrom}
              onChange={(e) => setSalesFrom(e.target.value)}
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
              To
            </div>
            <FieldInput
              type="date"
              value={salesTo}
              onChange={(e) => setSalesTo(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <button
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--app-fg)] hover:bg-[var(--hover)]"
              onClick={() => {
                setSalesQ("");
                setSalesStatusFilter("ALL");
                setSalesFrom("");
                setSalesTo("");
                loadSales();
              }}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-[var(--info-border)] bg-[var(--info-bg)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--info-fg)]">
            {salesFilteredTotals.count} sale(s)
          </span>
          <span className="rounded-full border border-[var(--border)] bg-[var(--card-2)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--app-fg)]">
            Total: {money(salesFilteredTotals.totalSum)}
          </span>
          <span className="rounded-full border border-[var(--border)] bg-[var(--card-2)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--app-fg)]">
            Paid: {money(salesFilteredTotals.paidSum)}
          </span>
        </div>

        <div className="grid gap-3">
          {salesLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4"
              >
                <div className="h-5 animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800/70" />
              </div>
            ))
          ) : sales.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-6 text-sm app-muted">
              No sales found.
            </div>
          ) : (
            sales.map((s) => {
              const total = Number(s?.totalAmount ?? s?.total ?? 0) || 0;
              const paid = Number(s?.amountPaid ?? s?.amount_paid ?? 0) || 0;
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
                  className="rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-base font-black text-[var(--app-fg)]">
                          Sale #{s?.id ?? "—"}
                        </div>
                        <span className="rounded-full border border-[var(--border)] bg-[var(--card-2)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--app-fg)]">
                          {String(s?.status || "—").toUpperCase()}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <StatSurface
                          label="Customer"
                          value={customerName}
                          sub={customerPhone || "—"}
                        />
                        <StatSurface label="Staff" value={staffName} />
                        <StatSurface label="Total" value={money(total)} />
                        <StatSurface
                          label="Paid"
                          value={money(paid)}
                          sub={fmt(s?.createdAt || s?.created_at)}
                        />
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] hover:bg-[var(--hover)]"
                        onClick={() => {
                          if (!s?.id) return;
                          router.push(
                            buildEvidenceUrl({
                              entity: "sale",
                              entityId: String(s.id),
                              limit: 200,
                            }),
                          );
                        }}
                      >
                        Proof
                      </button>

                      <button
                        className="rounded-2xl bg-[var(--danger-fg)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                        onClick={() => openCancel(s?.id)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {canLoadMoreSales ? (
            <button
              type="button"
              onClick={() => setSalesPage((p) => p + 1)}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--app-fg)] hover:bg-[var(--hover)]"
            >
              Load more (+10)
            </button>
          ) : null}
        </div>
      </div>
    </PanelCard>
  );
}

function InventorySection({
  invLoading,
  prodLoading,
  invQ,
  setInvQ,
  filteredInventory,
  sellingPriceForRow,
  prodQ,
  setProdQ,
  filteredProducts,
  showArchivedProducts,
  setShowArchivedProducts,
  openArchiveProduct,
  openRestoreProduct,
  openDeleteProduct,
  router,
  loadInventory,
  loadProducts,
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <PanelCard
        title="Inventory"
        hint="Stock on hand + selling price preview."
      >
        <FieldInput
          placeholder="Search by name, SKU, product number…"
          value={invQ}
          onChange={(e) => setInvQ(e.target.value)}
        />

        <div className="mt-4 grid gap-3">
          {(filteredInventory || []).slice(0, 60).map((row, idx) => {
            const pid = row?.productId ?? row?.product_id ?? row?.id ?? null;
            const name =
              row?.productName || row?.product_name || row?.name || "—";
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
                className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-[var(--app-fg)]">
                      {name}
                    </div>
                    <div className="mt-1 text-xs app-muted">
                      SKU: <b>{sku}</b>{" "}
                      {pid != null ? (
                        <>
                          • Product: <b>#{String(pid)}</b>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs app-muted">On hand</div>
                    <div className="text-lg font-extrabold text-[var(--app-fg)]">
                      {qty}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <StatSurface label="Selling price" value={selling} />
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
                      Proof
                    </div>
                    <div className="mt-2 flex justify-end">
                      {pid != null ? (
                        <button
                          className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--app-fg)] hover:bg-[var(--hover)]"
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
                        <span className="text-xs app-muted">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {!invLoading && filteredInventory.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-6 text-sm app-muted">
              No inventory rows.
            </div>
          ) : null}
        </div>
      </PanelCard>

      <PanelCard
        title={`Products (${showArchivedProducts ? "Archived" : "Active"})`}
        hint="Archive, restore, or delete products."
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <FieldInput
            placeholder="Search products (id, name, sku)"
            value={prodQ}
            onChange={(e) => setProdQ(e.target.value)}
          />

          <label className="flex items-center gap-2 text-sm font-semibold text-[var(--app-fg)]">
            <input
              type="checkbox"
              checked={showArchivedProducts}
              onChange={(e) => {
                setShowArchivedProducts(e.target.checked);
                loadProducts({ includeInactive: e.target.checked });
                loadInventory();
              }}
            />
            Show archived
          </label>
        </div>

        <div className="grid gap-3">
          {(filteredProducts || []).slice(0, 50).map((p) => {
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
                className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-extrabold text-[var(--app-fg)]">
                        {p?.name || p?.productName || p?.title || "—"}
                      </div>
                      <span className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--app-fg)]">
                        {archived ? "ARCHIVED" : "ACTIVE"}
                      </span>
                      {isUnpriced ? (
                        <span className="rounded-full border border-[var(--warn-border)] bg-[var(--warn-bg)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--warn-fg)]">
                          UNPRICED
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs app-muted">
                      SKU: <b>{p?.sku || "—"}</b> • Selling:{" "}
                      <b>{selling == null ? "—" : money(selling)}</b>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] hover:bg-[var(--hover)]"
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

                    <button
                      className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] hover:bg-[var(--hover)]"
                      onClick={() =>
                        archived ? openRestoreProduct(p) : openArchiveProduct(p)
                      }
                    >
                      {archived ? "Restore" : "Archive"}
                    </button>

                    <button
                      className="rounded-2xl bg-[var(--danger-fg)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                      onClick={() => openDeleteProduct(p)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {!prodLoading && filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-6 text-sm app-muted">
              No products.
            </div>
          ) : null}
        </div>
      </PanelCard>
    </div>
  );
}

function ArrivalsSection({
  arrivalsLoading,
  arrivalsNormalized,
  loadArrivals,
}) {
  return (
    <PanelCard
      title="Stock arrivals"
      hint="Incoming stock records + attached documents."
    >
      <div className="mb-4 flex justify-end">
        <button
          onClick={loadArrivals}
          className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] hover:bg-[var(--hover)]"
        >
          Reload
        </button>
      </div>

      {arrivalsLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4"
            >
              <div className="h-6 animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800/70" />
            </div>
          ))}
        </div>
      ) : arrivalsNormalized.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-6 text-sm app-muted">
          No arrivals yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {arrivalsNormalized.map((a) => {
            const raw = a.raw;
            return (
              <details
                key={String(a.id)}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
              >
                <summary className="cursor-pointer list-none">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-[var(--app-fg)]">
                        {a.productName}
                      </div>
                      <div className="mt-1 text-xs app-muted">
                        Qty: <b>{String(a.qty)}</b>
                      </div>
                      <div className="mt-1 text-xs app-muted">{a.when}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs app-muted">Arrival</div>
                      <div className="text-sm font-bold text-[var(--app-fg)]">
                        #{a.id}
                      </div>
                    </div>
                  </div>
                </summary>

                <div className="mt-4 grid gap-3">
                  {raw?.notes ? (
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--card-2)] p-3 text-sm text-[var(--app-fg)]">
                      <b>Notes:</b> {String(raw.notes)}
                    </div>
                  ) : null}

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                      Files
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Array.isArray(raw?.documents) &&
                      raw.documents.length > 0 ? (
                        raw.documents.map((d) => (
                          <a
                            key={d?.id || d?.fileUrl || d?.url}
                            href={(() => {
                              const rawUrl = d?.fileUrl || d?.url || "";
                              if (!rawUrl) return "#";
                              const API_BASE =
                                process.env.NEXT_PUBLIC_API_BASE ||
                                process.env.NEXT_PUBLIC_API_BASE_URL ||
                                "http://localhost:4000";
                              return /^https?:\/\//i.test(rawUrl)
                                ? rawUrl
                                : `${API_BASE}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;
                            })()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-xs font-semibold text-[var(--app-fg)] hover:bg-[var(--hover)]"
                          >
                            Open file
                          </a>
                        ))
                      ) : (
                        <div className="text-sm app-muted">No files.</div>
                      )}
                    </div>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </PanelCard>
  );
}

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
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4 text-sm text-[var(--app-fg)]">
        <div className="font-semibold">How to use</div>
        <div className="mt-1 app-muted">
          Choose entity, enter record code, then open proof.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <select
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--app-fg)]"
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

        <div className="md:col-span-2">
          <FieldInput
            placeholder="Record code"
            value={evEntityId}
            onChange={(e) => setEvEntityId(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <FieldInput
          type="date"
          value={evFrom}
          onChange={(e) => setEvFrom(e.target.value)}
        />
        <FieldInput
          type="date"
          value={evTo}
          onChange={(e) => setEvTo(e.target.value)}
        />
        <FieldInput
          placeholder="Action"
          value={evAction}
          onChange={(e) => setEvAction(e.target.value)}
        />
        <FieldInput
          placeholder="User id"
          value={evUserId}
          onChange={(e) => setEvUserId(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <FieldInput
            placeholder="Search words"
            value={evQ}
            onChange={(e) => setEvQ(e.target.value)}
          />
        </div>
        <select
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--app-fg)]"
          value={String(evLimit)}
          onChange={(e) => setEvLimit(Number(e.target.value || 200))}
        >
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="200">200</option>
          <option value="300">300</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-2xl bg-[var(--app-fg)] px-4 py-2.5 text-sm font-semibold text-[var(--app-bg)] hover:opacity-90"
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
          className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] hover:bg-[var(--hover)]"
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
