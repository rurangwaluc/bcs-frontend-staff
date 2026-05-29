"use client";

import {
  Input,
  Pill,
  SectionCard,
  Select,
  Skeleton,
  StatusBadge,
  cx,
  fmt,
  money,
  toStr,
} from "./adminShared";

import AsyncButton from "../AsyncButton";

const PAGE_SIZE = 10;

function getSaleItems(sale) {
  const items =
    sale?.items ||
    sale?.itemsPreview ||
    sale?.items_preview ||
    sale?.saleItems ||
    sale?.sale_items ||
    sale?.lines ||
    sale?.products ||
    [];

  return Array.isArray(items) ? items : [];
}

function itemName(item) {
  return (
    toStr(
      item?.productName ??
        item?.product_name ??
        item?.name ??
        item?.product?.name ??
        item?.sku,
    ) || "Item"
  );
}

function itemQty(item) {
  const qty = Number(item?.qty ?? item?.quantity ?? item?.soldQty ?? 0);
  return Number.isFinite(qty) && qty > 0 ? qty : 1;
}

function buildItemsText(sale) {
  const items = getSaleItems(sale);

  if (!items.length) {
    return toStr(
      sale?.itemsSummary ??
        sale?.items_summary ??
        sale?.productsSummary ??
        sale?.products_summary,
    );
  }

  return items
    .slice(0, 5)
    .map((item) => `${itemName(item)} ×${itemQty(item)}`)
    .join(", ");
}

function itemsCount(sale) {
  const items = getSaleItems(sale);
  if (items.length) return items.reduce((sum, item) => sum + itemQty(item), 0);
  return Number(sale?.itemsCount ?? sale?.items_count ?? 0) || 0;
}

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
    <div className={cx("rounded-3xl border p-4 sm:p-5", toneCls)}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] app-muted sm:text-[11px]">
        {label}
      </div>
      <div className="mt-1.5 break-words text-lg font-black leading-tight text-[var(--app-fg)] sm:text-xl 2xl:text-2xl">
        {value}
      </div>
      {sub ? <div className="mt-1.5 text-xs leading-5 app-muted">{sub}</div> : null}
    </div>
  );
}

function SalesToolbar(props) {
  const {
    salesQ,
    setSalesQ,
    salesStatusFilter,
    setSalesStatusFilter,
    salesFrom,
    setSalesFrom,
    salesTo,
    setSalesTo,
    onClear,
  } = props;

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-black text-[var(--app-fg)]">
            Sales filters
          </div>
          <div className="text-xs app-muted sm:text-sm">
            Search sales, customers, staff, and sold items.
          </div>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="app-focus inline-flex h-11 w-full items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)] sm:w-auto"
        >
          Clear filters
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            Search
          </div>
          <Input
            placeholder="Customer, phone, sale id, item, seller, cashier, status…"
            value={salesQ}
            onChange={(e) => setSalesQ?.(e.target.value)}
          />
        </div>

        <div className="lg:col-span-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            Filter
          </div>
          <Select
            value={salesStatusFilter}
            onChange={(e) => setSalesStatusFilter?.(e.target.value)}
          >
            <option value="ALL">All sales</option>
            <option value="TODAY">Today</option>
            <option value="AWAITING">Awaiting payment</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            From
          </div>
          <Input
            type="date"
            value={salesFrom}
            onChange={(e) => setSalesFrom?.(e.target.value)}
          />
        </div>

        <div className="lg:col-span-2">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            To
          </div>
          <Input
            type="date"
            value={salesTo}
            onChange={(e) => setSalesTo?.(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function SalesSummary({
  salesFilteredTotals,
  salesStatusFilter,
  canLoadMoreSales,
  filteredSales,
  filteredSalesAll,
}) {
  const visibleCount = Array.isArray(filteredSales) ? filteredSales.length : 0;
  const totalCount = salesFilteredTotals?.count ?? 0;
  const remaining = Math.max(
    0,
    (filteredSalesAll?.length || 0) - (filteredSales?.length || 0),
  );

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Filtered sales"
          value={String(totalCount)}
          sub="Current result set"
          tone="info"
        />
        <StatTile
          label="Total amount"
          value={money(salesFilteredTotals?.totalSum ?? 0)}
          sub="Sum of filtered sales"
        />
        <StatTile
          label="Paid amount"
          value={money(salesFilteredTotals?.paidSum ?? 0)}
          sub="Recorded paid amount"
          tone="success"
        />
        <StatTile
          label="Showing now"
          value={String(visibleCount)}
          sub={canLoadMoreSales ? `More available (${remaining})` : "All loaded"}
          tone={canLoadMoreSales ? "warn" : "neutral"}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Pill tone="info">{totalCount.toLocaleString()} result(s)</Pill>
        <Pill>Total {money(salesFilteredTotals?.totalSum ?? 0)} RWF</Pill>
        <Pill tone="success">
          Paid {money(salesFilteredTotals?.paidSum ?? 0)} RWF
        </Pill>
        {salesStatusFilter && salesStatusFilter !== "ALL" ? (
          <Pill tone="warn">Filter: {salesStatusFilter}</Pill>
        ) : null}
      </div>
    </div>
  );
}

function InfoBlock({ label, children, className = "" }) {
  return (
    <div
      className={cx(
        "min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3.5",
        className,
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] app-muted">
        {label}
      </div>
      <div className="mt-1.5 min-w-0 text-sm font-bold leading-5 text-[var(--app-fg)]">
        {children}
      </div>
    </div>
  );
}

function ItemsSoldBlock({ sale }) {
  const text = buildItemsText(sale);
  const count = itemsCount(sale);

  return (
    <InfoBlock label="Items sold">
      <div className="line-clamp-2 break-words">{text || "No item details loaded"}</div>
      <div className="mt-1 text-xs font-medium app-muted">
        {count > 0 ? `${count} item(s)` : "Open proof/details to inspect"}
      </div>
    </InfoBlock>
  );
}

function SaleCard({ sale, onOpenCancel, onOpenProof }) {
  const total = Number(sale?.totalAmount ?? sale?.total ?? 0) || 0;
  const paid = Number(sale?.amountPaid ?? sale?.amount_paid ?? 0) || 0;

  const customerName =
    toStr(sale?.customerName ?? sale?.customer_name) || "Walk-in customer";
  const customerPhone = toStr(sale?.customerPhone ?? sale?.customer_phone);

  const staffName =
    toStr(sale?.sellerName ?? sale?.seller_name) ||
    toStr(sale?.cashierName ?? sale?.cashier_name) ||
    "—";

  return (
    <article className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-base font-black text-[var(--app-fg)]">
              Sale #{sale?.id ?? "—"}
            </div>
            <StatusBadge status={sale?.status} />
          </div>
          <div className="mt-1 text-xs app-muted">
            {fmt(sale?.createdAt || sale?.created_at)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:min-w-[280px]">
          <InfoBlock label="Total">
            <span className="tabular-nums">{money(total)}</span>
          </InfoBlock>
          <InfoBlock label="Paid">
            <span className="tabular-nums">{money(paid)}</span>
          </InfoBlock>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-4">
        <InfoBlock label="Customer">
          <div className="truncate">{customerName}</div>
          <div className="mt-1 text-xs font-medium app-muted">
            {customerPhone || "—"}
          </div>
        </InfoBlock>

        <div className="lg:col-span-2">
          <ItemsSoldBlock sale={sale} />
        </div>

        <InfoBlock label="Staff">
          <div className="truncate">{staffName}</div>
        </InfoBlock>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
          onClick={() => onOpenProof?.(sale?.id)}
        >
          Proof / details
        </button>
        <button
          type="button"
          className="min-h-11 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--danger-fg)] transition hover:opacity-90"
          onClick={() => onOpenCancel?.(sale?.id)}
        >
          Cancel sale
        </button>
      </div>
    </article>
  );
}

function SalesLoadingState() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5"
        >
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-4 w-56 max-w-full" />
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-4">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl lg:col-span-2" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
          <Skeleton className="mt-4 h-11 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

function SalesEmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card-2)] p-8 text-center sm:p-10">
      <div className="text-base font-black text-[var(--app-fg)] sm:text-lg">
        No sales found
      </div>
      <div className="mt-2 text-sm leading-6 app-muted">
        Try changing the filters, date range, or search words.
      </div>
    </div>
  );
}

