"use client";

import {
  getSellerPaymentMethodFromSale,
  itemsSummary,
  numOrNull,
  safeDate,
} from "../../staff/cashier/cashier-utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ENDPOINTS } from "./useAdminDataLoaders";
import { METHODS } from "../../staff/cashier/cashier-constants";
import { apiFetch } from "../../../lib/api";
import { money } from "../../admin/adminShared";

function upper(v) {
  return String(v || "")
    .trim()
    .toUpperCase();
}

function isAwaitingPaymentSale(sale) {
  const status = upper(sale?.status);
  const paymentStatus = upper(
    sale?.paymentStatus ?? sale?.payment_status ?? sale?.collectionStatus,
  );

  const total = Number(sale?.totalAmount ?? sale?.total ?? 0) || 0;
  const paid = Number(sale?.amountPaid ?? sale?.amount_paid ?? 0) || 0;

  if (
    paymentStatus === "AWAITING_PAYMENT_RECORD" ||
    paymentStatus === "AWAITING_PAYMENT" ||
    paymentStatus === "PENDING_PAYMENT" ||
    paymentStatus === "UNPAID"
  ) {
    return true;
  }

  if (
    status === "AWAITING_PAYMENT_RECORD" ||
    status === "AWAITING_PAYMENT" ||
    status === "PENDING_PAYMENT"
  ) {
    return true;
  }

  if (status === "FULFILLED" && Math.round(paid) < Math.round(total)) {
    return true;
  }

  return false;
}

