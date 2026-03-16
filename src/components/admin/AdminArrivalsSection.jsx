"use client";

import {
  Pill,
  SectionCard,
  Skeleton,
  cx,
  fmt,
  money,
  toStr,
} from "./adminShared";
import { useMemo, useState } from "react";

import AsyncButton from "../AsyncButton";

function StatTile({ label, value, sub, tone = "neutral" }) {
  const toneCls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)]"
        : tone === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)]"
          : tone === "info"
            ? "border-[var(--info-border)] bg-[var(--info-bg)]"
            : "border-[var(--border)] bg-[var(--card-2)]";

  return (
    <div className={cx("rounded-2xl border p-4", toneCls)}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
        {label}
      </div>
      <div className="mt-1 text-xl font-black text-[var(--app-fg)]">
        {value}
      </div>
      {sub ? <div className="mt-1 text-xs app-muted">{sub}</div> : null}
    </div>
  );
}

function ArrivalFileButton({ file }) {
  const rawUrl = file?.fileUrl || file?.url || "";
  if (!rawUrl) return null;

  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE ||
    "http://localhost:4000";

  const href = /^https?:\/\//i.test(rawUrl)
    ? rawUrl
    : `${String(API_BASE).replace(/\/$/, "")}${
        rawUrl.startsWith("/") ? "" : "/"
      }${rawUrl}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-semibold text-[var(--app-fg)] hover:bg-[var(--hover)]"
    >
      Open file
    </a>
  );
}

function normalizeArrivalItems(arrival) {
  const rawItems = Array.isArray(arrival?.items) ? arrival.items : [];

  return rawItems.map((item, idx) => {
    const productName =
      toStr(item?.productDisplayName) ||
      toStr(item?.productName) ||
      toStr(item?.name) ||
      (item?.productId ? `Product #${item.productId}` : `Line ${idx + 1}`);

    const qtyReceived =
      Number(item?.stockQtyReceived ?? item?.qtyReceived ?? item?.qty ?? 0) ||
      0;

    const bonusQty = Number(item?.bonusQty ?? 0) || 0;

    const stockUnit =
      toStr(item?.stockUnit) ||
      toStr(item?.purchaseUnit) ||
      toStr(item?.unit) ||
      "PIECE";

    return {
      ...item,
      _productName: productName,
      _qtyReceived: qtyReceived,
      _bonusQty: bonusQty,
      _stockUnit: stockUnit,
    };
  });
}

function buildArrivalSummary(arrival) {
  const items = normalizeArrivalItems(arrival);

  const totalItems = Number(arrival?.itemsCount ?? items.length ?? 0) || 0;
  const totalStockQty =
    Number(arrival?.totalStockQtyReceived ?? 0) ||
    items.reduce((sum, item) => sum + item._qtyReceived + item._bonusQty, 0);

  const previewItems = items
    .slice()
    .sort((a, b) => b._qtyReceived - a._qtyReceived)
    .slice(0, 3);

  const previewText =
    previewItems.length > 0
      ? previewItems.map((item) => ({
          label: item._productName,
          qty: item._qtyReceived,
          unit: item._stockUnit,
        }))
      : [];

  return {
    items,
    totalItems,
    totalStockQty,
    previewText,
  };
}

function PreviewProductPill({ label, qty, unit }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5">
      <div className="truncate text-sm font-bold text-[var(--app-fg)]">
        {label}
      </div>
      <div className="mt-1 text-xs app-muted">
        {Number(qty || 0).toLocaleString()} {unit}
      </div>
    </div>
  );
}

function InfoMiniCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] app-muted">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-bold text-[var(--app-fg)]">
        {value}
      </div>
    </div>
  );
}

