// frontend-staff/src/app/cashier/page.js
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import AsyncButton from "../../components/AsyncButton";
import CreditsPanel from "../../components/CreditsPanel";
import RoleBar from "../../components/RoleBar";
import { apiFetch } from "../../lib/api";
import { connectSSE } from "../../lib/sse";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

const ENDPOINTS = {
  SALES_LIST: "/sales",
  SALE_GET: (id) => `/sales/${id}`,

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

  CASH_LEDGER_LIST: "/cash/ledger",
  CASH_LEDGER_TODAY: "/cash/summary/today",

  NOTIFS_UNREAD: "/notifications/unread-count",
  NOTIFS_LIST: "/notifications?limit=20",
  NOTIFS_STREAM: "/notifications/stream",
};

const METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "MOMO", label: "Mobile Money" },
  { value: "CARD", label: "Card" },
  { value: "BANK", label: "Bank" },
  { value: "OTHER", label: "Other" },
];

const SECTIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "payments", label: "Payments" },
  { key: "sessions", label: "Cash sessions" },
  { key: "ledger", label: "Cash ledger" },
  { key: "credits", label: "Credits" },
  { key: "deposits", label: "Deposits" },
  { key: "expenses", label: "Expenses" },
  { key: "reconcile", label: "Reconcile" },
  { key: "refunds", label: "Refunds" },
  { key: "notifications", label: "Notifications" },
];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function numOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function money(n) {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return "0";
  return Math.round(x).toLocaleString();
}

function safeDate(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

function getSellerPaymentMethodFromSale(sale) {
  const raw = sale?.paymentMethod ?? sale?.payment_method ?? null;
  const m = raw ? String(raw).trim().toUpperCase() : "";
  return m || null;
}

function locationLabel(me) {
  const loc = me?.location || null;

  const name =
    (loc?.name != null ? String(loc.name).trim() : "") ||
    (me?.locationName != null ? String(me.locationName).trim() : "") ||
    "";

  const code =
    (loc?.code != null ? String(loc.code).trim() : "") ||
    (me?.locationCode != null ? String(me.locationCode).trim() : "") ||
    "";

  const id = loc?.id ?? me?.locationId ?? me?.location_id ?? null;

  if (name && code) return `${name} (${code})`;
  if (name) return name;
  if (id != null && id !== "") return `Location #${id}`;
  return "Location —";
}

// ✅ SINGLE source of truth for items summary (no duplicates, no normalizeSaleItems)
function normalizeItemsForSummary(items) {
  if (!Array.isArray(items)) return [];
  return items.map((it) => {
    const name = String(
      it?.productName ?? it?.name ?? it?.product?.name ?? it?.title ?? "Item",
    ).trim();
    const qty = Number(it?.qty ?? it?.quantity ?? it?.count ?? 0) || 0;
    return { name: name || "Item", qty };
  });
}

function itemsSummary(items) {
  const list = normalizeItemsForSummary(items).filter((x) => x.qty > 0);
  if (!list.length) return "—";
  const shown = list.slice(0, 3).map((x) => `${x.name} × ${x.qty}`);
  return shown.join(" • ") + (list.length > 3 ? " • …" : "");
}

/* ---------- UI atoms ---------- */

function Skeleton({ className = "" }) {
  return (
    <div
      className={cx("animate-pulse rounded-xl bg-slate-200/70", className)}
    />
  );
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-3 h-4 w-48" />
            <div className="mt-6 grid gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div>
            <Skeleton className="h-12 w-full rounded-2xl" />
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
            <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Skeleton className="h-80 w-full rounded-2xl" />
              <Skeleton className="h-80 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Banner({ kind = "info", children }) {
  const styles =
    kind === "success"
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : kind === "warn"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : kind === "danger"
          ? "bg-rose-50 text-rose-900 border-rose-200"
          : "bg-slate-50 text-slate-800 border-slate-200";

  return (
    <div className={cx("rounded-2xl border px-4 py-3 text-sm", styles)}>
      {children}
    </div>
  );
}

function Card({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold text-slate-600">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {sub ? <div className="mt-1 text-xs text-slate-600">{sub}</div> : null}
    </div>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none",
        "focus:ring-2 focus:ring-slate-300",
        className,
      )}
    />
  );
}

function Select({ className = "", ...props }) {
  return (
    <select
      {...props}
      className={cx(
        "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none",
        "focus:ring-2 focus:ring-slate-300",
        className,
      )}
    />
  );
}

