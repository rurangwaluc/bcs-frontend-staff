"use client";

import {
  CreditSummary,
  Input,
  SectionCard,
  Select,
  Skeleton,
  StatusBadge,
} from "./seller-ui";
import { money, safeDate, safeDateOnly, toStr } from "./seller-utils";

import AsyncButton from "../../../components/AsyncButton";

function StatChip({ label, value, strong = false }) {
  return (
    <div
      className={[
        "rounded-2xl border px-3 py-3",
        "border-[var(--border)] bg-[var(--card)]",
        "shadow-[0_4px_12px_rgba(15,23,42,0.04)] dark:shadow-none",
      ].join(" ")}
    >
      <div className="text-[11px] font-black uppercase tracking-[0.1em] text-[var(--muted)]">
        {label}
      </div>

      <div
        className={[
          "mt-1 break-words text-sm text-[var(--app-fg)]",
          strong ? "font-black" : "font-semibold",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function SalesCardSkeleton() {
  return (
    <div
      className={[
        "overflow-hidden rounded-3xl border p-4",
        "border-[var(--border)] bg-[var(--card)]",
        "shadow-[0_10px_24px_rgba(15,23,42,0.06)] dark:shadow-sm",
      ].join(" ")}
    >
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
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    </div>
  );
}

function DocumentButton({
  children,
  onClick,
  disabled = false,
  tone = "neutral",
}) {
  const toneCls =
    tone === "primary"
      ? "border-[var(--app-fg)] bg-[var(--app-fg)] text-[var(--app-bg)]"
      : tone === "success"
        ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
        : tone === "warn"
          ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
          : tone === "info"
            ? "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]"
            : "border-[var(--border)] bg-[var(--card)] text-[var(--app-fg)]";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "app-focus rounded-2xl border px-4 py-2.5 text-sm font-black transition",
        disabled
          ? "cursor-not-allowed border-[var(--border)] bg-[var(--card-2)] text-[var(--muted)] opacity-100"
          : "shadow-[0_4px_12px_rgba(15,23,42,0.05)] hover:translate-y-[-1px] hover:shadow-md",
        disabled ? "" : toneCls,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SurfaceNote({ children, tone = "neutral" }) {
  const toneCls =
    tone === "warn"
      ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
      : tone === "danger"
        ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
        : tone === "success"
          ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
          : "border-[var(--border)] bg-[var(--card-2)] text-[var(--muted)]";

  return (
    <div
      className={[
        "rounded-2xl border px-4 py-3 text-sm",
        toneCls,
        "shadow-[0_4px_12px_rgba(15,23,42,0.04)] dark:shadow-none",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function resolveActionMessage({ saleStatus, creditStatus }) {
  if (saleStatus === "DRAFT") {
    return {
      tone: "neutral",
      text: "Waiting for store keeper to release stock before final action.",
    };
  }

  if (saleStatus === "AWAITING_PAYMENT_RECORD") {
    return {
      tone: "warn",
      text: "Payment is waiting for cashier recording.",
    };
  }

  if (creditStatus === "PENDING_APPROVAL") {
    return {
      tone: "warn",
      text: "Credit request is pending manager approval.",
    };
  }

  if (creditStatus === "APPROVED") {
    return {
      tone: "success",
      text: "Credit is approved and ready for collection.",
    };
  }

  if (creditStatus === "PARTIALLY_PAID") {
    return {
      tone: "warn",
      text: "Credit is active and being collected in parts.",
    };
  }

  if (creditStatus === "SETTLED") {
    return {
      tone: "success",
      text: "Credit is fully settled. Invoice is available.",
    };
  }

  if (creditStatus === "REJECTED") {
    return {
      tone: "danger",
      text: "Credit request was rejected.",
    };
  }

  if (saleStatus === "COMPLETED") {
    return {
      tone: "success",
      text: "Sale is completed. Invoice is available.",
    };
  }

  return {
    tone: "neutral",
    text: "No action required for this sale.",
  };
}

export default function SellerSalesSection({
  showAllSales,
  salesLoading,
  loadSales,
  salesQ,
  setSalesQ,
  salesToShow,
  salePayMethod,
  setSalePayMethod,
  markBtnState,
  markSalePaid,
  openCreditModal,
  openSaleItems,
  openProforma,
  openDeliveryNote,
  openInvoice,
  paymentMethods,
}) {
  return (
    <SectionCard
      title="My sales"
      hint={
        showAllSales
          ? "Showing matching sales from your search."
          : "Showing the 10 most recent sales first."
      }
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
        <div
          className={[
            "rounded-3xl border p-3 sm:p-4",
            "border-[var(--border)] bg-[var(--card-2)]",
            "shadow-[0_4px_12px_rgba(15,23,42,0.04)] dark:shadow-none",
          ].join(" ")}
        >
          <Input
            placeholder="Search by sale ID, customer, phone, payment method or credit"
            value={salesQ}
            onChange={(e) => setSalesQ(e.target.value)}
          />
        </div>

        {salesLoading ? (
          <div className="grid gap-4">
            <SalesCardSkeleton />
            <SalesCardSkeleton />
            <SalesCardSkeleton />
          </div>
        ) : salesToShow.length === 0 ? (
          <SurfaceNote>No sales found.</SurfaceNote>
        ) : (
          <div className="grid gap-4">
            {salesToShow.map((s) => {
              const id = s?.id;
              const st = String(s?.status || "").toUpperCase();

              const creditStatus = String(
                s?.credit?.status ?? s?.creditStatus ?? "",
              ).toUpperCase();

              const cname = s?.customerName ?? s?.customer_name ?? "Walk-in";
              const cphone = s?.customerPhone ?? s?.customer_phone ?? "";
              const customerLabel = [toStr(cname), toStr(cphone)]
                .filter(Boolean)
                .join(" • ");

              const total = Number(s?.totalAmount ?? s?.total ?? 0) || 0;
              const amountPaid =
                Number(
                  s?.credit?.paidAmount ??
                    s?.credit?.paid_amount ??
                    s?.amountPaid ??
                    0,
                ) || 0;

              const canFinalize = st === "FULFILLED";
              const canRequestCredit = st === "FULFILLED";

              const canDeliveryNote =
                st === "FULFILLED" ||
                st === "AWAITING_PAYMENT_RECORD" ||
                st === "COMPLETED" ||
                [
                  "PENDING_APPROVAL",
                  "APPROVED",
                  "PARTIALLY_PAID",
                  "SETTLED",
                ].includes(creditStatus);

              const canProforma =
                st === "DRAFT" ||
                st === "FULFILLED" ||
                st === "AWAITING_PAYMENT_RECORD";

              const canInvoice =
                st === "COMPLETED" || creditStatus === "SETTLED";

              const pm = salePayMethod[id] || "CASH";
              const btnState = markBtnState[id] || "idle";
              const createdAt = s?.createdAt || s?.created_at;
              const credit = s?.credit || null;

              const paidAt =
                credit?.settledAt ||
                credit?.settled_at ||
                s?.completedAt ||
                s?.completed_at ||
                s?.paidAt ||
                s?.paid_at ||
                null;

              const dueDate =
                credit?.dueDate ||
                credit?.due_date ||
                s?.dueDate ||
                s?.due_date ||
                null;

              const creditPrincipal =
                Number(
                  credit?.principalAmount ??
                    credit?.principal_amount ??
                    s?.creditPrincipalAmount ??
                    s?.creditAmount ??
                    total,
                ) || total;

              const remaining =
                creditStatus &&
                ["PENDING_APPROVAL", "APPROVED", "PARTIALLY_PAID"].includes(
                  creditStatus,
                )
                  ? Number(
                      credit?.remainingAmount ??
                        credit?.remaining_amount ??
                        Math.max(0, creditPrincipal - amountPaid),
                    ) || 0
                  : null;

              const itemsPreview = Array.isArray(s?.itemsPreview)
                ? s.itemsPreview
                : [];

              const actionMessage = resolveActionMessage({
                saleStatus: st,
                creditStatus,
              });

              return (
                <div
                  key={String(id)}
                  className={[
                    "overflow-hidden rounded-3xl border bg-[var(--card)]",
                    "border-[var(--border)]",
                    "shadow-[0_12px_28px_rgba(15,23,42,0.07)] dark:shadow-sm",
                  ].join(" ")}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-lg font-black text-[var(--app-fg)] sm:text-xl">
                            Sale #{id ?? "—"}
                          </div>
                          <StatusBadge status={creditStatus || st} />
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <StatChip
                            label="Customer"
                            value={customerLabel || "—"}
                            strong
                          />
                          <StatChip
                            label="Total"
                            value={`${money(total)} RWF`}
                            strong
                          />
                          <StatChip
                            label="Created"
                            value={safeDate(createdAt)}
                          />
                          <StatChip
                            label="Paid date"
                            value={canInvoice ? safeDate(paidAt) : "—"}
                          />
                        </div>

                        {(dueDate || remaining != null) && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {dueDate ? (
                              <div className="rounded-full border border-[var(--border)] bg-[var(--card-2)] px-3 py-1.5 text-xs font-bold text-[var(--app-fg)] shadow-sm">
                                Due: {safeDateOnly(dueDate)}
                              </div>
                            ) : null}

                            {remaining != null ? (
                              <div className="rounded-full border border-[var(--warn-border)] bg-[var(--warn-bg)] px-3 py-1.5 text-xs font-black text-[var(--warn-fg)] shadow-sm">
                                Remaining: {money(remaining)} RWF
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <DocumentButton onClick={() => openSaleItems(id)}>
                          View items
                        </DocumentButton>
                      </div>
                    </div>

                    <div
                      className={[
                        "mt-4 rounded-3xl border p-4",
                        "border-[var(--border)] bg-[var(--card-2)]",
                        "shadow-[0_4px_12px_rgba(15,23,42,0.04)] dark:shadow-none",
                      ].join(" ")}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="text-xs font-black uppercase tracking-[0.1em] text-[var(--muted)]">
                            Documents
                          </div>
                          <div className="mt-1 text-sm text-[var(--muted)]">
                            Available documents depend on the sale stage.
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {canProforma ? (
                            <DocumentButton
                              tone="info"
                              onClick={() => openProforma(id)}
                            >
                              Proforma
                            </DocumentButton>
                          ) : (
                            <DocumentButton disabled>
                              Proforma unavailable
                            </DocumentButton>
                          )}

                          {canDeliveryNote ? (
                            <DocumentButton
                              tone="success"
                              onClick={() => openDeliveryNote(id)}
                            >
                              Delivery note
                            </DocumentButton>
                          ) : (
                            <DocumentButton disabled>
                              Delivery note unavailable
                            </DocumentButton>
                          )}

                          {canInvoice ? (
                            <DocumentButton
                              tone="primary"
                              onClick={() => openInvoice(id)}
                            >
                              Invoice
                            </DocumentButton>
                          ) : (
                            <DocumentButton disabled>
                              Invoice after settlement
                            </DocumentButton>
                          )}
                        </div>
                      </div>
                    </div>

                    {itemsPreview.length ? (
                      <div
                        className={[
                          "mt-4 rounded-3xl border p-4",
                          "border-[var(--border)] bg-[var(--card)]",
                          "shadow-[0_4px_12px_rgba(15,23,42,0.04)] dark:shadow-none",
                        ].join(" ")}
                      >
                        <div className="text-xs font-black uppercase tracking-[0.1em] text-[var(--muted)]">
                          Items preview
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {itemsPreview.slice(0, 3).map((it, idx) => (
                            <div
                              key={idx}
                              className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-sm text-[var(--app-fg)] shadow-sm"
                            >
                              <b>{toStr(it?.productName) || "Item"}</b> ×{" "}
                              {Number(it?.qty ?? 0)}
                            </div>
                          ))}

                          {itemsPreview.length > 3 ? (
                            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-sm text-[var(--muted)] shadow-sm">
                              +{itemsPreview.length - 3} more
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {creditStatus ? <CreditSummary sale={s} /> : null}

                    <div className="mt-4 border-t border-[var(--border)] pt-4">
                      {!canFinalize && !canRequestCredit ? (
                        <SurfaceNote tone={actionMessage.tone}>
                          {actionMessage.text}
                        </SurfaceNote>
                      ) : (
                        <div
                          className={[
                            "rounded-3xl border p-4",
                            "border-[var(--border)] bg-[var(--card-2)]",
                            "shadow-[0_4px_12px_rgba(15,23,42,0.04)] dark:shadow-none",
                          ].join(" ")}
                        >
                          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[260px_1fr]">
                            <div>
                              <div className="mb-2 text-xs font-black uppercase tracking-[0.1em] text-[var(--muted)]">
                                Payment method
                              </div>

                              <Select
                                value={pm}
                                onChange={(e) =>
                                  setSalePayMethod((prev) => ({
                                    ...prev,
                                    [id]: e.target.value,
                                  }))
                                }
                              >
                                {paymentMethods.map((m) => (
                                  <option key={m.value} value={m.value}>
                                    {m.label}
                                  </option>
                                ))}
                              </Select>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                              <AsyncButton
                                variant="primary"
                                size="md"
                                state={btnState}
                                text="Mark paid"
                                loadingText="Saving…"
                                successText="Saved"
                                onClick={() => markSalePaid(id, pm)}
                              />

                              {canRequestCredit ? (
                                <button
                                  type="button"
                                  className="app-focus rounded-2xl border border-[var(--warn-border)] bg-[var(--warn-bg)] px-4 py-2.5 text-sm font-black text-[var(--warn-fg)] shadow-sm transition hover:opacity-90"
                                  onClick={() => openCreditModal(s)}
                                >
                                  Request credit
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!showAllSales ? (
          <div className="text-xs text-[var(--muted)]">
            Tip: use search to quickly find older sales.
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
