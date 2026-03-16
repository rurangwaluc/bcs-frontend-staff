"use client";

import { normalizeList, toStr } from "../../admin/adminShared";
import { useCallback, useMemo, useState } from "react";

import { apiFetch } from "../../../lib/api";

export const ENDPOINTS = {
  ADMIN_DASH: "/admin/dashboard",

  SALES_LIST: "/sales",
  SALES_CREATE: "/sales",
  SALE_GET: (id) => `/sales/${id}`,
  SALE_MARK: (id) => `/sales/${id}/mark`,
  SALE_CANCEL: (id) => `/sales/${id}/cancel`,

  CUSTOMERS_SEARCH: (q) =>
    `/customers/search?q=${encodeURIComponent(String(q || "").trim())}`,
  CUSTOMERS_CREATE: "/customers",

  INVENTORY_LIST: "/inventory",
  PRODUCTS_LIST: "/products",
  PRODUCT_CREATE: "/products",

  INVENTORY_ARRIVALS_LIST: "/inventory/arrivals",
  INVENTORY_ARRIVALS_CREATE: "/inventory/arrivals",

  INV_ADJ_REQ_LIST: "/inventory-adjust-requests",
  INV_ADJ_REQ_CREATE: "/inventory-adjust-requests",
  INV_ADJ_REQ_MINE: "/inventory-adjust-requests/mine",

  PRODUCT_ARCHIVE: (id) => `/products/${id}/archive`,
  PRODUCT_RESTORE: (id) => `/products/${id}/restore`,
  PRODUCT_DELETE: (id) => `/products/${id}`,

  PAYMENTS_LIST: "/payments",
  PAYMENTS_SUMMARY: "/payments/summary",
  PAYMENT_RECORD: "/payments",

  CASH_SESSIONS_MINE: "/cash-sessions/mine",
  CASH_SESSION_OPEN: "/cash-sessions/open",
  CASH_SESSION_CLOSE: (id) => `/cash-sessions/${id}/close`,

  CREDITS_OPEN: "/credits/open",
  USERS_LIST: "/users",

  SUPPLIERS_LIST: "/suppliers",
  SUPPLIER_BILLS_LIST: "/supplier-bills",
  SUPPLIER_SUMMARY: "/supplier/summary",
  SUPPLIER_CREATE: "/suppliers",
  SUPPLIER_BILL_CREATE: "/supplier-bills",

  COVERAGE_CURRENT: "/admin/coverage/current",
  COVERAGE_START: "/admin/coverage/start",
  COVERAGE_STOP: "/admin/coverage/stop",
};

export const SECTIONS = [
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
  { key: "audit", label: "Audit" },
  { key: "evidence", label: "Proof & history" },
];

export const COVERAGE_DEFAULT_SECTION = {
  store_keeper: "inventory",
  cashier: "payments",
  seller: "sales",
  manager: "dashboard",
};

export const PAGE_SIZE = 10;

function readList(data, keys = []) {
  return normalizeList(data, [...keys, "items", "rows", "results", "data"]);
}

