export const ENDPOINTS = {
  ADMIN_DASH: "/admin/dashboard",
  SALES_LIST: "/sales",
  SALE_GET: (id) => `/sales/${id}`,
  SALE_CANCEL: (id) => `/sales/${id}/cancel`,

  INVENTORY_LIST: "/inventory",
  PRODUCTS_LIST: "/products",
  INVENTORY_ARRIVALS_LIST: "/inventory/arrivals",
  INVENTORY_ARRIVALS_CREATE: "/inventory/arrivals",
  INV_ADJ_REQ_LIST: "/inventory-adjust-requests",
  INV_ADJ_REQ_CREATE: "/inventory-adjust-requests",
  INV_ADJ_REQ_MINE: "/inventory-adjust-requests/mine",

  PRODUCT_CREATE: "/products",
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

export const PAGE_SIZE = 10;

export const COVERAGE_DEFAULT_SECTION = {
  store_keeper: "inventory",
  cashier: "payments",
  seller: "sales",
  manager: "dashboard",
};
