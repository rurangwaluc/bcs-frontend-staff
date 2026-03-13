"use client";

export function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

export function money(n) {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return "0";
  return Math.round(x).toLocaleString();
}

export function fmt(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

export function normalizeList(data, keys = []) {
  for (const k of keys) {
    const v = data?.[k];
    if (Array.isArray(v)) return v;
  }
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
}

export function normalizeMethodKey(method) {
  const m = String(method || "")
    .trim()
    .toUpperCase();

  if (!m) return "OTHER";
  if (m === "CASH") return "CASH";
  if (m === "MOMO" || m === "MOBILEMONEY" || m === "MOBILE") return "MOMO";
  if (m === "BANK" || m === "TRANSFER") return "BANK";
  if (m === "CARD" || m === "POS") return "CARD";
  return "OTHER";
}

export function sumBreakdown(rows) {
  const out = {
    CASH: { count: 0, total: 0 },
    MOMO: { count: 0, total: 0 },
    BANK: { count: 0, total: 0 },
    CARD: { count: 0, total: 0 },
    OTHER: { count: 0, total: 0 },
  };

  const list = Array.isArray(rows) ? rows : [];
  for (const r of list) {
    const key = normalizeMethodKey(r?.method);
    out[key].count += Number(r?.count || 0);
    out[key].total += Number(r?.total || 0);
  }

  return out;
}

export function isArchivedProduct(p) {
  if (!p) return false;
  if (p.isActive === false) return true;
  if (p.is_active === false) return true;
  if (p.isArchived === true) return true;
  if (p.is_archived === true) return true;
  if (p.archivedAt || p.archived_at) return true;
  if (String(p.status || "").toUpperCase() === "ARCHIVED") return true;
  return false;
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
  return "Location";
}

export function buildEvidenceUrl({
  entity,
  entityId,
  from,
  to,
  action,
  userId,
  q,
  limit,
}) {
  const params = new URLSearchParams();

  if (entity) params.set("entity", entity);
  if (entityId) params.set("entityId", entityId);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (action) params.set("action", action);
  if (userId) params.set("userId", userId);
  if (q) params.set("q", q);
  if (limit) params.set("limit", String(limit));

  return `/evidence?${params.toString()}`;
}

export function firstItemLabel(items) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return { name: "—", qty: 0 };

  const first = list[0];
  const name =
    String(
      first?.productName ??
        first?.name ??
        first?.product?.name ??
        first?.title ??
        "Item",
    ).trim() || "Item";

  const qty = Number(first?.qty ?? first?.quantity ?? first?.count ?? 0) || 0;

  return { name, qty };
}

export function productNameById(products, productId) {
  const pid = String(productId ?? "");
  const p = (Array.isArray(products) ? products : []).find(
    (x) => String(x?.id) === pid,
  );
  return p?.name || p?.productName || p?.title || null;
}

export function getCustomerTin(s) {
  return (
    toStr(s?.customerTin ?? s?.customer_tin) ||
    toStr(s?.customer?.tin) ||
    toStr(s?.customer?.customerTin ?? s?.customer?.customer_tin) ||
    toStr(s?.customer?.taxId ?? s?.customer?.tax_id) ||
    toStr(s?.customer?.tinNumber ?? s?.customer?.tin_number)
  );
}

export function getCustomerAddress(s) {
  return (
    toStr(s?.customerAddress ?? s?.customer_address) ||
    toStr(s?.customer?.address) ||
    toStr(s?.customer?.customerAddress ?? s?.customer?.customer_address) ||
    toStr(s?.customer?.location ?? s?.customer?.location_text)
  );
}

export function makeCandidateLabel(entity, row) {
  const when = fmt(
    row?.createdAt || row?.created_at || row?.openedAt || row?.opened_at,
  );

  if (entity === "sale") {
    const name = (row?.customerName || row?.customer_name || "Customer").trim();
    const total = money(row?.totalAmount ?? row?.total ?? 0);
    return `Sale — ${name} — ${total} — ${when}`;
  }

  if (entity === "payment") {
    const amount = money(row?.amount ?? 0);
    const method = row?.method || "Payment";
    return `Payment — ${amount} — ${method} — ${when}`;
  }

  if (entity === "refund") {
    const amount = money(row?.amount ?? 0);
    const reason = row?.reason ? ` — ${String(row.reason).slice(0, 40)}` : "";
    return `Refund — ${amount}${reason} — ${when}`;
  }

  if (entity === "cash_session") {
    const status = row?.status || "Session";
    return `Cash session — ${status} — ${when}`;
  }

  if (entity === "expense") {
    const amount = money(row?.amount ?? 0);
    const note = row?.note ? ` — ${String(row.note).slice(0, 40)}` : "";
    return `Expense — ${amount}${note} — ${when}`;
  }

  if (entity === "deposit") {
    const amount = money(row?.amount ?? 0);
    return `Deposit — ${amount} — ${when}`;
  }

  if (entity === "credit") {
    const amount = money(row?.amount ?? 0);
    const name = (row?.customerName || "Customer").trim();
    const status = row?.status || "Credit";
    return `Credit — ${name} — ${amount} — ${status} — ${when}`;
  }

  if (entity === "product") {
    const name = (
      row?.name ||
      row?.productName ||
      row?.title ||
      "Product"
    ).trim();
    const sku = row?.sku ? ` — SKU ${row.sku}` : "";
    return `Product — ${name}${sku}`;
  }

  if (entity === "inventory") {
    const name = (
      row?.productName ||
      row?.product_name ||
      row?.name ||
      "Item"
    ).trim();
    const sku = row?.sku ? ` — SKU ${row.sku}` : "";
    const qty = row?.qtyOnHand ?? row?.qty_on_hand ?? row?.qty ?? row?.quantity;

    return qty != null
      ? `Inventory — ${name}${sku} — Qty ${qty}`
      : `Inventory — ${name}${sku}`;
  }

  if (entity === "user") {
    const name = (row?.name || "Staff").trim();
    const email = row?.email ? ` — ${row.email}` : "";
    return `Staff — ${name}${email}`;
  }

  return `Record — ${when}`;
}

export function safePlayBeep({
  volume = 0.06,
  durationMs = 160,
  freq = 920,
} = {}) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    gain.gain.value = volume;
    osc.frequency.value = freq;
    osc.type = "sine";

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    setTimeout(
      () => {
        try {
          osc.stop();
          ctx.close?.();
        } catch {}
      },
      Math.max(80, Number(durationMs) || 160),
    );
  } catch {}
}

export function isDocumentFocused() {
  if (typeof document === "undefined") return true;
  return (
    document.visibilityState === "visible" && (document.hasFocus?.() ?? true)
  );
}
