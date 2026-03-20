"use client";

import {
  COVERAGE_DEFAULT_SECTION,
  useAdminDataLoaders,
} from "./useAdminDataLoaders";
import {
  resolveRoleFromUser,
  resolveUserFromMePayload,
  useAdminCoverage,
} from "./useAdminCoverage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getMe } from "../../../lib/auth";
import { useAdminCashierCoverage } from "./useAdminCashierCoverage";
import { useAdminDerivedState } from "./useAdminDerivedState";
import { useAdminSellerCoverage } from "./useAdminSellerCoverage";
import { useAdminStoreKeeperCoverage } from "./useAdminStoreKeeperCoverage";

export function useAdminPageState({ router }) {
  const [bootLoading, setBootLoading] = useState(true);
  const [me, setMe] = useState(null);

  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info");

  const [section, setSection] = useState("dashboard");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [refreshState, setRefreshState] = useState("idle");

  const [salesQ, setSalesQ] = useState("");
  const [salesStatusFilter, setSalesStatusFilter] = useState("ALL");
  const [salesFrom, setSalesFrom] = useState("");
  const [salesTo, setSalesTo] = useState("");
  const [salesPage, setSalesPage] = useState(1);

  const [invQ, setInvQ] = useState("");
  const [prodQ, setProdQ] = useState("");
  const [paymentsPage, setPaymentsPage] = useState(1);

  const loadedSectionsRef = useRef(new Set());
  const previousCoverageRoleRef = useRef(null);

  const toast = useCallback((kind, text) => {
    setMsgKind(kind || "info");
    setMsg(text || "");
  }, []);

  const data = useAdminDataLoaders({ toast });

  const cashier = useAdminCashierCoverage({
    toast,
    sales: data.awaitingPaymentSales,
    salesQ,
    setSalesQ,
    payments: data.payments,
    loadSales: data.loadAwaitingPaymentSales,
    loadPayments: data.loadPayments,
    loadPaymentsSummary: data.loadPaymentsSummary,
  });

  const storeKeeper = useAdminStoreKeeperCoverage({
    toast,
    products: data.products,
    inventory: data.inventory,
    sales: data.sales,
    salesLoading: data.salesLoading,
    loadSales: data.loadSales,
    loadProducts: data.loadProducts,
    loadInventory: data.loadInventory,
    loadArrivals: data.loadArrivals,
    loadInvReqPendingCount: data.loadInvReqPendingCount,
  });

  const seller = useAdminSellerCoverage({
    toast,
    me,
    products: data.products,
    productsLoading: data.prodLoading,
    loadProducts: data.loadProducts,
    sales: data.sales,
    salesLoading: data.salesLoading,
    loadSales: data.loadSales,
    loadCreditsOpen: data.loadCreditsOpen,
  });

  const loadCoverageWorkspaceForRole = useCallback(
    async (role, nextSection) => {
      const r = String(role || "")
        .trim()
        .toLowerCase();

      setSection(nextSection || COVERAGE_DEFAULT_SECTION[r] || "dashboard");

      if (r === "store_keeper") {
        await Promise.all([
          data.loadInventory(),
          data.loadProducts({ includeInactive: false }),
          data.loadArrivals(),
          data.loadSales(),
          data.loadInvReqPendingCount(),
          storeKeeper.loadMyAdjustRequests(),
        ]);
        return;
      }

      if (r === "cashier") {
        await Promise.all([
          data.loadPaymentsSummary(),
          data.loadPayments(),
          data.loadAwaitingPaymentSales(),
          cashier.loadSessions(),
        ]);
        return;
      }

      if (r === "seller") {
        seller.setSellerSection("dashboard");
        await Promise.all([
          data.loadSales(),
          data.loadProducts({ includeInactive: false }),
          data.loadCreditsOpen(),
        ]);
        return;
      }

      if (r === "manager") {
        await Promise.all([
          data.loadAdminDash(),
          data.loadInventory(),
          data.loadProducts({ includeInactive: false }),
          data.loadSales(),
          data.loadInvReqPendingCount(),
          data.loadCreditsOpen(),
        ]);
      }
    },
    [
      data.loadInventory,
      data.loadProducts,
      data.loadArrivals,
      data.loadSales,
      data.loadInvReqPendingCount,
      data.loadPaymentsSummary,
      data.loadPayments,
      data.loadAwaitingPaymentSales,
      data.loadAdminDash,
      data.loadCreditsOpen,
      storeKeeper.loadMyAdjustRequests,
      cashier.loadSessions,
      seller.setSellerSection,
    ],
  );

  const coverage = useAdminCoverage({
    toast,
    loadCoverageWorkspaceForRole,
    onCoverageStopped: () => {
      loadedSectionsRef.current.delete("inventory");
      loadedSectionsRef.current.delete("arrivals");
      loadedSectionsRef.current.delete("inv_requests");
      loadedSectionsRef.current.delete("sales");
      loadedSectionsRef.current.delete("payments");
      setSection("dashboard");
    },
  });

  const derived = useAdminDerivedState({
    router,

    refreshNonce,

    sales: data.sales,
    salesQ,
    salesStatusFilter,
    salesFrom,
    salesTo,
    salesPage,

    inventory: data.inventory,
    invQ,

    products: data.products,
    prodQ,
    showArchivedProducts: data.showArchivedProducts,

    arrivals: data.arrivals,

    invReqPendingCount: data.invReqPendingCount,

    loadSales: data.loadSales,
    loadInventory: data.loadInventory,
    loadProducts: data.loadProducts,
    loadArrivals: data.loadArrivals,
    loadPayments: data.loadPayments,
    loadPaymentsSummary: data.loadPaymentsSummary,
    loadInvReqPendingCount: data.loadInvReqPendingCount,

    dash: data.dash,
    dashLoading: data.dashLoading,

    payments: data.payments,
    paymentsLoading: data.paymentsLoading,
    paymentsSummary: data.paymentsSummary,
    paySummaryLoading: data.paySummaryLoading,
    coverage: coverage.coverage,
    paymentsPage,
    setPaymentsPage,

    openCancel: data.openCancel,
    openArchiveProduct: data.openArchiveProduct,
    openRestoreProduct: data.openRestoreProduct,
    openDeleteProduct: data.openDeleteProduct,
  });

  useEffect(() => {
    let alive = true;

    (async () => {
      setBootLoading(true);
      try {
        const payload = await getMe();
        if (!alive) return;

        const user = resolveUserFromMePayload(payload);
        const role = resolveRoleFromUser(user);

        setMe(user);

        if (!role) {
          router.replace("/login");
          return;
        }

        if (role !== "admin" && role !== "owner") {
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

  const normalizedRole = resolveRoleFromUser(me);
  const isAuthorized =
    !!me && (normalizedRole === "admin" || normalizedRole === "owner");

  useEffect(() => {
    if (!isAuthorized) return;

    coverage.loadCoverage();

    const shouldPollInvReqCount = section !== "inv_requests";

    if (shouldPollInvReqCount) {
      data.loadInvReqPendingCount();
    }

    const t = shouldPollInvReqCount
      ? setInterval(() => {
          data.loadInvReqPendingCount();
        }, 30000)
      : null;

    function onVis() {
      if (typeof document === "undefined" || document.hidden) return;

      coverage.loadCoverage();

      if (section !== "inv_requests") {
        data.loadInvReqPendingCount();
      }
    }

    document.addEventListener("visibilitychange", onVis);

    return () => {
      if (t) clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [
    isAuthorized,
    section,
    coverage.loadCoverage,
    data.loadInvReqPendingCount,
  ]);

  useEffect(() => {
    const prev = previousCoverageRoleRef.current;
    const next = coverage.coverageRole;

    if (!prev && next) {
      const nextSection = COVERAGE_DEFAULT_SECTION[next] || "dashboard";
      loadedSectionsRef.current.delete(nextSection);
      setSection(nextSection);

      if (next === "seller") {
        seller.setSellerSection("dashboard");
      }
    }

    if (prev && !next) {
      loadedSectionsRef.current.delete("dashboard");
      loadedSectionsRef.current.delete("payments");
      loadedSectionsRef.current.delete("sales");
      loadedSectionsRef.current.delete("inventory");
      loadedSectionsRef.current.delete("arrivals");
      loadedSectionsRef.current.delete("inv_requests");
      loadedSectionsRef.current.delete("credits");
    }

    previousCoverageRoleRef.current = next || null;
  }, [coverage.coverageRole, seller.setSellerSection]);

  useEffect(() => {
    if (!isAuthorized) return;
    if (loadedSectionsRef.current.has(section)) return;

    loadedSectionsRef.current.add(section);

    (async () => {
      if (section === "dashboard") {
        await Promise.all([
          data.loadAdminDash(),
          data.loadSales(),
          data.loadInventory(),
          data.loadProducts({ includeInactive: data.showArchivedProducts }),
          data.loadPaymentsSummary(),
          data.loadPayments(),
          data.loadArrivals(),
          data.loadInvReqPendingCount(),
        ]);
        return;
      }

      if (section === "sales") {
        if (coverage.isSellerCoverage) {
          await Promise.all([
            data.loadSales(),
            data.loadProducts({ includeInactive: false }),
            data.loadCreditsOpen(),
          ]);
        } else if (coverage.isStoreKeeperCoverage) {
          await Promise.all([
            data.loadSales(),
            data.loadProducts({ includeInactive: false }),
            data.loadInventory(),
          ]);
        } else {
          await data.loadSales();
        }
        return;
      }

      if (section === "payments") {
        if (coverage.isCashierCoverage) {
          await Promise.all([
            data.loadPaymentsSummary(),
            data.loadPayments(),
            data.loadAwaitingPaymentSales(),
            cashier.loadSessions(),
          ]);
        } else {
          await Promise.all([data.loadPaymentsSummary(), data.loadPayments()]);
        }
        return;
      }

      if (section === "inventory") {
        if (coverage.isStoreKeeperCoverage || coverage.isManagerCoverage) {
          await Promise.all([
            data.loadInventory(),
            data.loadProducts({ includeInactive: false }),
          ]);
        } else {
          await Promise.all([
            data.loadInventory(),
            data.loadProducts({ includeInactive: data.showArchivedProducts }),
          ]);
        }
        return;
      }

      if (section === "arrivals") {
        if (coverage.isStoreKeeperCoverage) {
          await Promise.all([
            data.loadArrivals(),
            data.loadInventory(),
            data.loadProducts({ includeInactive: false }),
          ]);
        } else {
          await data.loadArrivals();
        }
        return;
      }

      if (section === "pricing") {
        await data.loadProducts({ includeInactive: true });
        return;
      }

      if (section === "inv_requests") {
        if (coverage.isStoreKeeperCoverage) {
          await Promise.all([
            storeKeeper.loadMyAdjustRequests(),
            data.loadInvReqPendingCount(),
            data.loadInventory(),
            data.loadProducts({ includeInactive: false }),
          ]);
        } else {
          await data.loadInvReqPendingCount();
        }
        return;
      }

      if (section === "credits") {
        await data.loadCreditsOpen();
        return;
      }

      if (section === "users") {
        await data.loadUsers();
      }
    })().catch(() => {});
  }, [
    isAuthorized,
    section,
    coverage.isCashierCoverage,
    coverage.isStoreKeeperCoverage,
    coverage.isSellerCoverage,
    coverage.isManagerCoverage,
    data.loadAdminDash,
    data.loadSales,
    data.loadInventory,
    data.loadProducts,
    data.showArchivedProducts,
    data.loadPaymentsSummary,
    data.loadPayments,
    data.loadAwaitingPaymentSales,
    data.loadArrivals,
    data.loadInvReqPendingCount,
    data.loadCreditsOpen,
    data.loadUsers,
    cashier.loadSessions,
    storeKeeper.loadMyAdjustRequests,
  ]);

  useEffect(() => {
    setPaymentsPage(1);
  }, [data.payments]);

  useEffect(() => {
    setSalesPage(1);
  }, [salesQ, salesStatusFilter, salesFrom, salesTo]);

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
        if (section === "inv_requests") {
          if (coverage.isStoreKeeperCoverage) {
            await Promise.all([
              storeKeeper.loadMyAdjustRequests(),
              data.loadInvReqPendingCount(),
              data.loadInventory(),
              data.loadProducts({ includeInactive: false }),
            ]);
          } else {
            await data.loadInvReqPendingCount();
          }
        }

        if (section === "pricing") {
          await data.loadProducts({ includeInactive: true });
        }

        if (section === "users") {
          await data.loadUsers();
        }

        if (section === "credits") {
          await data.loadCreditsOpen();
        }

        await coverage.loadCoverage();

        setRefreshNonce((n) => n + 1);
        setRefreshState("success");
        setTimeout(() => setRefreshState("idle"), 900);
        return;
      }

      if (section === "dashboard") {
        await Promise.all([
          data.loadAdminDash(),
          data.loadSales(),
          data.loadInventory(),
          data.loadProducts({ includeInactive: data.showArchivedProducts }),
          data.loadPaymentsSummary(),
          data.loadPayments(),
          data.loadArrivals(),
          data.loadInvReqPendingCount(),
        ]);
      } else if (section === "sales") {
        if (coverage.isSellerCoverage) {
          await Promise.all([
            data.loadSales(),
            data.loadProducts({ includeInactive: false }),
            data.loadCreditsOpen(),
          ]);
        } else if (coverage.isStoreKeeperCoverage) {
          await Promise.all([
            data.loadSales(),
            data.loadProducts({ includeInactive: false }),
            data.loadInventory(),
          ]);
        } else {
          await data.loadSales();
        }
      } else if (section === "payments") {
        if (coverage.isCashierCoverage) {
          await Promise.all([
            data.loadPaymentsSummary(),
            data.loadPayments(),
            data.loadAwaitingPaymentSales(),
            cashier.loadSessions(),
          ]);
        } else {
          await Promise.all([data.loadPaymentsSummary(), data.loadPayments()]);
        }
      } else if (section === "inventory") {
        if (coverage.isStoreKeeperCoverage || coverage.isManagerCoverage) {
          await Promise.all([
            data.loadInventory(),
            data.loadProducts({ includeInactive: false }),
          ]);
        } else {
          await Promise.all([
            data.loadInventory(),
            data.loadProducts({ includeInactive: data.showArchivedProducts }),
          ]);
        }
      } else if (section === "arrivals") {
        if (coverage.isStoreKeeperCoverage) {
          await Promise.all([
            data.loadArrivals(),
            data.loadInventory(),
            data.loadProducts({ includeInactive: false }),
          ]);
        } else {
          await data.loadArrivals();
        }
      }

      await coverage.loadCoverage();

      setRefreshState("success");
      setTimeout(() => setRefreshState("idle"), 900);
    } catch (e) {
      setRefreshState("idle");
      toast("danger", e?.data?.error || e?.message || "Refresh failed");
    }
  }, [
    section,
    coverage.isCashierCoverage,
    coverage.isStoreKeeperCoverage,
    coverage.isSellerCoverage,
    coverage.isManagerCoverage,
    coverage.loadCoverage,
    data.loadAdminDash,
    data.loadSales,
    data.loadInventory,
    data.loadProducts,
    data.showArchivedProducts,
    data.loadPaymentsSummary,
    data.loadPayments,
    data.loadAwaitingPaymentSales,
    data.loadArrivals,
    data.loadInvReqPendingCount,
    data.loadUsers,
    data.loadCreditsOpen,
    cashier.loadSessions,
    storeKeeper.loadMyAdjustRequests,
    toast,
  ]);

  const dashboardProps = derived.dashboardProps;

  const salesProps = useMemo(
    () => ({
      ...derived.salesProps,
      salesLoading: data.salesLoading,
      salesQ,
      setSalesQ,
      salesStatusFilter,
      setSalesStatusFilter,
      salesFrom,
      setSalesFrom,
      salesTo,
      setSalesTo,
      setSalesPage,
    }),
    [
      derived.salesProps,
      data.salesLoading,
      salesQ,
      setSalesQ,
      salesStatusFilter,
      setSalesStatusFilter,
      salesFrom,
      setSalesFrom,
      salesTo,
      setSalesTo,
    ],
  );

  const paymentsProps = useMemo(
    () => ({
      ...derived.paymentsProps,
      paymentsLoading: data.paymentsLoading,
      paymentsSummary: data.paymentsSummary,
      paySummaryLoading: data.paySummaryLoading,
    }),
    [
      derived.paymentsProps,
      data.paymentsLoading,
      data.paymentsSummary,
      data.paySummaryLoading,
    ],
  );

  const cashierCoverageProps = useMemo(
    () => ({
      coverage: coverage.coverage,
      sessionsProps: {
        currentOpenSession: cashier.currentOpenSession,
        sessions: cashier.raw.sessions,
        sessionsLoading: cashier.raw.sessionsLoading,
        openingBalance: cashier.raw.openingBalance,
        setOpeningBalance: cashier.raw.setOpeningBalance,
        openBtnState: cashier.raw.openBtnState,
        closeNote: cashier.raw.closeNote,
        setCloseNote: cashier.raw.setCloseNote,
        closeBtnState: cashier.raw.closeBtnState,
        loadSessions: cashier.loadSessions,
        money: cashier.sessionsProps.money,
        safeDate: cashier.sessionsProps.safeDate,
        onOpenSession: cashier.sessionsProps.onOpenSession,
        onCloseSession: cashier.sessionsProps.onCloseSession,
      },
      paymentsProps: {
        salesLoading: data.awaitingPaymentSalesLoading,
        loadSales: data.loadAwaitingPaymentSales,
        salesQ,
        setSalesQ,
        awaitingSales: cashier.awaitingSales,
        selectedSale: cashier.raw.selectedSale,
        setSelectedSale: cashier.raw.setSelectedSale,
        amount: cashier.raw.amount,
        setAmount: cashier.raw.setAmount,
        method: cashier.raw.method,
        setMethod: cashier.raw.setMethod,
        note: cashier.raw.note,
        setNote: cashier.raw.setNote,
        methods: cashier.paymentsProps.methods,
        paymentBtnState: cashier.raw.paymentBtnState,
        currentOpenSession: cashier.currentOpenSession,
        getSellerPaymentMethodFromSale:
          cashier.paymentsProps.getSellerPaymentMethodFromSale,
        ensureSaleDetails: cashier.paymentsProps.ensureSaleDetails,
        saleDetailsById: cashier.raw.saleDetailsById,
        saleDetailsLoadingById: cashier.raw.saleDetailsLoadingById,
        itemsSummary: cashier.paymentsProps.itemsSummary,
        money: cashier.paymentsProps.money,
        safeDate: cashier.paymentsProps.safeDate,
        payments: data.payments,
        paymentsLoading: data.paymentsLoading,
        payQ: cashier.raw.payQ,
        setPayQ: cashier.raw.setPayQ,
        canReadPayments: data.canReadPayments,
        loadSummary: data.loadPaymentsSummary,
        loadPayments: data.loadPayments,
        paymentAmountStatus: cashier.paymentAmountStatus,
        selectedSaleExpectedAmount: cashier.selectedSaleExpectedAmount,
        onSubmitPayment: cashier.paymentsProps.onSubmitPayment,
      },
    }),
    [
      coverage.coverage,
      cashier.currentOpenSession,
      cashier.raw.sessions,
      cashier.raw.sessionsLoading,
      cashier.raw.openingBalance,
      cashier.raw.setOpeningBalance,
      cashier.raw.openBtnState,
      cashier.raw.closeNote,
      cashier.raw.setCloseNote,
      cashier.raw.closeBtnState,
      cashier.loadSessions,
      cashier.sessionsProps.money,
      cashier.sessionsProps.safeDate,
      cashier.sessionsProps.onOpenSession,
      cashier.sessionsProps.onCloseSession,
      data.awaitingPaymentSalesLoading,
      data.loadAwaitingPaymentSales,
      salesQ,
      setSalesQ,
      cashier.awaitingSales,
      cashier.raw.selectedSale,
      cashier.raw.setSelectedSale,
      cashier.raw.amount,
      cashier.raw.setAmount,
      cashier.raw.method,
      cashier.raw.setMethod,
      cashier.raw.note,
      cashier.raw.setNote,
      cashier.paymentsProps.methods,
      cashier.raw.paymentBtnState,
      cashier.paymentsProps.getSellerPaymentMethodFromSale,
      cashier.paymentsProps.ensureSaleDetails,
      cashier.raw.saleDetailsById,
      cashier.raw.saleDetailsLoadingById,
      cashier.paymentsProps.itemsSummary,
      cashier.paymentsProps.money,
      cashier.paymentsProps.safeDate,
      data.payments,
      data.paymentsLoading,
      cashier.raw.payQ,
      cashier.raw.setPayQ,
      data.canReadPayments,
      data.loadPaymentsSummary,
      data.loadPayments,
      cashier.paymentAmountStatus,
      cashier.selectedSaleExpectedAmount,
      cashier.paymentsProps.onSubmitPayment,
    ],
  );

  const sellerCoverageProps = useMemo(
    () => ({
      coverage: coverage.coverage,
      sellerSection: seller.sellerSection,
      setSellerSection: seller.setSellerSection,

      dashboardProps: seller.dashboardProps,
      createProps: seller.createProps,
      salesProps: seller.salesProps,
      creditsProps: seller.creditsProps,

      itemsModalProps: seller.itemsModalProps,
      creditModalProps: seller.creditModalProps,
      proformaModalProps: seller.proformaModalProps,
      deliveryNoteModalProps: seller.deliveryNoteModalProps,
      invoiceModalProps: seller.invoiceModalProps,
    }),
    [
      coverage.coverage,
      seller.sellerSection,
      seller.setSellerSection,
      seller.dashboardProps,
      seller.createProps,
      seller.salesProps,
      seller.creditsProps,
      seller.itemsModalProps,
      seller.creditModalProps,
      seller.proformaModalProps,
      seller.deliveryNoteModalProps,
      seller.invoiceModalProps,
    ],
  );

  const storeKeeperInventoryProps = useMemo(
    () => ({
      ...storeKeeper.inventoryProps,
      productsLoading: data.prodLoading,
      inventoryLoading: data.invLoading,
      invQ,
      setInvQ,
      filteredInventory: derived.filteredInventory,
    }),
    [
      storeKeeper.inventoryProps,
      data.prodLoading,
      data.invLoading,
      invQ,
      setInvQ,
      derived.filteredInventory,
    ],
  );

  const storeKeeperArrivalsProps = useMemo(
    () => ({
      ...storeKeeper.arrivalsProps,
      productsLoading: data.prodLoading,
      inventoryLoading: data.invLoading,
    }),
    [storeKeeper.arrivalsProps, data.prodLoading, data.invLoading],
  );

  const storeKeeperAdjustmentsProps = useMemo(
    () => ({
      ...storeKeeper.adjustmentsProps,
    }),
    [storeKeeper.adjustmentsProps],
  );

  const storeKeeperSalesProps = useMemo(
    () => ({
      ...storeKeeper.salesProps,
      openSaleDetails: () => {},
      openDeliveryNote: () => {},
    }),
    [storeKeeper.salesProps],
  );

  const inventoryProps = useMemo(
    () => ({
      ...derived.inventoryProps,
      invLoading: data.invLoading,
      prodLoading: data.prodLoading,
      invQ,
      setInvQ,
      prodQ,
      setProdQ,
      showArchivedProducts: data.showArchivedProducts,
      setShowArchivedProducts: data.setShowArchivedProducts,
    }),
    [
      derived.inventoryProps,
      data.invLoading,
      data.prodLoading,
      invQ,
      setInvQ,
      prodQ,
      setProdQ,
      data.showArchivedProducts,
      data.setShowArchivedProducts,
    ],
  );

  const arrivalsProps = useMemo(
    () => ({
      ...derived.arrivalsProps,
      arrivals: data.arrivals,
      arrivalsLoading: data.arrivalsLoading,
    }),
    [derived.arrivalsProps, data.arrivals, data.arrivalsLoading],
  );

  const inventoryRequestsProps = useMemo(
    () => ({
      ...derived.inventoryRequestsProps,
      invReqCountLoading: data.invReqCountLoading,
    }),
    [derived.inventoryRequestsProps, data.invReqCountLoading],
  );

  const pricingProps = useMemo(
    () => ({
      ...derived.pricingProps,
      productsLoading: data.prodLoading,
    }),
    [derived.pricingProps, data.prodLoading],
  );

  return {
    bootLoading,
    isAuthorized,
    me,

    msg,
    msgKind,
    toast,

    section,
    setSection,
    refreshNonce,
    refreshState,
    refreshCurrent,

    actAs: coverage.actAs,
    setActAs: coverage.setActAs,
    actAsHref: coverage.actAsHref,

    coverage: coverage.coverage,
    coverageLoading: coverage.coverageLoading,
    coverageStopState: coverage.coverageStopState,
    isCashierCoverage: coverage.isCashierCoverage,
    isStoreKeeperCoverage: coverage.isStoreKeeperCoverage,
    isSellerCoverage: coverage.isSellerCoverage,
    isManagerCoverage: coverage.isManagerCoverage,
    openCoverageModal: coverage.openCoverageModal,
    stopCoverageMode: coverage.stopCoverageMode,

    sectionItems: derived.sectionItems,

    dashboardProps,
    salesProps,
    paymentsProps,
    cashierCoverageProps,
    sellerCoverageProps,
    storeKeeperInventoryProps,
    storeKeeperArrivalsProps,
    storeKeeperAdjustmentsProps,
    storeKeeperSalesProps,
    inventoryProps,
    arrivalsProps,
    inventoryRequestsProps,
    pricingProps,
    suppliersPanelProps: data.suppliersPanelProps,

    users: data.users,
    usersLoading: data.usersLoading,
    creditsLoading: data.creditsLoading,

    coverageModalProps: coverage.coverageModalProps,
    cancelModalProps: data.cancelModalProps,
    archiveModalProps: data.archiveModalProps,
    deleteModalProps: data.deleteModalProps,
  };
}