export function useAdminDataLoaders({ toast }) {
  const [dash, setDash] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);

  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);

  const [awaitingPaymentSales, setAwaitingPaymentSales] = useState([]);
  const [awaitingPaymentSalesLoading, setAwaitingPaymentSalesLoading] =
    useState(false);

  const [inventory, setInventory] = useState([]);
  const [invLoading, setInvLoading] = useState(false);

  const [products, setProducts] = useState([]);
  const [prodLoading, setProdLoading] = useState(false);
  const [showArchivedProducts, setShowArchivedProducts] = useState(false);

  const [arrivals, setArrivals] = useState([]);
  const [arrivalsLoading, setArrivalsLoading] = useState(false);

  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsSummary, setPaymentsSummary] = useState(null);
  const [paySummaryLoading, setPaySummaryLoading] = useState(false);
  const [canReadPayments, setCanReadPayments] = useState(true);

  const [creditsLoading, setCreditsLoading] = useState(false);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [invReqPendingCount, setInvReqPendingCount] = useState(0);
  const [invReqCountLoading, setInvReqCountLoading] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelSaleId, setCancelSaleId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelState, setCancelState] = useState("idle");

  const [archOpen, setArchOpen] = useState(false);
  const [archMode, setArchMode] = useState("archive");
  const [archProduct, setArchProduct] = useState(null);
  const [archReason, setArchReason] = useState("");
  const [archState, setArchState] = useState("idle");

  const [delOpen, setDelOpen] = useState(false);
  const [delProduct, setDelProduct] = useState(null);
  const [delState, setDelState] = useState("idle");

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
  }, [toast]);

  const loadSales = useCallback(async () => {
    setSalesLoading(true);
    try {
      const data = await apiFetch(`${ENDPOINTS.SALES_LIST}?limit=200`, {
        method: "GET",
      });
      setSales(readList(data, ["sales"]));
    } catch (e) {
      setSales([]);
      toast("danger", e?.data?.error || e?.message || "Failed to load sales");
    } finally {
      setSalesLoading(false);
    }
  }, [toast]);

  const loadAwaitingPaymentSales = useCallback(async () => {
    setAwaitingPaymentSalesLoading(true);
    try {
      let list = [];

      try {
        const qs = new URLSearchParams();
        qs.set("status", "AWAITING_PAYMENT_RECORD");
        qs.set("limit", "200");

        const filteredData = await apiFetch(
          `${ENDPOINTS.SALES_LIST}?${qs.toString()}`,
          { method: "GET" },
        );
        list = readList(filteredData, ["sales"]);
      } catch {
        list = [];
      }

      if (!Array.isArray(list) || list.length === 0) {
        const fallbackData = await apiFetch(
          `${ENDPOINTS.SALES_LIST}?limit=200`,
          {
            method: "GET",
          },
        );
        list = readList(fallbackData, ["sales"]);
      }

      setAwaitingPaymentSales(Array.isArray(list) ? list : []);
    } catch (e) {
      setAwaitingPaymentSales([]);
      toast(
        "danger",
        e?.data?.error || e?.message || "Failed to load awaiting payment sales",
      );
    } finally {
      setAwaitingPaymentSalesLoading(false);
    }
  }, [toast]);

  const loadInventory = useCallback(async () => {
    setInvLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.INVENTORY_LIST, { method: "GET" });
      setInventory(readList(data, ["inventory"]));
    } catch (e) {
      setInventory([]);
      toast(
        "danger",
        e?.data?.error || e?.message || "Failed to load inventory",
      );
    } finally {
      setInvLoading(false);
    }
  }, [toast]);

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
        setProducts(readList(data, ["products", "pricing"]));
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
    [showArchivedProducts, toast],
  );

  const loadArrivals = useCallback(async () => {
    setArrivalsLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.INVENTORY_ARRIVALS_LIST, {
        method: "GET",
      });
      setArrivals(readList(data, ["arrivals"]));
    } catch (e) {
      setArrivals([]);
      toast(
        "danger",
        e?.data?.error || e?.message || "Failed to load arrivals",
      );
    } finally {
      setArrivalsLoading(false);
    }
  }, [toast]);

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.PAYMENTS_LIST, { method: "GET" });
      setPayments(readList(data, ["payments"]));
      setCanReadPayments(true);
    } catch (e) {
      setPayments([]);
      const text = e?.data?.error || e?.message || "";
      if (String(text).toLowerCase().includes("forbidden")) {
        setCanReadPayments(false);
        return;
      }
      if (!String(text).toLowerCase().includes("not found")) {
        toast(
          "danger",
          e?.data?.error || e?.message || "Failed to load payments",
        );
      }
    } finally {
      setPaymentsLoading(false);
    }
  }, [toast]);

  const loadPaymentsSummary = useCallback(async () => {
    setPaySummaryLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.PAYMENTS_SUMMARY, {
        method: "GET",
      });
      setPaymentsSummary(data?.summary || data || null);
      setCanReadPayments(true);
    } catch (e) {
      setPaymentsSummary(null);
      const text = e?.data?.error || e?.message || "";
      if (String(text).toLowerCase().includes("forbidden")) {
        setCanReadPayments(false);
        return;
      }
      if (!String(text).toLowerCase().includes("not found")) {
        toast(
          "danger",
          e?.data?.error || e?.message || "Failed to load payment summary",
        );
      }
    } finally {
      setPaySummaryLoading(false);
    }
  }, [toast]);

  const loadCreditsOpen = useCallback(async () => {
    setCreditsLoading(true);
    try {
      await apiFetch(ENDPOINTS.CREDITS_OPEN, { method: "GET" });
    } catch {
      // silent
    } finally {
      setCreditsLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.USERS_LIST, { method: "GET" });
      setUsers(readList(data, ["users"]));
    } catch (e) {
      setUsers([]);
      toast("danger", e?.data?.error || e?.message || "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  }, [toast]);

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

      const rows = readList(data, [
        "requests",
        "adjustRequests",
        "inventoryAdjustRequests",
      ]);
      setInvReqPendingCount(Array.isArray(rows) ? rows.length : 0);
    } catch {
      // silent
    } finally {
      setInvReqCountLoading(false);
    }
  }, [invReqCountLoading]);

  const openCancel = useCallback((id) => {
    if (!id) return;
    setCancelSaleId(Number(id));
    setCancelReason("");
    setCancelState("idle");
    setCancelOpen(true);
  }, []);

  const confirmCancel = useCallback(async () => {
    if (!cancelSaleId) return;

    setCancelState("loading");
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

      await Promise.all([loadSales(), loadAwaitingPaymentSales()]);
    } catch (e) {
      setCancelState("idle");
      toast("danger", e?.data?.error || e?.message || "Cancel failed");
    }
  }, [cancelSaleId, cancelReason, loadSales, loadAwaitingPaymentSales, toast]);

  const openArchiveProduct = useCallback((prod) => {
    if (!prod?.id) return;
    setArchMode("archive");
    setArchProduct(prod);
    setArchReason("");
    setArchState("idle");
    setArchOpen(true);
  }, []);

  const openRestoreProduct = useCallback((prod) => {
    if (!prod?.id) return;
    setArchMode("restore");
    setArchProduct(prod);
    setArchReason("");
    setArchState("idle");
    setArchOpen(true);
  }, []);

  const confirmArchiveRestore = useCallback(async () => {
    const pid = archProduct?.id;
    if (!pid) return;

    setArchState("loading");
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
  }, [
    archProduct,
    archMode,
    archReason,
    loadProducts,
    loadInventory,
    showArchivedProducts,
    toast,
  ]);

  const openDeleteProduct = useCallback((prod) => {
    if (!prod?.id) return;
    setDelProduct(prod);
    setDelState("idle");
    setDelOpen(true);
  }, []);

  const confirmDeleteProduct = useCallback(async () => {
    const pid = delProduct?.id;
    if (!pid) return;

    setDelState("loading");
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
  }, [delProduct, loadProducts, loadInventory, showArchivedProducts, toast]);

  const cancelModalProps = useMemo(
    () => ({
      open: cancelOpen,
      cancelSaleId,
      cancelReason,
      setCancelReason,
      cancelState,
      setCancelOpen,
      setCancelSaleId,
      setCancelState,
      onConfirm: confirmCancel,
    }),
    [cancelOpen, cancelSaleId, cancelReason, cancelState, confirmCancel],
  );

  const archiveModalProps = useMemo(
    () => ({
      open: archOpen,
      archMode,
      archProduct,
      archReason,
      setArchReason,
      archState,
      setArchOpen,
      setArchProduct,
      setArchState,
      onConfirm: confirmArchiveRestore,
    }),
    [
      archOpen,
      archMode,
      archProduct,
      archReason,
      archState,
      confirmArchiveRestore,
    ],
  );

  const deleteModalProps = useMemo(
    () => ({
      open: delOpen,
      delProduct,
      delState,
      setDelOpen,
      setDelProduct,
      setDelState,
      onConfirm: confirmDeleteProduct,
    }),
    [delOpen, delProduct, delState, confirmDeleteProduct],
  );

  const suppliersPanelProps = useMemo(
    () => ({
      title: "Suppliers",
      subtitle: "Admin: create suppliers, bills, and bill payments.",
      capabilities: {
        canCreateSupplier: true,
        canCreateBill: true,
        canRecordBillPayment: true,
      },
      endpoints: {
        SUPPLIERS_LIST: ENDPOINTS.SUPPLIERS_LIST,
        SUPPLIER_CREATE: ENDPOINTS.SUPPLIER_CREATE,
        SUPPLIER_SUMMARY: ENDPOINTS.SUPPLIER_SUMMARY,
        SUPPLIER_BILLS_LIST: ENDPOINTS.SUPPLIER_BILLS_LIST,
        SUPPLIER_BILL_CREATE: ENDPOINTS.SUPPLIER_BILL_CREATE,
      },
    }),
    [],
  );

  return {
    dash,
    dashLoading,
    loadAdminDash,

    sales,
    salesLoading,
    loadSales,

    awaitingPaymentSales,
    awaitingPaymentSalesLoading,
    loadAwaitingPaymentSales,

    inventory,
    invLoading,
    loadInventory,

    products,
    prodLoading,
    showArchivedProducts,
    setShowArchivedProducts,
    loadProducts,

    arrivals,
    arrivalsLoading,
    loadArrivals,

    payments,
    paymentsLoading,
    paymentsSummary,
    paySummaryLoading,
    canReadPayments,
    loadPayments,
    loadPaymentsSummary,

    creditsLoading,
    loadCreditsOpen,

    users,
    usersLoading,
    loadUsers,

    invReqPendingCount,
    invReqCountLoading,
    loadInvReqPendingCount,

    openCancel,
    openArchiveProduct,
    openRestoreProduct,
    openDeleteProduct,

    cancelModalProps,
    archiveModalProps,
    deleteModalProps,

    suppliersPanelProps,
  };
}
