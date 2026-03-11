export const ENDPOINTS = {
  PRODUCTS_LIST: "/products",
  PRODUCT_CREATE: "/products",
  INVENTORY_LIST: "/inventory",
  INVENTORY_ARRIVALS_CREATE: "/inventory/arrivals",
  INV_ADJ_REQ_CREATE: "/inventory-adjust-requests",
  INV_ADJ_REQ_MINE: "/inventory-adjust-requests/mine",
  SALES_LIST: "/sales",
  SALE_GET: (id) => `/sales/${id}`,
  SALE_FULFILL: (id) => `/sales/${id}/fulfill`,

  NOTIFS_LIST: "/notifications",
  NOTIFS_UNREAD: "/notifications/unread-count",
  NOTIFS_READ_ONE: (id) => `/notifications/${id}/read`,
  NOTIFS_READ_ALL: "/notifications/read-all",
  NOTIFS_STREAM: "/notifications/stream",
};

export const SECTIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "inventory", label: "Inventory" },
  { key: "arrivals", label: "Stock arrivals" },
  { key: "adjustments", label: "Correction requests" },
  { key: "sales", label: "Release stock" },
];

export const SALES_TABS = [
  { value: "TO_RELEASE", label: "To release" },
  { value: "RELEASED", label: "Released" },
  { value: "ALL", label: "All" },
];
