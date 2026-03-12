export const ENDPOINTS = {
  MANAGER_DASHBOARD: "/manager/dashboard",

  SALES_LIST: "/sales",
  SALE_GET: (id) => `/sales/${id}`,
  SALE_CANCEL: (id) => `/sales/${id}/cancel`,

  INVENTORY_LIST: "/inventory",
  PRODUCTS_LIST: "/products",
  INVENTORY_ARRIVALS_LIST: "/inventory/arrivals",

  PRODUCT_ARCHIVE: (id) => `/products/${id}/archive`,
  PRODUCT_RESTORE: (id) => `/products/${id}/restore`,

  PAYMENTS_LIST: "/payments",
  PAYMENTS_SUMMARY: "/payments/summary",
  PAYMENTS_BREAKDOWN: "/payments/breakdown",

  INV_ADJ_REQ_LIST: "/inventory/adjust-requests",

  SUPPLIERS_LIST: "/suppliers",
  SUPPLIER_BILLS_LIST: "/supplier-bills",
  SUPPLIER_SUMMARY: "/supplier/summary",
  SUPPLIER_CREATE: "/suppliers",
  SUPPLIER_BILL_CREATE: "/supplier-bills",
};

export const SECTIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "sales", label: "Sales" },
  { key: "payments", label: "Payments" },
  { key: "inventory", label: "Inventory" },
  { key: "pricing", label: "Pricing" },
  { key: "inv_requests", label: "Inventory requests" },
  { key: "arrivals", label: "Stock arrivals" },
  { key: "suppliers", label: "Suppliers" },
  { key: "cash_reports", label: "Cash reports" },
  { key: "credits", label: "Credits" },
  { key: "staff", label: "Staff" },
];

export const ADVANCED_SECTIONS = [
  { key: "audit", label: "Audit" },
  { key: "evidence", label: "Proof & History" },
];

export const PAGE_SIZE = 10;
