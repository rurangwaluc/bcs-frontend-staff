"use client";

export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

export function toInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export function money(n) {
  const x = Number(n ?? 0);
  return Number.isFinite(x) ? Math.round(x).toLocaleString() : "0";
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

export function safeDateOnly(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString();
  } catch {
    return String(v);
  }
}

export function formatWhen(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

export function isSameLocalDay(a, b) {
  const da = new Date(a);
  const db = new Date(b);

  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;

  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function isToday(dateLike) {
  if (!dateLike) return false;
  return isSameLocalDay(dateLike, new Date());
}

export function nowLocalDatetimeValue() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate(),
  )}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function locationLabel(me) {
  const loc = me?.location || null;

  const name =
    (loc?.name != null ? toStr(loc.name) : "") ||
    (me?.locationName != null ? toStr(me.locationName) : "") ||
    "";

  const code =
    (loc?.code != null ? toStr(loc.code) : "") ||
    (me?.locationCode != null ? toStr(me.locationCode) : "") ||
    "";

  if (name && code) return `${name} (${code})`;
  if (name) return name;
  return "Store —";
}
