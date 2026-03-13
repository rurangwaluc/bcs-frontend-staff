"use client";

import AsyncButton from "../../../components/AsyncButton";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function safeDate(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

function qtyText(v) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.round(n).toLocaleString() : "0";
}

function inputBase(className = "") {
  return cx(
    "app-focus w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-3 text-sm text-[var(--app-fg)] outline-none transition",
    "placeholder:text-[var(--muted)]",
    "hover:border-[var(--border-strong)]",
    className,
  );
}

function Input({ className = "", ...props }) {
  return <input {...props} className={inputBase(className)} />;
}

function Skeleton({ className = "" }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70",
        className,
      )}
    />
  );
}

function SectionShell({ title, hint, right, children, className = "" }) {
  return (
    <section
      className={cx(
        "overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
        <div className="min-w-0">
          <div className="text-base font-black text-[var(--app-fg)]">
            {title}
          </div>
          {hint ? <div className="mt-1 text-sm app-muted">{hint}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function InfoPill({ children, tone = "default" }) {
  const toneCls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
        : tone === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
          : tone === "info"
            ? "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]"
            : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em]",
        toneCls,
      )}
    >
      {children}
    </span>
  );
}

function StatusBadge({ status }) {
  const raw = String(status || "").toUpperCase();

  const label =
    raw === "DRAFT"
      ? "To release"
      : raw === "FULFILLED"
        ? "Released"
        : raw === "PENDING"
          ? "Credit"
          : raw === "COMPLETED"
            ? "Paid"
            : raw === "AWAITING_PAYMENT_RECORD"
              ? "Waiting cashier"
              : raw || "—";

  const toneCls =
    raw === "DRAFT"
      ? "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]"
      : raw === "FULFILLED"
        ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
        : raw === "PENDING"
          ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
          : raw === "COMPLETED"
            ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
            : raw === "CANCELLED"
              ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
              : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em]",
        toneCls,
      )}
    >
      {label}
    </span>
  );
}

function TabButton({ active, label, badge, badgeTone = "default", onClick }) {
  const badgeCls =
    badgeTone === "danger"
      ? "bg-[var(--danger-fg)] text-white border-[var(--danger-fg)]"
      : active
        ? "bg-white/15 text-white border-white/15"
        : "bg-[var(--card)] text-[var(--app-fg)] border-[var(--border)]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "app-focus inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-extrabold transition",
        active
          ? "border-[var(--app-fg)] bg-[var(--app-fg)] text-[var(--app-bg)]"
          : "border-[var(--border)] bg-[var(--card)] text-[var(--app-fg)] hover:bg-[var(--hover)]",
      )}
    >
      <span>{label}</span>
      <span
        className={cx(
          "inline-flex min-w-[24px] items-center justify-center rounded-full border px-2 py-0.5 text-[11px] font-extrabold",
          badgeCls,
        )}
      >
        {Number(badge || 0)}
      </span>
    </button>
  );
}

function StatCard({ label, value, sub, tone = "default" }) {
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
    <div className={cx("rounded-2xl border p-3", toneCls)}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
        {label}
      </div>
      <div className="mt-1 text-lg font-black text-[var(--app-fg)]">
        {value}
      </div>
      {sub ? <div className="mt-1 text-xs app-muted">{sub}</div> : null}
    </div>
  );
}

function SaleCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-7 w-40 rounded-2xl" />
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        </div>
        <Skeleton className="h-11 w-28 rounded-2xl" />
      </div>
      <div className="mt-4">
        <Skeleton className="h-24 w-full rounded-3xl" />
      </div>
      <div className="mt-4 border-t border-[var(--border)] pt-4">
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    </div>
  );
}

function ReleaseButton({ state, disabled, onClick }) {
  const s = state || "idle";
  const label =
    s === "loading" ? "Releasing…" : s === "success" ? "Released" : "Release";

  const cls =
    s === "success"
      ? "bg-emerald-600 text-white hover:bg-emerald-700"
      : s === "loading"
        ? "bg-amber-600 text-white"
        : "bg-[var(--app-fg)] text-[var(--app-bg)] hover:opacity-90";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || s === "loading" || s === "success"}
      className={cx(
        "app-focus rounded-2xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
        cls,
      )}
    >
      {label}
    </button>
  );
}

