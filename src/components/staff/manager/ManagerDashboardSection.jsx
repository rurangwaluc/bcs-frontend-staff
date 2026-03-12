"use client";

import {
  EmptyState,
  RefreshButton,
  SectionCard,
  StatCard,
  SurfaceRow,
  TinyPill,
} from "./manager-ui";

function fallbackMoney(n) {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return "0";
  return Math.round(x).toLocaleString();
}

function fallbackFmt(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

function fallbackFirstItemLabel(sale) {
  const items = Array.isArray(sale?.items) ? sale.items : [];
  if (!items.length) return { name: "—", qty: 0 };

  const first = items[0];
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

function fallbackProductLabel(item) {
  return (
    item?.productName ||
    item?.product_name ||
    item?.name ||
    (item?.productId ? `Product #${item.productId}` : "Product")
  );
}

function statusTone(status) {
  const s = String(status || "").toUpperCase();
  if (
    s === "COMPLETED" ||
    s === "PAID" ||
    s === "APPROVED" ||
    s === "FULFILLED"
  ) {
    return "success";
  }
  if (s.includes("AWAIT") || s === "PENDING" || s === "OPEN") return "warn";
  if (s === "CANCELLED" || s === "DECLINED" || s === "VOID") return "danger";
  return "neutral";
}

function MixCard({ label, count, total }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-3 text-3xl font-black tracking-[-0.03em] text-[var(--app-fg)]">
        {count}
      </div>
      <div className="mt-2 text-sm text-[var(--muted)]">
        Total: <b className="text-[var(--app-fg)]">{total}</b> RWF
      </div>
    </div>
  );
}

function LowStockCard({ item, productLabel }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="text-sm font-black text-[var(--app-fg)]">
        {productLabel(item)}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <TinyPill tone="warn">Low stock</TinyPill>
        <span className="text-sm text-[var(--muted)]">
          Qty:{" "}
          <b className="text-[var(--app-fg)]">
            {Number(item?.qtyOnHand ?? item?.qty_on_hand ?? 0)}
          </b>
        </span>
      </div>
    </div>
  );
}

function StuckSaleCard({ sale, money, fmt, topItemLabel }) {
  const total = money(sale?.totalAmount ?? sale?.total ?? 0);
  const top = topItemLabel(sale);

  return (
    <div className="rounded-[26px] border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-black text-[var(--app-fg)]">
              Sale #{sale?.id ?? "—"}
            </div>
            <TinyPill tone={statusTone(sale?.status)}>
              {String(sale?.status ?? "—")}
            </TinyPill>
          </div>
          <div className="mt-2 text-xs text-[var(--muted)]">
            Created: {fmt(sale?.createdAt || sale?.created_at)}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
            Total
          </div>
          <div className="mt-1 text-2xl font-black tracking-[-0.03em] text-[var(--app-fg)]">
            {total}
          </div>
          <div className="text-[11px] text-[var(--muted)]">RWF</div>
        </div>
      </div>

      <div className="mt-4 rounded-[20px] border border-[var(--border)] bg-[var(--card-2)] p-4">
        <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
          Top item
        </div>
        <div className="mt-2 text-sm font-bold text-[var(--app-fg)]">
          {top.name}
        </div>
        <div className="mt-1 text-xs text-[var(--muted)]">
          Qty: <b className="text-[var(--app-fg)]">{top.qty || 0}</b>
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({ title, hint, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-4 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--hover)]"
    >
      <div className="text-sm font-black text-[var(--app-fg)]">{title}</div>
      <div className="mt-1 text-sm text-[var(--muted)]">{hint}</div>
    </button>
  );
}