function ArrivalItemRow({ item }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-[var(--app-fg)]">
            {item._productName}
          </div>
          <div className="mt-1 text-xs app-muted">
            {item?.productSku ? `SKU ${item.productSku}` : "No SKU"} • Stock{" "}
            {item._stockUnit}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            Received
          </div>
          <div className="mt-1 text-sm font-black text-[var(--app-fg)]">
            {Number(item._qtyReceived).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Qty"
          value={String(Number(item._qtyReceived || 0))}
          sub={item?.purchaseUnit || item._stockUnit}
        />
        <StatTile
          label="Bonus"
          value={String(Number(item._bonusQty || 0))}
          sub={item?.purchaseUnit || item._stockUnit}
        />
        <StatTile
          label="Unit cost"
          value={`${money(item?.unitCost ?? 0)} RWF`}
        />
        <StatTile
          label="Line total"
          value={`${money(item?.lineTotal ?? 0)} RWF`}
          tone="info"
        />
      </div>

      {toStr(item?.note) ? (
        <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3 text-sm text-[var(--app-fg)]">
          <span className="font-semibold">Line note:</span> {item.note}
        </div>
      ) : null}
    </div>
  );
}

function ArrivalCard({ arrival, expanded, onToggle, onOpenProof }) {
  const files = Array.isArray(arrival?.documents) ? arrival.documents : [];
  const summary = buildArrivalSummary(arrival);

  const supplierLabel = toStr(arrival?.supplierName) || "No supplier linked";
  const receivedByLabel =
    toStr(arrival?.receivedByName) || toStr(arrival?.receivedByEmail) || "—";
  const locationLabel = toStr(arrival?.locationName) || "Branch";
  const referenceLabel =
    toStr(arrival?.reference) || toStr(arrival?.documentNo) || "No reference";

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-black text-[var(--app-fg)] sm:text-base">
                Arrival #{arrival?.id ?? "—"}
              </div>

              <Pill tone="info">{toStr(arrival?.sourceType) || "MANUAL"}</Pill>

              <Pill tone={summary.totalItems > 0 ? "warn" : "info"}>
                {summary.totalItems} item(s)
              </Pill>

              {summary.totalStockQty > 0 ? (
                <Pill tone="success">
                  {Number(summary.totalStockQty).toLocaleString()} stock qty
                </Pill>
              ) : null}
            </div>

            <div className="mt-2 text-xs app-muted">
              {locationLabel} • {fmt(arrival?.receivedAt || arrival?.createdAt)}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] app-muted">
              Total amount
            </div>
            <div className="mt-1 text-lg font-black text-[var(--app-fg)]">
              {money(arrival?.totalAmount ?? 0)}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <InfoMiniCard label="Supplier" value={supplierLabel} />
          <InfoMiniCard label="Recorded by" value={receivedByLabel} />
          <InfoMiniCard
            label="Stock received"
            value={String(Number(summary.totalStockQty).toLocaleString())}
          />
          <InfoMiniCard label="Reference" value={referenceLabel} />
        </div>

        <div className="mt-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] app-muted">
            Products arrived
          </div>

          {summary.previewText.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--card-2)] px-3 py-3 text-sm app-muted">
              No product lines available yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {summary.previewText.map((item, idx) => (
                <PreviewProductPill
                  key={`${item.label}-${idx}`}
                  label={item.label}
                  qty={item.qty}
                  unit={item.unit}
                />
              ))}

              {summary.items.length > 3 ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2.5">
                  <div className="text-sm font-bold text-[var(--app-fg)]">
                    +{summary.items.length - 3} more item(s)
                  </div>
                  <div className="mt-1 text-xs app-muted">
                    Open details to view all lines
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {toStr(arrival?.notes) ? (
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3 text-sm text-[var(--app-fg)]">
            <span className="font-semibold">Arrival note:</span> {arrival.notes}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenProof?.(arrival)}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-semibold text-[var(--app-fg)] hover:bg-[var(--hover)]"
          >
            Open proof
          </button>

          <button
            type="button"
            onClick={onToggle}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-semibold text-[var(--app-fg)] hover:bg-[var(--hover)]"
          >
            {expanded ? "Hide details" : "View details"}
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-[var(--border)] px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile label="Supplier" value={supplierLabel} />
              <StatTile label="Recorded by" value={receivedByLabel} />
              <StatTile
                label="Items count"
                value={String(summary.totalItems)}
                sub="Distinct received lines"
              />
              <StatTile
                label="Stock received"
                value={String(Number(summary.totalStockQty).toLocaleString())}
                sub="Combined stock quantity"
                tone="success"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-black text-[var(--app-fg)]">
                Supporting documents
              </div>

              <div className="flex flex-wrap gap-2">
                {files.length === 0 ? (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-xs app-muted">
                    No files attached
                  </div>
                ) : null}

                {files.map((file, idx) => (
                  <ArrivalFileButton
                    key={file?.id || file?.url || file?.fileUrl || idx}
                    file={file}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="text-sm font-black text-[var(--app-fg)]">
                Arrival items
              </div>

              {summary.items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--card-2)] p-4 text-sm app-muted">
                  No item rows returned for this arrival.
                </div>
              ) : (
                summary.items.map((item) => (
                  <ArrivalItemRow
                    key={String(item?.id || `${item?.productId}-line`)}
                    item={item}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ArrivalsLoadingState() {
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5"
        >
          <Skeleton className="h-5 w-44" />
          <Skeleton className="mt-2 h-4 w-60" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
          <div className="mt-4 grid gap-2">
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ArrivalsEmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card-2)] p-8 text-center">
      <div className="text-base font-black text-[var(--app-fg)]">
        No stock arrivals yet
      </div>
      <div className="mt-2 text-sm app-muted">
        Incoming stock records will appear here after store keeper or admin
        receives inventory.
      </div>
    </div>
  );
}

export default function AdminArrivalsSection({
  arrivals = [],
  arrivalsLoading = false,
  loadArrivals,
  onOpenProof,
}) {
  const [expandedId, setExpandedId] = useState(null);

  const sortedRows = useMemo(() => {
    const rows = Array.isArray(arrivals) ? arrivals : [];
    return rows.slice().sort((a, b) => {
      const ta = new Date(a?.receivedAt || a?.createdAt || 0).getTime() || 0;
      const tb = new Date(b?.receivedAt || b?.createdAt || 0).getTime() || 0;
      if (tb !== ta) return tb - ta;
      return Number(b?.id || 0) - Number(a?.id || 0);
    });
  }, [arrivals]);

  const totalAmount = useMemo(
    () =>
      sortedRows.reduce(
        (sum, row) => sum + (Number(row?.totalAmount ?? 0) || 0),
        0,
      ),
    [sortedRows],
  );

  const totalStockQty = useMemo(
    () =>
      sortedRows.reduce((sum, row) => {
        const summary = buildArrivalSummary(row);
        return sum + summary.totalStockQty;
      }, 0),
    [sortedRows],
  );

  const supplierCount = useMemo(
    () =>
      new Set(sortedRows.map((x) => toStr(x?.supplierName)).filter(Boolean))
        .size,
    [sortedRows],
  );

  return (
    <div className="grid gap-4">
      <SectionCard
        title="Stock arrivals"
        hint="Incoming stock records, supplier references, quantities, products received, costs, and supporting files."
        right={
          <AsyncButton
            variant="secondary"
            size="sm"
            state={arrivalsLoading ? "loading" : "idle"}
            text="Reload"
            loadingText="Loading…"
            successText="Done"
            onClick={loadArrivals}
          />
        }
      >
        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Arrival records"
              value={String(sortedRows.length)}
              sub="Loaded stock receipts"
              tone="info"
            />
            <StatTile
              label="Suppliers seen"
              value={String(supplierCount)}
              sub="Distinct supplier names"
            />
            <StatTile
              label="Stock received"
              value={String(totalStockQty.toLocaleString())}
              sub="Total stock quantity"
              tone="success"
            />
            <StatTile
              label="Arrival amount"
              value={`${money(totalAmount)} RWF`}
              sub="Combined line totals"
              tone="warn"
            />
          </div>

          {arrivalsLoading ? (
            <ArrivalsLoadingState />
          ) : sortedRows.length === 0 ? (
            <ArrivalsEmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {sortedRows.map((arrival) => (
                <ArrivalCard
                  key={String(arrival?.id)}
                  arrival={arrival}
                  expanded={String(expandedId) === String(arrival?.id)}
                  onToggle={() =>
                    setExpandedId((prev) =>
                      String(prev) === String(arrival?.id) ? null : arrival?.id,
                    )
                  }
                  onOpenProof={onOpenProof}
                />
              ))}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
