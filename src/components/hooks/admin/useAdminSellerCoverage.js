"use client";

import {
  ENDPOINTS,
  SELLER_PAYMENT_METHODS,
} from "../../staff/seller/seller-constants";
import {
  isToday,
  nowLocalDatetimeValue,
  toInt,
  toStr,
} from "../../staff/seller/seller-utils";
import { useCallback, useMemo, useState } from "react";

import { apiFetch } from "../../../lib/api";

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

export function useAdminSellerCoverage({
  toast,
  me,

  products,
  productsLoading,
  loadProducts,

  sales,
  salesLoading,
  loadSales,

  loadCreditsOpen,
}) {
  const [sellerSection, setSellerSection] = useState("dashboard");

  const [prodQ, setProdQ] = useState("");
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
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [documentSale, setDocumentSale] = useState(null);
  const [documentLoading, setDocumentLoading] = useState(false);

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
    return filteredSales
      .slice()
      .sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
  }, [filteredSales]);

  const showAllSales = String(salesQ || "").trim().length > 0;

  const salesToShow = useMemo(() => {
    return showAllSales ? salesSorted.slice(0, 200) : salesSorted.slice(0, 10);
  }, [salesSorted, showAllSales]);

  const todaySales = useMemo(() => {
    return (Array.isArray(sales) ? sales : []).filter((s) =>
      isToday(s?.createdAt || s?.created_at),
    );
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
    return (Array.isArray(sales) ? sales : []).filter(
      (s) => String(s?.status || "").toUpperCase() === "DRAFT",
    ).length;
  }, [sales]);

  const releasedCount = useMemo(() => {
    return (Array.isArray(sales) ? sales : []).filter(
      (s) => String(s?.status || "").toUpperCase() === "FULFILLED",
    ).length;
  }, [sales]);

  const creditCount = useMemo(() => {
    return (Array.isArray(sales) ? sales : []).filter((s) => {
      const st = String(s?.status || "").toUpperCase();
      return ["PENDING", "APPROVED", "PARTIALLY_PAID"].includes(st);
    }).length;
  }, [sales]);

  const cartSubtotal = useMemo(() => {
    return saleCart.reduce((sum, it) => sum + previewLineTotal(it), 0);
  }, [saleCart]);

  function productToCartItem(p) {
    const productId = Number(p?.id);
    const sellingPrice = Number(p?.sellingPrice ?? p?.selling_price ?? 0);
    const maxDiscountPercent = Number(
      p?.maxDiscountPercent ?? p?.max_discount_percent ?? 0,
    );
    const qtyOnHand = getAvailableQty(p);
    const trackInventory = isInventoryTracked(p);

    return {
      productId,
      productName: p?.name || "—",
      sku: p?.sku || "—",
      sellingPrice: Number.isFinite(sellingPrice) ? sellingPrice : 0,
      maxDiscountPercent: Number.isFinite(maxDiscountPercent)
        ? maxDiscountPercent
        : 0,
      qty: 1,
      unitPrice: Number.isFinite(sellingPrice) ? sellingPrice : 0,
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
      toast("warn", `${product?.name || "Product"} is out of stock.`);
      return;
    }

    setSaleCart((prev) => {
      const exists = prev.find((x) => Number(x.productId) === productId);

      if (exists) {
        const nextQty = Number(exists.qty ?? 0) + 1;
        if (trackInventory && nextQty > qtyOnHand) {
          toast(
            "warn",
            `${product?.name || "Product"} has only ${qtyOnHand} item(s) in stock.`,
          );
          return prev;
        }

        return prev.map((x) =>
          Number(x.productId) === productId
            ? { ...x, qty: nextQty, qtyOnHand, trackInventory }
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

        return { ...next, qty, qtyOnHand, trackInventory };
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

  const createCustomerFromInputs = useCallback(async () => {
    if (createCustomerBtn === "loading") return;

    const name = toStr(customerName);
    const phone = toStr(customerPhone);
    const tin = toStr(customerTin);
    const address = toStr(customerAddress);

    if (name.length < 2) {
      toast("warn", "Customer name is required.");
      return;
    }

    if (phone.length < 6) {
      toast("warn", "Customer phone is required.");
      return;
    }

    setCreateCustomerBtn("loading");
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
        toast("danger", "Failed to create customer.");
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
      toast("success", "Customer created and selected.");

      setCreateCustomerBtn("success");
      setTimeout(() => setCreateCustomerBtn("idle"), 900);
    } catch (e) {
      setCreateCustomerBtn("idle");
      toast("danger", e?.data?.error || e?.message || "Customer create failed");
    }
  }, [
    createCustomerBtn,
    customerName,
    customerPhone,
    customerTin,
    customerAddress,
    toast,
  ]);

  const createSale = useCallback(
    async (e) => {
      e?.preventDefault?.();
      if (createSaleBtn === "loading") return;

      const typedName = toStr(customerName);
      const typedPhone = toStr(customerPhone);

      if (!selectedCustomer?.id) {
        if (typedName.length < 2) {
          toast("warn", "Customer name is required.");
          return;
        }
        if (typedPhone.length < 6) {
          toast("warn", "Customer phone is required.");
          return;
        }
      }

      if (saleCart.length === 0) {
        toast("warn", "Cart is empty. Add products.");
        return;
      }

      const payload = {
        customerId: selectedCustomer?.id
          ? Number(selectedCustomer.id)
          : undefined,
        customerName: typedName || null,
        customerPhone: typedPhone || null,
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
      try {
        const data = await apiFetch(ENDPOINTS.SALES_CREATE, {
          method: "POST",
          body: payload,
        });

        const newSaleId = data?.sale?.id || data?.id || null;
        toast(
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
        setSellerSection("sales");

        setCreateSaleBtn("success");
        setTimeout(() => setCreateSaleBtn("idle"), 900);

        await loadSales();
      } catch (e) {
        setCreateSaleBtn("idle");
        toast("danger", e?.data?.error || e?.message || "Sale create failed");
      }
    },
    [
      createSaleBtn,
      customerName,
      customerPhone,
      selectedCustomer,
      note,
      saleCart,
      toast,
      loadSales,
    ],
  );

  const openSaleItems = useCallback(
    async (saleId) => {
      const sid = Number(saleId);
      if (!sid) return;

      setItemsOpen(true);
      setItemsLoading(true);
      setItemsSale({ id: sid });

      try {
        const data = await apiFetch(ENDPOINTS.SALE_GET(sid), { method: "GET" });
        setItemsSale(data?.sale || data || { id: sid });
      } catch (e) {
        toast(
          "danger",
          e?.data?.error || e?.message || "Cannot load sale items",
        );
        setItemsSale({ id: sid });
      } finally {
        setItemsLoading(false);
      }
    },
    [toast],
  );

  const openSaleDocument = useCallback(
    async (saleId, type) => {
      const sid = Number(saleId);
      if (!sid) return;

      setDocumentLoading(true);
      try {
        const data = await apiFetch(ENDPOINTS.SALE_GET(sid), { method: "GET" });
        const sale = data?.sale || data || null;
        setDocumentSale(sale);

        if (type === "proforma") setProformaOpen(true);
        if (type === "delivery") setDeliveryNoteOpen(true);
      } catch (e) {
        toast(
          "danger",
          e?.data?.error || e?.message || "Cannot load sale document",
        );
      } finally {
        setDocumentLoading(false);
      }
    },
    [toast],
  );

  const openSaleInvoice = useCallback(
    async (saleId) => {
      const sid = Number(saleId);
      if (!sid) return;

      setDocumentLoading(true);
      try {
        const data = await apiFetch(ENDPOINTS.SALE_GET(sid), { method: "GET" });
        const sale = data?.sale || data || null;
        setDocumentSale(sale);
        setInvoiceOpen(true);
      } catch (e) {
        toast("danger", e?.data?.error || e?.message || "Cannot load invoice");
      } finally {
        setDocumentLoading(false);
      }
    },
    [toast],
  );

  const markSalePaid = useCallback(
    async (saleId, paymentMethod) => {
      const sid = Number(saleId);
      if (!sid) return;

      setMarkBtnState((p) => ({ ...p, [sid]: "loading" }));
      try {
        const method = String(paymentMethod || "CASH").toUpperCase();

        await apiFetch(ENDPOINTS.SALE_MARK(sid), {
          method: "POST",
          body: { status: "PAID", paymentMethod: method },
        });

        toast("success", `Sale #${sid} marked paid (${method})`);
        await loadSales();

        setMarkBtnState((p) => ({ ...p, [sid]: "success" }));
        setTimeout(
          () => setMarkBtnState((p) => ({ ...p, [sid]: "idle" })),
          900,
        );
      } catch (e) {
        setMarkBtnState((p) => ({ ...p, [sid]: "idle" }));
        toast("danger", e?.data?.error || e?.message || "Mark paid failed");
      }
    },
    [toast, loadSales],
  );

  const openCreditModal = useCallback((sale) => {
    setCreditSale({
      ...(sale || null),
      _defaults: {
        dueDate: "",
        note: "",
      },
    });
    setCreditOpen(true);
  }, []);

  const confirmCredit = useCallback(
    async (payload = {}) => {
      const sid = Number(creditSale?.id);
      if (!sid) return;

      setCreditSaving(true);
      try {
        await apiFetch("/credits", {
          method: "POST",
          body: {
            saleId: sid,
            creditMode: payload?.creditMode || "OPEN_BALANCE",
            dueDate: payload?.dueDate || undefined,
            note: payload?.note || undefined,
          },
        });

        toast("success", `Credit request created for sale #${sid}`);
        setCreditOpen(false);
        setCreditSale(null);
        await Promise.all([loadSales(), loadCreditsOpen?.()]);
      } catch (e) {
        toast(
          "danger",
          e?.data?.error || e?.message || "Create credit request failed",
        );
      } finally {
        setCreditSaving(false);
      }
    },
    [creditSale, toast, loadSales, loadCreditsOpen],
  );

  const dashboardProps = useMemo(
    () => ({
      salesLoading,
      todaySalesCount,
      todaySalesTotal,
      draftCount,
      releasedCount,
      loadSales,
      setSection: setSellerSection,
    }),
    [
      salesLoading,
      todaySalesCount,
      todaySalesTotal,
      draftCount,
      releasedCount,
      loadSales,
    ],
  );

  const createProps = useMemo(
    () => ({
      productsLoading,
      loadProducts,
      prodQ,
      setProdQ,
      filteredProducts,
      addProductToSaleCart,
      customerQ,
      setCustomerQ,
      selectedCustomer,
      customerLoading,
      customerResults,
      setSelectedCustomer,
      customerName,
      setCustomerName,
      customerPhone,
      setCustomerPhone,
      customerTin,
      setCustomerTin,
      customerAddress,
      setCustomerAddress,
      createCustomerBtn,
      createCustomerFromInputs,
      note,
      setNote,
      saleCart,
      cartSubtotal,
      updateCart,
      removeFromCart,
      previewLineTotal,
      createSale,
      createSaleBtn,
    }),
    [
      productsLoading,
      loadProducts,
      prodQ,
      filteredProducts,
      customerQ,
      selectedCustomer,
      customerLoading,
      customerResults,
      customerName,
      customerPhone,
      customerTin,
      customerAddress,
      createCustomerBtn,
      note,
      saleCart,
      cartSubtotal,
      createSaleBtn,
      createCustomerFromInputs,
      createSale,
    ],
  );

  const salesProps = useMemo(
    () => ({
      showAllSales,
      salesLoading,
      loadSales,
      salesQ,
      setSalesQ,
      salesToShow,
      salePayMethod,
      setSalePayMethod,
      markBtnState,
      markSalePaid,
      openCreditModal,
      openSaleItems,
      openProforma: (id) => openSaleDocument(id, "proforma"),
      openDeliveryNote: (id) => openSaleDocument(id, "delivery"),
      paymentMethods: SELLER_PAYMENT_METHODS,
      openInvoice: openSaleInvoice,
    }),
    [
      showAllSales,
      salesLoading,
      loadSales,
      salesQ,
      salesToShow,
      salePayMethod,
      markBtnState,
      markSalePaid,
      openCreditModal,
      openSaleItems,
      openSaleDocument,
      openSaleInvoice,
    ],
  );

  const creditsProps = useMemo(
    () => ({
      title: "Credits (Seller)",
      capabilities: {
        canView: true,
        canCreate: false,
        canDecide: false,
        canSettle: false,
      },
    }),
    [],
  );

  const itemsModalProps = useMemo(
    () => ({
      open: itemsOpen,
      loading: itemsLoading,
      sale: itemsSale,
      onClose: () => setItemsOpen(false),
    }),
    [itemsOpen, itemsLoading, itemsSale],
  );

  const creditModalProps = useMemo(
    () => ({
      key: creditSale?.id || "credit",
      open: creditOpen,
      sale: creditSale,
      loading: creditSaving,
      onClose: () => {
        if (creditSaving) return;
        setCreditOpen(false);
        setCreditSale(null);
      },
      onConfirm: confirmCredit,
    }),
    [creditOpen, creditSale, creditSaving, confirmCredit],
  );

  const proformaModalProps = useMemo(
    () => ({
      open: proformaOpen,
      sale: documentSale,
      loading: documentLoading,
      me,
      onClose: () => {
        if (documentLoading) return;
        setProformaOpen(false);
        setDocumentSale(null);
      },
    }),
    [proformaOpen, documentSale, documentLoading, me],
  );

  const deliveryNoteModalProps = useMemo(
    () => ({
      open: deliveryNoteOpen,
      sale: documentSale,
      loading: documentLoading,
      me,
      onClose: () => {
        if (documentLoading) return;
        setDeliveryNoteOpen(false);
        setDocumentSale(null);
      },
    }),
    [deliveryNoteOpen, documentSale, documentLoading, me],
  );

  const invoiceModalProps = useMemo(
    () => ({
      open: invoiceOpen,
      sale: documentSale,
      loading: documentLoading,
      me,
      onClose: () => {
        if (documentLoading) return;
        setInvoiceOpen(false);
        setDocumentSale(null);
      },
    }),
    [invoiceOpen, documentSale, documentLoading, me],
  );

  return {
    sellerSection,
    setSellerSection,

    dashboardProps,
    createProps,
    salesProps,
    creditsProps,

    itemsModalProps,
    creditModalProps,
    proformaModalProps,
    deliveryNoteModalProps,
    invoiceModalProps,

    searchCustomers,
  };
}
