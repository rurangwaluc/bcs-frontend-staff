"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import RoleBar from "../../components/RoleBar";
import { apiFetch } from "../../lib/api";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

const ENDPOINTS = {
  SALES_LIST: "/sales",
  PAYMENT_RECORD: "/payments",
  PAYMENTS_LIST: "/payments",
  PAYMENTS_SUMMARY: "/payments/summary",

  CASH_SESSIONS_MINE: "/cash-sessions/mine",
  CASH_SESSION_OPEN: "/cash-sessions/open",
  CASH_SESSION_CLOSE: (id) => `/cash-sessions/${id}/close`,

  CASHBOOK_DEPOSITS_LIST: "/cashbook/deposits",
  CASHBOOK_DEPOSIT_CREATE: "/cashbook/deposits",

  EXPENSES_LIST: "/cash/expenses",
  EXPENSE_CREATE: "/cash/expenses",

  CASH_RECONCILES_LIST: "/reconciles",
  CASH_RECONCILE_CREATE: "/reconcile",

  REFUNDS_LIST: "/refunds",
  REFUND_CREATE: "/refunds",
};

const METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "MOMO", label: "Mobile Money" },
  { value: "CARD", label: "Card" },
  { value: "BANK", label: "Bank" },
  { value: "OTHER", label: "Other" },
];