export default function AdminSalesSection({
  salesLoading,
  loadSales,

  salesQ,
  setSalesQ,
  salesStatusFilter,
  setSalesStatusFilter,
  salesFrom,
  setSalesFrom,
  salesTo,
  setSalesTo,

  filteredSales,
  filteredSalesAll,
  salesFilteredTotals,
  canLoadMoreSales,
  setSalesPage,

  onOpenCancel,
  onOpenProof,
}) {
  return (
    <SectionCard
      title="Sales command center"
      hint="Search, filter, investigate, see items sold, and cancel sales without losing context."
      right={
        <AsyncButton
          variant="secondary"
          size="sm"
          state={salesLoading ? "loading" : "idle"}
          text="Reload"
          loadingText="Loading…"
          successText="Done"
          onClick={loadSales}
        />
      }
    >
      <div className="grid gap-4 sm:gap-5">
        <SalesToolbar
          salesQ={salesQ}
          setSalesQ={setSalesQ}
          salesStatusFilter={salesStatusFilter}
          setSalesStatusFilter={setSalesStatusFilter}
          salesFrom={salesFrom}
          setSalesFrom={setSalesFrom}
          salesTo={salesTo}
          setSalesTo={setSalesTo}
          onClear={() => {
            setSalesQ?.("");
            setSalesStatusFilter?.("ALL");
            setSalesFrom?.("");
            setSalesTo?.("");
          }}
        />

        <SalesSummary
          salesFilteredTotals={salesFilteredTotals}
          salesStatusFilter={salesStatusFilter}
          canLoadMoreSales={canLoadMoreSales}
          filteredSales={filteredSales}
          filteredSalesAll={filteredSalesAll}
        />

        {salesLoading ? (
          <SalesLoadingState />
        ) : !Array.isArray(filteredSales) || filteredSales.length === 0 ? (
          <SalesEmptyState />
        ) : (
          <>
            <div className="grid gap-3">
              {filteredSales.map((sale) => (
                <SaleCard
                  key={String(sale?.id)}
                  sale={sale}
                  onOpenCancel={onOpenCancel}
                  onOpenProof={onOpenProof}
                />
              ))}
            </div>

            {canLoadMoreSales ? (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => setSalesPage?.((p) => Number(p || 1) + 1)}
                  className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-3 text-sm font-semibold text-[var(--app-fg)] shadow-sm transition hover:bg-[var(--hover)]"
                >
                  Load more (+{PAGE_SIZE})
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </SectionCard>
  );
}