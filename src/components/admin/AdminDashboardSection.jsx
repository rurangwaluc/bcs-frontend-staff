"use client";

import Last10PaymentsWidget from "../Last10PaymentsWidget";
import LowStockWidget from "../LowStockWidget";
import StuckSalesWidget from "../StuckSalesWidget";
import TodayMixWidget from "../TodayMixWidget";

function Card({ label, value, sub }) {
  return (
    <div className="rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
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
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          label="Sales today"
          value={
            dashLoading
              ? "…"
              : String(salesTodayTotal).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
          }
          sub={dashLoading ? "…" : `${salesToday.length} sale(s)`}
        />
        <Card
          label="Awaiting payment"
          value={dashLoading ? "…" : String(awaitingPaymentCount)}
          sub="Needs cashier action"
        />
        <Card
          label="Pricing gaps"
          value={dashLoading ? "…" : String(unpricedCount)}
          sub="Unpriced products"
        />
        <Card
          label="Inventory requests"
          value={dashLoading ? "…" : String(invReqPendingCount)}
          sub="Pending approvals"
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
