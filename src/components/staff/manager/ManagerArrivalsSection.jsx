"use client";

import {
  EmptyState,
  RefreshButton,
  SectionCard,
  Skeleton,
  TinyPill,
} from "./manager-ui";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function valueOrDash(v) {
  const s = toStr(v);
  return s || "—";
}

function money(n) {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return "0";
  return Math.round(x).toLocaleString();
}

function numOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function buildDocUrl(rawUrl) {
  if (!rawUrl) return "#";

  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE ||
    "http://localhost:4000";

  return /^https?:\/\//i.test(rawUrl)
    ? rawUrl
    : `${String(API_BASE).replace(/\/$/, "")}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;
}

function getArrivalProductName(arrival) {
  const raw = arrival?.raw || {};

  return (
    toStr(arrival?.productName) ||
    toStr(arrival?.product_name) ||
    toStr(raw?.productName) ||
    toStr(raw?.product_name) ||
    toStr(raw?.name) ||
    toStr(raw?.title) ||
    toStr(raw?.product?.name) ||
    toStr(raw?.inventory?.productName) ||
    toStr(raw?.inventory?.name) ||
    (raw?.productId ? `Product #${raw.productId}` : "") ||
    (raw?.product_id ? `Product #${raw.product_id}` : "") ||
    (arrival?.productId ? `Product #${arrival.productId}` : "") ||
    (arrival?.product_id ? `Product #${arrival.product_id}` : "") ||
    "Product"
  );
}

function getArrivalQty(arrival) {
  const raw = arrival?.raw || {};
  const val =
    arrival?.qty ??
    raw?.qtyReceived ??
    raw?.qty_received ??
    raw?.qty ??
    raw?.quantity ??
    0;

  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

function getArrivalSupplierLabel(raw) {
  const supplierName =
    toStr(raw?.supplierName) ||
    toStr(raw?.supplier_name) ||
    toStr(raw?.supplier?.name) ||
    toStr(raw?.vendorName) ||
    toStr(raw?.vendor_name);

  const supplierPhone =
    toStr(raw?.supplierPhone) ||
    toStr(raw?.supplier_phone) ||
    toStr(raw?.supplier?.phone) ||
    toStr(raw?.vendorPhone) ||
    toStr(raw?.vendor_phone);

  return [supplierName, supplierPhone].filter(Boolean).join(" • ");
}

function getArrivalReference(raw, arrival) {
  return (
    toStr(raw?.reference) ||
    toStr(raw?.arrivalRef) ||
    toStr(raw?.arrival_ref) ||
    toStr(raw?.referenceNo) ||
    toStr(raw?.reference_no) ||
    `#${arrival?.id ?? "—"}`
  );
}

function getArrivalDocuments(raw) {
  if (Array.isArray(raw?.documents)) return raw.documents;
  if (Array.isArray(raw?.files)) return raw.files;
  if (Array.isArray(raw?.attachments)) return raw.attachments;
  return [];
}

function isImageFile(doc) {
  const type = String(doc?.mimeType || doc?.type || "").toLowerCase();
  const url = String(doc?.fileUrl || doc?.url || "").toLowerCase();

  return (
    type.startsWith("image/") ||
    url.endsWith(".png") ||
    url.endsWith(".jpg") ||
    url.endsWith(".jpeg") ||
    url.endsWith(".webp") ||
    url.endsWith(".gif")
  );
}

function isPdfFile(doc) {
  const type = String(doc?.mimeType || doc?.type || "").toLowerCase();
  const url = String(doc?.fileUrl || doc?.url || "").toLowerCase();

  return type.includes("pdf") || url.endsWith(".pdf");
}

function fileKindLabel(doc) {
  if (isPdfFile(doc)) return "PDF";
  if (isImageFile(doc)) return "Image";
  return "File";
}

function MetaCard({ label, value, tone = "default" }) {
  const toneCls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)]"
        : tone === "info"
          ? "border-[var(--info-border)] bg-[var(--info-bg)]"
          : "border-[var(--border)] bg-[var(--card-2)]";

  return (
    <div className={cx("rounded-2xl border px-3 py-3", toneCls)}>
      <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-bold text-[var(--app-fg)]">
        {value}
      </div>
    </div>
  );
}

function FileCard({ doc }) {
  const href = buildDocUrl(doc?.fileUrl || doc?.url || "");
  const name =
    toStr(doc?.name) ||
    toStr(doc?.fileName) ||
    toStr(doc?.filename) ||
    toStr(doc?.title) ||
    "Open file";

  const kind = fileKindLabel(doc);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-[var(--app-fg)]">
            {name}
          </div>
          <div className="mt-1 text-xs app-muted">{kind}</div>
        </div>

        <TinyPill
          tone={kind === "PDF" ? "warn" : kind === "Image" ? "info" : "neutral"}
        >
          {kind}
        </TinyPill>
      </div>

      <div className="mt-3">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-xs font-bold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
        >
          Open file
        </a>
      </div>
    </div>
  );
}

