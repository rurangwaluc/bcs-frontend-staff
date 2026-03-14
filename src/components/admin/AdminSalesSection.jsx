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
    <div
      className={cx(
        "rounded-3xl border p-4 sm:p-5 transition",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        toneCls,
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] app-muted sm:text-[11px]">
        {label}
      </div>
      <div className="mt-1.5 text-lg font-black leading-tight text-[var(--app-fg)] sm:text-2xl">
        {value}
      </div>
      {sub ? (
        <div className="mt-1.5 text-xs leading-5 app-muted sm:text-sm">
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function SalesToolbar({
  salesQ,
  setSalesQ,
  salesStatusFilter,
  setSalesStatusFilter,
  salesFrom,
  setSalesFrom,
  salesTo,
  setSalesTo,
  onClear,
}) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-black text-[var(--app-fg)]">
            Sales filters
          </div>
          <div className="text-xs app-muted sm:text-sm">
            Narrow the list fast without losing context.
          </div>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="app-focus inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
        >
          Clear filters
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            Search
          </div>
          <Input
            placeholder="Customer, phone, sale id, seller, cashier, status…"
            value={salesQ}
            onChange={(e) => setSalesQ?.(e.target.value)}
          />
        </div>

        <div className="xl:col-span-3">
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

        <div className="xl:col-span-2">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            From
          </div>
          <Input
            type="date"
            value={salesFrom}
            onChange={(e) => setSalesFrom?.(e.target.value)}
          />
        </div>

        <div className="xl:col-span-2">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            To
          </div>
          <Input
            type="date"
            value={salesTo}
            onChange={(e) => setSalesTo?.(e.target.value)}
          />
        </div>

        <div className="xl:col-span-1 flex items-end">
          <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-center text-xs font-semibold app-muted">
            Live
          </div>
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
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
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
          sub={
            canLoadMoreSales ? `More available (${remaining})` : "All loaded"
          }
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

function DesktopSalesTable({ rows, onOpenCancel, onOpenProof }) {
  return (
    <div className="hidden xl:block">
      <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-[104px_178px_132px_132px_minmax(220px,1.25fr)_130px_168px] gap-0 border-b border-[var(--border)] bg-[var(--card-2)] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
          <div className="pr-5">Sale</div>
          <div className="px-4">Status</div>
          <div className="px-3 text-right">Total</div>
          <div className="border-l border-[var(--border)] px-3 text-right">
            Paid
          </div>
          <div className="border-l border-[var(--border)] px-4">Customer</div>
          <div className="border-l border-[var(--border)] px-3">Staff</div>
          <div className="border-l border-[var(--border)] pl-3 text-right">
            Actions
          </div>
        </div>

        <div className="grid">
          {rows.map((s) => {
            const total = Number(s?.totalAmount ?? s?.total ?? 0) || 0;
            const paid = Number(s?.amountPaid ?? s?.amount_paid ?? 0) || 0;

            const customerName =
              toStr(s?.customerName ?? s?.customer_name) || "Walk-in customer";
            const customerPhone = toStr(s?.customerPhone ?? s?.customer_phone);

            const staffName =
              toStr(s?.sellerName ?? s?.seller_name) ||
              toStr(s?.cashierName ?? s?.cashier_name) ||
              "—";

            return (
              <div
                key={String(s?.id)}
                className="grid grid-cols-[104px_178px_132px_132px_minmax(220px,1.25fr)_130px_168px] gap-0 border-b border-[var(--border)] px-5 py-4 text-sm last:border-b-0 hover:bg-[var(--hover)]"
              >
                <div className="pr-5 font-black text-[var(--app-fg)]">
                  #{s?.id ?? "—"}
                </div>

                <div className="min-w-0 px-4">
                  <StatusBadge status={s?.status} />
                </div>

                <div className="px-3 text-right font-black text-[var(--app-fg)] tabular-nums">
                  {money(total)}
                </div>

                <div className="border-l border-[var(--border)] px-3 text-right font-medium tabular-nums app-muted">
                  {money(paid)}
                </div>

                <div className="min-w-0 border-l border-[var(--border)] px-4">
                  <div className="truncate font-semibold text-[var(--app-fg)]">
                    {customerName}
                  </div>
                  <div className="mt-0.5 truncate text-xs app-muted">
                    {customerPhone || "—"}
                  </div>
                </div>

                <div className="truncate border-l border-[var(--border)] px-3 text-sm app-muted">
                  {staffName}
                </div>

                <div className="flex items-center justify-end gap-2 border-l border-[var(--border)] pl-3">
                  <button
                    type="button"
                    className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-semibold text-[var(--app-fg)] hover:bg-[var(--hover)]"
                    onClick={() => onOpenProof?.(s?.id)}
                  >
                    Proof
                  </button>
                  <button
                    type="button"
                    className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-xs font-semibold text-[var(--danger-fg)] hover:opacity-90"
                    onClick={() => onOpenCancel?.(s?.id)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MobileSalesCards({ rows, onOpenCancel, onOpenProof }) {
  return (
    <div className="grid gap-3 xl:hidden">
      {rows.map((s) => {
        const total = Number(s?.totalAmount ?? s?.total ?? 0) || 0;
        const paid = Number(s?.amountPaid ?? s?.amount_paid ?? 0) || 0;

        const customerName =
          toStr(s?.customerName ?? s?.customer_name) || "Walk-in customer";
        const customerPhone = toStr(s?.customerPhone ?? s?.customer_phone);

        const staffName =
          toStr(s?.sellerName ?? s?.seller_name) ||
          toStr(s?.cashierName ?? s?.cashier_name) ||
          "—";

        return (
          <div
            key={String(s?.id)}
            className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-black text-[var(--app-fg)] sm:text-base">
                    Sale #{s?.id ?? "—"}
                  </div>
                  <StatusBadge status={s?.status} />
                </div>

                <div className="mt-1 text-xs app-muted">
                  {fmt(s?.createdAt || s?.created_at)}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
                  Total
                </div>
                <div className="text-lg font-black leading-tight text-[var(--app-fg)] sm:text-xl">
                  {money(total)}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] app-muted">
                  Customer
                </div>
                <div className="mt-1.5 text-sm font-bold text-[var(--app-fg)]">
                  {customerName}
                </div>
                <div className="mt-1 text-xs app-muted">
                  {customerPhone || "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] app-muted">
                  Payment
                </div>
                <div className="mt-1.5 text-sm font-bold text-[var(--app-fg)]">
                  Paid {money(paid)}
                </div>
                <div className="mt-1 text-xs app-muted">Staff: {staffName}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] hover:bg-[var(--hover)]"
                onClick={() => onOpenProof?.(s?.id)}
              >
                Proof
              </button>
              <button
                type="button"
                className="min-h-11 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--danger-fg)] hover:opacity-90"
                onClick={() => onOpenCancel?.(s?.id)}
              >
                Cancel
              </button>
            </div>
          </div>
        );
      })}
    </div>
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
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Skeleton className="h-20 w-full rounded-2xl" />
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
      hint="Search, filter, investigate, and cancel sales without losing context."
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
            <DesktopSalesTable
              rows={filteredSales}
              onOpenCancel={onOpenCancel}
              onOpenProof={onOpenProof}
            />

            <MobileSalesCards
              rows={filteredSales}
              onOpenCancel={onOpenCancel}
              onOpenProof={onOpenProof}
            />

            {canLoadMoreSales ? (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => setSalesPage?.((p) => Number(p || 1) + 1)}
                  className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-3 text-sm font-semibold text-[var(--app-fg)] shadow-sm hover:bg-[var(--hover)]"
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
