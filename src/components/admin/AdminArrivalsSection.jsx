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
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:4000";

  const href = /^https?:\/\//i.test(rawUrl)
    ? rawUrl
    : `${API_BASE}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;

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

function ArrivalItemRow({ item }) {
  const productName =
    toStr(item?.productDisplayName) ||
    toStr(item?.productName) ||
    (item?.productId ? `Product #${item.productId}` : "—");

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-[var(--app-fg)]">
            {productName}
          </div>
          <div className="mt-1 text-xs app-muted">
            {item?.productSku ? `SKU ${item.productSku}` : "No SKU"} • Stock{" "}
            {item?.stockUnit || "PIECE"}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            Received
          </div>
          <div className="mt-1 text-sm font-black text-[var(--app-fg)]">
            {Number(
              item?.stockQtyReceived ?? item?.qtyReceived ?? 0,
            ).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Qty"
          value={String(Number(item?.qtyReceived ?? 0))}
          sub={item?.purchaseUnit || "PIECE"}
        />
        <StatTile
          label="Bonus"
          value={String(Number(item?.bonusQty ?? 0))}
          sub={item?.purchaseUnit || "PIECE"}
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
  const items = Array.isArray(arrival?.items) ? arrival.items : [];

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 p-4 text-left sm:p-5"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-black text-[var(--app-fg)] sm:text-base">
              Arrival #{arrival?.id ?? "—"}
            </div>
            <Pill tone="info">{toStr(arrival?.sourceType) || "MANUAL"}</Pill>
            {arrival?.supplierName ? (
              <Pill tone="success">{arrival.supplierName}</Pill>
            ) : null}
          </div>

          <div className="mt-1 text-xs app-muted">
            {arrival?.locationName || "Branch"} •{" "}
            {fmt(arrival?.receivedAt || arrival?.createdAt)}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {arrival?.reference ? <Pill>Ref {arrival.reference}</Pill> : null}
            {arrival?.documentNo ? <Pill>Doc {arrival.documentNo}</Pill> : null}
            <Pill tone="warn">
              {Number(arrival?.itemsCount ?? items.length ?? 0)} item(s)
            </Pill>
            <Pill tone="success">
              {Number(arrival?.totalStockQtyReceived ?? 0).toLocaleString()}{" "}
              stock qty
            </Pill>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            Total amount
          </div>
          <div className="mt-1 text-lg font-black text-[var(--app-fg)]">
            {money(arrival?.totalAmount ?? 0)}
          </div>
          <div className="mt-2 text-xs font-semibold text-[var(--app-fg)]">
            {expanded ? "Hide details" : "View details"}
          </div>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-[var(--border)] px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile
                label="Recorded by"
                value={
                  arrival?.receivedByName || arrival?.receivedByEmail || "—"
                }
              />
              <StatTile label="Supplier" value={arrival?.supplierName || "—"} />
              <StatTile
                label="Items count"
                value={String(Number(arrival?.itemsCount ?? items.length ?? 0))}
              />
              <StatTile
                label="Stock received"
                value={String(
                  Number(arrival?.totalStockQtyReceived ?? 0).toLocaleString(),
                )}
                tone="success"
              />
            </div>

            {toStr(arrival?.notes) ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4 text-sm text-[var(--app-fg)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
                  Arrival notes
                </div>
                <div className="mt-2 whitespace-pre-wrap break-words">
                  {arrival.notes}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-black text-[var(--app-fg)]">
                Supporting documents
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onOpenProof?.(arrival)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-semibold text-[var(--app-fg)] hover:bg-[var(--hover)]"
                >
                  Open proof
                </button>

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

              {items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--card-2)] p-4 text-sm app-muted">
                  No item rows returned for this arrival.
                </div>
              ) : (
                items.map((item) => (
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
    <div className="grid gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5"
        >
          <Skeleton className="h-5 w-44" />
          <Skeleton className="mt-2 h-4 w-60" />
          <div className="mt-4 flex flex-wrap gap-2">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-28 rounded-full" />
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

  const rows = Array.isArray(arrivals) ? arrivals : [];

  const sortedRows = rows.slice().sort((a, b) => {
    const ta = new Date(a?.receivedAt || a?.createdAt || 0).getTime() || 0;
    const tb = new Date(b?.receivedAt || b?.createdAt || 0).getTime() || 0;
    if (tb !== ta) return tb - ta;
    return Number(b?.id || 0) - Number(a?.id || 0);
  });

  const totalAmount = sortedRows.reduce(
    (sum, row) => sum + (Number(row?.totalAmount ?? 0) || 0),
    0,
  );

  const totalStockQty = sortedRows.reduce(
    (sum, row) => sum + (Number(row?.totalStockQtyReceived ?? 0) || 0),
    0,
  );

  const supplierCount = new Set(
    sortedRows.map((x) => toStr(x?.supplierName)).filter(Boolean),
  ).size;

  return (
    <div className="grid gap-4">
      <SectionCard
        title="Stock arrivals"
        hint="Incoming stock records, supplier references, quantities, costs, and supporting files."
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
            <div className="grid gap-3">
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
