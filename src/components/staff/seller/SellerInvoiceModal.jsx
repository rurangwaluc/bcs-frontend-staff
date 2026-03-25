"use client";

import { money, safeDate, toStr } from "./seller-utils";

import { createPortal } from "react-dom";

function getApiOrigin() {
  const raw =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE ||
    "";

  const v = String(raw || "")
    .trim()
    .replace(/\/$/, "");

  if (!v) return "";
  return v;
}

function resolveAssetUrl(value) {
  const v = toStr(value);
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;

  const base = getApiOrigin();
  if (!base) return v;

  return `${base}${v.startsWith("/") ? "" : "/"}${v}`;
}

function getBusinessIdentity(me) {
  const businessName =
    toStr(me?.business?.name) ||
    toStr(me?.location?.name) ||
    toStr(me?.businessName) ||
    toStr(me?.companyName) ||
    toStr(me?.organizationName) ||
    toStr(me?.storeName) ||
    "Your Business Name";

  const branchName =
    toStr(me?.location?.name) ||
    toStr(me?.locationName) ||
    toStr(me?.branchName) ||
    "";

  const branchCode =
    toStr(me?.location?.code) ||
    toStr(me?.locationCode) ||
    toStr(me?.branchCode) ||
    "";

  const email =
    toStr(me?.business?.email) ||
    toStr(me?.location?.email) ||
    toStr(me?.businessEmail) ||
    toStr(me?.companyEmail) ||
    toStr(me?.email) ||
    "";

  const phone =
    toStr(me?.business?.phone) ||
    toStr(me?.location?.phone) ||
    toStr(me?.businessPhone) ||
    toStr(me?.companyPhone) ||
    toStr(me?.phone) ||
    "";

  const website =
    toStr(me?.business?.website) ||
    toStr(me?.location?.website) ||
    toStr(me?.businessWebsite) ||
    toStr(me?.companyWebsite) ||
    toStr(me?.website) ||
    "";

  const logoUrl = resolveAssetUrl(
    toStr(me?.business?.logoUrl) ||
      toStr(me?.location?.logoUrl) ||
      toStr(me?.businessLogoUrl) ||
      toStr(me?.companyLogoUrl) ||
      toStr(me?.logoUrl) ||
      "",
  );

  const address =
    toStr(me?.business?.address) ||
    toStr(me?.location?.address) ||
    toStr(me?.businessAddress) ||
    toStr(me?.companyAddress) ||
    toStr(me?.address) ||
    "";

  const tin =
    toStr(me?.business?.tin) ||
    toStr(me?.location?.tin) ||
    toStr(me?.businessTin) ||
    toStr(me?.companyTin) ||
    toStr(me?.tin) ||
    "";

  const momoCode =
    toStr(me?.business?.momoCode) ||
    toStr(me?.location?.momoCode) ||
    toStr(me?.momoCode) ||
    "";

  const bankAccountsRaw =
    me?.business?.bankAccounts ||
    me?.location?.bankAccounts ||
    me?.bankAccounts ||
    [];

  const bankAccounts = Array.isArray(bankAccountsRaw)
    ? bankAccountsRaw
        .map((acc) => {
          if (!acc) return "";
          if (typeof acc === "string") return acc.trim();

          const bankName =
            toStr(acc?.bankName) || toStr(acc?.bank) || toStr(acc?.name);
          const accountName = toStr(acc?.accountName) || toStr(acc?.holderName);
          const accountNumber = toStr(acc?.accountNumber) || toStr(acc?.number);

          return [bankName, accountName, accountNumber]
            .filter(Boolean)
            .join(" • ");
        })
        .filter(Boolean)
    : [];

  const branchLabel =
    branchName && branchCode
      ? `${branchName} (${branchCode})`
      : branchName || branchCode || businessName;

  return {
    businessName,
    branchName,
    branchCode,
    branchLabel,
    email,
    phone,
    website,
    logoUrl,
    address,
    tin,
    momoCode,
    bankAccounts,
  };
}

