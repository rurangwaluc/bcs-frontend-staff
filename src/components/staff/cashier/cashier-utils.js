export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

export function numOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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

  const id = loc?.id ?? me?.locationId ?? me?.location_id ?? null;

  if (name && code) return `${name} (${code})`;
  if (name) return name;
  if (id != null && id !== "") return `Location #${id}`;
  return "Location —";
}

export function getSellerPaymentMethodFromSale(sale) {
  const raw = sale?.paymentMethod ?? sale?.payment_method ?? null;
  const m = raw ? String(raw).trim().toUpperCase() : "";
  return m || null;
}

export function normalizeItemsForSummary(items) {
  if (!Array.isArray(items)) return [];
  return items.map((it) => {
    const name = String(
      it?.productName ?? it?.name ?? it?.product?.name ?? it?.title ?? "Item",
    ).trim();
    const qty = Number(it?.qty ?? it?.quantity ?? it?.count ?? 0) || 0;
    return { name: name || "Item", qty };
  });
}

export function itemsSummary(items) {
  const list = normalizeItemsForSummary(items).filter((x) => x.qty > 0);
  if (!list.length) return "—";
  const shown = list.slice(0, 3).map((x) => `${x.name} × ${x.qty}`);
  return shown.join(" • ") + (list.length > 3 ? " • …" : "");
}

export function sumAmounts(list, picker) {
  let t = 0;
  for (const x of list || []) {
    const n = Number(picker(x) ?? 0);
    if (Number.isFinite(n)) t += n;
  }
  return t;
}
