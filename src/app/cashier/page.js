"use client";

import {
  Banner,
  PageSkeleton,
} from "../../components/staff/cashier/cashier-ui";
import {
  ENDPOINTS,
  METHODS,
  SECTIONS,
} from "../../components/staff/cashier/cashier-constants";
import {
  getSellerPaymentMethodFromSale,
  itemsSummary,
  locationLabel,
  money,
  numOrNull,
  safeDate,
  sumAmounts,
} from "../../components/staff/cashier/cashier-utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import CashierCreditsSection from "../../components/staff/cashier/CashierCreditsSection";
import CashierDashboardSection from "../../components/staff/cashier/CashierDashboardSection";
import CashierDepositsSection from "../../components/staff/cashier/CashierDepositsSection";
import CashierExpensesSection from "../../components/staff/cashier/CashierExpensesSection";
import CashierLedgerSection from "../../components/staff/cashier/CashierLedgerSection";
import CashierNotificationsSection from "../../components/staff/cashier/CashierNotificationsSection";
import CashierPaymentsSection from "../../components/staff/cashier/CashierPaymentsSection";
import CashierReconcileSection from "../../components/staff/cashier/CashierReconcileSection";
import CashierRefundsSection from "../../components/staff/cashier/CashierRefundsSection";
import CashierSessionsSection from "../../components/staff/cashier/CashierSessionsSection";
import CashierTopSectionSwitcher from "../../components/staff/cashier/CashierTopSectionSwitcher";
import RoleBar from "../../components/RoleBar";
import { apiFetch } from "../../lib/api";
import { connectSSE } from "../../lib/sse";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

function getNotificationKey(n, idx = 0) {
  if (n?.id != null) return `id-${n.id}`;
  const created = n?.createdAt || n?.created_at || "";
  const title = n?.title || n?.type || "";
  const body = n?.body || "";
  return `fallback-${created}-${title}-${body}-${idx}`;
}