function ActionButton({ children, onClick, tone = "default" }) {
  const toneCls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)] hover:opacity-90"
      : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)] hover:bg-[var(--hover)]";

  return (
    <button
      type="button"
      className={cx(
        "app-focus rounded-2xl border px-4 py-2.5 text-sm font-semibold transition",
        toneCls,
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function SaleCard({
  sale,
  releaseState,
  onRelease,
  onOpenSale,
  onOpenDeliveryNote,
}) {
  const status = String(sale?.status || "").toUpperCase();
  const canRelease = status === "DRAFT";
  const canShowDeliveryNote =
    status === "DRAFT" ||
    status === "FULFILLED" ||
    status === "PENDING" ||
    status === "AWAITING_PAYMENT_RECORD" ||
    status === "COMPLETED";

  const customerName = toStr(sale?.customerName) || "Walk-in";
  const customerPhone = toStr(sale?.customerPhone);
  const customerLabel = [customerName, customerPhone]
    .filter(Boolean)
    .join(" • ");

  const sellerLabel =
    toStr(sale?.sellerName) ||
    toStr(sale?.sellerEmail) ||
    `Staff #${toStr(sale?.sellerId ?? sale?.seller_id) || "—"}`;

  const createdAt = sale?.createdAt || sale?.created_at;
  const itemsPreview = Array.isArray(sale?.itemsPreview)
    ? sale.itemsPreview
    : [];
  const totalItems = Array.isArray(sale?.items)
    ? sale.items.reduce((sum, it) => sum + (Number(it?.qty ?? 0) || 0), 0)
    : Array.isArray(itemsPreview)
      ? itemsPreview.reduce((sum, it) => sum + (Number(it?.qty ?? 0) || 0), 0)
      : 0;

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-lg font-black text-[var(--app-fg)] sm:text-xl">
                Sale #{sale?.id ?? "—"}
              </div>
              <StatusBadge status={status} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Customer" value={customerLabel || "—"} />
              <StatCard label="Seller" value={sellerLabel || "—"} />
              <StatCard label="Created" value={safeDate(createdAt)} />
              <StatCard label="Items qty" value={qtyText(totalItems)} />
            </div>

            {itemsPreview.length > 0 ? (
              <div className="mt-4 rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4">
                <div className="text-xs font-black uppercase tracking-[0.08em] app-muted">
                  Items preview
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {itemsPreview.slice(0, 4).map((it, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--app-fg)]"
                    >
                      <b>{toStr(it?.productName) || "Item"}</b> ×{" "}
                      {qtyText(it?.qty ?? 0)}
                    </div>
                  ))}

                  {itemsPreview.length > 4 ? (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm app-muted">
                      +{itemsPreview.length - 4} more
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <ActionButton onClick={() => onOpenSale?.(sale?.id)}>
              View items
            </ActionButton>

            {canShowDeliveryNote ? (
              <ActionButton
                tone="success"
                onClick={() => onOpenDeliveryNote?.(sale?.id)}
              >
                Delivery note
              </ActionButton>
            ) : null}
          </div>
        </div>

        <div className="mt-4 border-t border-[var(--border)] pt-4">
          {canRelease ? (
            <div className="rounded-3xl border border-[var(--info-border)] bg-[var(--info-bg)] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-black text-[var(--app-fg)]">
                    Ready for release
                  </div>
                  <div className="mt-1 text-sm app-muted">
                    Confirm stock is available, then release this sale so seller
                    can continue the workflow.
                  </div>
                </div>

                <ReleaseButton
                  state={releaseState}
                  disabled={!canRelease}
                  onClick={() => onRelease?.(sale?.id)}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-3 text-sm app-muted">
              {status === "FULFILLED"
                ? "This sale has already been released from stock."
                : status === "PENDING"
                  ? "This sale is already on customer credit."
                  : status === "COMPLETED"
                    ? "This sale is fully completed."
                    : status === "AWAITING_PAYMENT_RECORD"
                      ? "Released already. Waiting for cashier payment record."
                      : "No release action is needed for this sale."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StoreKeeperSalesSection({
  salesLoading,
  loadSales,
  salesQ,
  setSalesQ,
  salesTab,
  setSalesTab,
  draftSalesCount,
  releasedCount,
  lastTenCount,
  filteredSalesLastTen,
  releaseBtnState,
  releaseStock,
  openSaleDetails,
  openDeliveryNote,
}) {
  return (
    <SectionShell
      title="Release stock"
      hint="Only draft sales can be released. Releasing removes stock and moves the sale forward."
      right={
        <AsyncButton
          variant="secondary"
          size="sm"
          state={salesLoading ? "loading" : "idle"}
          text="Refresh"
          loadingText="Refreshing…"
          successText="Done"
          onClick={loadSales}
        />
      }
    >
      <div className="grid gap-4">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-3 sm:p-4">
          <div className="flex flex-wrap gap-2">
            <TabButton
              active={salesTab === "TO_RELEASE"}
              label="To release"
              badge={draftSalesCount}
              badgeTone={draftSalesCount > 0 ? "danger" : "default"}
              onClick={() => setSalesTab?.("TO_RELEASE")}
            />
            <TabButton
              active={salesTab === "RELEASED"}
              label="Released"
              badge={releasedCount}
              onClick={() => setSalesTab?.("RELEASED")}
            />
            <TabButton
              active={salesTab === "ALL"}
              label="All"
              badge={lastTenCount}
              onClick={() => setSalesTab?.("ALL")}
            />
          </div>

          <div className="mt-3">
            <Input
              placeholder="Search by customer, phone, sale id, seller…"
              value={salesQ}
              onChange={(e) => setSalesQ?.(e.target.value)}
            />
          </div>

          <div className="mt-3 text-xs app-muted">
            Showing latest <b>10</b> results, most recent first.
          </div>
        </div>

        {salesLoading ? (
          <div className="grid gap-4">
            <SaleCardSkeleton />
            <SaleCardSkeleton />
            <SaleCardSkeleton />
          </div>
        ) : !Array.isArray(filteredSalesLastTen) ||
          filteredSalesLastTen.length === 0 ? (
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-6 text-sm app-muted">
            No sales found.
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredSalesLastTen.map((sale) => (
              <SaleCard
                key={String(sale?.id)}
                sale={sale}
                releaseState={releaseBtnState?.[sale?.id] || "idle"}
                onRelease={releaseStock}
                onOpenSale={openSaleDetails}
                onOpenDeliveryNote={openDeliveryNote}
              />
            ))}
          </div>
        )}
      </div>
    </SectionShell>
  );
}