function esc(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function moneyLine(n) {
  return `${money(n)} RWF`;
}

function printDocument(title, html) {
  if (typeof window === "undefined") return;

  const win = window.open("", "_blank", "width=1200,height=900");
  if (!win) return;

  win.document.open();
  win.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${esc(title)}</title>
        <style>
          * { box-sizing: border-box; }

          html, body {
            margin: 0;
            padding: 0;
            background: #eef2f7;
            color: #0f172a;
            font-family: Inter, Arial, Helvetica, sans-serif;
          }

          body { padding: 24px; }

          .page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: #ffffff;
            padding: 16mm 15mm 18mm;
            box-shadow: 0 20px 50px rgba(15, 23, 42, 0.12);
          }

          .top-band {
            height: 6px;
            border-radius: 999px;
            background: #0f172a;
            margin-bottom: 18px;
          }

          .header {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 200px;
            gap: 18px;
            align-items: start;
            padding-bottom: 18px;
            border-bottom: 1px solid #dbe2ea;
          }

          .brand-wrap {
            display: flex;
            align-items: flex-start;
            gap: 16px;
            min-width: 0;
          }

          .logo-shell {
            width: 96px;
            height: 96px;
            min-width: 96px;
            border: 1px solid #dbe2ea;
            border-radius: 22px;
            background: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }

          .logo-shell img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
          }

          .logo-fallback {
            padding: 8px;
            text-align: center;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: #475569;
            line-height: 1.4;
          }

          .brand-copy {
            min-width: 0;
          }

          .doc-kicker {
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #64748b;
          }

          .branch-name {
            margin: 8px 0 0;
            font-size: 22px;
            line-height: 1.08;
            font-weight: 900;
            letter-spacing: -0.03em;
            color: #0f172a;
            word-break: break-word;
          }

          .company-name {
            margin-top: 6px;
            font-size: 13px;
            line-height: 1.5;
            color: #475569;
            font-weight: 700;
          }

          .contact-lines {
            margin-top: 14px;
            display: grid;
            gap: 4px;
            font-size: 12px;
            line-height: 1.55;
            color: #334155;
          }

          .meta-panel {
            border: 1px solid #dbe2ea;
            border-radius: 18px;
            background: #f8fafc;
            overflow: hidden;
            min-width: 200px;
          }

          .meta-row {
            padding: 11px 13px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 12px;
            line-height: 1.45;
            color: #0f172a;
          }

          .meta-row:last-child {
            border-bottom: 0;
          }

          .meta-row .label {
            color: #64748b;
            font-weight: 800;
            margin-right: 6px;
          }

          .meta-row .value {
            color: #0f172a;
            font-weight: 900;
            word-break: break-word;
          }

          .section-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 14px;
            margin-top: 18px;
          }

          .card {
            border: 1px solid #dbe2ea;
            border-radius: 18px;
            padding: 14px;
            background: #ffffff;
          }

          .card-title {
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 10px;
          }

          .line {
            font-size: 13px;
            line-height: 1.6;
            color: #0f172a;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 18px;
            border: 1px solid #dbe2ea;
            border-radius: 18px;
            overflow: hidden;
          }

          thead th {
            background: #f8fafc;
            color: #0f172a;
            font-size: 11px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            padding: 12px 10px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
          }

          tbody td {
            padding: 12px 10px;
            font-size: 13px;
            line-height: 1.5;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
            color: #0f172a;
          }

          tbody tr:last-child td {
            border-bottom: 0;
          }

          .right {
            text-align: right;
          }

          .summary-row {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 360px;
            gap: 16px;
            align-items: start;
            margin-top: 18px;
          }

          .totals {
            width: 100%;
            border: 1px solid #dbe2ea;
            border-radius: 18px;
            padding: 14px 16px;
            background: #ffffff;
          }

          .total-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
            font-size: 14px;
          }

          .total-row:last-child {
            border-bottom: 0;
          }

          .total-row.grand {
            font-size: 18px;
            font-weight: 900;
            color: #0f172a;
          }

          .note {
            margin-top: 18px;
            border: 1px solid #dbe2ea;
            border-radius: 18px;
            padding: 14px 16px;
            background: #f8fafc;
            font-size: 13px;
            line-height: 1.65;
            white-space: pre-wrap;
            color: #0f172a;
          }

          .signatures {
            margin-top: 22px;
            display: grid;
            grid-template-columns: minmax(0, 1fr) 220px;
            gap: 16px;
            align-items: stretch;
          }

          .signature-card {
            border: 1px solid #dbe2ea;
            border-radius: 20px;
            background: #ffffff;
            padding: 16px;
            min-height: 150px;
            display: flex;
            flex-direction: column;
          }

          .signature-title {
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: #64748b;
          }

          .signature-space {
            flex: 1;
            min-height: 68px;
          }

          .signature-line {
            margin-top: 8px;
            border-top: 1px solid #0f172a;
            padding-top: 8px;
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
            min-height: 28px;
          }

          .signature-meta {
            margin-top: 12px;
            display: grid;
            gap: 10px;
          }

          .signature-meta-row {
            display: grid;
            grid-template-columns: 52px 1fr;
            gap: 10px;
            align-items: end;
          }

          .signature-meta-label {
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: #64748b;
          }

          .signature-meta-line {
            border-bottom: 1px solid #94a3b8;
            min-height: 18px;
          }

          .stamp-card {
            border: 1px dashed #94a3b8;
            border-radius: 20px;
            background: #f8fafc;
            min-height: 150px;
            padding: 16px;
            display: flex;
            flex-direction: column;
          }

          .stamp-title {
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: #64748b;
          }

          .stamp-space {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #94a3b8;
            font-size: 12px;
            font-weight: 700;
            text-align: center;
            padding: 12px;
          }

          @media print {
            body {
              background: #fff;
              padding: 0;
            }

            .page {
              margin: 0;
              width: auto;
              min-height: auto;
              box-shadow: none;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        ${html}
        <script>
          window.onload = function () { window.print(); };
        </script>
      </body>
    </html>
  `);
  win.document.close();
}

function buildInvoiceHtml({ sale, me }) {
  const items = Array.isArray(sale?.items) ? sale.items : [];
  const customerName = sale?.customerName || sale?.customer_name || "Walk-in";
  const customerPhone = sale?.customerPhone || sale?.customer_phone || "";
  const customerTin = sale?.customerTin || sale?.customer_tin || "";
  const customerAddress = sale?.customerAddress || sale?.customer_address || "";
  const sellerName =
    sale?.sellerName || sale?.createdByName || me?.name || "Seller";

  const createdAt = sale?.createdAt || sale?.created_at || null;
  const paidAt =
    sale?.completedAt ||
    sale?.completed_at ||
    sale?.paidAt ||
    sale?.paid_at ||
    sale?.credit?.settledAt ||
    sale?.credit?.settled_at ||
    null;

  const paymentMethod =
    toStr(sale?.paymentMethod || sale?.payment_method).toUpperCase() || "—";

  const note = sale?.note || "";
  const total = Number(sale?.totalAmount ?? sale?.total ?? 0) || 0;
  const biz = getBusinessIdentity(me);

  const rows = items
    .map((it, idx) => {
      const qty = Number(it?.qty ?? 0) || 0;
      const unitPrice = Number(it?.unitPrice ?? it?.price ?? 0) || 0;
      const lineTotal =
        Number(it?.lineTotal ?? it?.total ?? qty * unitPrice) || 0;

      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${esc(
            toStr(
              it?.productName || it?.name || `Item #${it?.productId || ""}`,
            ) || "—",
          )}</td>
          <td>${esc(toStr(it?.sku) || "—")}</td>
          <td class="right">${qty}</td>
          <td class="right">${esc(moneyLine(unitPrice))}</td>
          <td class="right">${esc(moneyLine(lineTotal))}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="page">
      <div class="top-band"></div>

      <div class="header">
        <div>
          <div class="brand-wrap">
            <div class="logo-shell">
              ${
                biz.logoUrl
                  ? `<img src="${esc(biz.logoUrl)}" alt="${esc(
                      biz.branchLabel,
                    )} logo" />`
                  : `<div class="logo-fallback">${esc(biz.branchLabel)}</div>`
              }
            </div>

            <div class="brand-copy">
              <div class="doc-kicker">Invoice</div>
              <h1 class="branch-name">${esc(biz.branchLabel)}</h1>
              <div class="company-name">${esc(biz.businessName)}</div>

              <div class="contact-lines">
                ${biz.address ? `<div><strong>Address:</strong> ${esc(biz.address)}</div>` : ""}
                ${biz.phone ? `<div><strong>Phone:</strong> ${esc(biz.phone)}</div>` : ""}
                ${biz.email ? `<div><strong>Email:</strong> ${esc(biz.email)}</div>` : ""}
                ${biz.website ? `<div><strong>Website:</strong> ${esc(biz.website)}</div>` : ""}
                ${biz.tin ? `<div><strong>TIN:</strong> ${esc(biz.tin)}</div>` : ""}
                ${biz.momoCode ? `<div><strong>MoMo Code:</strong> ${esc(biz.momoCode)}</div>` : ""}
                ${
                  biz.bankAccounts.length
                    ? `<div><strong>Bank:</strong> ${biz.bankAccounts
                        .map((x) => esc(x))
                        .join(" | ")}</div>`
                    : ""
                }
              </div>
            </div>
          </div>
        </div>

        <div class="meta-panel">
          <div class="meta-row"><span class="label">Invoice No:</span><span class="value">INV-${esc(sale?.id || "—")}</span></div>
          <div class="meta-row"><span class="label">Sale Ref:</span><span class="value">#${esc(sale?.id || "—")}</span></div>
          <div class="meta-row"><span class="label">Created:</span><span class="value">${esc(safeDate(createdAt))}</span></div>
          <div class="meta-row"><span class="label">Paid:</span><span class="value">${esc(safeDate(paidAt))}</span></div>
          <div class="meta-row"><span class="label">Method:</span><span class="value">${esc(paymentMethod)}</span></div>
        </div>
      </div>

      <div class="section-grid">
        <div class="card">
          <div class="card-title">Bill To</div>
          <div class="line"><strong>Name:</strong> ${esc(toStr(customerName) || "—")}</div>
          <div class="line"><strong>Phone:</strong> ${esc(toStr(customerPhone) || "—")}</div>
          <div class="line"><strong>TIN:</strong> ${esc(toStr(customerTin) || "—")}</div>
          <div class="line"><strong>Address:</strong> ${esc(toStr(customerAddress) || "—")}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:56px;">#</th>
            <th>Item</th>
            <th style="width:150px;">SKU</th>
            <th style="width:90px;" class="right">Qty</th>
            <th style="width:150px;" class="right">Unit Price</th>
            <th style="width:170px;" class="right">Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${
            rows ||
            `<tr><td colspan="6" style="text-align:center;">No items.</td></tr>`
          }
        </tbody>
      </table>

      <div class="summary-row">
        <div></div>

        <div class="totals">
          <div class="total-row grand">
            <span>Total Paid</span>
            <span>${esc(moneyLine(total))}</span>
          </div>
        </div>
      </div>

      ${
        toStr(note)
          ? `<div class="note"><strong>Note</strong><br/>${esc(toStr(note))}</div>`
          : ""
      }

      <div class="signatures">
        <div class="signature-card">
          <div class="signature-title">Prepared By</div>
          <div class="signature-space"></div>
          <div class="signature-line">${esc(toStr(sellerName) || "—")}</div>

          <div class="signature-meta">
            <div class="signature-meta-row">
             
              <div class="signature-meta-line"></div>
            </div>
          </div>
        </div>

        <div class="stamp-card">
          <div class="stamp-title">Company Stamp</div>
          <div class="stamp-space">Official Stamp Area</div>
        </div>
      </div>
    </div>
  `;
}

function InfoCard({ title, children }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="text-[11px] font-black uppercase tracking-[0.14em] app-muted">
        {title}
      </div>
      <div className="mt-3 space-y-2 text-sm text-[var(--app-fg)]">
        {children}
      </div>
    </div>
  );
}

function MetaPanel({ saleId, createdAt, paidAt, paymentMethod }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] min-w-[200px]">
      <div className="border-b border-[var(--border)] px-3 py-3 text-sm font-semibold text-[var(--app-fg)]">
        <span className="app-muted">Invoice No:</span>{" "}
        <span className="font-extrabold">INV-{saleId || "—"}</span>
      </div>

      <div className="border-b border-[var(--border)] px-3 py-3 text-sm font-semibold text-[var(--app-fg)]">
        <span className="app-muted">Sale Ref:</span>{" "}
        <span className="font-extrabold">#{saleId || "—"}</span>
      </div>

      <div className="border-b border-[var(--border)] px-3 py-3 text-sm font-semibold text-[var(--app-fg)]">
        <span className="app-muted">Created:</span>{" "}
        <span className="font-extrabold">{safeDate(createdAt)}</span>
      </div>

      <div className="border-b border-[var(--border)] px-3 py-3 text-sm font-semibold text-[var(--app-fg)]">
        <span className="app-muted">Paid:</span>{" "}
        <span className="font-extrabold">{safeDate(paidAt)}</span>
      </div>

      <div className="px-3 py-3 text-sm font-semibold text-[var(--app-fg)]">
        <span className="app-muted">Method:</span>{" "}
        <span className="font-extrabold">{paymentMethod}</span>
      </div>
    </div>
  );
}

function SignatureCard({
  title,
  lineValue = "",
  showNameRow = false,
  showDateRow = true,
}) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] app-muted">
        {title}
      </div>

      <div className="min-h-[72px]" />

      <div className="border-t border-[var(--app-fg)] pt-2 text-sm font-semibold text-[var(--app-fg)]">
        {lineValue || ""}
      </div>

      <div className="mt-3 space-y-3">
        {showNameRow ? (
          <div className="grid grid-cols-[52px_minmax(0,1fr)] items-end gap-3">
            <div className="text-[10px] font-black uppercase tracking-[0.1em] app-muted">
              Name
            </div>
            <div className="h-[18px] border-b border-[var(--border-strong)]" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StampCard() {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] app-muted">
        Company Stamp
      </div>

      <div className="flex min-h-[128px] items-center justify-center text-center text-sm font-semibold text-[var(--muted)]">
        Official Stamp Area
      </div>
    </div>
  );
}

export default function SellerInvoiceModal({
  open,
  sale,
  loading,
  me,
  onClose,
}) {
  if (!open) return null;

  const items = Array.isArray(sale?.items) ? sale.items : [];
  const customerName = sale?.customerName || sale?.customer_name || "Walk-in";
  const createdAt = sale?.createdAt || sale?.created_at || null;
  const paidAt =
    sale?.completedAt ||
    sale?.completed_at ||
    sale?.paidAt ||
    sale?.paid_at ||
    sale?.credit?.settledAt ||
    sale?.credit?.settled_at ||
    null;

  const paymentMethod =
    toStr(sale?.paymentMethod || sale?.payment_method).toUpperCase() || "—";
  const total = Number(sale?.totalAmount ?? sale?.total ?? 0) || 0;
  const biz = getBusinessIdentity(me);
  const sellerName = sale?.sellerName || sale?.createdByName || me?.name || "—";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-6xl overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--card)] shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-4">
          <div>
            <div className="text-lg font-black text-[var(--app-fg)]">
              Invoice
            </div>
            <div className="mt-1 text-sm app-muted">
              Sale #{sale?.id ?? "—"} {loading ? "• Loading…" : ""}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                printDocument(
                  `Invoice-${sale?.id || "sale"}`,
                  buildInvoiceHtml({ sale, me }),
                )
              }
              disabled={loading || !sale}
              className="app-focus rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-2.5 text-sm font-bold text-[var(--app-fg)] hover:bg-[var(--hover)] disabled:opacity-50"
            >
              Print
            </button>

            <button
              type="button"
              onClick={onClose}
              className="app-focus rounded-2xl bg-[var(--app-fg)] px-4 py-2.5 text-sm font-bold text-[var(--app-bg)]"
            >
              Close
            </button>
          </div>
        </div>

        <div className="max-h-[82vh] overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="text-sm app-muted">Loading document…</div>
          ) : !sale ? (
            <div className="text-sm app-muted">No sale loaded.</div>
          ) : (
            <div className="mx-auto max-w-5xl rounded-[28px] border border-[var(--border)] bg-[var(--card-2)] p-4 sm:p-6">
              <div className="mb-6 h-2 rounded-full bg-[var(--app-fg)]" />

              <div className="grid gap-5 border-b border-[var(--border)] pb-6 lg:grid-cols-[minmax(0,1fr)_200px]">
                <div>
                  <div className="flex items-start gap-4">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-[var(--border)] bg-white p-2">
                      {biz.logoUrl ? (
                        <img
                          src={biz.logoUrl}
                          alt={`${biz.branchLabel} logo`}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="px-2 text-center text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
                          {biz.branchLabel}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-[11px] font-black uppercase tracking-[0.18em] app-muted">
                        Invoice
                      </div>

                      <div className="mt-2 break-words text-[20px] font-black leading-[1.08] tracking-[-0.03em] text-[var(--app-fg)] sm:text-[22px]">
                        {biz.branchLabel}
                      </div>

                      <div className="mt-4 space-y-1 text-sm text-[var(--app-fg)]">
                        {biz.address ? (
                          <div>
                            <b>Address:</b> {biz.address}
                          </div>
                        ) : null}
                        {biz.phone ? (
                          <div>
                            <b>Phone:</b> {biz.phone}
                          </div>
                        ) : null}
                        {biz.email ? (
                          <div>
                            <b>Email:</b> {biz.email}
                          </div>
                        ) : null}
                        {biz.website ? (
                          <div>
                            <b>Website:</b> {biz.website}
                          </div>
                        ) : null}
                        {biz.tin ? (
                          <div>
                            <b>TIN:</b> {biz.tin}
                          </div>
                        ) : null}
                        {biz.momoCode ? (
                          <div>
                            <b>MoMo Code:</b> {biz.momoCode}
                          </div>
                        ) : null}
                        {biz.bankAccounts.length ? (
                          <div>
                            <b>Bank:</b> {biz.bankAccounts.join(" | ")}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <MetaPanel
                  saleId={sale?.id}
                  createdAt={createdAt}
                  paidAt={paidAt}
                  paymentMethod={paymentMethod}
                />
              </div>

              <div className="mt-5 grid gap-4">
                <InfoCard title="Bill To">
                  <div>
                    <b>Name:</b> {toStr(customerName) || "Walk-in"}
                  </div>
                  <div>
                    <b>Phone:</b>{" "}
                    {toStr(sale?.customerPhone || sale?.customer_phone) || "—"}
                  </div>
                  <div>
                    <b>TIN:</b>{" "}
                    {toStr(sale?.customerTin || sale?.customer_tin) || "—"}
                  </div>
                  <div>
                    <b>Address:</b>{" "}
                    {toStr(sale?.customerAddress || sale?.customer_address) ||
                      "—"}
                  </div>
                </InfoCard>
              </div>

              <div className="mt-5 overflow-x-auto rounded-3xl border border-[var(--border)] bg-[var(--card)]">
                <table className="min-w-full text-sm">
                  <thead className="bg-[var(--card-2)]">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-black text-[var(--app-fg)]">
                        #
                      </th>
                      <th className="px-4 py-3 font-black text-[var(--app-fg)]">
                        Item
                      </th>
                      <th className="px-4 py-3 font-black text-[var(--app-fg)]">
                        SKU
                      </th>
                      <th className="px-4 py-3 text-right font-black text-[var(--app-fg)]">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-right font-black text-[var(--app-fg)]">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right font-black text-[var(--app-fg)]">
                        Line Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-6 text-center text-sm app-muted"
                        >
                          No items.
                        </td>
                      </tr>
                    ) : (
                      items.map((it, idx) => {
                        const qty = Number(it?.qty ?? 0) || 0;
                        const unitPrice =
                          Number(it?.unitPrice ?? it?.price ?? 0) || 0;
                        const lineTotal =
                          Number(
                            it?.lineTotal ?? it?.total ?? qty * unitPrice,
                          ) || 0;

                        return (
                          <tr
                            key={it?.id || idx}
                            className="border-t border-[var(--border)]"
                          >
                            <td className="px-4 py-3 text-[var(--app-fg)]">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3 text-[var(--app-fg)]">
                              {toStr(
                                it?.productName ||
                                  it?.name ||
                                  `Item #${it?.productId || ""}`,
                              ) || "—"}
                            </td>
                            <td className="px-4 py-3 text-[var(--app-fg)]">
                              {toStr(it?.sku) || "—"}
                            </td>
                            <td className="px-4 py-3 text-right text-[var(--app-fg)]">
                              {qty}
                            </td>
                            <td className="px-4 py-3 text-right text-[var(--app-fg)]">
                              {moneyLine(unitPrice)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-[var(--app-fg)]">
                              {moneyLine(lineTotal)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div></div>

                <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="flex items-center justify-between text-lg font-black text-[var(--app-fg)]">
                    <span>Total Paid</span>
                    <span>{moneyLine(total)}</span>
                  </div>
                </div>
              </div>

              {toStr(sale?.note) ? (
                <div className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.14em] app-muted">
                    Note
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-[var(--app-fg)]">
                    {toStr(sale?.note)}
                  </div>
                </div>
              ) : null}

              <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <SignatureCard
                  title="Prepared By"
                  lineValue={toStr(sellerName) || ""}
                  showNameRow={false}
                />

                <StampCard />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
