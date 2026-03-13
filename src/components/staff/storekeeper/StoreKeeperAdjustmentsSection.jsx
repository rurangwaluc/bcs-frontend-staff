"use client";

import AsyncButton from "../../../components/AsyncButton";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
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

function Select({ className = "", ...props }) {
  return <select {...props} className={inputBase(className)} />;
}

function TextArea({ className = "", ...props }) {
  return <textarea {...props} className={inputBase(className)} />;
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

function StatCard({ label, value, sub, tone = "default" }) {
  const toneCls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)]"
        : tone === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)]"
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

function InfoPill({ children, tone = "default" }) {
  const toneCls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
        : tone === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
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

function RequestStatusBadge({ status }) {
  const st = String(status || "").toUpperCase();

  const toneCls =
    st === "PENDING"
      ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
      : st === "APPROVED"
        ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
        : st === "REJECTED"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
          : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em]",
        toneCls,
      )}
    >
      {st || "—"}
    </span>
  );
}

function ProductQuickCard({
  product,
  selected,
  onSelect,
  currentQty,
  adjDirection,
  adjQtyAbs,
}) {
  const displayName =
    toStr(product?.displayName) ||
    [
      toStr(product?.name),
      toStr(product?.brand),
      toStr(product?.model),
      toStr(product?.size),
      toStr(product?.color),
    ]
      .filter(Boolean)
      .join(" ") ||
    "Unnamed product";

  const sku = toStr(product?.sku);
  const category =
    toStr(product?.category) || toStr(product?.subcategory) || "Hardware";

  const qty = toNum(currentQty, 0);

  const effectiveAbsQty = selected ? toNum(adjQtyAbs, 0) : 0;
  const signed = adjDirection === "REMOVE" ? -effectiveAbsQty : effectiveAbsQty;
  const projected = qty + signed;

  const unit = toStr(product?.stockUnit || product?.unit || "pcs");

  return (
    <button
      type="button"
      onClick={() => onSelect?.(String(product?.id ?? ""))}
      className={cx(
        "app-focus w-full rounded-3xl border p-4 text-left transition",
        selected
          ? "border-[var(--app-fg)] bg-[var(--card)] shadow-sm"
          : "border-[var(--border)] bg-[var(--card-2)] hover:bg-[var(--hover)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-[var(--app-fg)] sm:text-base">
            {displayName}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <InfoPill>#{product?.id ?? "—"}</InfoPill>
            {sku ? <InfoPill>SKU: {sku}</InfoPill> : null}
            <InfoPill>{category}</InfoPill>
          </div>
        </div>

        {selected ? <InfoPill tone="success">Selected</InfoPill> : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-3">
        <StatCard label="Current" value={qtyText(qty)} sub={unit} />

        <StatCard
          label="Requested"
          value={
            effectiveAbsQty > 0
              ? signed > 0
                ? `+${qtyText(effectiveAbsQty)}`
                : `-${qtyText(effectiveAbsQty)}`
              : "0"
          }
          sub={unit}
          tone={
            effectiveAbsQty > 0 ? (signed > 0 ? "success" : "warn") : "default"
          }
        />

        <StatCard
          label="After approval"
          value={projected < 0 ? "Below zero" : qtyText(projected)}
          sub={unit}
          tone={
            projected < 0
              ? "danger"
              : effectiveAbsQty > 0
                ? signed > 0
                  ? "success"
                  : "warn"
                : "default"
          }
        />
      </div>
    </button>
  );
}

function RequestCard({ request }) {
  const qty = Number(request?.qtyChange ?? request?.qty_change ?? 0) || 0;
  const directionTone = qty > 0 ? "success" : qty < 0 ? "warn" : "default";
  const productLabel =
    toStr(request?.productDisplayName) ||
    toStr(request?.productName) ||
    "Unknown product";

  const reason =
    toStr(request?.reason) ||
    toStr(request?.note) ||
    toStr(request?.description) ||
    "—";

  const approver =
    toStr(request?.approvedByName) ||
    toStr(request?.decidedByName) ||
    toStr(request?.managerName) ||
    "";

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-black text-[var(--app-fg)] sm:text-base">
              {productLabel}
            </div>
            <RequestStatusBadge status={request?.status} />
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <InfoPill>Request #{request?.id ?? "—"}</InfoPill>
            {request?.productId ? (
              <InfoPill>Product #{request.productId}</InfoPill>
            ) : null}
            {toStr(request?.sku) ? (
              <InfoPill>SKU: {request.sku}</InfoPill>
            ) : null}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            Qty change
          </div>
          <div
            className={cx(
              "mt-1 text-lg font-black",
              directionTone === "success"
                ? "text-[var(--success-fg)]"
                : directionTone === "warn"
                  ? "text-[var(--warn-fg)]"
                  : "text-[var(--app-fg)]",
            )}
          >
            {qty > 0 ? `+${qtyText(qty)}` : qtyText(qty)}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Created"
          value={safeDate(request?.createdAt ?? request?.created_at)}
        />
        <StatCard
          label="Decision date"
          value={safeDate(
            request?.approvedAt ??
              request?.decidedAt ??
              request?.updatedAt ??
              request?.updated_at,
          )}
        />
        <StatCard label="Approver" value={approver || "—"} />
        <StatCard
          label="Branch"
          value={
            toStr(request?.locationName) ||
            toStr(request?.branchName) ||
            "Current branch"
          }
        />
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
          Reason
        </div>
        <div className="mt-1 whitespace-pre-wrap break-words text-sm text-[var(--app-fg)]">
          {reason}
        </div>
      </div>

      {toStr(request?.decisionReason) || toStr(request?.managerComment) ? (
        <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            Decision note
          </div>
          <div className="mt-1 whitespace-pre-wrap break-words text-sm text-[var(--app-fg)]">
            {toStr(request?.decisionReason) ||
              toStr(request?.managerComment) ||
              "—"}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getQtyOnHandForProduct(inventory, productId) {
  const pid = Number(productId);
  if (!pid) return null;
  const row = (Array.isArray(inventory) ? inventory : []).find(
    (r) => Number(r?.id) === pid,
  );
  if (!row) return null;
  const qty = Number(row?.qtyOnHand ?? row?.qty_on_hand ?? 0);
  return Number.isFinite(qty) ? qty : 0;
}

export default function StoreKeeperAdjustmentsSection({
  products = [],
  inventory = [],
  myAdjRequests = [],
  myAdjLoading = false,
  loadMyAdjustRequests,

  adjProductId,
  setAdjProductId,
  adjDirection,
  setAdjDirection,
  adjQtyAbs,
  setAdjQtyAbs,
  adjReason,
  setAdjReason,
  createAdjustRequest,
  adjBtn,
}) {
  const productRows = Array.isArray(products) ? products : [];
  const requestRows = Array.isArray(myAdjRequests) ? myAdjRequests : [];

  const selectedProduct =
    productRows.find((p) => String(p?.id) === String(adjProductId)) || null;

  const currentQty = getQtyOnHandForProduct(inventory, adjProductId);
  const absQty = toNum(adjQtyAbs, 0);
  const signedQty = adjDirection === "REMOVE" ? -absQty : absQty;
  const projectedQty =
    currentQty == null
      ? null
      : Number(currentQty || 0) + Number(signedQty || 0);

  const pendingCount = requestRows.filter(
    (r) => String(r?.status || "").toUpperCase() === "PENDING",
  ).length;

  const approvedCount = requestRows.filter(
    (r) => String(r?.status || "").toUpperCase() === "APPROVED",
  ).length;

  const rejectedCount = requestRows.filter(
    (r) => String(r?.status || "").toUpperCase() === "REJECTED",
  ).length;

  const topProducts = productRows.slice(0, 24);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.92fr_1.08fr]">
      <SectionShell
        title="Request stock correction"
        hint="Store keepers do not change stock directly here. Send a controlled correction request for recount issues, damage, found items, or branch mistakes."
      >
        <form onSubmit={createAdjustRequest} className="grid gap-4">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4">
            <div className="text-sm font-black text-[var(--app-fg)]">
              Correction preview
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Selected product"
                value={adjProductId ? `#${adjProductId}` : "None"}
                sub={
                  toStr(
                    selectedProduct?.name || selectedProduct?.displayName,
                  ) || "Pick a product"
                }
                tone={adjProductId ? "success" : "default"}
              />
              <StatCard
                label="Current stock"
                value={currentQty == null ? "—" : qtyText(currentQty)}
                sub={toStr(
                  selectedProduct?.stockUnit || selectedProduct?.unit || "pcs",
                )}
              />
              <StatCard
                label="Requested change"
                value={
                  absQty > 0
                    ? signedQty > 0
                      ? `+${qtyText(absQty)}`
                      : `-${qtyText(absQty)}`
                    : "0"
                }
                sub={adjDirection === "REMOVE" ? "Decrease" : "Increase"}
                tone={
                  absQty > 0
                    ? adjDirection === "REMOVE"
                      ? "warn"
                      : "success"
                    : "default"
                }
              />
              <StatCard
                label="After approval"
                value={
                  projectedQty == null
                    ? "—"
                    : projectedQty < 0
                      ? "Below zero"
                      : qtyText(projectedQty)
                }
                sub="Expected only after approval"
                tone={
                  projectedQty == null
                    ? "default"
                    : projectedQty < 0
                      ? "danger"
                      : adjDirection === "REMOVE"
                        ? "warn"
                        : "success"
                }
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <InfoPill tone={adjProductId ? "success" : "default"}>
                {adjProductId ? "Product selected" : "Pick a product"}
              </InfoPill>
              <InfoPill
                tone={
                  absQty > 0
                    ? adjDirection === "REMOVE"
                      ? "warn"
                      : "success"
                    : "warn"
                }
              >
                {absQty > 0
                  ? adjDirection === "REMOVE"
                    ? "Decrease request"
                    : "Increase request"
                  : "Enter qty"}
              </InfoPill>
              <InfoPill tone={toStr(adjReason) ? "success" : "warn"}>
                {toStr(adjReason) ? "Reason added" : "Reason required"}
              </InfoPill>
              {projectedQty != null && projectedQty < 0 ? (
                <InfoPill tone="danger">Would go below zero</InfoPill>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                  Product
                </div>
                <Select
                  value={adjProductId}
                  onChange={(e) => setAdjProductId?.(e.target.value)}
                >
                  <option value="">Select product…</option>
                  {productRows.map((p) => {
                    const displayName =
                      toStr(p?.displayName) ||
                      [
                        toStr(p?.name),
                        toStr(p?.brand),
                        toStr(p?.model),
                        toStr(p?.size),
                      ]
                        .filter(Boolean)
                        .join(" ");
                    const sku = toStr(p?.sku);
                    return (
                      <option key={p?.id} value={p?.id}>
                        #{p?.id} • {displayName || p?.name || "Unnamed"}
                        {sku ? ` • ${sku}` : ""}
                      </option>
                    );
                  })}
                </Select>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                  Direction
                </div>
                <Select
                  value={adjDirection}
                  onChange={(e) => setAdjDirection?.(e.target.value)}
                >
                  <option value="ADD">Increase (+)</option>
                  <option value="REMOVE">Decrease (-)</option>
                </Select>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                  Qty
                </div>
                <Input
                  type="number"
                  min="1"
                  placeholder="Example: 3"
                  value={adjQtyAbs}
                  onChange={(e) => setAdjQtyAbs?.(e.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                  Reason
                </div>
                <TextArea
                  rows={4}
                  placeholder="Explain clearly: recount mismatch, damaged stock, broken pack, found stock, wrong branch receipt, return not captured…"
                  value={adjReason}
                  onChange={(e) => setAdjReason?.(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <AsyncButton
              type="submit"
              variant="primary"
              state={adjBtn}
              text="Send request"
              loadingText="Sending…"
              successText="Sent"
            />

            <button
              type="button"
              className="app-focus rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
              onClick={() => {
                setAdjProductId?.("");
                setAdjDirection?.("ADD");
                setAdjQtyAbs?.("");
                setAdjReason?.("");
              }}
            >
              Clear form
            </button>

            <div className="text-xs app-muted">
              Approval is required before inventory changes.
            </div>
          </div>
        </form>
      </SectionShell>

      <div className="grid gap-4">
        <SectionShell
          title="Quick product picker"
          hint="Pick the exact quincaillerie item and review the requested stock effect before sending."
        >
          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Products loaded"
                value={String(productRows.length)}
                sub="Available in this branch"
              />
              <StatCard
                label="Pending requests"
                value={String(pendingCount)}
                sub="Waiting approval"
                tone={pendingCount > 0 ? "warn" : "default"}
              />
              <StatCard
                label="Approved"
                value={String(approvedCount)}
                sub="Completed decisions"
                tone={approvedCount > 0 ? "success" : "default"}
              />
              <StatCard
                label="Rejected"
                value={String(rejectedCount)}
                sub="Needs review"
                tone={rejectedCount > 0 ? "danger" : "default"}
              />
            </div>

            {topProducts.length === 0 ? (
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-6 text-sm app-muted">
                No products available yet.
              </div>
            ) : (
              <div className="grid gap-3">
                {topProducts.map((p) => (
                  <ProductQuickCard
                    key={String(p?.id)}
                    product={p}
                    selected={String(adjProductId) === String(p?.id)}
                    onSelect={setAdjProductId}
                    currentQty={getQtyOnHandForProduct(inventory, p?.id)}
                    adjDirection={
                      String(adjProductId) === String(p?.id)
                        ? adjDirection
                        : "ADD"
                    }
                    adjQtyAbs={
                      String(adjProductId) === String(p?.id) ? adjQtyAbs : ""
                    }
                  />
                ))}
              </div>
            )}

            {productRows.length > 24 ? (
              <div className="text-xs app-muted">
                Showing the first 24 products here for fast picking. Use the
                product dropdown on the left for the full list.
              </div>
            ) : null}
          </div>
        </SectionShell>

        <SectionShell
          title="My correction requests"
          hint="Every request stays traceable by product, quantity, reason, and decision."
          right={
            <AsyncButton
              variant="secondary"
              size="sm"
              state={myAdjLoading ? "loading" : "idle"}
              text="Refresh"
              loadingText="Refreshing…"
              successText="Done"
              onClick={loadMyAdjustRequests}
            />
          }
        >
          {myAdjLoading ? (
            <div className="grid gap-3">
              <Skeleton className="h-40 w-full rounded-3xl" />
              <Skeleton className="h-40 w-full rounded-3xl" />
              <Skeleton className="h-40 w-full rounded-3xl" />
            </div>
          ) : requestRows.length === 0 ? (
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-6 text-sm app-muted">
              No correction requests yet.
            </div>
          ) : (
            <div className="grid gap-3">
              {requestRows.map((r) => (
                <RequestCard key={String(r?.id)} request={r} />
              ))}
            </div>
          )}
        </SectionShell>
      </div>
    </div>
  );
}
