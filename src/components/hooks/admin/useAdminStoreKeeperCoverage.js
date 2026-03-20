"use client";

import { useCallback, useMemo, useState } from "react";

import { ENDPOINTS } from "./useAdminDataLoaders";
import { apiFetch } from "../../../lib/api";
import { apiUpload } from "../../../lib/apiUpload";

function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function numOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function useAdminStoreKeeperCoverage({
  toast,
  products,
  inventory,
  sales,
  salesLoading,
  loadSales,
  loadProducts,
  loadInventory,
  loadArrivals,
  loadInvReqPendingCount,
}) {
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

  const [salesQ, setSalesQ] = useState("");
  const [salesTab, setSalesTab] = useState("TO_RELEASE");
  const [releaseBtnState, setReleaseBtnState] = useState({});

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
      setMyAdjRequests([]);
      toast(
        "danger",
        e?.data?.error || e?.message || "Cannot load correction requests",
      );
    } finally {
      setMyAdjLoading(false);
    }
  }, [toast]);

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

        await loadProducts({ includeInactive: false });
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
      toast,
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
        if (arrFiles.length > 0) {
          await apiUpload(arrFiles);
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

        await Promise.all([
          loadInventory(),
          loadProducts({ includeInactive: false }),
          loadArrivals(),
        ]);

        setArrivalBtn("success");
        setTimeout(() => setArrivalBtn("idle"), 900);
      } catch (e2) {
        setArrivalBtn("idle");
        toast(
          "danger",
          e2?.data?.error || e2?.message || "Save arrival failed",
        );
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
      loadArrivals,
      toast,
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

        await Promise.all([loadMyAdjustRequests(), loadInvReqPendingCount()]);

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
      loadInvReqPendingCount,
      toast,
    ],
  );

  const releaseStock = useCallback(
    async (saleId) => {
      const id = Number(saleId);
      if (!id) return toast("warn", "Bad sale id.");
      if (releaseBtnState[id] === "loading") return;

      setReleaseBtnState((p) => ({ ...p, [id]: "loading" }));
      try {
        await apiFetch(`/sales/${id}/fulfill`, {
          method: "POST",
          body: {},
        });

        toast("success", `Sale #${id} released.`);

        await Promise.all([loadSales(), loadInventory()]);

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
    [releaseBtnState, loadSales, loadInventory, toast],
  );

  const inventoryProps = useMemo(
    () => ({
      productsLoading: false,
      inventoryLoading: false,
      loadProducts: () => loadProducts({ includeInactive: false }),
      loadInventory,
      pName,
      setPName,
      pSku,
      setPSku,
      pUnit,
      setPUnit,
      pNotes,
      setPNotes,
      pInitialQty,
      setPInitialQty,
      createProduct,
      createProductBtn,
      invQ: "",
      setInvQ: () => {},
      filteredInventory: inventory,
      pCategory,
      setPCategory,
      pSubcategory,
      setPSubcategory,
      pBrand,
      setPBrand,
      pModel,
      setPModel,
      pSize,
      setPSize,
      pColor,
      setPColor,
      pMaterial,
      setPMaterial,
      pVariantSummary,
      setPVariantSummary,
      pBarcode,
      setPBarcode,
      pSupplierSku,
      setPSupplierSku,
      pStockUnit,
      setPStockUnit,
      pSalesUnit,
      setPSalesUnit,
      pPurchaseUnit,
      setPPurchaseUnit,
      pReorderLevel,
      setPReorderLevel,
      pTrackInventory,
      setPTrackInventory,
    }),
    [
      loadProducts,
      loadInventory,
      inventory,
      pName,
      pSku,
      pUnit,
      pNotes,
      pInitialQty,
      createProduct,
      createProductBtn,
      pCategory,
      pSubcategory,
      pBrand,
      pModel,
      pSize,
      pColor,
      pMaterial,
      pVariantSummary,
      pBarcode,
      pSupplierSku,
      pStockUnit,
      pSalesUnit,
      pPurchaseUnit,
      pReorderLevel,
      pTrackInventory,
    ],
  );

  const arrivalsProps = useMemo(
    () => ({
      products,
      inventory,
      productsLoading: false,
      inventoryLoading: false,
      loadProducts: () => loadProducts({ includeInactive: false }),
      loadInventory,
      arrProductId,
      setArrProductId,
      arrQty,
      setArrQty,
      arrNotes,
      setArrNotes,
      arrFiles,
      setArrFiles,
      createArrival,
      arrivalBtn,
    }),
    [
      products,
      inventory,
      loadProducts,
      loadInventory,
      arrProductId,
      arrQty,
      arrNotes,
      arrFiles,
      createArrival,
      arrivalBtn,
    ],
  );

  const adjustmentsProps = useMemo(
    () => ({
      products,
      inventory,
      myAdjRequests,
      myAdjLoading,
      loadMyAdjustRequests,
      adjProductId,
      setAdjProductId,
      adjDirection,
      setAdjDirection,
      adjQtyAbs,
      setAdjQtyAbs,
      adjReason,
      setAdjReason,
      createAdjustRequest,
      adjBtn,
    }),
    [
      products,
      inventory,
      myAdjRequests,
      myAdjLoading,
      loadMyAdjustRequests,
      adjProductId,
      adjDirection,
      adjQtyAbs,
      adjReason,
      createAdjustRequest,
      adjBtn,
    ],
  );

  const draftSalesCount = useMemo(
    () =>
      (Array.isArray(sales) ? sales : []).filter(
        (s) => String(s?.status || "").toUpperCase() === "DRAFT",
      ).length,
    [sales],
  );

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

  const filteredSalesLastTen = useMemo(() => {
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

    if (qq) {
      base = base.filter((s) => {
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
    }

    return base.slice(0, 10);
  }, [sales, salesQ, salesTab]);

  const salesProps = useMemo(
    () => ({
      salesLoading,
      loadSales,
      salesQ,
      setSalesQ,
      salesTab,
      setSalesTab,
      draftSalesCount,
      releasedCount,
      lastTenCount,
      filteredSalesLastTen,
      releaseBtnState,
      releaseStock,
      openSaleDetails: () => {},
      openDeliveryNote: () => {},
    }),
    [
      salesLoading,
      loadSales,
      salesQ,
      salesTab,
      draftSalesCount,
      releasedCount,
      lastTenCount,
      filteredSalesLastTen,
      releaseBtnState,
      releaseStock,
    ],
  );

  return {
    loadMyAdjustRequests,
    myAdjRequests,
    myAdjLoading,
    inventoryProps,
    arrivalsProps,
    adjustmentsProps,
    salesProps,
  };
}