export default function ManagerDashboardSection(props) {
  const {
    dash,
    dashLoading,
    dashTodayTotal,
    dashLowStockCount,
    dashStuckSalesCount,
    unpricedCount,
    pricingGapCount,
    refreshLoading,
    onRefresh,
    onGoToSection,
    setSection,
    breakdownTodayTotals,
    money,
    fmt,
    productLabel,
    topItemLabel,
  } = props;

  const formatMoney = typeof money === "function" ? money : fallbackMoney;
  const formatDate = typeof fmt === "function" ? fmt : fallbackFmt;
  const getProductLabel =
    typeof productLabel === "function" ? productLabel : fallbackProductLabel;
  const getTopItemLabel =
    typeof topItemLabel === "function" ? topItemLabel : fallbackFirstItemLabel;

  const goToSection =
    typeof onGoToSection === "function"
      ? onGoToSection
      : typeof setSection === "function"
        ? setSection
        : () => {};

  const pricingCount = Number(unpricedCount ?? pricingGapCount ?? 0) || 0;

  const stuck = Array.isArray(dash?.sales?.stuck) ? dash.sales.stuck : [];
  const lowStock = Array.isArray(dash?.inventory?.lowStock)
    ? dash.inventory.lowStock
    : [];

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Money today"
          value={dashLoading ? "…" : formatMoney(dashTodayTotal)}
          sub="All methods"
          tone="info"
        />
        <StatCard
          label="Low stock"
          value={dashLoading ? "…" : String(dashLowStockCount ?? 0)}
          sub="Need restock"
          tone={Number(dashLowStockCount || 0) > 0 ? "warn" : "success"}
        />
        <StatCard
          label="Stuck sales"
          value={dashLoading ? "…" : String(dashStuckSalesCount ?? 0)}
          sub="Need action"
          tone={Number(dashStuckSalesCount || 0) > 0 ? "warn" : "success"}
        />
        <StatCard
          label="Pricing gaps"
          value={dashLoading ? "…" : String(pricingCount)}
          sub="Products missing selling price"
          tone={pricingCount > 0 ? "warn" : "success"}
        />
      </div>

      {!dashLoading && !dash ? (
        <EmptyState
          title="No dashboard data"
          hint="The dashboard endpoint returned no usable data."
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard
          title="Today payment mix"
          hint="How money came in today."
          right={<RefreshButton loading={refreshLoading} onClick={onRefresh} />}
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <MixCard
              label="Cash"
              count={breakdownTodayTotals?.CASH?.count ?? 0}
              total={formatMoney(breakdownTodayTotals?.CASH?.total ?? 0)}
            />
            <MixCard
              label="Momo"
              count={breakdownTodayTotals?.MOMO?.count ?? 0}
              total={formatMoney(breakdownTodayTotals?.MOMO?.total ?? 0)}
            />
            <MixCard
              label="Bank"
              count={breakdownTodayTotals?.BANK?.count ?? 0}
              total={formatMoney(breakdownTodayTotals?.BANK?.total ?? 0)}
            />
            <MixCard
              label="Card"
              count={breakdownTodayTotals?.CARD?.count ?? 0}
              total={formatMoney(breakdownTodayTotals?.CARD?.total ?? 0)}
            />
            <MixCard
              label="Other"
              count={breakdownTodayTotals?.OTHER?.count ?? 0}
              total={formatMoney(breakdownTodayTotals?.OTHER?.total ?? 0)}
            />
          </div>

          <SurfaceRow className="mt-4">
            <div className="text-sm text-[var(--muted)]">
              Today total:{" "}
              <b className="text-[var(--app-fg)]">
                {formatMoney(dashTodayTotal)}
              </b>{" "}
              RWF
            </div>
          </SurfaceRow>
        </SectionCard>

        <SectionCard
          title="Low stock"
          hint={`Items with quantity at or below ${dash?.inventory?.lowStockThreshold ?? 5}.`}
        >
          {lowStock.length === 0 ? (
            <EmptyState
              title="No low stock alerts"
              hint="Everything currently looks healthy."
            />
          ) : (
            <div className="grid gap-3">
              {lowStock.map((item, idx) => (
                <LowStockCard
                  key={item?.productId ?? idx}
                  item={item}
                  productLabel={getProductLabel}
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Stuck sales"
        hint={
          dash?.sales?.stuckRule || "Not completed and older than 30 minutes"
        }
      >
        {stuck.length === 0 ? (
          <EmptyState
            title="No stuck sales"
            hint="There are no delayed or blocked sales right now."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {stuck.map((sale, idx) => (
              <StuckSaleCard
                key={sale?.id ?? idx}
                sale={sale}
                money={formatMoney}
                fmt={formatDate}
                topItemLabel={getTopItemLabel}
              />
            ))}
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <QuickActionCard
            title="Inventory requests"
            hint="Approve or decline stock adjustments."
            onClick={() => goToSection("inv_requests")}
          />
          <QuickActionCard
            title="Pricing"
            hint="Fix missing product selling prices."
            onClick={() => goToSection("pricing")}
          />
          <QuickActionCard
            title="Stock arrivals"
            hint="Review incoming stock activity."
            onClick={() => goToSection("arrivals")}
          />
          <QuickActionCard
            title="Suppliers"
            hint="Review supplier balances and bills."
            onClick={() => goToSection("suppliers")}
          />
        </div>
      </SectionCard>
    </div>
  );
}