function ArrivalCard({ arrival }) {
  const raw = arrival?.raw || {};

  const productName = getArrivalProductName(arrival);
  const qty = getArrivalQty(arrival);

  const sku =
    toStr(raw?.sku) ||
    toStr(raw?.productSku) ||
    toStr(raw?.product_sku) ||
    toStr(raw?.product?.sku);

  const batchNo =
    toStr(raw?.batchNo) ||
    toStr(raw?.batch_no) ||
    toStr(raw?.batchNumber) ||
    toStr(raw?.batch_number);

  const reference = getArrivalReference(raw, arrival);

  const supplierLabel = getArrivalSupplierLabel(raw);

  const unitCost = numOrNull(
    raw?.unitCost ??
      raw?.unit_cost ??
      raw?.costPrice ??
      raw?.cost_price ??
      raw?.buyingPrice ??
      raw?.buying_price,
  );

  const totalCost =
    numOrNull(raw?.totalCost ?? raw?.total_cost) ??
    (unitCost != null ? unitCost * qty : null);

  const locationName =
    toStr(raw?.locationName) ||
    toStr(raw?.location_name) ||
    toStr(raw?.location?.name);

  const receivedBy =
    toStr(raw?.receivedByName) ||
    toStr(raw?.received_by_name) ||
    toStr(raw?.createdByName) ||
    toStr(raw?.created_by_name) ||
    toStr(raw?.user?.name);

  const supplierInvoice =
    toStr(raw?.supplierInvoiceRef) ||
    toStr(raw?.supplier_invoice_ref) ||
    toStr(raw?.invoiceRef) ||
    toStr(raw?.invoice_ref);

  const purchaseOrderRef =
    toStr(raw?.purchaseOrderRef) ||
    toStr(raw?.purchase_order_ref) ||
    toStr(raw?.poRef) ||
    toStr(raw?.po_ref);

  const notes =
    toStr(raw?.notes) || toStr(raw?.note) || toStr(raw?.description);

  const documents = getArrivalDocuments(raw);

  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] dark:shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-base font-black text-[var(--app-fg)]">
              {productName}
            </div>
            <TinyPill tone="success">Product arrived</TinyPill>
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-xs app-muted">
            <span>
              Arrival ref: <b className="text-[var(--app-fg)]">{reference}</b>
            </span>

            {sku ? (
              <span>
                SKU: <b className="text-[var(--app-fg)]">{sku}</b>
              </span>
            ) : null}

            {batchNo ? (
              <span>
                Batch: <b className="text-[var(--app-fg)]">{batchNo}</b>
              </span>
            ) : null}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
            Received qty
          </div>
          <div className="mt-1 text-2xl font-black tracking-[-0.03em] text-[var(--app-fg)]">
            {qty}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetaCard
          label="Received at"
          value={valueOrDash(arrival?.when)}
          tone="info"
        />
        <MetaCard label="Supplier" value={supplierLabel || "—"} />
        <MetaCard
          label="Unit cost"
          value={unitCost != null ? `${money(unitCost)} RWF` : "—"}
        />
        <MetaCard
          label="Total cost context"
          value={totalCost != null ? `${money(totalCost)} RWF` : "—"}
          tone={totalCost != null ? "success" : "default"}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetaCard label="Location" value={locationName || "—"} />
        <MetaCard label="Received by" value={receivedBy || "—"} />
        <MetaCard label="Supplier invoice" value={supplierInvoice || "—"} />
        <MetaCard label="PO / source ref" value={purchaseOrderRef || "—"} />
      </div>

      {notes ? (
        <div className="mt-4 rounded-[20px] border border-[var(--border)] bg-[var(--card-2)] p-4">
          <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
            Notes
          </div>
          <div className="mt-2 text-sm leading-6 text-[var(--app-fg)]">
            {notes}
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-[20px] border border-[var(--border)] bg-[var(--card-2)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
              Documents
            </div>
            <div className="mt-1 text-sm app-muted">
              Receipts, invoices, proof images, and supporting files.
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-bold text-[var(--app-fg)]">
            {documents.length} file{documents.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {documents.length > 0 ? (
            documents.map((doc, idx) => (
              <FileCard
                key={
                  doc?.id || doc?.fileUrl || doc?.url || `${arrival?.id}-${idx}`
                }
                doc={doc}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] px-4 py-5 text-sm app-muted">
              No documents attached.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ArrivalsSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Skeleton className="h-72 w-full rounded-[24px]" />
      <Skeleton className="h-72 w-full rounded-[24px]" />
      <Skeleton className="h-72 w-full rounded-[24px]" />
      <Skeleton className="h-72 w-full rounded-[24px]" />
    </div>
  );
}

export default function ManagerArrivalsSection({
  arrivalsNormalized,
  loadingArrivals,
  loadArrivals,
}) {
  const rows = Array.isArray(arrivalsNormalized) ? arrivalsNormalized : [];

  return (
    <SectionCard
      title="Stock arrivals"
      hint="Recent incoming stock with supplier context, quantity received, cost visibility, notes, and proof documents."
      right={<RefreshButton loading={loadingArrivals} onClick={loadArrivals} />}
    >
      {loadingArrivals ? (
        <ArrivalsSkeletonGrid />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No stock arrivals yet"
          hint="Incoming stock records will appear here once they are created."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {rows.map((arrival) => (
            <ArrivalCard key={String(arrival.id)} arrival={arrival} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}
