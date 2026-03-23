"use client";

import Last10PaymentsWidget from "../Last10PaymentsWidget";
import LowStockWidget from "../LowStockWidget";
import StuckSalesWidget from "../StuckSalesWidget";
import TodayMixWidget from "../TodayMixWidget";

function Card({ label, value, sub, tone = "neutral" }) {
  const toneCls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)]"
        : tone === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)]"
          : tone === "info"
            ? "border-[var(--info-border)] bg-[var(--info-bg)]"
            : "border-[var(--border)] bg-[var(--card)]";

  return (
    <div className={`rounded-[28px] border p-5 shadow-sm ${toneCls}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black text-[var(--app-fg)]">
        {value}
      </div>
      {sub ? <div className="mt-1 text-sm app-muted">{sub}</div> : null}
    </div>
  );
}

function SectionCard({ title, hint, children }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <div className="text-base font-black text-[var(--app-fg)]">{title}</div>
        {hint ? <div className="mt-1 text-sm app-muted">{hint}</div> : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="h-64 animate-pulse rounded-[28px] bg-slate-200/70 dark:bg-slate-800/70" />
  );
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(v) {
  return safeNumber(v).toLocaleString();
}

export default function AdminDashboardSection({
  dash,
  dashLoading,
  salesTodayTotal,
  salesToday,
  awaitingPaymentCount,
  unpricedCount,
  invReqPendingCount,
  products,
  router,
  setSection,
}) {
  const inventoryValue = safeNumber(dash?.inventory?.inventoryValue);
  const inventoryProductsCount = safeNumber(dash?.inventory?.productsCount);
  const inventoryQtyOnHand = safeNumber(dash?.inventory?.totalQtyOnHand);
  const lowStockCount = safeNumber(dash?.inventory?.lowStockCount);
  const outOfStockCount = safeNumber(dash?.inventory?.outOfStockCount);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card
          label="Sales today"
          value={
            dashLoading ? (
              "…"
            ) : (
              <span className="text-[19px] font-semibold tracking-tight">
                {formatMoney(salesTodayTotal)} RWF
              </span>
            )
          }
          sub={dashLoading ? "…" : `${salesToday.length} sale(s)`}
          tone="info"
        />

        <Card
          label="Awaiting payment"
          value={
            dashLoading ? (
              "…"
            ) : (
              <span className="text-[19px] font-semibold tracking-tight">
                {awaitingPaymentCount.toLocaleString()}
              </span>
            )
          }
          sub="Needs cashier action"
          tone="warn"
        />

        <Card
          label="Inventory value"
          value={
            dashLoading ? (
              "…"
            ) : (
              <span className="text-[19px] font-semibold tracking-tight">
                {formatMoney(inventoryValue)} RWF
              </span>
            )
          }
          sub={
            dashLoading
              ? "…"
              : `${inventoryProductsCount} products • ${formatMoney(inventoryQtyOnHand)} units`
          }
          tone="success"
        />

        <Card
          label="Low / out stock"
          value={
            dashLoading ? (
              "…"
            ) : (
              <span className="text-[19px] font-semibold tracking-tight">
                {lowStockCount.toLocaleString()} /{" "}
                {outOfStockCount.toLocaleString()}
              </span>
            )
          }
          sub="Low stock / out of stock"
          tone={
            outOfStockCount > 0
              ? "danger"
              : lowStockCount > 0
                ? "warn"
                : "success"
          }
        />

        <Card
          label="Pricing gaps"
          value={
            dashLoading ? (
              "…"
            ) : (
              <span className="text-[19px] font-semibold tracking-tight">
                {unpricedCount.toLocaleString()}
              </span>
            )
          }
          sub={`Inventory requests: ${
            dashLoading ? "…" : invReqPendingCount.toLocaleString()
          }`}
          tone={unpricedCount > 0 ? "warn" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="Today payment mix" hint="How money came in today.">
          {dashLoading ? (
            <SkeletonCard />
          ) : (
            <TodayMixWidget breakdown={dash?.payments?.breakdownToday || []} />
          )}
        </SectionCard>

        <SectionCard title="Low stock" hint="Items that need restock.">
          {dashLoading ? (
            <SkeletonCard />
          ) : (
            <LowStockWidget
              lowStock={dash?.inventory?.lowStock || []}
              threshold={dash?.inventory?.lowStockThreshold ?? 5}
              products={products}
            />
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="Stuck sales" hint="Sales that need attention.">
          {dashLoading ? (
            <SkeletonCard />
          ) : (
            <StuckSalesWidget
              stuck={dash?.sales?.stuck || []}
              rule={dash?.sales?.stuckRule}
            />
          )}
        </SectionCard>

        <SectionCard title="Last 10 payments" hint="Most recent payments.">
          {dashLoading ? (
            <SkeletonCard />
          ) : (
            <Last10PaymentsWidget rows={dash?.payments?.last10 || []} />
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Admin coverage"
        hint="Quick shortcuts for covering other operational roles."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Seller", href: "/seller" },
            { label: "Cashier", href: "/cashier" },
            { label: "Store keeper", href: "/store-keeper" },
            { label: "Manager", href: "/manager" },
            { label: "Customers", href: "/customers" },
          ].map((x) => (
            <button
              key={x.href}
              type="button"
              onClick={() => router.push(x.href)}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4 text-left transition hover:bg-[var(--hover)]"
            >
              <div className="text-sm font-extrabold text-[var(--app-fg)]">
                {x.label}
              </div>
              <div className="mt-1 text-xs app-muted">Open {x.label}</div>
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Sales", key: "sales" },
            { label: "Payments", key: "payments" },
            { label: "Inventory", key: "inventory" },
            { label: "Reports", key: "reports" },
          ].map((x) => (
            <button
              key={x.key}
              type="button"
              onClick={() => setSection(x.key)}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-left transition hover:bg-[var(--hover)]"
            >
              <div className="text-sm font-extrabold text-[var(--app-fg)]">
                {x.label}
              </div>
              <div className="mt-1 text-xs app-muted">Open section</div>
            </button>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
