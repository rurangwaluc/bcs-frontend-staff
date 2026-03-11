"use client";

export const ENDPOINTS = {
  PRODUCTS_LIST: "/products",
  SALES_LIST: "/sales",
  SALES_CREATE: "/sales",
  SALE_GET: (id) => `/sales/${id}`,
  SALE_MARK: (id) => `/sales/${id}/mark`,
  CUSTOMERS_SEARCH: (q) => `/customers/search?q=${encodeURIComponent(q)}`,
  CUSTOMERS_CREATE: "/customers",
};

export const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "MOMO", label: "MoMo" },
  { value: "BANK", label: "Bank" },
  { value: "CARD", label: "Card" },
];

export const SELLER_PAYMENT_METHODS = PAYMENT_METHODS.filter((m) =>
  ["CASH", "MOMO", "BANK", "CARD"].includes(
    String(m?.value || "").toUpperCase(),
  ),
);

export const SECTIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "create", label: "Create sale" },
  { key: "sales", label: "My sales" },
  { key: "credits", label: "Credits" },
];

export const NOTIFY_POLL_MS = 20_000;
