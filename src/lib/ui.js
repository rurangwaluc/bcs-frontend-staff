export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function safe(value) {
  return String(value ?? "").trim();
}

export function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function formatMoney(value) {
  return safeNumber(value).toLocaleString();
}