function dedupeNotifications(list) {
  const out = [];
  const seen = new Set();

  for (let i = 0; i < (Array.isArray(list) ? list : []).length; i += 1) {
    const item = list[i];
    const key = getNotificationKey(item, i);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
}

export default function CashierPage() {
  const router = useRouter();

  const [bootLoading, setBootLoading] = useState(true);
  const [me, setMe] = useState(null);

  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info");
  const [section, setSection] = useState("dashboard");

  function toast(kind, text) {
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

        if (role !== "cashier") {
          const map = {
            seller: "/seller",
            store_keeper: "/store-keeper",
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

  const isAuthorized =
    !!me && String(me?.role || "").toLowerCase() === "cashier";

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const [openingBalance, setOpeningBalance] = useState("");
  const [openBtnState, setOpenBtnState] = useState("idle");

  const [closeNote, setCloseNote] = useState("");
  const [closeBtnState, setCloseBtnState] = useState("idle");

  const currentOpenSession = useMemo(() => {
    const list = Array.isArray(sessions) ? sessions : [];
    const open = list
      .filter((s) => String(s?.status || "").toUpperCase() === "OPEN")
      .sort(
        (a, b) =>
          new Date(b?.openedAt || b?.opened_at || 0) -
          new Date(a?.openedAt || a?.opened_at || 0),
      );
    return open[0] || null;
  }, [sessions]);

  const closedSessions = useMemo(() => {
    return (Array.isArray(sessions) ? sessions : [])
      .filter((s) => String(s?.status || "").toUpperCase() === "CLOSED")
      .sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
  }, [sessions]);

  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesQ, setSalesQ] = useState("");
  const [selectedSale, setSelectedSale] = useState(null);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");
  const [paymentBtnState, setPaymentBtnState] = useState("idle");

  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [payQ, setPayQ] = useState("");

  const [summary, setSummary] = useState({
    today: { count: 0, total: 0 },
    yesterday: { count: 0, total: 0 },
    allTime: { count: 0, total: 0 },
  });
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [canReadPayments, setCanReadPayments] = useState(true);

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

  const [deposits, setDeposits] = useState([]);
  const [depositsLoading, setDepositsLoading] = useState(false);
  const [depositQ, setDepositQ] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositMethod, setDepositMethod] = useState("BANK");
  const [depositReference, setDepositReference] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [depositBtnState, setDepositBtnState] = useState("idle");

  const [expenses, setExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [expenseQ, setExpenseQ] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("GENERAL");
  const [expenseRef, setExpenseRef] = useState("");
  const [expenseNote, setExpenseNote] = useState("");
  const [expenseBtnState, setExpenseBtnState] = useState("idle");

  const [reconciles, setReconciles] = useState([]);
  const [reconcilesLoading, setReconcilesLoading] = useState(false);
  const [reconcileQ, setReconcileQ] = useState("");
  const [selectedClosedSessionId, setSelectedClosedSessionId] = useState("");
  const [reconcileCountedCash, setReconcileCountedCash] = useState("");
  const [reconcileNote, setReconcileNote] = useState("");
  const [reconcileBtnState, setReconcileBtnState] = useState("idle");

  useEffect(() => {
    if (!selectedClosedSessionId && closedSessions[0]?.id) {
      setSelectedClosedSessionId(String(closedSessions[0].id));
    }
  }, [closedSessions, selectedClosedSessionId]);

  const [refunds, setRefunds] = useState([]);
  const [refundsLoading, setRefundsLoading] = useState(false);
  const [refundQ, setRefundQ] = useState("");
  const [refundSaleId, setRefundSaleId] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("CASH");
  const [refundReference, setRefundReference] = useState("");
  const [refundBtnState, setRefundBtnState] = useState("idle");

  const [ledger, setLedger] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerQ, setLedgerQ] = useState("");
  const [canReadLedger, setCanReadLedger] = useState(true);

  const [ledgerFromDate, setLedgerFromDate] = useState("");
  const [ledgerToDate, setLedgerToDate] = useState("");

  const [ledgerToday, setLedgerToday] = useState({
    totalIn: 0,
    totalOut: 0,
    net: 0,
  });
  const [ledgerTodayLoading, setLedgerTodayLoading] = useState(false);

  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState([]);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const [notifsErr, setNotifsErr] = useState("");
  const [streamStatus, setStreamStatus] = useState("idle");
  const sseRef = useRef(null);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.CASH_SESSIONS_MINE, {
        method: "GET",
      });
      const list = Array.isArray(data?.sessions)
        ? data.sessions
        : data?.items || data?.rows || [];
      setSessions(Array.isArray(list) ? list : []);
    } catch (e) {
      toast("danger", e?.data?.error || e?.message || "Cannot load sessions");
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const loadSales = useCallback(async () => {
    setSalesLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.SALES_LIST, { method: "GET" });
      const list = Array.isArray(data?.sales)
        ? data.sales
        : data?.items || data?.rows || [];
      setSales(Array.isArray(list) ? list : []);
    } catch (e) {
      toast("danger", e?.data?.error || e?.message || "Cannot load sales");
      setSales([]);
    } finally {
      setSalesLoading(false);
    }
  }, []);

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.PAYMENTS_LIST, { method: "GET" });
      const list = Array.isArray(data?.payments)
        ? data.payments
        : data?.items || data?.rows || [];
      setPayments(Array.isArray(list) ? list : []);
      setCanReadPayments(true);
    } catch (e) {
      const errText = e?.data?.error || e?.message || "Cannot load payments";
      if (String(errText).toLowerCase().includes("forbidden")) {
        setCanReadPayments(false);
        setPayments([]);
        return;
      }
      toast("danger", errText);
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.PAYMENTS_SUMMARY, {
        method: "GET",
      });
      const s = data?.summary || {};
      setSummary({
        today: {
          count: Number(s?.today?.count || 0),
          total: Number(s?.today?.total || 0),
        },
        yesterday: {
          count: Number(s?.yesterday?.count || 0),
          total: Number(s?.yesterday?.total || 0),
        },
        allTime: {
          count: Number(s?.allTime?.count || 0),
          total: Number(s?.allTime?.total || 0),
        },
      });
      setCanReadPayments(true);
    } catch (e) {
      const errText = e?.data?.error || e?.message || "Cannot load money info";
      if (String(errText).toLowerCase().includes("forbidden")) {
        setCanReadPayments(false);
        return;
      }
      toast("danger", errText);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadDeposits = useCallback(async () => {
    setDepositsLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.CASHBOOK_DEPOSITS_LIST, {
        method: "GET",
      });
      const list = Array.isArray(data?.deposits)
        ? data.deposits
        : data?.items || data?.rows || [];
      setDeposits(Array.isArray(list) ? list : []);
    } catch (e) {
      toast("danger", e?.data?.error || e?.message || "Cannot load deposits");
      setDeposits([]);
    } finally {
      setDepositsLoading(false);
    }
  }, []);

  const loadExpenses = useCallback(async () => {
    setExpensesLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.EXPENSES_LIST, { method: "GET" });
      const list = Array.isArray(data?.expenses)
        ? data.expenses
        : data?.items || data?.rows || [];
      setExpenses(Array.isArray(list) ? list : []);
    } catch (e) {
      toast("danger", e?.data?.error || e?.message || "Cannot load expenses");
      setExpenses([]);
    } finally {
      setExpensesLoading(false);
    }
  }, []);

  const loadReconciles = useCallback(async () => {
    setReconcilesLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.CASH_RECONCILES_LIST, {
        method: "GET",
      });
      const list = Array.isArray(data?.reconciles)
        ? data.reconciles
        : data?.items || data?.rows || [];
      setReconciles(Array.isArray(list) ? list : []);
    } catch (e) {
      toast("danger", e?.data?.error || e?.message || "Cannot load reconciles");
      setReconciles([]);
    } finally {
      setReconcilesLoading(false);
    }
  }, []);

  const loadRefunds = useCallback(async () => {
    setRefundsLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.REFUNDS_LIST, { method: "GET" });
      const list = Array.isArray(data?.refunds)
        ? data.refunds
        : data?.items || data?.rows || [];
      setRefunds(Array.isArray(list) ? list : []);
    } catch (e) {
      toast("danger", e?.data?.error || e?.message || "Cannot load refunds");
      setRefunds([]);
    } finally {
      setRefundsLoading(false);
    }
  }, []);

  const loadLedger = useCallback(async () => {
    setLedgerLoading(true);
    try {
      const data = await apiFetch(`${ENDPOINTS.CASH_LEDGER_LIST}?limit=120`, {
        method: "GET",
      });
      const list = Array.isArray(data?.ledger)
        ? data.ledger
        : data?.items || data?.rows || [];
      setLedger(Array.isArray(list) ? list : []);
      setCanReadLedger(true);
    } catch (e) {
      const errText = e?.data?.error || e?.message || "Cannot load ledger";
      if (String(errText).toLowerCase().includes("forbidden")) {
        setCanReadLedger(false);
        setLedger([]);
        return;
      }
      toast("danger", errText);
      setLedger([]);
    } finally {
      setLedgerLoading(false);
    }
  }, []);

  const loadLedgerToday = useCallback(async () => {
    setLedgerTodayLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.CASH_LEDGER_TODAY, {
        method: "GET",
      });
      const s = data?.summary || {};
      const totalIn = Number(s?.totalIn ?? s?.in ?? s?.cashIn ?? 0) || 0;
      const totalOut = Number(s?.totalOut ?? s?.out ?? s?.cashOut ?? 0) || 0;
      const net = Number(s?.net ?? totalIn - totalOut) || totalIn - totalOut;
      setLedgerToday({ totalIn, totalOut, net });
      setCanReadLedger(true);
    } catch (e) {
      const errText =
        e?.data?.error || e?.message || "Cannot load ledger today";
      if (String(errText).toLowerCase().includes("forbidden")) {
        setCanReadLedger(false);
        return;
      }
      toast("danger", errText);
    } finally {
      setLedgerTodayLoading(false);
    }
  }, []);

  const loadUnread = useCallback(async () => {
    try {
      const data = await apiFetch(ENDPOINTS.NOTIFS_UNREAD, { method: "GET" });
      setUnread(Number(data?.unread ?? 0) || 0);
    } catch {
      setUnread(0);
    }
  }, []);

  const loadNotificationsList = useCallback(async () => {
    setNotifsLoading(true);
    setNotifsErr("");

    try {
      const data = await apiFetch(ENDPOINTS.NOTIFS_LIST, { method: "GET" });

      const raw =
        (Array.isArray(data?.notifications) && data.notifications) ||
        (Array.isArray(data?.items) && data.items) ||
        (Array.isArray(data?.rows) && data.rows) ||
        [];

      setNotifs(dedupeNotifications(raw));
    } catch (e) {
      setNotifs([]);
      setNotifsErr(
        e?.data?.error || e?.message || "Notifications list not available.",
      );
    } finally {
      setNotifsLoading(false);
    }
  }, []);

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

  const awaitingSales = useMemo(() => {
    const list = Array.isArray(sales) ? sales : [];
    const q = String(salesQ || "")
      .trim()
      .toLowerCase();

    return list
      .filter(
        (s) =>
          String(s?.status || "").toUpperCase() === "AWAITING_PAYMENT_RECORD",
      )
      .filter((s) => {
        if (!q) return true;
        const hay = [
          s?.id,
          s?.customerName ?? s?.customer_name,
          s?.customerPhone ?? s?.customer_phone,
          s?.totalAmount ?? s?.total,
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

  const awaitingCount = awaitingSales.length;

  const openSessionId = currentOpenSession?.id
    ? Number(currentOpenSession.id)
    : null;

  const sessionDeposits = useMemo(() => {
    if (!openSessionId) return [];
    return (Array.isArray(deposits) ? deposits : []).filter(
      (d) =>
        Number(d?.cashSessionId ?? d?.cash_session_id ?? 0) === openSessionId,
    );
  }, [deposits, openSessionId]);

  const sessionExpenses = useMemo(() => {
    if (!openSessionId) return [];
    return (Array.isArray(expenses) ? expenses : []).filter(
      (x) =>
        Number(x?.cashSessionId ?? x?.cash_session_id ?? 0) === openSessionId,
    );
  }, [expenses, openSessionId]);

  const sessionLedgerRows = useMemo(() => {
    if (!openSessionId) return [];
    return (Array.isArray(ledger) ? ledger : []).filter(
      (r) =>
        Number(r?.cashSessionId ?? r?.cash_session_id ?? 0) === openSessionId,
    );
  }, [ledger, openSessionId]);

  const sessionCashIn = useMemo(() => {
    return sumAmounts(
      sessionLedgerRows.filter(
        (r) =>
          String(r?.direction || "").toUpperCase() === "IN" &&
          String(r?.method || "").toUpperCase() === "CASH",
      ),
      (r) => r?.amount,
    );
  }, [sessionLedgerRows]);

  const sessionCashOut = useMemo(() => {
    return sumAmounts(
      sessionLedgerRows.filter(
        (r) =>
          String(r?.direction || "").toUpperCase() === "OUT" &&
          String(r?.method || "").toUpperCase() === "CASH",
      ),
      (r) => r?.amount,
    );
  }, [sessionLedgerRows]);

  const depositsOut = useMemo(
    () => sumAmounts(sessionDeposits, (d) => d?.amount),
    [sessionDeposits],
  );

  const expensesOut = useMemo(
    () => sumAmounts(sessionExpenses, (x) => x?.amount),
    [sessionExpenses],
  );

  const opening =
    Number(
      currentOpenSession?.openingBalance ??
        currentOpenSession?.opening_balance ??
        0,
    ) || 0;

  const expectedDrawerCash = useMemo(() => {
    return opening + sessionCashIn - sessionCashOut - depositsOut - expensesOut;
  }, [opening, sessionCashIn, sessionCashOut, depositsOut, expensesOut]);

  const selectedSaleExpectedAmount = useMemo(() => {
    return Number(selectedSale?.totalAmount ?? selectedSale?.total ?? 0) || 0;
  }, [selectedSale]);

  const paymentAmountNumber = useMemo(() => {
    return numOrNull(amount);
  }, [amount]);

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
  }, [selectedSale, paymentAmountNumber, selectedSaleExpectedAmount]);

  async function handleSubmitPayment(e) {
    e.preventDefault();
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

      await loadSales();
      await loadSummary();
      await loadPayments();
      await loadSessions();
      await loadUnread();

      setPaymentBtnState("success");
      setTimeout(() => setPaymentBtnState("idle"), 900);
    } catch (e2) {
      setPaymentBtnState("idle");
      toast("danger", e2?.data?.error || e2?.message || "Payment failed");
    }
  }

  async function handleOpenSession(e) {
    e.preventDefault();
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
      await loadUnread();

      setOpenBtnState("success");
      setTimeout(() => setOpenBtnState("idle"), 900);
    } catch (e2) {
      setOpenBtnState("idle");
      toast("danger", e2?.data?.error || e2?.message || "Open session failed");
    }
  }

  async function handleCloseSession(e) {
    e.preventDefault();
    if (closeBtnState === "loading") return;

    if (!currentOpenSession?.id) {
      return toast("warn", "No open session.");
    }

    setCloseBtnState("loading");
    try {
      await apiFetch(ENDPOINTS.CASH_SESSION_CLOSE(currentOpenSession.id), {
        method: "POST",
        body: {
          note: closeNote?.trim() ? closeNote.trim().slice(0, 200) : undefined,
        },
      });

      toast("success", "Session closed.");
      setCloseNote("");
      await loadSessions();
      await loadUnread();

      setCloseBtnState("success");
      setTimeout(() => setCloseBtnState("idle"), 900);
    } catch (e2) {
      setCloseBtnState("idle");
      toast("danger", e2?.data?.error || e2?.message || "Close session failed");
    }
  }

  async function handleCreateDeposit(e) {
    e.preventDefault();
    if (depositBtnState === "loading") return;

    if (!currentOpenSession?.id) {
      return toast("warn", "Open a cash session first.");
    }

    const n = numOrNull(depositAmount);
    if (n == null || n <= 0) {
      return toast("warn", "Enter a valid amount.");
    }

    setDepositBtnState("loading");
    try {
      await apiFetch(ENDPOINTS.CASHBOOK_DEPOSIT_CREATE, {
        method: "POST",
        body: {
          cashSessionId: Number(currentOpenSession.id),
          amount: Math.round(n),
          method: String(depositMethod || "BANK").toUpperCase(),
          reference: depositReference?.trim()
            ? depositReference.trim().slice(0, 120)
            : undefined,
          note: depositNote?.trim()
            ? depositNote.trim().slice(0, 200)
            : undefined,
        },
      });

      toast("success", "Deposit created.");
      setDepositAmount("");
      setDepositMethod("BANK");
      setDepositReference("");
      setDepositNote("");

      await loadDeposits();
      await loadSessions();

      setDepositBtnState("success");
      setTimeout(() => setDepositBtnState("idle"), 900);
    } catch (e2) {
      setDepositBtnState("idle");
      toast("danger", e2?.data?.error || e2?.message || "Deposit failed");
    }
  }

  async function handleCreateExpense(e) {
    e.preventDefault();
    if (expenseBtnState === "loading") return;

    if (!currentOpenSession?.id) {
      return toast("warn", "Open a cash session first.");
    }

    const n = numOrNull(expenseAmount);
    if (n == null || n <= 0) {
      return toast("warn", "Enter a valid amount.");
    }

    setExpenseBtnState("loading");
    try {
      await apiFetch(ENDPOINTS.EXPENSE_CREATE, {
        method: "POST",
        body: {
          cashSessionId: Number(currentOpenSession.id),
          amount: Math.round(n),
          category: String(expenseCategory || "GENERAL").slice(0, 50),
          reference: expenseRef?.trim()
            ? expenseRef.trim().slice(0, 120)
            : undefined,
          note: expenseNote?.trim()
            ? expenseNote.trim().slice(0, 200)
            : undefined,
        },
      });

      toast("success", "Expense created.");
      setExpenseAmount("");
      setExpenseCategory("GENERAL");
      setExpenseRef("");
      setExpenseNote("");

      await loadExpenses();
      await loadSessions();

      setExpenseBtnState("success");
      setTimeout(() => setExpenseBtnState("idle"), 900);
    } catch (e2) {
      setExpenseBtnState("idle");
      toast("danger", e2?.data?.error || e2?.message || "Expense failed");
    }
  }

  async function handleCreateReconcile(e) {
    e.preventDefault();
    if (reconcileBtnState === "loading") return;

    const sid = Number(selectedClosedSessionId);
    if (!Number.isInteger(sid) || sid <= 0) {
      return toast("warn", "Pick a closed session.");
    }

    const n = numOrNull(reconcileCountedCash);
    if (n == null || n < 0) {
      return toast("warn", "Enter counted cash.");
    }

    setReconcileBtnState("loading");
    try {
      await apiFetch(ENDPOINTS.CASH_RECONCILE_CREATE, {
        method: "POST",
        body: {
          cashSessionId: sid,
          countedCash: Math.round(n),
          note: reconcileNote?.trim()
            ? reconcileNote.trim().slice(0, 200)
            : undefined,
        },
      });

      toast("success", "Reconcile saved.");
      setReconcileCountedCash("");
      setReconcileNote("");
      await loadReconciles();
      await loadSessions();

      setReconcileBtnState("success");
      setTimeout(() => setReconcileBtnState("idle"), 900);
    } catch (e2) {
      setReconcileBtnState("idle");
      toast("danger", e2?.data?.error || e2?.message || "Reconcile failed");
    }
  }

  async function handleCreateRefund(e) {
    e.preventDefault();
    if (refundBtnState === "loading") return;

    const sid = Number(refundSaleId);
    if (!Number.isInteger(sid) || sid <= 0) {
      return toast("warn", "Enter a valid sale ID.");
    }

    if (
      String(refundMethod || "").toUpperCase() === "CASH" &&
      !currentOpenSession?.id
    ) {
      return toast("warn", "Open a cash session for CASH refund.");
    }

    setRefundBtnState("loading");
    try {
      await apiFetch(ENDPOINTS.REFUND_CREATE, {
        method: "POST",
        body: {
          saleId: sid,
          reason: refundReason?.trim()
            ? refundReason.trim().slice(0, 300)
            : undefined,
          method: String(refundMethod || "CASH").toUpperCase(),
          reference: refundReference?.trim()
            ? refundReference.trim().slice(0, 120)
            : undefined,
        },
      });

      toast("success", `Refund saved for sale #${sid}`);
      setRefundSaleId("");
      setRefundReason("");
      setRefundMethod("CASH");
      setRefundReference("");

      await loadRefunds();
      await loadSessions();

      setRefundBtnState("success");
      setTimeout(() => setRefundBtnState("idle"), 900);
    } catch (e2) {
      setRefundBtnState("idle");
      toast("danger", e2?.data?.error || e2?.message || "Refund failed");
    }
  }

  useEffect(() => {
    if (!isAuthorized) return;

    loadSessions();
    loadUnread();

    if (section === "dashboard") {
      loadSummary();
      loadSales();
      loadPayments();
      loadLedgerToday();
      loadLedger();
      loadDeposits();
      loadExpenses();
      loadNotificationsList();
    } else if (section === "payments") {
      loadSales();
      loadSummary();
      loadPayments();
      loadSessions();
    } else if (section === "sessions") {
      loadSessions();
    } else if (section === "ledger") {
      loadLedger();
      loadLedgerToday();
      loadSessions();
      loadDeposits();
      loadExpenses();
    } else if (section === "credits") {
      loadSessions();
    } else if (section === "deposits") {
      loadDeposits();
      loadSessions();
    } else if (section === "expenses") {
      loadExpenses();
      loadSessions();
    } else if (section === "reconcile") {
      loadReconciles();
      loadSessions();
    } else if (section === "refunds") {
      loadRefunds();
      loadSessions();
    } else if (section === "notifications") {
      loadUnread();
      loadNotificationsList();
    }
  }, [
    isAuthorized,
    section,
    loadSessions,
    loadSales,
    loadSummary,
    loadPayments,
    loadDeposits,
    loadExpenses,
    loadReconciles,
    loadRefunds,
    loadLedger,
    loadLedgerToday,
    loadUnread,
    loadNotificationsList,
  ]);

  useEffect(() => {
    if (!isAuthorized) return;

    try {
      sseRef.current?.close?.();
    } catch {}

    sseRef.current = null;
    setStreamStatus("idle");

    try {
      const conn = connectSSE(ENDPOINTS.NOTIFS_STREAM, {
        onHello: () => setStreamStatus("live"),
        onNotification: (payload) => {
          loadUnread();

          setNotifs((prev) => {
            const list = Array.isArray(prev) ? prev : [];
            const item =
              payload && typeof payload === "object"
                ? payload
                : { title: String(payload) };

            return dedupeNotifications([item, ...list]).slice(0, 30);
          });
        },
        onError: () => setStreamStatus("error"),
      });
      sseRef.current = conn;
    } catch {
      setStreamStatus("error");
    }

    return () => {
      try {
        sseRef.current?.close?.();
      } catch {}
      sseRef.current = null;
    };
  }, [isAuthorized, loadUnread]);

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

  useEffect(() => {
    if (section !== "payments") return;
    awaitingSales.slice(0, 20).forEach((s) => {
      if (s?.id) ensureSaleDetails(s.id);
    });
  }, [section, awaitingSales, ensureSaleDetails]);

  useEffect(() => {
    const sid = selectedSale?.id ? Number(selectedSale.id) : null;
    if (!sid) return;
    ensureSaleDetails(sid);
  }, [selectedSale?.id, ensureSaleDetails]);

  if (bootLoading) return <PageSkeleton />;

  if (!isAuthorized) {
    return <div className="p-6 text-sm app-muted">Redirecting…</div>;
  }

  const subtitle = `User: ${me?.email || "—"} • ${locationLabel(me)}`;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--app-bg)]">
      <RoleBar title="Cashier" subtitle={subtitle} user={me} />

      <div className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-black text-[var(--app-fg)]">
                Cashier Control Strip
              </div>
              <div className="mt-1 text-xs app-muted">
                Monitor session state, payment queue, live notifications and
                drawer expectation.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-xs text-[var(--app-fg)]">
                Session:{" "}
                <b>
                  {currentOpenSession
                    ? `OPEN #${currentOpenSession.id}`
                    : "CLOSED"}
                </b>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-xs text-[var(--app-fg)]">
                Awaiting payments: <b>{awaitingCount}</b>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-xs text-[var(--app-fg)]">
                Unread alerts: <b>{unread}</b>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-xs text-[var(--app-fg)]">
                Expected drawer cash: <b>{money(expectedDrawerCash)}</b>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-5">
        <div className="mb-4">
          {sessionsLoading ? (
            <Banner>Loading session…</Banner>
          ) : currentOpenSession ? (
            <Banner kind="success">
              <div className="flex flex-wrap items-center gap-2">
                <b>Session OPEN</b>
                <span>#{currentOpenSession.id}</span>
                <span>
                  Opening: <b>{money(opening)}</b>
                </span>
                <span>
                  Expected cash now: <b>{money(expectedDrawerCash)}</b>
                </span>
              </div>
            </Banner>
          ) : (
            <Banner kind="warn">
              <b>No open session.</b> Open one in <b>Cash sessions</b> before
              you do cash work.
            </Banner>
          )}
        </div>

        {msg ? (
          <div className="mb-4">
            <Banner kind={msgKind}>{msg}</Banner>
          </div>
        ) : null}

        <div className="grid gap-4">
          <CashierTopSectionSwitcher
            me={me}
            section={section}
            setSection={setSection}
            sections={SECTIONS}
            awaitingCount={awaitingCount}
            unread={unread}
            hasOpenSession={!!currentOpenSession}
          />

          <main className="grid gap-4">
            {section === "dashboard" ? (
              <CashierDashboardSection
                summaryLoading={summaryLoading}
                salesLoading={salesLoading}
                sessionsLoading={sessionsLoading}
                summary={summary}
                ledgerToday={ledgerToday}
                ledgerTodayLoading={ledgerTodayLoading}
                unread={unread}
                streamStatus={streamStatus}
                awaitingCount={awaitingCount}
                loadSessions={loadSessions}
                loadSummary={loadSummary}
                loadSales={loadSales}
                loadPayments={loadPayments}
                loadUnread={loadUnread}
                setSection={setSection}
              />
            ) : null}

            {section === "payments" ? (
              <CashierPaymentsSection
                salesLoading={salesLoading}
                loadSales={loadSales}
                salesQ={salesQ}
                setSalesQ={setSalesQ}
                awaitingSales={awaitingSales}
                selectedSale={selectedSale}
                setSelectedSale={setSelectedSale}
                amount={amount}
                setAmount={setAmount}
                method={method}
                setMethod={setMethod}
                note={note}
                setNote={setNote}
                methods={METHODS}
                paymentBtnState={paymentBtnState}
                currentOpenSession={currentOpenSession}
                getSellerPaymentMethodFromSale={getSellerPaymentMethodFromSale}
                ensureSaleDetails={ensureSaleDetails}
                saleDetailsById={saleDetailsById}
                saleDetailsLoadingById={saleDetailsLoadingById}
                itemsSummary={itemsSummary}
                money={money}
                safeDate={safeDate}
                payments={payments}
                paymentsLoading={paymentsLoading}
                payQ={payQ}
                setPayQ={setPayQ}
                canReadPayments={canReadPayments}
                loadSummary={loadSummary}
                loadPayments={loadPayments}
                paymentAmountStatus={paymentAmountStatus}
                selectedSaleExpectedAmount={selectedSaleExpectedAmount}
                onSubmitPayment={handleSubmitPayment}
              />
            ) : null}

            {section === "sessions" ? (
              <CashierSessionsSection
                currentOpenSession={currentOpenSession}
                sessions={sessions}
                sessionsLoading={sessionsLoading}
                openingBalance={openingBalance}
                setOpeningBalance={setOpeningBalance}
                openBtnState={openBtnState}
                closeNote={closeNote}
                setCloseNote={setCloseNote}
                closeBtnState={closeBtnState}
                loadSessions={loadSessions}
                loadUnread={loadUnread}
                money={money}
                safeDate={safeDate}
                onOpenSession={handleOpenSession}
                onCloseSession={handleCloseSession}
              />
            ) : null}

            {section === "ledger" ? (
              <CashierLedgerSection
                currentOpenSession={currentOpenSession}
                canReadLedger={canReadLedger}
                ledger={ledger}
                ledgerLoading={ledgerLoading}
                ledgerQ={ledgerQ}
                setLedgerQ={setLedgerQ}
                ledgerFromDate={ledgerFromDate}
                setLedgerFromDate={setLedgerFromDate}
                ledgerToDate={ledgerToDate}
                setLedgerToDate={setLedgerToDate}
                ledgerToday={ledgerToday}
                ledgerTodayLoading={ledgerTodayLoading}
                opening={opening}
                expectedDrawerCash={expectedDrawerCash}
                sessionCashIn={sessionCashIn}
                sessionCashOut={sessionCashOut}
                depositsOut={depositsOut}
                expensesOut={expensesOut}
                sessionDeposits={sessionDeposits}
                sessionExpenses={sessionExpenses}
                loadLedger={loadLedger}
                loadLedgerToday={loadLedgerToday}
                loadDeposits={loadDeposits}
                loadExpenses={loadExpenses}
                loadSessions={loadSessions}
                money={money}
                safeDate={safeDate}
              />
            ) : null}

            {section === "credits" ? <CashierCreditsSection /> : null}

            {section === "deposits" ? (
              <CashierDepositsSection
                currentOpenSession={currentOpenSession}
                deposits={deposits}
                depositsLoading={depositsLoading}
                depositQ={depositQ}
                setDepositQ={setDepositQ}
                depositAmount={depositAmount}
                setDepositAmount={setDepositAmount}
                depositMethod={depositMethod}
                setDepositMethod={setDepositMethod}
                depositReference={depositReference}
                setDepositReference={setDepositReference}
                depositNote={depositNote}
                setDepositNote={setDepositNote}
                depositBtnState={depositBtnState}
                methods={METHODS}
                loadDeposits={loadDeposits}
                loadSessions={loadSessions}
                money={money}
                safeDate={safeDate}
                onCreateDeposit={handleCreateDeposit}
              />
            ) : null}

            {section === "expenses" ? (
              <CashierExpensesSection
                currentOpenSession={currentOpenSession}
                expenses={expenses}
                expensesLoading={expensesLoading}
                expenseQ={expenseQ}
                setExpenseQ={setExpenseQ}
                expenseAmount={expenseAmount}
                setExpenseAmount={setExpenseAmount}
                expenseCategory={expenseCategory}
                setExpenseCategory={setExpenseCategory}
                expenseRef={expenseRef}
                setExpenseRef={setExpenseRef}
                expenseNote={expenseNote}
                setExpenseNote={setExpenseNote}
                expenseBtnState={expenseBtnState}
                loadExpenses={loadExpenses}
                loadSessions={loadSessions}
                money={money}
                safeDate={safeDate}
                onCreateExpense={handleCreateExpense}
              />
            ) : null}

            {section === "reconcile" ? (
              <CashierReconcileSection
                closedSessions={closedSessions}
                reconciles={reconciles}
                reconcilesLoading={reconcilesLoading}
                reconcileQ={reconcileQ}
                setReconcileQ={setReconcileQ}
                selectedClosedSessionId={selectedClosedSessionId}
                setSelectedClosedSessionId={setSelectedClosedSessionId}
                reconcileCountedCash={reconcileCountedCash}
                setReconcileCountedCash={setReconcileCountedCash}
                reconcileNote={reconcileNote}
                setReconcileNote={setReconcileNote}
                reconcileBtnState={reconcileBtnState}
                loadReconciles={loadReconciles}
                loadSessions={loadSessions}
                money={money}
                safeDate={safeDate}
                onCreateReconcile={handleCreateReconcile}
              />
            ) : null}

            {section === "refunds" ? (
              <CashierRefundsSection
                currentOpenSession={currentOpenSession}
                refunds={refunds}
                refundsLoading={refundsLoading}
                refundQ={refundQ}
                setRefundQ={setRefundQ}
                refundSaleId={refundSaleId}
                setRefundSaleId={setRefundSaleId}
                refundReason={refundReason}
                setRefundReason={setRefundReason}
                refundMethod={refundMethod}
                setRefundMethod={setRefundMethod}
                refundReference={refundReference}
                setRefundReference={setRefundReference}
                refundBtnState={refundBtnState}
                methods={METHODS}
                loadRefunds={loadRefunds}
                loadSessions={loadSessions}
                money={money}
                safeDate={safeDate}
                onCreateRefund={handleCreateRefund}
              />
            ) : null}

            {section === "notifications" ? (
              <CashierNotificationsSection
                unread={unread}
                streamStatus={streamStatus}
                notifs={notifs}
                notifsLoading={notifsLoading}
                notifsErr={notifsErr}
                loadUnread={loadUnread}
                loadNotificationsList={loadNotificationsList}
                safeDate={safeDate}
              />
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}
