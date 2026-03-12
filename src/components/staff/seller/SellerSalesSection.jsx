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
    <div className="rounded-2xl border border-[var(--border)] bg-white px-3 py-3 shadow-sm dark:border-[var(--border-strong)] dark:bg-[var(--card-2)] dark:shadow-none">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
        {label}
      </div>
      <div
        className={`mt-1 break-words text-sm ${
          strong
            ? "font-black text-[var(--app-fg)]"
            : "font-semibold text-[var(--app-fg)]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function SalesCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--card)] p-4 shadow-sm">
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
        <div className="rounded-3xl border border-[var(--border-strong)] bg-[var(--card-2)] p-3 shadow-sm sm:p-4">
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
          <div className="rounded-3xl border border-[var(--border-strong)] bg-[var(--card-2)] p-6 text-sm app-muted shadow-sm">
            No sales found.
          </div>
        ) : (
          <div className="grid gap-4">
            {salesToShow.map((s) => {
              const id = s?.id;
              const st = String(s?.status || "").toUpperCase();

              const cname = s?.customerName ?? s?.customer_name ?? "Walk-in";
              const cphone = s?.customerPhone ?? s?.customer_phone ?? "";
              const customerLabel = [toStr(cname), toStr(cphone)]
                .filter(Boolean)
                .join(" • ");

              const total = Number(s?.totalAmount ?? s?.total ?? 0) || 0;
              const amountPaid = Number(s?.amountPaid ?? 0) || 0;
              const canFinalize = st === "FULFILLED" || st === "PENDING";
              const canDeliveryNote =
                st === "FULFILLED" || st === "PENDING" || st === "COMPLETED";
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

              const creditAmount = Number(credit?.amount ?? total) || total;
              const remaining =
                st === "PENDING"
                  ? Math.max(0, creditAmount - amountPaid)
                  : null;

              const itemsPreview = Array.isArray(s?.itemsPreview)
                ? s.itemsPreview
                : [];

              return (
                <div
                  key={String(id)}
                  className="overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--card)] shadow-sm"
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-lg font-black text-[var(--app-fg)] sm:text-xl">
                            Sale #{id ?? "—"}
                          </div>
                          <StatusBadge status={st} />
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
                            value={st === "COMPLETED" ? safeDate(paidAt) : "—"}
                          />
                        </div>

                        {(dueDate || remaining != null) && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {dueDate ? (
                              <div className="rounded-full border border-[var(--border-strong)] bg-[var(--card-2)] px-3 py-1.5 text-xs font-semibold text-[var(--app-fg)] shadow-sm">
                                Due: {safeDateOnly(dueDate)}
                              </div>
                            ) : null}

                            {remaining != null ? (
                              <div className="rounded-full border border-[var(--warn-border)] bg-[var(--warn-bg)] px-3 py-1.5 text-xs font-bold text-[var(--warn-fg)] shadow-sm">
                                Remaining: {money(remaining)} RWF
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="app-focus rounded-2xl border border-[var(--border-strong)] bg-[var(--card-2)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] shadow-sm transition hover:bg-[var(--hover)]"
                          onClick={() => openSaleItems(id)}
                        >
                          View items
                        </button>

                        <button
                          type="button"
                          className="app-focus rounded-2xl border border-[var(--border-strong)] bg-[var(--card-2)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] shadow-sm transition hover:bg-[var(--hover)]"
                          onClick={() => openProforma(id)}
                        >
                          Proforma
                        </button>

                        <button
                          type="button"
                          disabled={!canDeliveryNote}
                          className="app-focus rounded-2xl border border-[var(--border-strong)] bg-[var(--card-2)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] shadow-sm transition hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => openDeliveryNote(id)}
                        >
                          Delivery note
                        </button>
                      </div>
                    </div>

                    {itemsPreview.length ? (
                      <div className="mt-4 rounded-3xl border border-[var(--border)] bg-white p-4 shadow-sm dark:border-[var(--border-strong)] dark:bg-[var(--card-2)]">
                        <div className="text-xs font-black uppercase tracking-[0.08em] app-muted">
                          Items preview
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {itemsPreview.slice(0, 3).map((it, idx) => (
                            <div
                              key={idx}
                              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--app-fg)] shadow-sm"
                            >
                              <b>{toStr(it?.productName) || "Item"}</b> ×{" "}
                              {Number(it?.qty ?? 0)}
                            </div>
                          ))}
                          {itemsPreview.length > 3 ? (
                            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm app-muted shadow-sm">
                              +{itemsPreview.length - 3} more
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {st === "PENDING" ? <CreditSummary sale={s} /> : null}

                    <div className="mt-4 border-t border-[var(--border)] pt-4">
                      {!canFinalize ? (
                        <div className="rounded-2xl border border-[var(--border-strong)] bg-[var(--card-2)] px-4 py-3 text-sm app-muted shadow-sm">
                          {st === "DRAFT"
                            ? "Waiting for store keeper to release stock."
                            : st === "AWAITING_PAYMENT_RECORD"
                              ? "Waiting cashier to record payment."
                              : "No action required for this sale."}
                        </div>
                      ) : (
                        <div className="rounded-3xl border border-[var(--border-strong)] bg-[var(--card-2)] p-4 shadow-sm">
                          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[260px_1fr]">
                            <div>
                              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
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
                                text={
                                  st === "PENDING"
                                    ? "Record payment"
                                    : "Mark paid"
                                }
                                loadingText="Saving…"
                                successText="Saved"
                                onClick={() => markSalePaid(id, pm)}
                              />

                              {st === "FULFILLED" ? (
                                <button
                                  type="button"
                                  className="app-focus rounded-2xl border border-[var(--warn-border)] bg-[var(--warn-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--warn-fg)] shadow-sm transition hover:opacity-90"
                                  onClick={() => openCreditModal(s)}
                                >
                                  Mark credit
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
          <div className="text-xs app-muted">
            Tip: use search to quickly find older sales.
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