export function useAdminCashierCoverage({
  toast,
  sales,
  salesQ,
  setSalesQ,
  payments,
  loadSales,
  loadPayments,
  loadPaymentsSummary,
}) {
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [openingBalance, setOpeningBalance] = useState("");
  const [openBtnState, setOpenBtnState] = useState("idle");
  const [closeNote, setCloseNote] = useState("");
  const [closeBtnState, setCloseBtnState] = useState("idle");

  const [selectedSale, setSelectedSale] = useState(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");
  const [paymentBtnState, setPaymentBtnState] = useState("idle");
  const [payQ, setPayQ] = useState("");

  const [saleDetailsById, setSaleDetailsById] = useState({});
  const [saleDetailsLoadingById, setSaleDetailsLoadingById] = useState({});

  const saleDetailsByIdRef = useRef({});
  const saleDetailsLoadingRef = useRef({});

  useEffect(() => {
    saleDetailsByIdRef.current = saleDetailsById;
  }, [saleDetailsById]);

  useEffect(() => {
    saleDetailsLoadingRef.current = saleDetailsLoadingById;
  }, [saleDetailsLoadingById]);

  const currentOpenSession = useMemo(() => {
    const list = Array.isArray(sessions) ? sessions : [];
    const open = list
      .filter((s) => upper(s?.status) === "OPEN")
      .sort(
        (a, b) =>
          new Date(b?.openedAt || b?.opened_at || 0).getTime() -
          new Date(a?.openedAt || a?.opened_at || 0).getTime(),
      );
    return open[0] || null;
  }, [sessions]);

  const awaitingSales = useMemo(() => {
    const list = Array.isArray(sales) ? sales : [];
    const q = String(salesQ || "")
      .trim()
      .toLowerCase();

    return list
      .filter((s) => isAwaitingPaymentSale(s))
      .filter((s) => {
        if (!q) return true;

        const hay = [
          s?.id,
          s?.status,
          s?.paymentStatus ?? s?.payment_status,
          s?.customerName ?? s?.customer_name,
          s?.customerPhone ?? s?.customer_phone,
          s?.totalAmount ?? s?.total,
          s?.amountPaid ?? s?.amount_paid,
          s?.paymentMethod ?? s?.payment_method,
        ]
          .map((x) => String(x ?? ""))
          .join(" ")
          .toLowerCase();

        return hay.includes(q);
      })
      .slice()
      .sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
  }, [sales, salesQ]);

  const selectedSaleExpectedAmount = useMemo(() => {
    return Number(selectedSale?.totalAmount ?? selectedSale?.total ?? 0) || 0;
  }, [selectedSale]);

  const paymentAmountNumber = useMemo(() => numOrNull(amount), [amount]);

  const paymentAmountStatus = useMemo(() => {
    if (!selectedSale?.id) {
      return {
        tone: "neutral",
        message: "Pick a sale to record payment.",
        isValid: false,
      };
    }

    if (paymentAmountNumber == null) {
      return {
        tone: "warn",
        message: "Enter a valid amount.",
        isValid: false,
      };
    }

    if (paymentAmountNumber <= 0) {
      return {
        tone: "warn",
        message: "Amount must be greater than zero.",
        isValid: false,
      };
    }

    if (
      Math.round(paymentAmountNumber) < Math.round(selectedSaleExpectedAmount)
    ) {
      return {
        tone: "warn",
        message: `Amount is below expected total of ${money(selectedSaleExpectedAmount)} RWF.`,
        isValid: false,
      };
    }

    if (
      Math.round(paymentAmountNumber) > Math.round(selectedSaleExpectedAmount)
    ) {
      return {
        tone: "warn",
        message: `Amount is above expected total of ${money(selectedSaleExpectedAmount)} RWF.`,
        isValid: false,
      };
    }

    return {
      tone: "success",
      message: `Amount matches expected total: ${money(selectedSaleExpectedAmount)} RWF.`,
      isValid: true,
    };
  }, [paymentAmountNumber, selectedSale, selectedSaleExpectedAmount]);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.CASH_SESSIONS_MINE, {
        method: "GET",
      });
      const list = Array.isArray(data?.sessions)
        ? data.sessions
        : data?.items || data?.rows || data?.data || [];
      setSessions(Array.isArray(list) ? list : []);
    } catch (e) {
      setSessions([]);
      toast("danger", e?.data?.error || e?.message || "Cannot load sessions");
    } finally {
      setSessionsLoading(false);
    }
  }, [toast]);

  const ensureSaleDetails = useCallback(async (saleId) => {
    const id = Number(saleId);
    if (!Number.isInteger(id) || id <= 0) return;
    if (saleDetailsByIdRef.current[id]) return;
    if (saleDetailsLoadingRef.current[id]) return;

    setSaleDetailsLoadingById((p) => ({ ...p, [id]: true }));

    try {
      const data = await apiFetch(ENDPOINTS.SALE_GET(id), { method: "GET" });
      const sale = data?.sale || data || null;
      const items =
        (Array.isArray(sale?.items) && sale.items) ||
        (Array.isArray(data?.items) && data.items) ||
        [];
      setSaleDetailsById((p) => ({ ...p, [id]: { id, items } }));
    } catch {
      setSaleDetailsById((p) => ({ ...p, [id]: { id, items: [] } }));
    } finally {
      setSaleDetailsLoadingById((p) => ({ ...p, [id]: false }));
    }
  }, []);

  const handleOpenSession = useCallback(
    async (e) => {
      e?.preventDefault?.();
      if (openBtnState === "loading") return;

      const n = numOrNull(openingBalance);
      if (n == null || n < 0) {
        return toast("warn", "Enter a valid opening balance.");
      }

      setOpenBtnState("loading");
      try {
        await apiFetch(ENDPOINTS.CASH_SESSION_OPEN, {
          method: "POST",
          body: { openingBalance: Math.round(n) },
        });

        toast("success", "Session opened.");
        setOpeningBalance("");
        await loadSessions();

        setOpenBtnState("success");
        setTimeout(() => setOpenBtnState("idle"), 900);
      } catch (e2) {
        setOpenBtnState("idle");
        toast(
          "danger",
          e2?.data?.error || e2?.message || "Open session failed",
        );
      }
    },
    [openBtnState, openingBalance, loadSessions, toast],
  );

  const handleCloseSession = useCallback(
    async (e) => {
      e?.preventDefault?.();
      if (closeBtnState === "loading") return;

      if (!currentOpenSession?.id) {
        return toast("warn", "No open session.");
      }

      setCloseBtnState("loading");
      try {
        await apiFetch(ENDPOINTS.CASH_SESSION_CLOSE(currentOpenSession.id), {
          method: "POST",
          body: {
            note: closeNote?.trim()
              ? closeNote.trim().slice(0, 200)
              : undefined,
          },
        });

        toast("success", "Session closed.");
        setCloseNote("");
        await loadSessions();

        setCloseBtnState("success");
        setTimeout(() => setCloseBtnState("idle"), 900);
      } catch (e2) {
        setCloseBtnState("idle");
        toast(
          "danger",
          e2?.data?.error || e2?.message || "Close session failed",
        );
      }
    },
    [closeBtnState, currentOpenSession, closeNote, loadSessions, toast],
  );

  const handleSubmitPayment = useCallback(
    async (e) => {
      e?.preventDefault?.();
      if (paymentBtnState === "loading") return;

      if (!currentOpenSession?.id) {
        return toast("warn", "Open a cash session first.");
      }

      if (!selectedSale?.id) {
        return toast("warn", "Pick a sale first.");
      }

      const expected =
        Number(selectedSale?.totalAmount ?? selectedSale?.total ?? 0) || 0;

      const n = numOrNull(amount);
      if (n == null || n <= 0) {
        return toast("warn", "Enter a valid amount.");
      }

      if (Math.round(n) !== Math.round(expected)) {
        return toast("warn", `Amount must be exactly ${money(expected)} RWF.`);
      }

      setPaymentBtnState("loading");
      try {
        await apiFetch(ENDPOINTS.PAYMENT_RECORD, {
          method: "POST",
          body: {
            saleId: Number(selectedSale.id),
            amount: Math.round(n),
            method: String(method || "CASH").toUpperCase(),
            note: note?.trim() ? note.trim().slice(0, 200) : undefined,
            cashSessionId: Number(currentOpenSession.id),
          },
        });

        toast("success", `Payment saved for sale #${selectedSale.id}`);
        setSelectedSale(null);
        setAmount("");
        setMethod("CASH");
        setNote("");

        await Promise.all([
          loadSales?.(),
          loadPaymentsSummary?.(),
          loadPayments?.(),
          loadSessions(),
        ]);

        setPaymentBtnState("success");
        setTimeout(() => setPaymentBtnState("idle"), 900);
      } catch (e2) {
        setPaymentBtnState("idle");
        toast("danger", e2?.data?.error || e2?.message || "Payment failed");
      }
    },
    [
      paymentBtnState,
      currentOpenSession,
      selectedSale,
      amount,
      method,
      note,
      loadSales,
      loadPaymentsSummary,
      loadPayments,
      loadSessions,
      toast,
    ],
  );

  useEffect(() => {
    const list = Array.isArray(payments) ? payments : [];
    const q = String(payQ || "")
      .trim()
      .toLowerCase();

    const visible = list
      .filter((p) => {
        if (!q) return true;
        const hay = [p?.id, p?.saleId ?? p?.sale_id, p?.method, p?.amount]
          .map((x) => String(x ?? ""))
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 20);

    for (const p of visible) {
      const sid = p?.saleId ?? p?.sale_id;
      if (sid) ensureSaleDetails(sid);
    }
  }, [payments, payQ, ensureSaleDetails]);

  return {
    currentOpenSession,
    awaitingSales,
    selectedSaleExpectedAmount,
    paymentAmountStatus,

    loadSessions,
    ensureSaleDetails,

    sessionsProps: {
      currentOpenSession,
      sessions,
      sessionsLoading,
      openingBalance,
      setOpeningBalance,
      openBtnState,
      closeNote,
      setCloseNote,
      closeBtnState,
      loadSessions,
      money,
      safeDate,
      onOpenSession: handleOpenSession,
      onCloseSession: handleCloseSession,
    },

    paymentsProps: {
      salesLoading: false,
      loadSales,
      salesQ,
      setSalesQ,
      awaitingSales,
      selectedSale,
      setSelectedSale,
      amount,
      setAmount,
      method,
      setMethod,
      note,
      setNote,
      methods: METHODS,
      paymentBtnState,
      currentOpenSession,
      getSellerPaymentMethodFromSale,
      ensureSaleDetails,
      saleDetailsById,
      saleDetailsLoadingById,
      itemsSummary,
      money,
      safeDate,
      payments,
      paymentsLoading: false,
      payQ,
      setPayQ,
      canReadPayments: true,
      loadSummary: loadPaymentsSummary,
      loadPayments,
      paymentAmountStatus,
      selectedSaleExpectedAmount,
      onSubmitPayment: handleSubmitPayment,
    },

    raw: {
      sessions,
      sessionsLoading,
      openingBalance,
      setOpeningBalance,
      openBtnState,
      closeNote,
      setCloseNote,
      closeBtnState,
      selectedSale,
      setSelectedSale,
      amount,
      setAmount,
      method,
      setMethod,
      note,
      setNote,
      paymentBtnState,
      payQ,
      setPayQ,
      saleDetailsById,
      saleDetailsLoadingById,
    },
  };
}
