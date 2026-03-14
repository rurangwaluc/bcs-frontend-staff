"use client";

import { PAGE_SIZE, SECTIONS } from "./useAdminDataLoaders";
import {
  buildEvidenceUrl,
  fmt,
  isArchivedProduct,
  isToday,
  money,
  sortByCreatedAtDesc,
  toStr,
} from "../../admin/adminShared";
import { useCallback, useMemo } from "react";

function dateOnlyMs(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function useAdminDerivedState({
  router,

  refreshNonce,

  sales,
  salesQ,
  salesStatusFilter,
  salesFrom,
  salesTo,
  salesPage,

  inventory,
  invQ,

  products,
  prodQ,
  showArchivedProducts,

  arrivals,

  invReqPendingCount,

  loadSales,
  loadInventory,
  loadProducts,
  loadArrivals,
  loadPayments,
  loadPaymentsSummary,
  loadInvReqPendingCount,

  dash,
  dashLoading,

  payments,
  paymentsLoading,
  paymentsSummary,
  paySummaryLoading,
  coverage,
  paymentsPage,
  setPaymentsPage,

  openCancel,
  openArchiveProduct,
  openRestoreProduct,
  openDeleteProduct,
}) {
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

  const salesBadge = useMemo(() => {
    const n = Array.isArray(sales) ? sales.length : 0;
    return n > 0 ? String(Math.min(n, 99)) : null;
  }, [sales]);

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

  const sectionItems = useMemo(
    () =>
      SECTIONS.map((s) => ({
        ...s,
        badge:
          s.key === "sales"
            ? salesBadge
            : s.key === "arrivals"
              ? arrivalsBadge
              : s.key === "pricing"
                ? pricingBadge
                : s.key === "inv_requests"
                  ? invReqBadge
                  : null,
      })),
    [salesBadge, arrivalsBadge, pricingBadge, invReqBadge],
  );

  const productFromInventoryRow = useCallback(
    (invRow) => {
      const pid = invRow?.productId ?? invRow?.product_id ?? invRow?.id;
      const sku = invRow?.sku;

      const list = Array.isArray(products) ? products : [];
      const byId =
        pid != null ? list.find((x) => String(x?.id) === String(pid)) : null;
      const bySku =
        !byId && sku ? list.find((x) => String(x?.sku) === String(sku)) : null;

      return byId || bySku || null;
    },
    [products],
  );

  const sellingPriceForRow = useCallback(
    (invRow) => {
      const prod = productFromInventoryRow(invRow);
      const price =
        prod?.sellingPrice ??
        prod?.selling_price ??
        prod?.price ??
        prod?.unitPrice ??
        prod?.unit_price ??
        null;

      return price == null ? "—" : money(price);
    },
    [productFromInventoryRow],
  );

  const dashboardProps = useMemo(
    () => ({
      dash,
      dashLoading,
      salesTodayTotal,
      salesToday,
      awaitingPaymentCount,
      unpricedCount,
      invReqPendingCount,
      products,
      router,
      loadProducts: () =>
        loadProducts({ includeInactive: showArchivedProducts }),
      loadInventory,
      loadSales,
      loadPayments,
      loadPaymentsSummary,
      loadArrivals,
      loadInvReqPendingCount,
    }),
    [
      dash,
      dashLoading,
      salesTodayTotal,
      salesToday,
      awaitingPaymentCount,
      unpricedCount,
      invReqPendingCount,
      products,
      router,
      loadProducts,
      showArchivedProducts,
      loadInventory,
      loadSales,
      loadPayments,
      loadPaymentsSummary,
      loadArrivals,
      loadInvReqPendingCount,
    ],
  );

  const salesProps = useMemo(
    () => ({
      salesLoading: false,
      loadSales,
      salesQ,
      salesStatusFilter,
      salesFrom,
      salesTo,
      filteredSales,
      filteredSalesAll,
      salesFilteredTotals,
      canLoadMoreSales,
      onOpenCancel: openCancel,
      onOpenProof: (saleId) =>
        router.push(
          buildEvidenceUrl({
            entity: "sale",
            entityId: String(saleId),
            from: salesFrom || "",
            to: salesTo || "",
            limit: 200,
          }),
        ),
    }),
    [
      loadSales,
      salesQ,
      salesStatusFilter,
      salesFrom,
      salesTo,
      filteredSales,
      filteredSalesAll,
      salesFilteredTotals,
      canLoadMoreSales,
      openCancel,
      router,
    ],
  );

  const paymentsProps = useMemo(
    () => ({
      payments,
      paymentsLoading,
      paymentsSummary,
      paySummaryLoading,
      loadPayments,
      loadPaymentsSummary,
      coverage,
      paymentsPage,
      setPaymentsPage,
    }),
    [
      payments,
      paymentsLoading,
      paymentsSummary,
      paySummaryLoading,
      loadPayments,
      loadPaymentsSummary,
      coverage,
      paymentsPage,
      setPaymentsPage,
    ],
  );

  const inventoryProps = useMemo(
    () => ({
      inventory,
      products,
      invQ,
      prodQ,
      showArchivedProducts,
      loadInventory,
      loadProducts,
      filteredInventory,
      filteredProducts,
      unpricedCount,
      sellingPriceForRow,
      isArchivedProduct,
      onOpenInventoryProof: (row) => {
        const entityId = row?.productId ?? row?.product_id ?? row?.id;
        if (!entityId) return;
        router.push(
          buildEvidenceUrl({
            entity: "product",
            entityId: String(entityId),
            limit: 200,
          }),
        );
      },
      onOpenProductProof: (product) => {
        const entityId = product?.id;
        if (!entityId) return;
        router.push(
          buildEvidenceUrl({
            entity: "product",
            entityId: String(entityId),
            limit: 200,
          }),
        );
      },
      onOpenArchiveProduct: openArchiveProduct,
      onOpenRestoreProduct: openRestoreProduct,
      onOpenDeleteProduct: openDeleteProduct,
    }),
    [
      inventory,
      products,
      invQ,
      prodQ,
      showArchivedProducts,
      loadInventory,
      loadProducts,
      filteredInventory,
      filteredProducts,
      unpricedCount,
      sellingPriceForRow,
      router,
      openArchiveProduct,
      openRestoreProduct,
      openDeleteProduct,
    ],
  );

  const arrivalsProps = useMemo(
    () => ({
      arrivals,
      arrivalsNormalized,
      loadArrivals,
      onOpenProof: (arrival) => {
        const entityId = arrival?.id;
        if (!entityId) return;
        router.push(
          buildEvidenceUrl({
            entity: "inventory_arrival",
            entityId: String(entityId),
            limit: 200,
          }),
        );
      },
    }),
    [arrivals, arrivalsNormalized, loadArrivals, router],
  );

  const inventoryRequestsProps = useMemo(
    () => ({
      refreshNonce,
      invReqPendingCount,
      loadInvReqPendingCount,
    }),
    [refreshNonce, invReqPendingCount, loadInvReqPendingCount],
  );

  const pricingProps = useMemo(
    () => ({
      refreshNonce,
      products,
      unpricedCount,
      refreshProducts: () => loadProducts({ includeInactive: true }),
    }),
    [refreshNonce, products, unpricedCount, loadProducts],
  );

  return {
    filteredSalesAll,
    filteredSales,
    canLoadMoreSales,
    salesToday,
    salesTodayTotal,
    awaitingPaymentCount,
    filteredInventory,
    filteredProducts,
    arrivalsNormalized,
    sectionItems,

    dashboardProps,
    salesProps,
    paymentsProps,
    inventoryProps,
    arrivalsProps,
    inventoryRequestsProps,
    pricingProps,
  };
}
