export const ENDPOINTS = {
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

export const METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "MOMO", label: "Mobile Money" },
  { value: "CARD", label: "Card" },
  { value: "BANK", label: "Bank" },
  { value: "OTHER", label: "Other" },
];

export const SECTIONS = [
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