export default function CashierPage() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState("payments");

  // ROLE GUARD
  useEffect(() => {
    let alive = true;
    async function run() {
      try {
        const data = await getMe();
        if (!alive) return;

        const user = data?.user || null;
        setMe(user);

        const role = String(user?.role || "").toLowerCase();
        if (!role) return router.replace("/login");

        if (role !== "cashier") {
          const map = {
            seller: "/seller",
            store_keeper: "/store-keeper",
            manager: "/manager",
            admin: "/admin",
            owner: "/owner",
          };
          router.replace(map[role] || "/");
        }
      } catch {
        if (!alive) return;
        router.replace("/login");
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [router]);

  const isAuthorized =
    !!me && String(me?.role || "").toLowerCase() === "cashier";

  // CASH SESSIONS
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionOpenLoading, setSessionOpenLoading] = useState(false);
  const [sessionCloseLoading, setSessionCloseLoading] = useState(false);

  const [openingBalance, setOpeningBalance] = useState("");
  const [openNote, setOpenNote] = useState("");
  const [closingBalance, setClosingBalance] = useState("");
  const [closeNote, setCloseNote] = useState("");

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

  // PAYMENTS / SALES
  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesQ, setSalesQ] = useState("");
  const [selectedSale, setSelectedSale] = useState(null);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [recording, setRecording] = useState(false);

  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [payQ, setPayQ] = useState("");

  const [summary, setSummary] = useState({
    today: { count: 0, total: 0 },
    allTime: { count: 0, total: 0 },
  });
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [canReadPayments, setCanReadPayments] = useState(true);

  // DEPOSITS
  const [deposits, setDeposits] = useState([]);
  const [depositsLoading, setDepositsLoading] = useState(false);
  const [depositQ, setDepositQ] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositMethod, setDepositMethod] = useState("BANK");
  const [depositReference, setDepositReference] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [depositSaving, setDepositSaving] = useState(false);

  // EXPENSES
  const [expenses, setExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [expenseQ, setExpenseQ] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("GENERAL");
  const [expenseRef, setExpenseRef] = useState("");
  const [expenseNote, setExpenseNote] = useState("");
  const [expenseSaving, setExpenseSaving] = useState(false);

  // RECONCILES
  const [reconciles, setReconciles] = useState([]);
  const [reconcilesLoading, setReconcilesLoading] = useState(false);
  const [reconcileQ, setReconcileQ] = useState("");
  const [reconcileCountedCash, setReconcileCountedCash] = useState("");
  const [reconcileNote, setReconcileNote] = useState("");
  const [reconcileSaving, setReconcileSaving] = useState(false);

  // REFUNDS
  const [refunds, setRefunds] = useState([]);
  const [refundsLoading, setRefundsLoading] = useState(false);
  const [refundQ, setRefundQ] = useState("");
  const [refundSaleId, setRefundSaleId] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundSaving, setRefundSaving] = useState(false);

  // LOADERS
  const loadSales = useCallback(async () => {
    setSalesLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.SALES_LIST, { method: "GET" });
      const list = Array.isArray(data?.sales)
        ? data.sales
        : data?.items || data?.rows || [];
      setSales(Array.isArray(list) ? list : []);
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Cannot load sales");
      setSales([]);
    } finally {
      setSalesLoading(false);
    }
  }, []);

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    setMsg("");
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
      setMsg(errText);
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setMsg("");
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
        allTime: {
          count: Number(s?.allTime?.count || 0),
          total: Number(s?.allTime?.total || 0),
        },
      });
      setCanReadPayments(true);
    } catch (e) {
      const errText = e?.data?.error || e?.message || "Cannot load summary";
      if (String(errText).toLowerCase().includes("forbidden")) {
        setCanReadPayments(false);
        return;
      }
      setMsg(errText);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.CASH_SESSIONS_MINE, {
        method: "GET",
      });
      const list = Array.isArray(data?.sessions)
        ? data.sessions
        : data?.items || data?.rows || [];
      setSessions(Array.isArray(list) ? list : []);
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Cannot load sessions");
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const loadDeposits = useCallback(async () => {
    setDepositsLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.CASHBOOK_DEPOSITS_LIST, {
        method: "GET",
      });
      const list = Array.isArray(data?.deposits)
        ? data.deposits
        : data?.items || data?.rows || [];
      setDeposits(Array.isArray(list) ? list : []);
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Cannot load deposits");
      setDeposits([]);
    } finally {
      setDepositsLoading(false);
    }
  }, []);

  const loadExpenses = useCallback(async () => {
    setExpensesLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.EXPENSES_LIST, { method: "GET" });
      const list = Array.isArray(data?.expenses)
        ? data.expenses
        : data?.items || data?.rows || [];
      setExpenses(Array.isArray(list) ? list : []);
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Cannot load expenses");
      setExpenses([]);
    } finally {
      setExpensesLoading(false);
    }
  }, []);

  const loadReconciles = useCallback(async () => {
    setReconcilesLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.CASH_RECONCILES_LIST, {
        method: "GET",
      });
      const list = Array.isArray(data?.reconciles)
        ? data.reconciles
        : data?.items || data?.rows || [];
      setReconciles(Array.isArray(list) ? list : []);
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Cannot load cash check");
      setReconciles([]);
    } finally {
      setReconcilesLoading(false);
    }
  }, []);

  const loadRefunds = useCallback(async () => {
    setRefundsLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.REFUNDS_LIST, { method: "GET" });
      const list = Array.isArray(data?.refunds)
        ? data.refunds
        : data?.items || data?.rows || [];
      setRefunds(Array.isArray(list) ? list : []);
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Cannot load refunds");
      setRefunds([]);
    } finally {
      setRefundsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;

    loadSessions();

    if (tab === "payments") {
      loadSales();
      loadSummary();
      loadPayments();
    }
    if (tab === "sessions") loadSessions();
    if (tab === "deposits") loadDeposits();
    if (tab === "expenses") loadExpenses();
    if (tab === "reconcile") loadReconciles();
    if (tab === "refunds") loadRefunds();
  }, [
    isAuthorized,
    tab,
    loadSales,
    loadSummary,
    loadPayments,
    loadSessions,
    loadDeposits,
    loadExpenses,
    loadReconciles,
    loadRefunds,
  ]);

  // FILTERS
  const awaitingSales = useMemo(() => {
    return (Array.isArray(sales) ? sales : []).filter(
      (s) =>
        String(s?.status || "").toUpperCase() === "AWAITING_PAYMENT_RECORD",
    );
  }, [sales]);

  const filteredAwaitingSales = useMemo(() => {
    const qq = String(salesQ || "")
      .trim()
      .toLowerCase();
    if (!qq) return awaitingSales;

    return awaitingSales.filter((s) => {
      const id = String(s?.id || "");
      const name = String(s?.customerName || s?.customer_name || "")
        .trim()
        .toLowerCase();
      const phone = String(s?.customerPhone || s?.customer_phone || "")
        .trim()
        .toLowerCase();
      const total = String(s?.totalAmount ?? s?.total ?? "");
      return (
        id.includes(qq) ||
        name.includes(qq) ||
        phone.includes(qq) ||
        total.includes(qq)
      );
    });
  }, [awaitingSales, salesQ]);

  const filteredPayments = useMemo(() => {
    const qq = String(payQ || "")
      .trim()
      .toLowerCase();
    const list = Array.isArray(payments) ? payments : [];
    if (!qq) return list;

    return list.filter((p) => {
      const id = String(p?.id || "");
      const saleId = String(p?.saleId || p?.sale_id || "");
      const m = String(p?.method || "").toLowerCase();
      const amt = String(p?.amount ?? "");
      return (
        id.includes(qq) ||
        saleId.includes(qq) ||
        m.includes(qq) ||
        amt.includes(qq)
      );
    });
  }, [payments, payQ]);

  const filteredDeposits = useMemo(() => {
    const qq = String(depositQ || "")
      .trim()
      .toLowerCase();
    const list = Array.isArray(deposits) ? deposits : [];
    if (!qq) return list;

    return list.filter((d) => {
      const id = String(d?.id || "");
      const ref = String(d?.reference || d?.ref || "").toLowerCase();
      const m = String(d?.method || "").toLowerCase();
      const amt = String(d?.amount ?? "");
      return (
        id.includes(qq) ||
        ref.includes(qq) ||
        m.includes(qq) ||
        amt.includes(qq)
      );
    });
  }, [deposits, depositQ]);

  const filteredExpenses = useMemo(() => {
    const qq = String(expenseQ || "")
      .trim()
      .toLowerCase();
    const list = Array.isArray(expenses) ? expenses : [];
    if (!qq) return list;

    return list.filter((x) => {
      const id = String(x?.id || "");
      const cat = String(x?.category || x?.type || "").toLowerCase();
      const ref = String(x?.reference || x?.ref || "").toLowerCase();
      const n = String(x?.note || "").toLowerCase();
      const amt = String(x?.amount ?? "");
      return (
        id.includes(qq) ||
        cat.includes(qq) ||
        ref.includes(qq) ||
        n.includes(qq) ||
        amt.includes(qq)
      );
    });
  }, [expenses, expenseQ]);

  const filteredReconciles = useMemo(() => {
    const qq = String(reconcileQ || "")
      .trim()
      .toLowerCase();
    const list = Array.isArray(reconciles) ? reconciles : [];
    if (!qq) return list;

    return list.filter((r) => {
      const id = String(r?.id || "");
      const note2 = String(r?.note || "").toLowerCase();
      const status = String(r?.status || r?.state || "").toLowerCase();
      return id.includes(qq) || note2.includes(qq) || status.includes(qq);
    });
  }, [reconciles, reconcileQ]);

  const filteredRefunds = useMemo(() => {
    const qq = String(refundQ || "")
      .trim()
      .toLowerCase();
    const list = Array.isArray(refunds) ? refunds : [];
    if (!qq) return list;

    return list.filter((r) => {
      const id = String(r?.id || "");
      const saleId = String(r?.saleId || r?.sale_id || "");
      const reason = String(r?.reason || "").toLowerCase();
      const amt = String(r?.amount ?? "");
      return (
        id.includes(qq) ||
        saleId.includes(qq) ||
        reason.includes(qq) ||
        amt.includes(qq)
      );
    });
  }, [refunds, refundQ]);

  // ACTIONS
  async function recordPayment(e) {
    e.preventDefault();
    if (recording) return;
    setMsg("");

    if (!currentOpenSession?.id) return setMsg("Open a session first.");
    if (!selectedSale?.id) return setMsg("Pick a sale first.");

    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return setMsg("Type a good amount.");

    const payload = {
      saleId: Number(selectedSale.id),
      amount: Math.round(n),
      method: String(method || "CASH").toUpperCase(),
      note: note?.trim() ? note.trim().slice(0, 200) : undefined,
      cashSessionId: Number(currentOpenSession.id),
    };

    setRecording(true);
    try {
      await apiFetch(ENDPOINTS.PAYMENT_RECORD, {
        method: "POST",
        body: payload,
      });

      setMsg(`✅ Done! Payment saved for sale #${selectedSale.id}`);
      setSelectedSale(null);
      setAmount("");
      setMethod("CASH");
      setReference("");
      setNote("");

      await loadSales();
      await loadSummary();
      await loadPayments();
      await loadSessions();
    } catch (e2) {
      setMsg(e2?.data?.error || e2?.message || "Payment failed");
    } finally {
      setRecording(false);
    }
  }

  async function openSession(e) {
    e.preventDefault();
    if (sessionOpenLoading) return;
    setMsg("");

    const n = Number(openingBalance);
    if (!Number.isFinite(n) || n < 0) return setMsg("Type opening money.");

    setSessionOpenLoading(true);
    try {
      await apiFetch(ENDPOINTS.CASH_SESSION_OPEN, {
        method: "POST",
        body: {
          openingBalance: Math.round(n),
          note: openNote?.trim() ? openNote.trim().slice(0, 200) : undefined,
        },
      });

      setMsg("✅ Session is open");
      setOpeningBalance("");
      setOpenNote("");
      await loadSessions();
    } catch (e2) {
      setMsg(e2?.data?.error || e2?.message || "Open session failed");
    } finally {
      setSessionOpenLoading(false);
    }
  }

  async function closeSession(e) {
    e.preventDefault();
    if (sessionCloseLoading) return;
    setMsg("");

    if (!currentOpenSession?.id) return setMsg("No open session.");

    const n = Number(closingBalance);
    if (!Number.isFinite(n) || n < 0) return setMsg("Type closing money.");

    setSessionCloseLoading(true);
    try {
      await apiFetch(ENDPOINTS.CASH_SESSION_CLOSE(currentOpenSession.id), {
        method: "POST",
        body: {
          closingBalance: Math.round(n),
          note: closeNote?.trim() ? closeNote.trim().slice(0, 200) : undefined,
        },
      });

      setMsg("✅ Session is closed");
      setClosingBalance("");
      setCloseNote("");
      await loadSessions();
    } catch (e2) {
      setMsg(e2?.data?.error || e2?.message || "Close session failed");
    } finally {
      setSessionCloseLoading(false);
    }
  }

  async function createDeposit(e) {
    e.preventDefault();
    if (depositSaving) return;
    setMsg("");

    if (!currentOpenSession?.id) return setMsg("Open a session first.");

    const n = Number(depositAmount);
    if (!Number.isFinite(n) || n <= 0) return setMsg("Type deposit money.");

    setDepositSaving(true);
    try {
      await apiFetch(ENDPOINTS.CASHBOOK_DEPOSIT_CREATE, {
        method: "POST",
        body: {
          amount: Math.round(n),
          method: String(depositMethod || "BANK").toUpperCase(),
          reference: depositReference?.trim()
            ? depositReference.trim().slice(0, 100)
            : undefined,
          note: depositNote?.trim()
            ? depositNote.trim().slice(0, 200)
            : undefined,
          cashSessionId: Number(currentOpenSession.id),
        },
      });

      setMsg("✅ Deposit saved");
      setDepositAmount("");
      setDepositMethod("BANK");
      setDepositReference("");
      setDepositNote("");

      await loadDeposits();
      await loadSessions();
    } catch (e2) {
      setMsg(e2?.data?.error || e2?.message || "Deposit failed");
    } finally {
      setDepositSaving(false);
    }
  }

  async function createExpense(e) {
    e.preventDefault();
    if (expenseSaving) return;
    setMsg("");

    if (!currentOpenSession?.id) return setMsg("Open a session first.");

    const n = Number(expenseAmount);
    if (!Number.isFinite(n) || n <= 0) return setMsg("Type expense money.");

    setExpenseSaving(true);
    try {
      await apiFetch(ENDPOINTS.EXPENSE_CREATE, {
        method: "POST",
        body: {
          amount: Math.round(n),
          category: String(expenseCategory || "GENERAL").slice(0, 50),
          reference: expenseRef?.trim()
            ? expenseRef.trim().slice(0, 100)
            : undefined,
          note: expenseNote?.trim()
            ? expenseNote.trim().slice(0, 200)
            : undefined,
          cashSessionId: Number(currentOpenSession.id),
        },
      });

      setMsg("✅ Expense saved");
      setExpenseAmount("");
      setExpenseCategory("GENERAL");
      setExpenseRef("");
      setExpenseNote("");

      await loadExpenses();
      await loadSessions();
    } catch (e2) {
      setMsg(e2?.data?.error || e2?.message || "Expense failed");
    } finally {
      setExpenseSaving(false);
    }
  }

  async function createReconcile(e) {
    e.preventDefault();
    if (reconcileSaving) return;
    setMsg("");

    if (!currentOpenSession?.id) return setMsg("Open a session first.");

    const n = Number(reconcileCountedCash);
    if (!Number.isFinite(n) || n < 0) return setMsg("Type cash you counted.");

    const payload = {
      cashSessionId: Number(currentOpenSession.id),
      expectedCash: 0,
      countedCash: Math.round(n),
      note: reconcileNote?.trim()
        ? reconcileNote.trim().slice(0, 200)
        : undefined,
    };

    setReconcileSaving(true);
    try {
      await apiFetch(ENDPOINTS.CASH_RECONCILE_CREATE, {
        method: "POST",
        body: payload,
      });

      setMsg("✅ Cash check saved");
      setReconcileCountedCash("");
      setReconcileNote("");

      await loadReconciles();
      await loadSessions();
    } catch (e2) {
      setMsg(e2?.data?.error || e2?.message || "Cash check failed");
    } finally {
      setReconcileSaving(false);
    }
  }

  async function createRefund(e) {
    e.preventDefault();
    if (refundSaving) return;
    setMsg("");

    const sid = Number(refundSaleId);
    if (!Number.isInteger(sid) || sid <= 0) return setMsg("Type a sale ID.");

    setRefundSaving(true);
    try {
      await apiFetch(ENDPOINTS.REFUND_CREATE, {
        method: "POST",
        body: {
          saleId: sid,
          reason: refundReason?.trim()
            ? refundReason.trim().slice(0, 300)
            : undefined,
        },
      });

      setMsg(`✅ Refund saved for sale #${sid}`);
      setRefundSaleId("");
      setRefundReason("");

      await loadRefunds();
      await loadSessions();
    } catch (e2) {
      setMsg(e2?.data?.error || e2?.message || "Refund failed");
    } finally {
      setRefundSaving(false);
    }
  }

  if (!isAuthorized) {
    return <div className="p-6 text-sm text-gray-600">Redirecting...</div>;
  }

  function reconcileStatus(r) {
    return r?.status || r?.reconcileStatus || r?.state || "PENDING";
  }

  const subtitle = `User: ${me?.email || "-"} • Location: ${
    me?.locationId ?? me?.location_id ?? "-"
  }`;

  return (
    <div>
      <RoleBar title="Cashier" subtitle={subtitle} />

      <div className="max-w-6xl mx-auto p-6">
        {/* Session banner */}
        <div className="mb-4">
          {sessionsLoading ? (
            <div className="p-3 rounded-lg bg-gray-50 text-gray-700 text-sm">
              Loading sessions...
            </div>
          ) : currentOpenSession ? (
            <div className="p-3 rounded-lg bg-green-50 text-green-900 text-sm">
              ✅ Session OPEN (#{currentOpenSession.id}) • Opened:{" "}
              {safeDate(
                currentOpenSession.openedAt || currentOpenSession.opened_at,
              )}{" "}
              • Opening:{" "}
              {money(
                currentOpenSession.openingBalance ??
                  currentOpenSession.opening_balance,
              )}
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-yellow-50 text-yellow-900 text-sm">
              ⚠️ No open session. Open one in <b>Sessions</b>.
            </div>
          )}
        </div>

        {/* Message */}
        {msg ? (
          <div className="mb-4 text-sm">
            {String(msg).startsWith("✅") ? (
              <div className="p-3 rounded-lg bg-green-50 text-green-800">
                {msg}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-red-50 text-red-700">{msg}</div>
            )}
          </div>
        ) : null}

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card
            label="Paid today"
            value={summaryLoading ? "…" : String(summary.today.count)}
            sub={`Total: ${money(summary.today.total)}`}
          />
          <Card
            label="All payments"
            value={summaryLoading ? "…" : String(summary.allTime.count)}
            sub={`Total: ${money(summary.allTime.total)}`}
          />
          <Card
            label="Need payment"
            value={salesLoading ? "…" : String(awaitingSales.length)}
            sub="Sales waiting for payment"
          />
        </div>

        {!canReadPayments ? (
          <div className="mb-4 text-sm p-3 rounded-lg bg-yellow-50 text-yellow-900">
            ⚠️ You cannot view payments list (permission).
          </div>
        ) : null}

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap mb-4 text-sm">
          <TabButton
            active={tab === "payments"}
            onClick={() => setTab("payments")}
          >
            Payments
          </TabButton>
          <TabButton
            active={tab === "sessions"}
            onClick={() => setTab("sessions")}
          >
            Sessions
          </TabButton>
          <TabButton
            active={tab === "deposits"}
            onClick={() => setTab("deposits")}
          >
            Deposits
          </TabButton>
          <TabButton
            active={tab === "expenses"}
            onClick={() => setTab("expenses")}
          >
            Expenses
          </TabButton>
          <TabButton
            active={tab === "reconcile"}
            onClick={() => setTab("reconcile")}
          >
            Cash check
          </TabButton>
          <TabButton
            active={tab === "refunds"}
            onClick={() => setTab("refunds")}
          >
            Refunds
          </TabButton>
        </div>

        {/* PAYMENTS TAB */}
        {tab === "payments" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <div className="font-semibold">Sales waiting for payment</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Pick a sale, then save payment.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadSales}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm"
                >
                  Refresh
                </button>
              </div>

              <div className="p-3 border-b">
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Search"
                  value={salesQ}
                  onChange={(e) => setSalesQ(e.target.value)}
                />
              </div>

              {salesLoading ? (
                <div className="p-4 text-sm text-gray-600">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left p-3">ID</th>
                        <th className="text-right p-3">Total</th>
                        <th className="text-left p-3">Customer</th>
                        <th className="text-right p-3">Pick</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAwaitingSales.map((s) => {
                        const total = s?.totalAmount ?? s?.total ?? 0;
                        const cname =
                          s?.customerName ?? s?.customer_name ?? "-";
                        const cphone =
                          s?.customerPhone ?? s?.customer_phone ?? "";
                        return (
                          <tr key={s?.id} className="border-t">
                            <td className="p-3 font-medium">#{s?.id}</td>
                            <td className="p-3 text-right">{money(total)}</td>
                            <td className="p-3">
                              <div className="font-medium">{cname}</div>
                              <div className="text-xs text-gray-500">
                                {cphone}
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                className="px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50"
                                onClick={() => {
                                  setSelectedSale(s);
                                  setAmount(
                                    String(Math.round(Number(total) || 0)),
                                  );
                                  setMethod("CASH");
                                  setReference("");
                                  setNote("");
                                }}
                              >
                                Pick
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredAwaitingSales.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-sm text-gray-600">
                            No sales here.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <div className="font-semibold">Save payment</div>
              <div className="text-xs text-gray-500 mt-1">
                You must have an open session.
              </div>

              {!selectedSale ? (
                <div className="mt-4 text-sm text-gray-600">
                  Pick a sale first.
                </div>
              ) : (
                <div className="mt-4">
                  <div className="text-sm">
                    <div>
                      <b>Sale:</b> #{selectedSale.id}
                    </div>
                    <div>
                      <b>Total:</b>{" "}
                      {money(
                        selectedSale.totalAmount ?? selectedSale.total ?? 0,
                      )}
                    </div>
                  </div>

                  <form onSubmit={recordPayment} className="mt-4 grid gap-3">
                    <input
                      className="border rounded-lg px-3 py-2"
                      placeholder="Amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />

                    <select
                      className="border rounded-lg px-3 py-2"
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                    >
                      {METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>

                    <input
                      className="border rounded-lg px-3 py-2"
                      placeholder="Note (optional)"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />

                    <div className="flex gap-2 flex-wrap">
                      <button
                        disabled={recording}
                        className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60"
                      >
                        {recording ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
                        onClick={() => setSelectedSale(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="mt-6 border-t pt-4">
                <div className="font-semibold">Payments list</div>

                <div className="mt-3 flex gap-2 items-center">
                  <input
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    placeholder="Search"
                    value={payQ}
                    onChange={(e) => setPayQ(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      loadSummary();
                      loadPayments();
                    }}
                    className="px-4 py-2 rounded-lg bg-black text-white text-sm"
                  >
                    Refresh
                  </button>
                </div>

                {!canReadPayments ? (
                  <div className="mt-3 text-sm text-yellow-900 bg-yellow-50 p-3 rounded-lg">
                    You cannot view this list.
                  </div>
                ) : paymentsLoading ? (
                  <div className="mt-3 text-sm text-gray-600">Loading...</div>
                ) : (
                  <div className="mt-3 overflow-x-auto border rounded-xl">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="text-left p-3">ID</th>
                          <th className="text-left p-3">Sale</th>
                          <th className="text-right p-3">Amount</th>
                          <th className="text-left p-3">Method</th>
                          <th className="text-left p-3">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPayments.map((p, idx) => (
                          <tr key={p?.id || idx} className="border-t">
                            <td className="p-3 font-medium">{p?.id ?? "-"}</td>
                            <td className="p-3">
                              #{p?.saleId ?? p?.sale_id ?? "-"}
                            </td>
                            <td className="p-3 text-right">
                              {money(p?.amount ?? 0)}
                            </td>
                            <td className="p-3">{p?.method ?? "-"}</td>
                            <td className="p-3">
                              {safeDate(p?.createdAt || p?.created_at)}
                            </td>
                          </tr>
                        ))}
                        {filteredPayments.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="p-4 text-sm text-gray-600"
                            >
                              No payments yet.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* SESSIONS TAB */}
        {tab === "sessions" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="font-semibold">Open session</div>

              <form onSubmit={openSession} className="mt-4 grid gap-3 max-w-md">
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Opening money"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  disabled={!!currentOpenSession}
                />
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Note (optional)"
                  value={openNote}
                  onChange={(e) => setOpenNote(e.target.value)}
                  disabled={!!currentOpenSession}
                />
                <button
                  disabled={sessionOpenLoading || !!currentOpenSession}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60"
                >
                  {currentOpenSession
                    ? "Already open"
                    : sessionOpenLoading
                      ? "Opening..."
                      : "Open"}
                </button>
              </form>

              <div className="mt-6 border-t pt-4">
                <div className="font-semibold">Close session</div>

                {!currentOpenSession ? (
                  <div className="mt-3 text-sm text-gray-600">
                    No open session.
                  </div>
                ) : (
                  <form
                    onSubmit={closeSession}
                    className="mt-4 grid gap-3 max-w-md"
                  >
                    <input
                      className="border rounded-lg px-3 py-2"
                      placeholder="Closing money"
                      value={closingBalance}
                      onChange={(e) => setClosingBalance(e.target.value)}
                    />
                    <input
                      className="border rounded-lg px-3 py-2"
                      placeholder="Note (optional)"
                      value={closeNote}
                      onChange={(e) => setCloseNote(e.target.value)}
                    />
                    <button
                      disabled={sessionCloseLoading}
                      className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60"
                    >
                      {sessionCloseLoading ? "Closing..." : "Close"}
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div className="font-semibold">My sessions</div>
                <button
                  type="button"
                  onClick={loadSessions}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm"
                >
                  Refresh
                </button>
              </div>

              {sessionsLoading ? (
                <div className="p-4 text-sm text-gray-600">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left p-3">ID</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Opened</th>
                        <th className="text-left p-3">Closed</th>
                        <th className="text-right p-3">Open</th>
                        <th className="text-right p-3">Close</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(sessions) ? sessions : []).map((s) => (
                        <tr key={s?.id} className="border-t">
                          <td className="p-3 font-medium">{s?.id}</td>
                          <td className="p-3">{s?.status}</td>
                          <td className="p-3">
                            {safeDate(s?.openedAt || s?.opened_at)}
                          </td>
                          <td className="p-3">
                            {safeDate(s?.closedAt || s?.closed_at)}
                          </td>
                          <td className="p-3 text-right">
                            {money(s?.openingBalance ?? s?.opening_balance)}
                          </td>
                          <td className="p-3 text-right">
                            {s?.closingBalance == null &&
                            s?.closing_balance == null
                              ? "-"
                              : money(s?.closingBalance ?? s?.closing_balance)}
                          </td>
                        </tr>
                      ))}
                      {(Array.isArray(sessions) ? sessions : []).length ===
                      0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-sm text-gray-600">
                            No sessions yet.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* DEPOSITS TAB */}
        {tab === "deposits" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="font-semibold">Save deposit</div>
              <div className="text-xs text-gray-500 mt-1">
                Money you put in bank.
              </div>

              <form
                onSubmit={createDeposit}
                className="mt-4 grid gap-3 max-w-md"
              >
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Amount"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />

                <select
                  className="border rounded-lg px-3 py-2"
                  value={depositMethod}
                  onChange={(e) => setDepositMethod(e.target.value)}
                >
                  {METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>

                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Reference (optional)"
                  value={depositReference}
                  onChange={(e) => setDepositReference(e.target.value)}
                />

                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Note (optional)"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                />

                <button
                  disabled={depositSaving}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60"
                >
                  {depositSaving ? "Saving..." : "Save"}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div className="font-semibold">Deposits</div>
                <button
                  type="button"
                  onClick={loadDeposits}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm"
                >
                  Refresh
                </button>
              </div>

              <div className="p-3 border-b">
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Search"
                  value={depositQ}
                  onChange={(e) => setDepositQ(e.target.value)}
                />
              </div>

              {depositsLoading ? (
                <div className="p-4 text-sm text-gray-600">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left p-3">ID</th>
                        <th className="text-right p-3">Amount</th>
                        <th className="text-left p-3">Method</th>
                        <th className="text-left p-3">Ref</th>
                        <th className="text-left p-3">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDeposits.map((d, idx) => (
                        <tr key={d?.id || idx} className="border-t">
                          <td className="p-3 font-medium">{d?.id ?? "-"}</td>
                          <td className="p-3 text-right">
                            {money(d?.amount ?? 0)}
                          </td>
                          <td className="p-3">{d?.method ?? "-"}</td>
                          <td className="p-3">
                            {d?.reference || d?.ref || "-"}
                          </td>
                          <td className="p-3">
                            {safeDate(d?.createdAt || d?.created_at)}
                          </td>
                        </tr>
                      ))}
                      {filteredDeposits.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-sm text-gray-600">
                            No deposits yet.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* EXPENSES TAB */}
        {tab === "expenses" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="font-semibold">Save expense</div>
              <div className="text-xs text-gray-500 mt-1">Money you used.</div>

              <form
                onSubmit={createExpense}
                className="mt-4 grid gap-3 max-w-md"
              >
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Amount"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                />

                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Type (e.g. Transport, Lunch)"
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                />

                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Reference (optional)"
                  value={expenseRef}
                  onChange={(e) => setExpenseRef(e.target.value)}
                />

                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Note (optional)"
                  value={expenseNote}
                  onChange={(e) => setExpenseNote(e.target.value)}
                />

                <button
                  disabled={expenseSaving}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60"
                >
                  {expenseSaving ? "Saving..." : "Save"}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div className="font-semibold">Expenses</div>
                <button
                  type="button"
                  onClick={loadExpenses}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm"
                >
                  Refresh
                </button>
              </div>

              <div className="p-3 border-b">
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Search"
                  value={expenseQ}
                  onChange={(e) => setExpenseQ(e.target.value)}
                />
              </div>

              {expensesLoading ? (
                <div className="p-4 text-sm text-gray-600">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left p-3">ID</th>
                        <th className="text-right p-3">Amount</th>
                        <th className="text-left p-3">Type</th>
                        <th className="text-left p-3">Ref</th>
                        <th className="text-left p-3">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.map((x, idx) => (
                        <tr key={x?.id || idx} className="border-t">
                          <td className="p-3 font-medium">{x?.id ?? "-"}</td>
                          <td className="p-3 text-right">
                            {money(x?.amount ?? 0)}
                          </td>
                          <td className="p-3">
                            {x?.category || x?.type || "-"}
                          </td>
                          <td className="p-3">
                            {x?.reference || x?.ref || "-"}
                          </td>
                          <td className="p-3">
                            {safeDate(x?.createdAt || x?.created_at)}
                          </td>
                        </tr>
                      ))}
                      {filteredExpenses.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-sm text-gray-600">
                            No expenses yet.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* RECONCILE TAB */}
        {tab === "reconcile" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="font-semibold">Cash check</div>
              <div className="text-xs text-gray-500 mt-1">
                Count the cash in hand, then save.
              </div>

              <form
                onSubmit={createReconcile}
                className="mt-4 grid gap-3 max-w-md"
              >
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Cash you counted"
                  value={reconcileCountedCash}
                  onChange={(e) => setReconcileCountedCash(e.target.value)}
                />
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Note (optional)"
                  value={reconcileNote}
                  onChange={(e) => setReconcileNote(e.target.value)}
                />
                <button
                  disabled={reconcileSaving}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60"
                >
                  {reconcileSaving ? "Saving..." : "Save"}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div className="font-semibold">Cash checks</div>
                <button
                  type="button"
                  onClick={loadReconciles}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm"
                >
                  Refresh
                </button>
              </div>

              <div className="p-3 border-b">
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Search"
                  value={reconcileQ}
                  onChange={(e) => setReconcileQ(e.target.value)}
                />
              </div>

              {reconcilesLoading ? (
                <div className="p-4 text-sm text-gray-600">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left p-3">ID</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-right p-3">Counted</th>
                        <th className="text-left p-3">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReconciles.map((r, idx) => (
                        <tr key={r?.id || idx} className="border-t">
                          <td className="p-3 font-medium">{r?.id ?? "-"}</td>
                          <td className="p-3 font-medium">
                            {reconcileStatus(r)}
                          </td>
                          <td className="p-3 text-right">
                            {money(r?.countedCash ?? r?.counted_cash ?? 0)}
                          </td>
                          <td className="p-3">
                            {safeDate(r?.createdAt || r?.created_at)}
                          </td>
                        </tr>
                      ))}
                      {filteredReconciles.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-sm text-gray-600">
                            No cash checks yet.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* REFUNDS TAB */}
        {tab === "refunds" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="font-semibold">Save refund</div>
              <div className="text-xs text-gray-500 mt-1">Give money back.</div>

              <form
                onSubmit={createRefund}
                className="mt-4 grid gap-3 max-w-md"
              >
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Sale ID"
                  value={refundSaleId}
                  onChange={(e) => setRefundSaleId(e.target.value)}
                />
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Reason (optional)"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                />
                <button
                  disabled={refundSaving}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60"
                >
                  {refundSaving ? "Saving..." : "Save"}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div className="font-semibold">Refunds</div>
                <button
                  type="button"
                  onClick={loadRefunds}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm"
                >
                  Refresh
                </button>
              </div>

              <div className="p-3 border-b">
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Search"
                  value={refundQ}
                  onChange={(e) => setRefundQ(e.target.value)}
                />
              </div>

              {refundsLoading ? (
                <div className="p-4 text-sm text-gray-600">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left p-3">ID</th>
                        <th className="text-left p-3">Sale</th>
                        <th className="text-right p-3">Amount</th>
                        <th className="text-left p-3">Reason</th>
                        <th className="text-left p-3">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRefunds.map((r, idx) => (
                        <tr key={r?.id || idx} className="border-t">
                          <td className="p-3 font-medium">{r?.id ?? "-"}</td>
                          <td className="p-3">
                            #{r?.saleId ?? r?.sale_id ?? "-"}
                          </td>
                          <td className="p-3 text-right">
                            {money(r?.amount ?? 0)}
                          </td>
                          <td className="p-3">{r?.reason || "-"}</td>
                          <td className="p-3">
                            {safeDate(r?.createdAt || r?.created_at)}
                          </td>
                        </tr>
                      ))}
                      {filteredRefunds.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-sm text-gray-600">
                            No refunds yet.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* UI helpers */
function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-3 py-2 rounded-lg border " +
        (active
          ? "bg-black text-white border-black"
          : "bg-white text-gray-700 hover:bg-gray-100")
      }
    >
      {children}
    </button>
  );
}

function Card({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub ? <div className="text-sm text-gray-600 mt-1">{sub}</div> : null}
    </div>
  );
}

function money(n) {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return "0";
  return Math.round(x).toLocaleString();
}

function safeDate(v) {
  if (!v) return "-";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}
