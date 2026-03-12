"use client";

import { safeDate, toStr } from "./seller-utils";

import { createPortal } from "react-dom";

function getBusinessIdentity(me) {
  const businessName =
    toStr(me?.business?.name) ||
    toStr(me?.location?.name) ||
    toStr(me?.businessName) ||
    toStr(me?.companyName) ||
    toStr(me?.organizationName) ||
    toStr(me?.storeName) ||
    toStr(me?.location?.businessName) ||
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
    toStr(me?.tinNumber) ||
    toStr(me?.tin) ||
    "";

  const momoCode =
    toStr(me?.business?.momoCode) ||
    toStr(me?.location?.momoCode) ||
    toStr(me?.momoCode) ||
    toStr(me?.merchantCode) ||
    toStr(me?.mtnMomoCode) ||
    toStr(me?.airtelMoneyCode) ||
    "";

  const bankAccountsRaw =
    me?.business?.bankAccounts ||
    me?.location?.bankAccounts ||
    me?.bankAccounts ||
    me?.businessBankAccounts ||
    me?.companyBankAccounts ||
    [];

  const bankAccounts = Array.isArray(bankAccountsRaw)
    ? bankAccountsRaw
        .map((acc) => {
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
      : branchName || branchCode || "";

  return {
    businessName,
    branchLabel,
    email,
    phone,
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

function printDocument(title, html) {
  if (typeof window === "undefined") return;

  const win = window.open("", "_blank", "width=1100,height=800");
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
          body {
            font-family: Inter, Arial, sans-serif;
            color: #111827;
            margin: 0;
            padding: 28px;
            background: #ffffff;
          }
          .doc {
            max-width: 980px;
            margin: 0 auto;
          }
          .topbar {
            height: 8px;
            background: #111827;
            border-radius: 999px;
            margin-bottom: 18px;
          }
          .head {
            display: grid;
            grid-template-columns: 1.3fr 0.9fr;
            gap: 20px;
            align-items: start;
            border-bottom: 2px solid #111827;
            padding-bottom: 18px;
            margin-bottom: 22px;
          }
          .brand-name {
            font-size: 28px;
            font-weight: 800;
            line-height: 1.15;
            letter-spacing: -0.02em;
          }
          .doc-title {
            margin-top: 10px;
            font-size: 14px;
            font-weight: 800;
            letter-spacing: 0.12em;
            color: #374151;
          }
          .meta {
            text-align: right;
            border: 1px solid #d1d5db;
            border-radius: 16px;
            padding: 14px 16px;
            background: #f9fafb;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            font-size: 13px;
            padding: 5px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .meta-row:last-child {
            border-bottom: 0;
          }
          .subinfo {
            margin-top: 8px;
            color: #4b5563;
            font-size: 12px;
            line-height: 1.6;
          }
          .block {
            margin-top: 18px;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          .panel {
            border: 1px solid #d1d5db;
            border-radius: 16px;
            padding: 16px;
            background: #ffffff;
          }
          .panel-label {
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: #6b7280;
            margin-bottom: 10px;
          }
          .line {
            font-size: 13px;
            margin-bottom: 7px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
            border: 1px solid #d1d5db;
            border-radius: 16px;
            overflow: hidden;
          }
          th, td {
            border-bottom: 1px solid #e5e7eb;
            padding: 12px 10px;
            font-size: 13px;
            text-align: left;
            vertical-align: top;
          }
          th {
            background: #f3f4f6;
            font-weight: 800;
            color: #111827;
          }
          tr:last-child td {
            border-bottom: 0;
          }
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 32px;
            margin-top: 42px;
          }
          .sign-box {
            border: 1px solid #d1d5db;
            border-radius: 16px;
            padding: 16px;
            min-height: 120px;
          }
          .sign-title {
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: #6b7280;
            margin-bottom: 20px;
          }
          .sign-line {
            margin-top: 26px;
            border-top: 1px solid #111827;
            padding-top: 8px;
            font-size: 13px;
          }
          @media print {
            body { padding: 0; }
            .doc { max-width: 100%; }
          }
        </style>
      </head>
      <body>
        ${html}
        <script>
          window.onload = function () {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  win.document.close();
}

function buildDeliveryHtml({ sale, me }) {
  const items = Array.isArray(sale?.items) ? sale.items : [];
  const customerName = sale?.customerName || sale?.customer_name || "Walk-in";
  const customerPhone = sale?.customerPhone || sale?.customer_phone || "";
  const customerAddress = sale?.customerAddress || sale?.customer_address || "";
  const sellerName =
    sale?.sellerName || sale?.createdByName || me?.name || "Seller";

  const deliveredAt =
    sale?.fulfilledAt ||
    sale?.fulfilled_at ||
    sale?.updatedAt ||
    sale?.updated_at ||
    sale?.createdAt ||
    sale?.created_at ||
    null;

  const biz = getBusinessIdentity(me);

  const rows = items
    .map((it, idx) => {
      const qty = Number(it?.qty ?? 0) || 0;

      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${esc(toStr(it?.productName || it?.name || `Item #${it?.productId || ""}`) || "—")}</td>
          <td>${esc(toStr(it?.sku) || "—")}</td>
          <td>${qty}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="doc">
      <div class="topbar"></div>

      <div class="head">
        <div>
          <div class="brand-name">${esc(biz.businessName)}</div>
            <div class="subinfo">
                ${biz.branchLabel ? `<div><strong>Branch:</strong> ${esc(biz.branchLabel)}</div>` : ""}
                ${biz.address ? `<div><strong>Address:</strong> ${esc(biz.address)}</div>` : ""}
                ${biz.phone || biz.email ? `<div>${biz.phone ? `Tel: ${esc(biz.phone)}` : ""}${biz.phone && biz.email ? " • " : ""}${biz.email ? `Email: ${esc(biz.email)}` : ""}</div>` : ""}
                ${biz.tin ? `<div><strong>TIN:</strong> ${esc(biz.tin)}</div>` : ""}
                ${biz.momoCode ? `<div><strong>MoMo Code:</strong> ${esc(biz.momoCode)}</div>` : ""}
                ${
                  biz.bankAccounts.length
                    ? `<div><strong>Bank:</strong><br />${biz.bankAccounts
                        .map((acc) => esc(acc))
                        .join("<br />")}</div>`
                    : ""
                }
            </div>
        </div>

        <div class="meta">
          <div class="meta-row"><span><strong>Document No</strong></span><span>DN-${esc(sale?.id || "—")}</span></div>
          <div class="meta-row"><span><strong>Sale Ref</strong></span><span>#${esc(sale?.id || "—")}</span></div>
          <div class="meta-row"><span><strong>Date</strong></span><span>${esc(safeDate(deliveredAt))}</span></div>
          <div class="meta-row"><span><strong>Status</strong></span><span>${esc(toStr(sale?.status || "").toUpperCase() || "—")}</span></div>
        </div>
      </div>

      <div class="grid block">
        <div class="panel">
          <div class="panel-label">Customer details</div>
          <div class="line"><strong>Name:</strong> ${esc(toStr(customerName) || "—")}</div>
          <div class="line"><strong>Phone:</strong> ${esc(toStr(customerPhone) || "—")}</div>
          <div class="line"><strong>Address:</strong> ${esc(toStr(customerAddress) || "—")}</div>
        </div>

        <div class="panel">
          <div class="panel-label">Handling details</div>
          <div class="line"><strong>Prepared by:</strong> ${esc(toStr(sellerName) || "—")}</div>
          <div class="line"><strong>Released from:</strong> ${esc(biz.branchLabel || biz.businessName)}</div>
        </div>
      </div>

      <div class="block">
        <table>
          <thead>
            <tr>
              <th style="width:72px">#</th>
              <th>Item</th>
              <th style="width:180px">SKU</th>
              <th style="width:100px">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="4">No items</td></tr>`}
          </tbody>
        </table>
      </div>

      <div class="signatures">
        <div class="sign-box">
          <div class="sign-title">Prepared / Released by</div>
          <div class="line"><strong>Name:</strong> ${esc(toStr(sellerName) || "—")}</div>
          <div class="sign-line">Signature</div>
        </div>

        <div class="sign-box">
          <div class="sign-title">Received by customer</div>
          <div class="line"><strong>Name:</strong> ________________________</div>
          <div class="sign-line">Signature</div>
        </div>
      </div>
    </div>
  `;
}

export default function SellerDeliveryNoteModal({
  open,
  sale,
  loading,
  me,
  onClose,
}) {
  if (!open) return null;

  const items = Array.isArray(sale?.items) ? sale.items : [];
  const deliveredAt =
    sale?.fulfilledAt ||
    sale?.fulfilled_at ||
    sale?.updatedAt ||
    sale?.updated_at ||
    sale?.createdAt ||
    sale?.created_at ||
    null;

  const sellerName = sale?.sellerName || sale?.createdByName || me?.name || "—";

  const biz = getBusinessIdentity(me);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-4">
          <div className="min-w-0">
            <div className="text-lg font-black text-[var(--app-fg)]">
              Delivery note
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
                  `Delivery-Note-${sale?.id || "sale"}`,
                  buildDeliveryHtml({ sale, me }),
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

        <div className="max-h-[80vh] overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="text-sm app-muted">Loading document…</div>
          ) : !sale ? (
            <div className="text-sm app-muted">No sale loaded.</div>
          ) : (
            <div className="mx-auto max-w-4xl rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-5 sm:p-6">
              <div className="mb-5 h-2 rounded-full bg-[var(--app-fg)]" />

              <div className="flex flex-col gap-5 border-b border-[var(--border)] pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="text-2xl font-black tracking-[-0.02em] text-[var(--app-fg)]">
                    {biz.businessName}
                  </div>
                  <div className="mt-2 text-xs font-black uppercase tracking-[0.14em] app-muted">
                    Delivery Note
                  </div>

                  <div className="mt-3 space-y-1 text-sm text-[var(--app-fg)]">
                    {biz.branchLabel ? (
                      <div>
                        <b>Branch:</b> {biz.branchLabel}
                      </div>
                    ) : null}

                    {biz.address ? (
                      <div>
                        <b>Address:</b> {biz.address}
                      </div>
                    ) : null}

                    {biz.phone || biz.email ? (
                      <div>
                        {biz.phone ? (
                          <span>
                            <b>Tel:</b> {biz.phone}
                          </span>
                        ) : null}
                        {biz.phone && biz.email ? " • " : null}
                        {biz.email ? (
                          <span>
                            <b>Email:</b> {biz.email}
                          </span>
                        ) : null}
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
                        <b>Bank:</b>
                        <div className="mt-1 space-y-1">
                          {biz.bankAccounts.map((acc, idx) => (
                            <div key={idx}>{acc}</div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--app-fg)]">
                  <div className="flex items-center justify-between py-1">
                    <span className="font-semibold">Document No</span>
                    <span>DN-{sale?.id || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="font-semibold">Sale Ref</span>
                    <span>#{sale?.id || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="font-semibold">Date</span>
                    <span>{safeDate(deliveredAt)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="font-semibold">Status</span>
                    <span>
                      {toStr(sale?.status || "").toUpperCase() || "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="text-xs font-black uppercase tracking-[0.08em] app-muted">
                    Customer details
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-[var(--app-fg)]">
                    <div>
                      <b>Name:</b>{" "}
                      {toStr(sale?.customerName || sale?.customer_name) ||
                        "Walk-in"}
                    </div>
                    <div>
                      <b>Phone:</b>{" "}
                      {toStr(sale?.customerPhone || sale?.customer_phone) ||
                        "—"}
                    </div>
                    <div>
                      <b>Address:</b>{" "}
                      {toStr(sale?.customerAddress || sale?.customer_address) ||
                        "—"}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="text-xs font-black uppercase tracking-[0.08em] app-muted">
                    Handling details
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-[var(--app-fg)]">
                    <div>
                      <b>Prepared by:</b> {toStr(sellerName) || "—"}
                    </div>
                    <div>
                      <b>Released from:</b>{" "}
                      {biz.branchLabel || biz.businessName}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
                <table className="min-w-full text-sm">
                  <thead className="bg-[var(--card-2)]">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-bold text-[var(--app-fg)]">
                        #
                      </th>
                      <th className="px-4 py-3 font-bold text-[var(--app-fg)]">
                        Item
                      </th>
                      <th className="px-4 py-3 font-bold text-[var(--app-fg)]">
                        SKU
                      </th>
                      <th className="px-4 py-3 font-bold text-[var(--app-fg)]">
                        Qty
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-4 text-center text-sm app-muted"
                        >
                          No items.
                        </td>
                      </tr>
                    ) : (
                      items.map((it, idx) => (
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
                          <td className="px-4 py-3 font-bold text-[var(--app-fg)]">
                            {Number(it?.qty ?? 0) || 0}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="text-xs font-black uppercase tracking-[0.08em] app-muted">
                    Prepared / Released by
                  </div>

                  <div className="mt-6 text-sm text-[var(--app-fg)]">
                    <div>
                      <b>Name:</b> {toStr(sellerName) || "—"}
                    </div>
                  </div>

                  <div className="mt-8 border-t border-[var(--border)] pt-2 text-sm text-[var(--app-fg)]">
                    Signature
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="text-xs font-black uppercase tracking-[0.08em] app-muted">
                    Received by customer
                  </div>

                  <div className="mt-6 text-sm text-[var(--app-fg)]">
                    <div>
                      <b>Name:</b> ________________________
                    </div>
                  </div>

                  <div className="mt-8 border-t border-[var(--border)] pt-2 text-sm text-[var(--app-fg)]">
                    Signature
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
