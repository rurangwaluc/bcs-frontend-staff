export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function money(n) {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return "0";
  return Math.round(x).toLocaleString();
}

export function safeDate(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

export function numOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

export function locationLabel(me) {
  const loc = me?.location || null;

  const name =
    (loc?.name != null ? String(loc.name).trim() : "") ||
    (me?.locationName != null ? String(me.locationName).trim() : "") ||
    "";

  const code =
    (loc?.code != null ? String(loc.code).trim() : "") ||
    (me?.locationCode != null ? String(me.locationCode).trim() : "") ||
    "";

  if (name && code) return `${name} (${code})`;
  if (name) return name;
  return "Store —";
}

export function getQtyOnHandForProduct(inventory, productId) {
  const pid = Number(productId);
  if (!pid) return null;

  const row = (Array.isArray(inventory) ? inventory : []).find(
    (r) => Number(r.id) === pid,
  );
  if (!row) return null;

  const qty = Number(row.qtyOnHand ?? row.qty_on_hand ?? 0);
  return Number.isFinite(qty) ? qty : 0;
}

export function statusLabel(status) {
  const raw = String(status || "").toUpperCase();
  if (raw === "DRAFT") return "TO RELEASE";
  if (raw === "FULFILLED") return "RELEASED";
  return raw || "—";
}

export function statusTone(status) {
  const raw = String(status || "").toUpperCase();

  if (raw === "DRAFT") return "info";
  if (raw === "FULFILLED") return "success";
  if (raw === "PENDING") return "warn";
  if (raw === "COMPLETED") return "neutral";
  if (raw === "CANCELLED") return "danger";
  return "neutral";
}