function SectionCard({ title, hint, right, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {hint ? (
            <div className="mt-1 text-xs text-slate-600">{hint}</div>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function NavItem({ active, label, onClick, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "w-full text-left rounded-xl px-3 py-2.5 text-sm font-semibold transition flex items-center justify-between gap-2",
        active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50",
      )}
    >
      <span className="truncate">{label}</span>
      {badge ? (
        <span
          className={cx(
            "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold",
            active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700",
          )}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function TinyPill({ tone = "neutral", children }) {
  const cls =
    tone === "success"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : tone === "warn"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : tone === "danger"
          ? "bg-rose-50 text-rose-800 border-rose-200"
          : tone === "info"
            ? "bg-sky-50 text-sky-800 border-sky-200"
            : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-xl border px-2 py-1 text-[11px] font-bold",
        cls,
      )}
    >
      {children}
    </span>
  );
}

function sumAmounts(list, picker) {
  let t = 0;
  for (const x of list || []) {
    const n = Number(picker(x) ?? 0);
    if (Number.isFinite(n)) t += n;
  }
  return t;
}

/* ---------- Page ---------- */

export default function CashierPage() {
  const router = useRouter();

  const [bootLoading, setBootLoading] = useState(true);
  const [me, setMe] = useState(null);

  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info");
  const [section, setSection] = useState("dashboard");

  function toast(kind, text) {
    setMsgKind(kind);
    setMsg(text || "");
  }

  // ROLE GUARD
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

  /* ---------- Sessions ---------- */
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

  /* ---------- Payments / Sales ---------- */
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

  // Sale details cache (items)
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

  /* ---------- Deposits ---------- */
  const [deposits, setDeposits] = useState([]);
  const [depositsLoading, setDepositsLoading] = useState(false);
  const [depositQ, setDepositQ] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositMethod, setDepositMethod] = useState("BANK");
  const [depositReference, setDepositReference] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [depositBtnState, setDepositBtnState] = useState("idle");

  /* ---------- Expenses ---------- */
  const [expenses, setExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [expenseQ, setExpenseQ] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("GENERAL");
  const [expenseRef, setExpenseRef] = useState("");
  const [expenseNote, setExpenseNote] = useState("");
  const [expenseBtnState, setExpenseBtnState] = useState("idle");

  /* ---------- Reconcile ---------- */
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

  /* ---------- Refunds ---------- */
  const [refunds, setRefunds] = useState([]);
  const [refundsLoading, setRefundsLoading] = useState(false);
  const [refundQ, setRefundQ] = useState("");

  const [refundSaleId, setRefundSaleId] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("CASH");
  const [refundReference, setRefundReference] = useState("");
  const [refundBtnState, setRefundBtnState] = useState("idle");

  /* ---------- Ledger ---------- */
  const [ledger, setLedger] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerQ, setLedgerQ] = useState("");
  const [canReadLedger, setCanReadLedger] = useState(true);

  const [ledgerToday, setLedgerToday] = useState({
    totalIn: 0,
    totalOut: 0,
    net: 0,
  });
  const [ledgerTodayLoading, setLedgerTodayLoading] = useState(false);

  /* ---------- Notifications ---------- */
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState([]);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const [notifsErr, setNotifsErr] = useState("");
  const [streamStatus, setStreamStatus] = useState("idle"); // idle|live|error
  const sseRef = useRef(null);

  /* ---------- Loaders ---------- */

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
      const list =
        (Array.isArray(data?.notifications) && data.notifications) ||
        (Array.isArray(data?.items) && data.items) ||
        (Array.isArray(data?.rows) && data.rows) ||
        [];
      setNotifs(Array.isArray(list) ? list : []);
    } catch (e) {
      setNotifs([]);
      setNotifsErr(
        e?.data?.error || e?.message || "Notifications list not available.",
      );
    } finally {
      setNotifsLoading(false);
    }
  }, []);

  // ✅ stable details fetcher (no duplicate defs, no hook issues)
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

  /* ---------- Derived: sales waiting ---------- */

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

  /* ---------- Derived: session math ---------- */

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

  /* ---------- Load by section ---------- */

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

  // SSE connect
  useEffect(() => {
    if (!isAuthorized) return;

    try {
      sseRef.current?.close?.();
    } catch {
      // ignore
    }
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
            return [item, ...list].slice(0, 30);
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
      } catch {
        // ignore
      }
      sseRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized]);

  // Prefetch details for visible payments (for items display)
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

  // Prefetch details for awaiting sales when on payments tab
  useEffect(() => {
    if (section !== "payments") return;
    awaitingSales.slice(0, 20).forEach((s) => {
      if (s?.id) ensureSaleDetails(s.id);
    });
  }, [section, awaitingSales, ensureSaleDetails]);

  // Prefetch selected sale details
  useEffect(() => {
    const sid = selectedSale?.id ? Number(selectedSale.id) : null;
    if (!sid) return;
    ensureSaleDetails(sid);
  }, [selectedSale?.id, ensureSaleDetails]);

  /* ---------- Render ---------- */

  if (bootLoading) return <PageSkeleton />;
  if (!isAuthorized)
    return <div className="p-6 text-sm text-slate-600">Redirecting…</div>;

  const subtitle = `User: ${me?.email || "—"} • ${locationLabel(me)}`;

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      <RoleBar title="Cashier" subtitle={subtitle} user={me} />

      <div className="mx-auto max-w-7xl px-4 sm:px-5 py-6">
        {/* Session banner FIRST */}
        <div className="mb-4">
          {sessionsLoading ? (
            <Banner>Loading session…</Banner>
          ) : currentOpenSession ? (
            <Banner kind="success">
              <div className="flex flex-wrap items-center gap-2">
                <b>Session OPEN</b>
                <TinyPill tone="success">#{currentOpenSession.id}</TinyPill>
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
              you do CASH work.
            </Banner>
          )}
        </div>

        {msg ? (
          <div className="mb-4">
            <Banner kind={msgKind}>{msg}</Banner>
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
          {/* Sidebar */}
          <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 h-fit">
            <div className="text-sm font-semibold text-slate-900">Cashier</div>
            <div className="mt-1 text-xs text-slate-600">
              {locationLabel(me)}
            </div>

            <div className="mt-4 lg:hidden">
              <div className="text-xs font-semibold text-slate-600 mb-2">
                Section
              </div>
              <Select
                value={section}
                onChange={(e) => setSection(e.target.value)}
              >
                {SECTIONS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="mt-4 hidden lg:grid gap-2">
              {/* ✅ Dashboard: no badge */}
              <NavItem
                active={section === "dashboard"}
                label="Dashboard"
                onClick={() => setSection("dashboard")}
              />

              <NavItem
                active={section === "payments"}
                label="Payments"
                onClick={() => setSection("payments")}
                badge={awaitingCount > 0 ? String(awaitingCount) : null}
              />
              <NavItem
                active={section === "sessions"}
                label="Cash sessions"
                onClick={() => setSection("sessions")}
                badge={currentOpenSession ? "OPEN" : null}
              />
              <NavItem
                active={section === "ledger"}
                label="Cash ledger"
                onClick={() => setSection("ledger")}
              />
              <NavItem
                active={section === "credits"}
                label="Credits"
                onClick={() => setSection("credits")}
              />
              <NavItem
                active={section === "deposits"}
                label="Deposits"
                onClick={() => setSection("deposits")}
              />
              <NavItem
                active={section === "expenses"}
                label="Expenses"
                onClick={() => setSection("expenses")}
              />
              <NavItem
                active={section === "reconcile"}
                label="Reconcile"
                onClick={() => setSection("reconcile")}
              />
              <NavItem
                active={section === "refunds"}
                label="Refunds"
                onClick={() => setSection("refunds")}
              />
              <NavItem
                active={section === "notifications"}
                label="Notifications"
                onClick={() => setSection("notifications")}
                badge={unread > 0 ? String(unread) : null}
              />
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-600">
              Simple flow: <b>Open session</b> → do work → <b>Close session</b>{" "}
              → <b>Reconcile</b>.
            </div>
          </aside>

          {/* Main */}
          <main className="grid gap-4">
            {/* DASHBOARD */}
            {section === "dashboard" ? (
              <div className="grid gap-4">
                <SectionCard
                  title="What to do now"
                  hint="Do these in order."
                  right={
                    <AsyncButton
                      variant="secondary"
                      size="sm"
                      state={
                        summaryLoading || salesLoading || sessionsLoading
                          ? "loading"
                          : "idle"
                      }
                      text="Refresh"
                      loadingText="Refreshing…"
                      successText="Done"
                      onClick={() => {
                        loadSessions();
                        loadSummary();
                        loadSales();
                        loadPayments();
                        loadUnread();
                      }}
                    />
                  }
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-sm font-bold text-slate-900">
                        1) Open session
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        You need it for cash work.
                      </div>
                      <div className="mt-3">
                        <button
                          type="button"
                          className="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-bold hover:bg-slate-800"
                          onClick={() => setSection("sessions")}
                        >
                          Go
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-sm font-bold text-slate-900">
                        2) Record payments
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        Finish sales waiting.
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <TinyPill tone={awaitingCount > 0 ? "warn" : "neutral"}>
                          Waiting: {awaitingCount}
                        </TinyPill>
                        <button
                          type="button"
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-slate-50"
                          onClick={() => setSection("payments")}
                        >
                          Go
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-sm font-bold text-slate-900">
                        3) Close & reconcile
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        Close, then count cash.
                      </div>
                      <div className="mt-3">
                        <button
                          type="button"
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-slate-50"
                          onClick={() => setSection("reconcile")}
                        >
                          Go
                        </button>
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <Card
                    label="Today payments"
                    value={summaryLoading ? "…" : String(summary.today.count)}
                    sub={`Total: ${money(summary.today.total)}`}
                  />
                  <Card
                    label="Today money IN"
                    value={
                      ledgerTodayLoading ? "…" : money(ledgerToday.totalIn)
                    }
                    sub="All methods"
                  />
                  <Card
                    label="Today money OUT"
                    value={
                      ledgerTodayLoading ? "…" : money(ledgerToday.totalOut)
                    }
                    sub="All methods"
                  />
                  <Card
                    label="Unread notifications"
                    value={String(unread)}
                    sub={
                      streamStatus === "live"
                        ? "Live ON"
                        : streamStatus === "error"
                          ? "Live OFF"
                          : "—"
                    }
                  />
                </div>
              </div>
            ) : null}

            {/* PAYMENTS */}
            {section === "payments" ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <SectionCard
                  title="Sales waiting for payment"
                  hint="Pick a sale. Check items. Then record payment."
                  right={
                    <AsyncButton
                      variant="secondary"
                      size="sm"
                      state={salesLoading ? "loading" : "idle"}
                      text="Refresh"
                      loadingText="Refreshing…"
                      successText="Done"
                      onClick={loadSales}
                    />
                  }
                >
                  <div className="grid gap-3">
                    <Input
                      placeholder="Search (id / name / phone)"
                      value={salesQ}
                      onChange={(e) => setSalesQ(e.target.value)}
                    />

                    {salesLoading ? (
                      <div className="grid gap-3">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                      </div>
                    ) : awaitingSales.length === 0 ? (
                      <div className="text-sm text-slate-600">
                        No sales waiting.
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {awaitingSales.slice(0, 20).map((s) => {
                          const total = s?.totalAmount ?? s?.total ?? 0;
                          const cname =
                            s?.customerName ?? s?.customer_name ?? "—";
                          const cphone =
                            s?.customerPhone ?? s?.customer_phone ?? "";
                          const sellerMethod =
                            getSellerPaymentMethodFromSale(s);
                          const sid = Number(s?.id || 0) || null;

                          const isLoadingItems = sid
                            ? !!saleDetailsLoadingById[sid]
                            : false;
                          const items = sid
                            ? saleDetailsById[sid]?.items || []
                            : [];

                          return (
                            <button
                              key={String(s?.id)}
                              type="button"
                              className={cx(
                                "w-full text-left rounded-2xl border p-3 hover:bg-slate-50",
                                selectedSale?.id === s?.id
                                  ? "border-slate-400 bg-slate-50"
                                  : "border-slate-200 bg-white",
                              )}
                              onClick={() => {
                                if (sid) ensureSaleDetails(sid);
                                const sm = getSellerPaymentMethodFromSale(s);
                                setSelectedSale(s);
                                setAmount(
                                  String(Math.round(Number(total) || 0)),
                                );
                                setMethod(sm || "CASH");
                                setNote("");
                              }}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-extrabold text-slate-900">
                                    Sale #{s?.id}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-600 truncate">
                                    {cname}
                                    {cphone ? ` • ${cphone}` : ""}
                                  </div>
                                  <div className="mt-2 text-xs text-slate-600">
                                    Seller said: <b>{sellerMethod || "—"}</b>
                                  </div>

                                  <div className="mt-2 text-xs text-slate-600 break-words">
                                    <span className="font-semibold">
                                      Items:
                                    </span>{" "}
                                    {isLoadingItems ? (
                                      <span className="text-slate-500">
                                        Loading…
                                      </span>
                                    ) : (
                                      <span>{itemsSummary(items)}</span>
                                    )}
                                  </div>
                                </div>

                                <div className="shrink-0 text-right">
                                  <div className="text-sm font-extrabold text-slate-900">
                                    {money(total)}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    RWF
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </SectionCard>

                <SectionCard
                  title="Record payment"
                  hint="Needs OPEN session. Amount must match sale total."
                >
                  {!currentOpenSession ? (
                    <Banner kind="warn">Open a cash session first.</Banner>
                  ) : null}

                  {!selectedSale ? (
                    <div className="text-sm text-slate-600">
                      Pick a sale on the left.
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {(() => {
                        const sid = Number(selectedSale?.id || 0) || null;
                        const isLoadingItems = sid
                          ? !!saleDetailsLoadingById[sid]
                          : false;
                        const items = sid
                          ? saleDetailsById[sid]?.items || []
                          : [];
                        const expected =
                          Number(
                            selectedSale.totalAmount ?? selectedSale.total ?? 0,
                          ) || 0;

                        return (
                          <>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <div className="text-sm font-extrabold text-slate-900">
                                Sale #{selectedSale.id}
                              </div>
                              <div className="mt-1 text-xs text-slate-600">
                                Total: <b>{money(expected)}</b> RWF
                              </div>
                              <div className="mt-2 text-xs text-slate-600 break-words">
                                <span className="font-semibold">Items:</span>{" "}
                                {isLoadingItems ? (
                                  <span className="text-slate-500">
                                    Loading…
                                  </span>
                                ) : (
                                  <span>{itemsSummary(items)}</span>
                                )}
                              </div>
                            </div>

                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                if (paymentBtnState === "loading") return;

                                if (!currentOpenSession?.id)
                                  return toast(
                                    "warn",
                                    "Open a cash session first.",
                                  );
                                if (!selectedSale?.id)
                                  return toast("warn", "Pick a sale first.");

                                const n = numOrNull(amount);
                                if (n == null || n <= 0)
                                  return toast("warn", "Enter a valid amount.");

                                if (Math.round(n) !== Math.round(expected)) {
                                  return toast(
                                    "warn",
                                    `Amount must be exactly ${money(expected)} RWF.`,
                                  );
                                }

                                setPaymentBtnState("loading");
                                try {
                                  await apiFetch(ENDPOINTS.PAYMENT_RECORD, {
                                    method: "POST",
                                    body: {
                                      saleId: Number(selectedSale.id),
                                      amount: Math.round(n),
                                      method: String(
                                        method || "CASH",
                                      ).toUpperCase(),
                                      note: note?.trim()
                                        ? note.trim().slice(0, 200)
                                        : undefined,
                                      cashSessionId: Number(
                                        currentOpenSession.id,
                                      ),
                                    },
                                  });

                                  toast(
                                    "success",
                                    `Payment saved for sale #${selectedSale.id}`,
                                  );
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
                                  setTimeout(
                                    () => setPaymentBtnState("idle"),
                                    900,
                                  );
                                } catch (e2) {
                                  setPaymentBtnState("idle");
                                  toast(
                                    "danger",
                                    e2?.data?.error ||
                                      e2?.message ||
                                      "Payment failed",
                                  );
                                }
                              }}
                              className="grid gap-3"
                            >
                              <Input
                                placeholder="Amount (RWF)"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                              />
                              <Select
                                value={method}
                                onChange={(e) => setMethod(e.target.value)}
                              >
                                {METHODS.map((m) => (
                                  <option key={m.value} value={m.value}>
                                    {m.label}
                                  </option>
                                ))}
                              </Select>
                              <Input
                                placeholder="Note (optional)"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                              />

                              <div className="flex gap-2 flex-wrap">
                                <AsyncButton
                                  type="submit"
                                  variant="primary"
                                  state={paymentBtnState}
                                  text="Save payment"
                                  loadingText="Saving…"
                                  successText="Saved"
                                  disabled={!currentOpenSession}
                                />
                                <button
                                  type="button"
                                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                                  onClick={() => setSelectedSale(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Payments list */}
                  <div className="mt-6 border-t border-slate-200 pt-4">
                    <div className="text-sm font-semibold text-slate-900">
                      Payments list
                    </div>

                    {!canReadPayments ? (
                      <div className="mt-3">
                        <Banner kind="warn">
                          You can’t view this list (permission).
                        </Banner>
                      </div>
                    ) : (
                      <div className="mt-3 grid gap-3">
                        <div className="flex gap-2">
                          <Input
                            className="flex-1"
                            placeholder="Search"
                            value={payQ}
                            onChange={(e) => setPayQ(e.target.value)}
                          />
                          <AsyncButton
                            variant="secondary"
                            size="sm"
                            state={
                              paymentsLoading || summaryLoading
                                ? "loading"
                                : "idle"
                            }
                            text="Refresh"
                            loadingText="Refreshing…"
                            successText="Done"
                            onClick={() => {
                              loadSummary();
                              loadPayments();
                            }}
                          />
                        </div>

                        {paymentsLoading ? (
                          <div className="grid gap-3">
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                          </div>
                        ) : (
                          <div className="grid gap-2">
                            {(Array.isArray(payments) ? payments : [])
                              .filter((p) => {
                                const q = String(payQ || "")
                                  .trim()
                                  .toLowerCase();
                                if (!q) return true;
                                const hay = [
                                  p?.id,
                                  p?.saleId ?? p?.sale_id,
                                  p?.method,
                                  p?.amount,
                                ]
                                  .map((x) => String(x ?? ""))
                                  .join(" ")
                                  .toLowerCase();
                                return hay.includes(q);
                              })
                              .slice(0, 50)
                              .map((p, idx) => {
                                const saleId =
                                  Number(p?.saleId ?? p?.sale_id ?? 0) || null;
                                const details = saleId
                                  ? saleDetailsById[saleId]
                                  : null;
                                const items = details?.items || [];
                                const isLoadingItems = saleId
                                  ? !!saleDetailsLoadingById[saleId]
                                  : false;

                                return (
                                  <div
                                    key={p?.id || idx}
                                    className="rounded-2xl border border-slate-200 bg-white p-4"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <div className="text-sm font-extrabold text-slate-900">
                                            Payment #{p?.id ?? "—"}
                                          </div>
                                          <TinyPill tone="info">
                                            {String(
                                              p?.method ?? "—",
                                            ).toUpperCase()}
                                          </TinyPill>
                                        </div>

                                        <div className="mt-2 text-sm text-slate-700">
                                          Sale: <b>#{saleId ?? "—"}</b>
                                        </div>

                                        <div className="mt-1 text-xs text-slate-600">
                                          Time:{" "}
                                          <b>
                                            {safeDate(
                                              p?.createdAt || p?.created_at,
                                            )}
                                          </b>
                                        </div>

                                        <div className="mt-2 text-xs text-slate-600 break-words">
                                          <span className="font-semibold">
                                            Items:
                                          </span>{" "}
                                          {isLoadingItems ? (
                                            <span className="text-slate-500">
                                              Loading…
                                            </span>
                                          ) : (
                                            <span>{itemsSummary(items)}</span>
                                          )}
                                        </div>

                                        {saleId &&
                                        !details &&
                                        !isLoadingItems ? (
                                          <div className="mt-3">
                                            <button
                                              type="button"
                                              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50"
                                              onClick={() =>
                                                ensureSaleDetails(saleId)
                                              }
                                            >
                                              Load items
                                            </button>
                                          </div>
                                        ) : null}
                                      </div>

                                      <div className="shrink-0 text-right">
                                        <div className="text-xs text-slate-600">
                                          Paid
                                        </div>
                                        <div className="text-lg font-extrabold text-slate-900">
                                          {money(p?.amount ?? 0)}
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                          RWF
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                            {(Array.isArray(payments) ? payments : [])
                              .length === 0 ? (
                              <div className="text-sm text-slate-600">
                                No payments yet.
                              </div>
                            ) : null}

                            {(Array.isArray(payments) ? payments : []).length >
                            50 ? (
                              <div className="text-xs text-slate-500">
                                Showing first 50. Use search for more.
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </SectionCard>
              </div>
            ) : null}

            {/* SESSIONS */}
            {section === "sessions" ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <SectionCard
                  title="Open session"
                  hint="You can only have one OPEN session."
                >
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (openBtnState === "loading") return;

                      const n = numOrNull(openingBalance);
                      if (n == null || n < 0)
                        return toast("warn", "Enter a valid opening balance.");

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
                        toast(
                          "danger",
                          e2?.data?.error ||
                            e2?.message ||
                            "Open session failed",
                        );
                      }
                    }}
                    className="grid gap-3 max-w-md"
                  >
                    <Input
                      placeholder="Opening balance (RWF)"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(e.target.value)}
                      disabled={!!currentOpenSession}
                    />

                    <AsyncButton
                      type="submit"
                      variant="primary"
                      state={!!currentOpenSession ? "success" : openBtnState}
                      text="Open session"
                      loadingText="Opening…"
                      successText="Opened"
                      disabled={!!currentOpenSession}
                    />
                  </form>

                  <div className="mt-6 border-t border-slate-200 pt-4">
                    <div className="text-sm font-semibold text-slate-900">
                      Close session
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      Closing stops new money moves.
                    </div>

                    {!currentOpenSession ? (
                      <div className="mt-3 text-sm text-slate-600">
                        No open session.
                      </div>
                    ) : (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (closeBtnState === "loading") return;
                          if (!currentOpenSession?.id)
                            return toast("warn", "No open session.");

                          setCloseBtnState("loading");
                          try {
                            await apiFetch(
                              ENDPOINTS.CASH_SESSION_CLOSE(
                                currentOpenSession.id,
                              ),
                              {
                                method: "POST",
                                body: {
                                  note: closeNote?.trim()
                                    ? closeNote.trim().slice(0, 200)
                                    : undefined,
                                },
                              },
                            );

                            toast("success", "Session closed.");
                            setCloseNote("");
                            await loadSessions();
                            await loadUnread();

                            setCloseBtnState("success");
                            setTimeout(() => setCloseBtnState("idle"), 900);
                          } catch (e2) {
                            setCloseBtnState("idle");
                            toast(
                              "danger",
                              e2?.data?.error ||
                                e2?.message ||
                                "Close session failed",
                            );
                          }
                        }}
                        className="mt-3 grid gap-3 max-w-md"
                      >
                        <Input
                          placeholder="Note (optional)"
                          value={closeNote}
                          onChange={(e) => setCloseNote(e.target.value)}
                        />
                        <AsyncButton
                          type="submit"
                          variant="danger"
                          state={closeBtnState}
                          text="Close session"
                          loadingText="Closing…"
                          successText="Closed"
                        />
                      </form>
                    )}
                  </div>
                </SectionCard>

                <SectionCard
                  title="My sessions"
                  hint="Recent sessions."
                  right={
                    <AsyncButton
                      variant="secondary"
                      size="sm"
                      state={sessionsLoading ? "loading" : "idle"}
                      text="Refresh"
                      loadingText="Refreshing…"
                      successText="Done"
                      onClick={loadSessions}
                    />
                  }
                >
                  {sessionsLoading ? (
                    <div className="grid gap-3">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : (Array.isArray(sessions) ? sessions : []).length === 0 ? (
                    <div className="text-sm text-slate-600">
                      No sessions yet.
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {(Array.isArray(sessions) ? sessions : []).map((s) => (
                        <div
                          key={s?.id}
                          className="rounded-2xl border border-slate-200 bg-white p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-900">
                                Session #{s?.id}
                              </div>
                              <div className="mt-1 text-xs text-slate-600">
                                Status:{" "}
                                <b>{String(s?.status || "—").toUpperCase()}</b>
                              </div>
                              <div className="mt-2 text-xs text-slate-500">
                                Opened: {safeDate(s?.openedAt || s?.opened_at)}{" "}
                                • Closed:{" "}
                                {safeDate(s?.closedAt || s?.closed_at)}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-xs text-slate-600">
                                Opening
                              </div>
                              <div className="text-sm font-bold text-slate-900">
                                {money(s?.openingBalance ?? s?.opening_balance)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>
            ) : null}

            {/* LEDGER (no table, no horizontal scroll) */}
            {section === "ledger" ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <SectionCard
                  title="Session summary"
                  hint="Expected drawer cash for the OPEN session."
                  right={
                    <AsyncButton
                      variant="secondary"
                      size="sm"
                      state={
                        ledgerLoading || ledgerTodayLoading ? "loading" : "idle"
                      }
                      text="Refresh"
                      loadingText="Refreshing…"
                      successText="Done"
                      onClick={() => {
                        loadLedger();
                        loadLedgerToday();
                        loadDeposits();
                        loadExpenses();
                        loadSessions();
                      }}
                    />
                  }
                >
                  {!currentOpenSession ? (
                    <Banner kind="warn">
                      No OPEN session. Open one to see drawer expectations.
                    </Banner>
                  ) : !canReadLedger ? (
                    <Banner kind="warn">
                      You do not have permission to view cash ledger.
                    </Banner>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Card
                        label="Opening balance"
                        value={money(opening)}
                        sub={`Session #${currentOpenSession.id}`}
                      />
                      <Card
                        label="Expected drawer cash"
                        value={money(expectedDrawerCash)}
                        sub="opening + cash in - cash out - deposits - expenses"
                      />
                      <Card
                        label="Cash IN (cash only)"
                        value={money(sessionCashIn)}
                        sub="Ledger (CASH method)"
                      />
                      <Card
                        label="Cash OUT (cash only)"
                        value={money(sessionCashOut)}
                        sub="Ledger (CASH method)"
                      />
                      <Card
                        label="Deposits (this session)"
                        value={money(depositsOut)}
                        sub={`Count: ${sessionDeposits.length}`}
                      />
                      <Card
                        label="Expenses (this session)"
                        value={money(expensesOut)}
                        sub={`Count: ${sessionExpenses.length}`}
                      />
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="text-sm font-semibold text-slate-900">
                      Today (location)
                    </div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Card
                        label="Total IN"
                        value={
                          ledgerTodayLoading ? "…" : money(ledgerToday.totalIn)
                        }
                      />
                      <Card
                        label="Total OUT"
                        value={
                          ledgerTodayLoading ? "…" : money(ledgerToday.totalOut)
                        }
                      />
                      <Card
                        label="Net"
                        value={
                          ledgerTodayLoading ? "…" : money(ledgerToday.net)
                        }
                      />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  title="Cash ledger"
                  hint="All money movements (latest first)."
                >
                  {!canReadLedger ? (
                    <Banner kind="warn">
                      Ledger is blocked by permission.
                    </Banner>
                  ) : (
                    <div className="grid gap-3">
                      <Input
                        placeholder="Search (type/method/sale/payment/note)"
                        value={ledgerQ}
                        onChange={(e) => setLedgerQ(e.target.value)}
                      />

                      {ledgerLoading ? (
                        <div className="grid gap-3">
                          <Skeleton className="h-24 w-full" />
                          <Skeleton className="h-24 w-full" />
                          <Skeleton className="h-24 w-full" />
                        </div>
                      ) : (
                        <div className="grid gap-2">
                          {(Array.isArray(ledger) ? ledger : [])
                            .filter((r) => {
                              const q = String(ledgerQ || "")
                                .trim()
                                .toLowerCase();
                              if (!q) return true;
                              const hay = [
                                r?.type,
                                r?.direction,
                                r?.method,
                                r?.reference,
                                r?.note,
                                r?.saleId ?? r?.sale_id,
                                r?.paymentId ?? r?.payment_id,
                                r?.cashSessionId ?? r?.cash_session_id,
                              ]
                                .map((x) => String(x ?? ""))
                                .join(" ")
                                .toLowerCase();
                              return hay.includes(q);
                            })
                            .slice(0, 80)
                            .map((r, idx) => {
                              const dir = String(
                                r?.direction || "",
                              ).toUpperCase();
                              const amt = Number(r?.amount ?? 0) || 0;
                              return (
                                <div
                                  key={r?.id || idx}
                                  className="rounded-2xl border border-slate-200 bg-white p-4"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <div className="text-sm font-extrabold text-slate-900">
                                          {r?.type ?? "Movement"}
                                        </div>
                                        <TinyPill
                                          tone={
                                            dir === "IN" ? "success" : "danger"
                                          }
                                        >
                                          {dir || "—"}
                                        </TinyPill>
                                        <TinyPill tone="info">
                                          {String(
                                            r?.method ?? "—",
                                          ).toUpperCase()}
                                        </TinyPill>
                                      </div>

                                      <div className="mt-2 text-xs text-slate-600">
                                        Time:{" "}
                                        <b>
                                          {safeDate(
                                            r?.createdAt || r?.created_at,
                                          )}
                                        </b>
                                      </div>

                                      <div className="mt-2 text-xs text-slate-600 flex flex-wrap gap-2">
                                        <span>
                                          Session:{" "}
                                          <b>
                                            #
                                            {r?.cashSessionId ??
                                              r?.cash_session_id ??
                                              "—"}
                                          </b>
                                        </span>
                                        <span>
                                          Sale:{" "}
                                          <b>
                                            #{r?.saleId ?? r?.sale_id ?? "—"}
                                          </b>
                                        </span>
                                        <span>
                                          Payment:{" "}
                                          <b>
                                            #
                                            {r?.paymentId ??
                                              r?.payment_id ??
                                              "—"}
                                          </b>
                                        </span>
                                      </div>

                                      {r?.note ? (
                                        <div className="mt-2 text-xs text-slate-600 break-words">
                                          Note: <b>{String(r.note)}</b>
                                        </div>
                                      ) : null}
                                    </div>

                                    <div className="shrink-0 text-right">
                                      <div className="text-xs text-slate-600">
                                        Amount
                                      </div>
                                      <div className="text-lg font-extrabold text-slate-900">
                                        {money(amt)}
                                      </div>
                                      <div className="text-[11px] text-slate-500">
                                        RWF
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                          {(Array.isArray(ledger) ? ledger : []).length ===
                          0 ? (
                            <div className="text-sm text-slate-600">
                              No ledger entries yet.
                            </div>
                          ) : null}

                          {(Array.isArray(ledger) ? ledger : []).length > 80 ? (
                            <div className="text-xs text-slate-500">
                              Showing first 80. Use search to find more.
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )}
                </SectionCard>
              </div>
            ) : null}

            {/* CREDITS */}
            {section === "credits" ? (
              <SectionCard
                title="Credits (Cashier)"
                hint="Settle approved credits."
              >
                <CreditsPanel
                  title="Credits (Cashier)"
                  capabilities={{
                    canView: true,
                    canCreate: false,
                    canDecide: false,
                    canSettle: true,
                  }}
                />
              </SectionCard>
            ) : null}

            {/* DEPOSITS (no table) */}
            {section === "deposits" ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <SectionCard
                  title="Create deposit"
                  hint="Move money to bank / safe. Needs OPEN session."
                >
                  {!currentOpenSession ? (
                    <Banner kind="warn">
                      Open a session to create a deposit.
                    </Banner>
                  ) : null}

                  <form
                    className="grid gap-3 max-w-md"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (depositBtnState === "loading") return;
                      if (!currentOpenSession?.id)
                        return toast("warn", "Open a cash session first.");

                      const n = numOrNull(depositAmount);
                      if (n == null || n <= 0)
                        return toast("warn", "Enter a valid amount.");

                      setDepositBtnState("loading");
                      try {
                        await apiFetch(ENDPOINTS.CASHBOOK_DEPOSIT_CREATE, {
                          method: "POST",
                          body: {
                            cashSessionId: Number(currentOpenSession.id),
                            amount: Math.round(n),
                            method: String(
                              depositMethod || "BANK",
                            ).toUpperCase(),
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
                        toast(
                          "danger",
                          e2?.data?.error || e2?.message || "Deposit failed",
                        );
                      }
                    }}
                  >
                    <Input
                      placeholder="Amount (RWF)"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                    />
                    <Select
                      value={depositMethod}
                      onChange={(e) => setDepositMethod(e.target.value)}
                    >
                      {METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </Select>
                    <Input
                      placeholder="Reference (optional)"
                      value={depositReference}
                      onChange={(e) => setDepositReference(e.target.value)}
                    />
                    <Input
                      placeholder="Note (optional)"
                      value={depositNote}
                      onChange={(e) => setDepositNote(e.target.value)}
                    />

                    <AsyncButton
                      type="submit"
                      variant="primary"
                      state={depositBtnState}
                      text="Save deposit"
                      loadingText="Saving…"
                      successText="Saved"
                      disabled={!currentOpenSession}
                    />
                  </form>
                </SectionCard>

                <SectionCard
                  title="Deposits"
                  hint="Latest deposits"
                  right={
                    <AsyncButton
                      variant="secondary"
                      size="sm"
                      state={depositsLoading ? "loading" : "idle"}
                      text="Refresh"
                      loadingText="Refreshing…"
                      successText="Done"
                      onClick={loadDeposits}
                    />
                  }
                >
                  <Input
                    placeholder="Search"
                    value={depositQ}
                    onChange={(e) => setDepositQ(e.target.value)}
                  />

                  <div className="mt-3">
                    {depositsLoading ? (
                      <div className="grid gap-3">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {(Array.isArray(deposits) ? deposits : [])
                          .filter((d) => {
                            const q = String(depositQ || "")
                              .trim()
                              .toLowerCase();
                            if (!q) return true;
                            const hay = [
                              d?.id,
                              d?.amount,
                              d?.method,
                              d?.reference,
                              d?.cashSessionId ?? d?.cash_session_id,
                            ]
                              .map((x) => String(x ?? ""))
                              .join(" ")
                              .toLowerCase();
                            return hay.includes(q);
                          })
                          .slice(0, 60)
                          .map((d, idx) => (
                            <div
                              key={d?.id || idx}
                              className="rounded-2xl border border-slate-200 bg-white p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-extrabold text-slate-900">
                                    Deposit #{d?.id ?? "—"}
                                  </div>
                                  <div className="mt-2 text-xs text-slate-600 flex flex-wrap gap-2">
                                    <TinyPill tone="info">
                                      {String(d?.method ?? "—").toUpperCase()}
                                    </TinyPill>
                                    <span>
                                      Session:{" "}
                                      <b>
                                        #
                                        {d?.cashSessionId ??
                                          d?.cash_session_id ??
                                          "—"}
                                      </b>
                                    </span>
                                  </div>
                                  <div className="mt-2 text-xs text-slate-600">
                                    Ref: <b>{d?.reference ?? "—"}</b>
                                  </div>
                                  <div className="mt-1 text-xs text-slate-600">
                                    Time:{" "}
                                    <b>
                                      {safeDate(d?.createdAt || d?.created_at)}
                                    </b>
                                  </div>
                                </div>
                                <div className="shrink-0 text-right">
                                  <div className="text-xs text-slate-600">
                                    Amount
                                  </div>
                                  <div className="text-lg font-extrabold text-slate-900">
                                    {money(d?.amount ?? 0)}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    RWF
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}

                        {(Array.isArray(deposits) ? deposits : []).length ===
                        0 ? (
                          <div className="text-sm text-slate-600">
                            No deposits yet.
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </SectionCard>
              </div>
            ) : null}

            {/* EXPENSES (no table) */}
            {section === "expenses" ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <SectionCard
                  title="Create expense"
                  hint="Cash spent. Needs OPEN session."
                >
                  {!currentOpenSession ? (
                    <Banner kind="warn">
                      Open a session to create an expense.
                    </Banner>
                  ) : null}

                  <form
                    className="grid gap-3 max-w-md"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (expenseBtnState === "loading") return;
                      if (!currentOpenSession?.id)
                        return toast("warn", "Open a cash session first.");

                      const n = numOrNull(expenseAmount);
                      if (n == null || n <= 0)
                        return toast("warn", "Enter a valid amount.");

                      setExpenseBtnState("loading");
                      try {
                        await apiFetch(ENDPOINTS.EXPENSE_CREATE, {
                          method: "POST",
                          body: {
                            cashSessionId: Number(currentOpenSession.id),
                            amount: Math.round(n),
                            category: String(
                              expenseCategory || "GENERAL",
                            ).slice(0, 50),
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
                        toast(
                          "danger",
                          e2?.data?.error || e2?.message || "Expense failed",
                        );
                      }
                    }}
                  >
                    <Input
                      placeholder="Amount (RWF)"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                    />
                    <Input
                      placeholder="Category (example: Transport)"
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                    />
                    <Input
                      placeholder="Reference (optional)"
                      value={expenseRef}
                      onChange={(e) => setExpenseRef(e.target.value)}
                    />
                    <Input
                      placeholder="Note (optional)"
                      value={expenseNote}
                      onChange={(e) => setExpenseNote(e.target.value)}
                    />

                    <AsyncButton
                      type="submit"
                      variant="primary"
                      state={expenseBtnState}
                      text="Save expense"
                      loadingText="Saving…"
                      successText="Saved"
                      disabled={!currentOpenSession}
                    />
                  </form>
                </SectionCard>

                <SectionCard
                  title="Expenses"
                  hint="Latest expenses"
                  right={
                    <AsyncButton
                      variant="secondary"
                      size="sm"
                      state={expensesLoading ? "loading" : "idle"}
                      text="Refresh"
                      loadingText="Refreshing…"
                      successText="Done"
                      onClick={loadExpenses}
                    />
                  }
                >
                  <Input
                    placeholder="Search"
                    value={expenseQ}
                    onChange={(e) => setExpenseQ(e.target.value)}
                  />

                  <div className="mt-3">
                    {expensesLoading ? (
                      <div className="grid gap-3">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {(Array.isArray(expenses) ? expenses : [])
                          .filter((x) => {
                            const q = String(expenseQ || "")
                              .trim()
                              .toLowerCase();
                            if (!q) return true;
                            const hay = [
                              x?.id,
                              x?.amount,
                              x?.category ?? x?.type,
                              x?.reference ?? x?.ref,
                              x?.cashSessionId ?? x?.cash_session_id,
                              x?.note,
                            ]
                              .map((v) => String(v ?? ""))
                              .join(" ")
                              .toLowerCase();
                            return hay.includes(q);
                          })
                          .slice(0, 60)
                          .map((x, idx) => (
                            <div
                              key={x?.id || idx}
                              className="rounded-2xl border border-slate-200 bg-white p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-extrabold text-slate-900">
                                    Expense #{x?.id ?? "—"}
                                  </div>
                                  <div className="mt-2 text-xs text-slate-600 flex flex-wrap gap-2">
                                    <TinyPill tone="warn">
                                      {String(
                                        x?.category ?? x?.type ?? "GENERAL",
                                      )}
                                    </TinyPill>
                                    <span>
                                      Session:{" "}
                                      <b>
                                        #
                                        {x?.cashSessionId ??
                                          x?.cash_session_id ??
                                          "—"}
                                      </b>
                                    </span>
                                  </div>
                                  <div className="mt-2 text-xs text-slate-600">
                                    Ref: <b>{x?.reference ?? x?.ref ?? "—"}</b>
                                  </div>
                                  <div className="mt-1 text-xs text-slate-600">
                                    Time:{" "}
                                    <b>
                                      {safeDate(x?.createdAt || x?.created_at)}
                                    </b>
                                  </div>
                                  {x?.note ? (
                                    <div className="mt-2 text-xs text-slate-600 break-words">
                                      Note: <b>{String(x.note)}</b>
                                    </div>
                                  ) : null}
                                </div>
                                <div className="shrink-0 text-right">
                                  <div className="text-xs text-slate-600">
                                    Amount
                                  </div>
                                  <div className="text-lg font-extrabold text-slate-900">
                                    {money(x?.amount ?? 0)}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    RWF
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}

                        {(Array.isArray(expenses) ? expenses : []).length ===
                        0 ? (
                          <div className="text-sm text-slate-600">
                            No expenses yet.
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </SectionCard>
              </div>
            ) : null}

            {/* RECONCILE (no table) */}
            {section === "reconcile" ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <SectionCard
                  title="Create reconcile"
                  hint="Pick a CLOSED session, then enter counted cash."
                >
                  {closedSessions.length === 0 ? (
                    <Banner kind="warn">
                      No CLOSED sessions found. Close a session first.
                    </Banner>
                  ) : (
                    <form
                      className="grid gap-3 max-w-md"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (reconcileBtnState === "loading") return;

                        const sid = Number(selectedClosedSessionId);
                        if (!Number.isInteger(sid) || sid <= 0)
                          return toast("warn", "Pick a closed session.");

                        const n = numOrNull(reconcileCountedCash);
                        if (n == null || n < 0)
                          return toast("warn", "Enter counted cash.");

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
                          toast(
                            "danger",
                            e2?.data?.error ||
                              e2?.message ||
                              "Reconcile failed",
                          );
                        }
                      }}
                    >
                      <Select
                        value={selectedClosedSessionId}
                        onChange={(e) =>
                          setSelectedClosedSessionId(e.target.value)
                        }
                      >
                        {closedSessions.map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            Session #{s.id} • closed{" "}
                            {safeDate(s.closedAt || s.closed_at)}
                          </option>
                        ))}
                      </Select>

                      <Input
                        placeholder="Counted cash (RWF)"
                        value={reconcileCountedCash}
                        onChange={(e) =>
                          setReconcileCountedCash(e.target.value)
                        }
                      />
                      <Input
                        placeholder="Note (optional)"
                        value={reconcileNote}
                        onChange={(e) => setReconcileNote(e.target.value)}
                      />

                      <AsyncButton
                        type="submit"
                        variant="primary"
                        state={reconcileBtnState}
                        text="Save reconcile"
                        loadingText="Saving…"
                        successText="Saved"
                      />
                    </form>
                  )}
                </SectionCard>

                <SectionCard
                  title="Reconciles"
                  hint="Latest reconciles"
                  right={
                    <AsyncButton
                      variant="secondary"
                      size="sm"
                      state={reconcilesLoading ? "loading" : "idle"}
                      text="Refresh"
                      loadingText="Refreshing…"
                      successText="Done"
                      onClick={loadReconciles}
                    />
                  }
                >
                  <Input
                    placeholder="Search"
                    value={reconcileQ}
                    onChange={(e) => setReconcileQ(e.target.value)}
                  />

                  <div className="mt-3">
                    {reconcilesLoading ? (
                      <div className="grid gap-3">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {(Array.isArray(reconciles) ? reconciles : [])
                          .filter((r) => {
                            const q = String(reconcileQ || "")
                              .trim()
                              .toLowerCase();
                            if (!q) return true;
                            const hay = [
                              r?.id,
                              r?.cashSessionId ?? r?.cash_session_id,
                              r?.note,
                              r?.difference,
                            ]
                              .map((v) => String(v ?? ""))
                              .join(" ")
                              .toLowerCase();
                            return hay.includes(q);
                          })
                          .slice(0, 60)
                          .map((r, idx) => (
                            <div
                              key={r?.id || idx}
                              className="rounded-2xl border border-slate-200 bg-white p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-extrabold text-slate-900">
                                    Reconcile #{r?.id ?? "—"}
                                  </div>
                                  <div className="mt-2 text-xs text-slate-600">
                                    Session:{" "}
                                    <b>
                                      #
                                      {r?.cashSessionId ??
                                        r?.cash_session_id ??
                                        "—"}
                                    </b>
                                  </div>
                                  <div className="mt-1 text-xs text-slate-600">
                                    Time:{" "}
                                    <b>
                                      {safeDate(r?.createdAt || r?.created_at)}
                                    </b>
                                  </div>
                                  {r?.note ? (
                                    <div className="mt-2 text-xs text-slate-600 break-words">
                                      Note: <b>{String(r.note)}</b>
                                    </div>
                                  ) : null}
                                </div>
                                <div className="shrink-0 text-right">
                                  <div className="text-xs text-slate-600">
                                    Expected
                                  </div>
                                  <div className="text-sm font-extrabold text-slate-900">
                                    {money(
                                      r?.expectedCash ?? r?.expected_cash ?? 0,
                                    )}
                                  </div>
                                  <div className="mt-2 text-xs text-slate-600">
                                    Counted
                                  </div>
                                  <div className="text-sm font-extrabold text-slate-900">
                                    {money(
                                      r?.countedCash ?? r?.counted_cash ?? 0,
                                    )}
                                  </div>
                                  <div className="mt-2">
                                    <TinyPill
                                      tone={
                                        (Number(r?.difference ?? 0) || 0) === 0
                                          ? "success"
                                          : "warn"
                                      }
                                    >
                                      Diff: {money(r?.difference ?? 0)}
                                    </TinyPill>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}

                        {(Array.isArray(reconciles) ? reconciles : [])
                          .length === 0 ? (
                          <div className="text-sm text-slate-600">
                            No reconciles yet.
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </SectionCard>
              </div>
            ) : null}

            {/* REFUNDS (no table) */}
            {section === "refunds" ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <SectionCard
                  title="Create refund"
                  hint="Refund a completed sale. CASH refund needs OPEN session."
                >
                  <form
                    className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-md"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (refundBtnState === "loading") return;

                      const sid = Number(refundSaleId);
                      if (!Number.isInteger(sid) || sid <= 0)
                        return toast("warn", "Enter a valid sale ID.");

                      if (
                        String(refundMethod || "").toUpperCase() === "CASH" &&
                        !currentOpenSession?.id
                      ) {
                        return toast(
                          "warn",
                          "Open a cash session for CASH refund.",
                        );
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
                            method: String(
                              refundMethod || "CASH",
                            ).toUpperCase(),
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
                        toast(
                          "danger",
                          e2?.data?.error || e2?.message || "Refund failed",
                        );
                      }
                    }}
                  >
                    <Input
                      placeholder="Sale ID"
                      value={refundSaleId}
                      onChange={(e) => setRefundSaleId(e.target.value)}
                    />
                    <Select
                      value={refundMethod}
                      onChange={(e) => setRefundMethod(e.target.value)}
                    >
                      {METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </Select>
                    <Input
                      placeholder="Reference (optional)"
                      value={refundReference}
                      onChange={(e) => setRefundReference(e.target.value)}
                    />
                    <Input
                      placeholder="Reason (optional)"
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                    />
                    <div className="md:col-span-2">
                      <AsyncButton
                        type="submit"
                        variant="primary"
                        state={refundBtnState}
                        text="Save refund"
                        loadingText="Saving…"
                        successText="Saved"
                        className="w-full"
                      />
                    </div>
                  </form>

                  {!currentOpenSession ? (
                    <div className="mt-3">
                      <Banner kind="warn">
                        If you refund by CASH, open a cash session first.
                      </Banner>
                    </div>
                  ) : null}
                </SectionCard>

                <SectionCard
                  title="Refunds"
                  hint="Latest refunds"
                  right={
                    <AsyncButton
                      variant="secondary"
                      size="sm"
                      state={refundsLoading ? "loading" : "idle"}
                      text="Refresh"
                      loadingText="Refreshing…"
                      successText="Done"
                      onClick={loadRefunds}
                    />
                  }
                >
                  <Input
                    placeholder="Search"
                    value={refundQ}
                    onChange={(e) => setRefundQ(e.target.value)}
                  />

                  <div className="mt-3">
                    {refundsLoading ? (
                      <div className="grid gap-3">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {(Array.isArray(refunds) ? refunds : [])
                          .filter((r) => {
                            const q = String(refundQ || "")
                              .trim()
                              .toLowerCase();
                            if (!q) return true;
                            const hay = [
                              r?.id,
                              r?.saleId ?? r?.sale_id,
                              r?.amount,
                              r?.method,
                              r?.reason,
                            ]
                              .map((v) => String(v ?? ""))
                              .join(" ")
                              .toLowerCase();
                            return hay.includes(q);
                          })
                          .slice(0, 60)
                          .map((r, idx) => (
                            <div
                              key={r?.id || idx}
                              className="rounded-2xl border border-slate-200 bg-white p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-extrabold text-slate-900">
                                    Refund #{r?.id ?? "—"}
                                  </div>
                                  <div className="mt-2 text-xs text-slate-600 flex flex-wrap gap-2">
                                    <TinyPill tone="info">
                                      {String(r?.method ?? "—").toUpperCase()}
                                    </TinyPill>
                                    <span>
                                      Sale:{" "}
                                      <b>#{r?.saleId ?? r?.sale_id ?? "—"}</b>
                                    </span>
                                  </div>
                                  <div className="mt-1 text-xs text-slate-600">
                                    Time:{" "}
                                    <b>
                                      {safeDate(r?.createdAt || r?.created_at)}
                                    </b>
                                  </div>
                                  <div className="mt-2 text-xs text-slate-600 break-words">
                                    Reason: <b>{r?.reason ?? "—"}</b>
                                  </div>
                                </div>
                                <div className="shrink-0 text-right">
                                  <div className="text-xs text-slate-600">
                                    Amount
                                  </div>
                                  <div className="text-lg font-extrabold text-slate-900">
                                    {money(r?.amount ?? 0)}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    RWF
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}

                        {(Array.isArray(refunds) ? refunds : []).length ===
                        0 ? (
                          <div className="text-sm text-slate-600">
                            No refunds yet.
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </SectionCard>
              </div>
            ) : null}

            {/* NOTIFICATIONS */}
            {section === "notifications" ? (
              <SectionCard
                title="Notifications"
                hint="Messages about sales, credits, sessions."
                right={
                  <AsyncButton
                    variant="secondary"
                    size="sm"
                    state={notifsLoading ? "loading" : "idle"}
                    text="Refresh"
                    loadingText="Refreshing…"
                    successText="Done"
                    onClick={() => {
                      loadUnread();
                      loadNotificationsList();
                    }}
                  />
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <TinyPill tone={unread > 0 ? "warn" : "neutral"}>
                    Unread: {String(unread)}
                  </TinyPill>
                  <TinyPill
                    tone={
                      streamStatus === "live"
                        ? "success"
                        : streamStatus === "error"
                          ? "warn"
                          : "neutral"
                    }
                  >
                    Live:{" "}
                    {streamStatus === "live"
                      ? "ON"
                      : streamStatus === "error"
                        ? "OFF"
                        : "—"}
                  </TinyPill>
                </div>

                <div className="mt-3">
                  {notifsLoading ? (
                    <div className="grid gap-2">
                      <Skeleton className="h-14 w-full" />
                      <Skeleton className="h-14 w-full" />
                      <Skeleton className="h-14 w-full" />
                      <Skeleton className="h-14 w-full" />
                    </div>
                  ) : notifsErr ? (
                    <Banner kind="warn">{notifsErr}</Banner>
                  ) : (Array.isArray(notifs) ? notifs : []).length === 0 ? (
                    <div className="text-sm text-slate-600">
                      No notifications yet.
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {(Array.isArray(notifs) ? notifs : [])
                        .slice(0, 25)
                        .map((n, idx) => {
                          const isRead = n?.is_read ?? n?.isRead ?? null;
                          const priority = n?.priority
                            ? String(n.priority).toLowerCase()
                            : "";
                          const tone =
                            priority === "high"
                              ? "warn"
                              : priority === "danger"
                                ? "danger"
                                : "neutral";

                          return (
                            <div
                              key={n?.id || idx}
                              className="rounded-2xl border border-slate-200 bg-white p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <div className="text-sm font-extrabold text-slate-900 truncate">
                                      {n?.title ?? n?.type ?? "Notification"}
                                    </div>
                                    {isRead === false ? (
                                      <TinyPill tone="warn">NEW</TinyPill>
                                    ) : null}
                                    {n?.type ? (
                                      <TinyPill>
                                        {String(n.type).slice(0, 30)}
                                      </TinyPill>
                                    ) : null}
                                  </div>
                                  {n?.body ? (
                                    <div className="mt-1 text-xs text-slate-600 break-words">
                                      {n.body}
                                    </div>
                                  ) : null}
                                  <div className="mt-2 text-[11px] text-slate-500">
                                    {safeDate(n?.createdAt || n?.created_at)}
                                  </div>
                                </div>

                                {priority ? (
                                  <TinyPill tone={tone}>
                                    {priority.toUpperCase()}
                                  </TinyPill>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </SectionCard>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}
