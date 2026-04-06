"use client";

import {
  Banner,
  Input,
  RefreshButton,
  SectionCard,
  Skeleton,
  TinyPill,
} from "./cashier-ui";
import { useMemo, useState } from "react";

import AsyncButton from "../../../components/AsyncButton";

const PAGE_SIZE = 10;

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function moneyText(fn, value) {
  if (typeof fn === "function") return fn(value);
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.round(n).toLocaleString() : "0";
}

function dateText(fn, value) {
  if (typeof fn === "function") return fn(value);
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

function renderItemsText(itemsSummary, items) {
  if (typeof itemsSummary === "function") return itemsSummary(items);
  const rows = Array.isArray(items) ? items : [];
  if (!rows.length) return "No items";
  return `${rows.length} item(s)`;
}

function PaymentStatusBanner({ paymentAmountStatus }) {
  if (!paymentAmountStatus?.message) return null;

  const kind =
    paymentAmountStatus?.tone === "success"
      ? "success"
      : paymentAmountStatus?.tone === "warn"
        ? "warn"
        : paymentAmountStatus?.tone === "danger"
          ? "danger"
          : "info";

  return <Banner kind={kind}>{paymentAmountStatus.message}</Banner>;
}

function PaymentQueueCard({
  sale,
  selected,
  onSelect,
  ensureSaleDetails,
  saleDetailsById,
  saleDetailsLoadingById,
  getSellerPaymentMethodFromSale,
  itemsSummary,
  money,
  safeDate,
}) {
  const sid = Number(sale?.id || 0) || null;
  const isLoadingItems = sid ? !!saleDetailsLoadingById?.[sid] : false;
  const items = sid ? saleDetailsById?.[sid]?.items || [] : [];
  const customerName =
    sale?.customerName ?? sale?.customer_name ?? "Walk-in customer";
  const customerPhone = sale?.customerPhone ?? sale?.customer_phone ?? "";
  const total = sale?.totalAmount ?? sale?.total ?? 0;
  const sellerMethod =
    typeof getSellerPaymentMethodFromSale === "function"
      ? getSellerPaymentMethodFromSale(sale)
      : "";
  const createdAt =
    sale?.createdAt ?? sale?.created_at ?? sale?.updatedAt ?? sale?.updated_at;

  return (
    <button
      type="button"
      onClick={() => {
        if (sid && typeof ensureSaleDetails === "function") {
          ensureSaleDetails(sid);
        }
        onSelect?.(sale);
      }}
      className={cx(
        "w-full rounded-3xl border p-4 text-left transition",
        selected
          ? "border-[var(--border-strong)] bg-[var(--card-2)] ring-1 ring-[var(--border-strong)]"
          : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-strong)] hover:bg-[var(--hover)]",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-extrabold text-[var(--app-fg)] sm:text-base">
              Sale #{sale?.id}
            </div>

            {selected ? (
              <TinyPill tone="success">Selected</TinyPill>
            ) : (
              <TinyPill tone="info">Tap to select</TinyPill>
            )}

            {sellerMethod ? (
              <TinyPill tone="neutral">{sellerMethod}</TinyPill>
            ) : null}
          </div>

          <div className="mt-2 text-sm text-[var(--app-fg)]">
            {customerName}
            {customerPhone ? (
              <span className="text-[var(--muted)]"> • {customerPhone}</span>
            ) : null}
          </div>

          <div className="mt-2 text-xs app-muted">
            Time: <b>{dateText(safeDate, createdAt)}</b>
          </div>

          <div className="mt-2 text-xs app-muted break-words">
            <span className="font-semibold">Items:</span>{" "}
            {isLoadingItems ? "Loading…" : renderItemsText(itemsSummary, items)}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
            Total to collect
          </div>
          <div className="mt-1 text-xl font-black text-[var(--app-fg)]">
            {moneyText(money, total)}
          </div>
          <div className="text-[11px] app-muted">RWF</div>
        </div>
      </div>
    </button>
  );
}

function RecordedPaymentCard({
  payment,
  detailsMap,
  detailsLoadingMap,
  ensureSaleDetails,
  itemsSummary,
  money,
  safeDate,
}) {
  const saleId = Number(payment?.saleId ?? payment?.sale_id ?? 0) || null;
  const details = saleId ? detailsMap?.[saleId] : null;
  const items = details?.items || [];
  const isLoadingItems = saleId ? !!detailsLoadingMap?.[saleId] : false;

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-extrabold text-[var(--app-fg)]">
              Payment #{payment?.id ?? "—"}
            </div>
            <TinyPill tone="info">
              {String(payment?.method ?? "—").toUpperCase()}
            </TinyPill>
          </div>

          <div className="mt-2 text-sm text-[var(--app-fg)]">
            Sale <b>#{saleId ?? "—"}</b>
          </div>

          <div className="mt-1 text-xs app-muted">
            Time:{" "}
            <b>
              {dateText(safeDate, payment?.createdAt || payment?.created_at)}
            </b>
          </div>

          <div className="mt-2 text-xs app-muted break-words">
            <span className="font-semibold">Items:</span>{" "}
            {isLoadingItems ? "Loading…" : renderItemsText(itemsSummary, items)}
          </div>

          {saleId && !details && !isLoadingItems ? (
            <div className="mt-3">
              <button
                type="button"
                className="rounded-2xl border border-[var(--border)] px-3 py-2 text-xs font-extrabold text-[var(--app-fg)] hover:bg-[var(--hover)]"
                onClick={() => ensureSaleDetails?.(saleId)}
              >
                Load items
              </button>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
            Paid
          </div>
          <div className="mt-1 text-lg font-extrabold text-[var(--app-fg)]">
            {moneyText(money, payment?.amount ?? 0)}
          </div>
          <div className="text-[11px] app-muted">RWF</div>
        </div>
      </div>
    </div>
  );
}

export default function CashierPaymentsSection({
  salesLoading = false,
  loadSales,
  salesQ = "",
  setSalesQ,
  awaitingSales = [],
  selectedSale = null,
  setSelectedSale,
  amount = "",
  setAmount,
  method = "CASH",
  setMethod,
  note = "",
  setNote,
  methods = [],
  paymentBtnState = "idle",
  currentOpenSession = null,
  getSellerPaymentMethodFromSale,
  ensureSaleDetails,
  saleDetailsById = {},
  saleDetailsLoadingById = {},
  itemsSummary,
  money,
  safeDate,
  payments = [],
  paymentsLoading = false,
  payQ = "",
  setPayQ,
  canReadPayments = true,
  loadSummary,
  loadPayments,
  paymentAmountStatus = null,
  selectedSaleExpectedAmount = 0,
  onSubmitPayment,
}) {
  const isLocked = !currentOpenSession;

  const waitingSales = useMemo(
    () => (Array.isArray(awaitingSales) ? awaitingSales : []),
    [awaitingSales],
  );

  const paymentRows = useMemo(
    () => (Array.isArray(payments) ? payments : []),
    [payments],
  );

  const methodRows = useMemo(
    () => (Array.isArray(methods) ? methods : []),
    [methods],
  );

  const [waitingLoadMoreCount, setWaitingLoadMoreCount] = useState(0);
  const [paymentsLoadMoreCount, setPaymentsLoadMoreCount] = useState(0);

  const visibleWaitingCount = PAGE_SIZE + waitingLoadMoreCount * PAGE_SIZE;
  const visiblePaymentsCount = PAGE_SIZE + paymentsLoadMoreCount * PAGE_SIZE;

  const visibleWaitingSales = useMemo(() => {
    return waitingSales.slice(0, visibleWaitingCount);
  }, [waitingSales, visibleWaitingCount]);

  const filteredPayments = useMemo(() => {
    const q = String(payQ || "")
      .trim()
      .toLowerCase();

    return paymentRows.filter((p) => {
      if (!q) return true;
      const hay = [p?.id, p?.saleId ?? p?.sale_id, p?.method, p?.amount]
        .map((x) => String(x ?? ""))
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [paymentRows, payQ]);

  const visiblePayments = useMemo(() => {
    return filteredPayments.slice(0, visiblePaymentsCount);
  }, [filteredPayments, visiblePaymentsCount]);

  const waitingHasMore = visibleWaitingCount < waitingSales.length;
  const paymentsHasMore = visiblePaymentsCount < filteredPayments.length;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.02fr_0.98fr]">
      <div className="grid gap-4">
        <SectionCard
          title="Sales waiting for payment"
          hint="Choose one sale below, then record the exact final payment."
          right={
            <RefreshButton
              loading={salesLoading}
              onClick={() => {
                setWaitingLoadMoreCount(0);
                loadSales?.();
              }}
              text="Refresh sales"
            />
          }
        >
          <Banner kind="info" className="mb-4">
            This area is only for normal sale payments. Credit collections
            belong in <b> Credit collections</b>.
          </Banner>

          <div className="grid gap-4">
            <Input
              placeholder="Search by sale ID, customer name or phone"
              value={salesQ}
              onChange={(e) => {
                setWaitingLoadMoreCount(0);
                setSalesQ?.(e.target.value);
              }}
            />

            <div className="flex flex-wrap gap-2">
              <TinyPill tone={waitingSales.length > 0 ? "warn" : "neutral"}>
                Waiting now: {waitingSales.length}
              </TinyPill>
              <TinyPill tone={selectedSale?.id ? "success" : "neutral"}>
                {selectedSale?.id
                  ? `Selected sale #${selectedSale.id}`
                  : "No sale selected"}
              </TinyPill>
            </div>

            {salesLoading ? (
              <div className="grid gap-3">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ) : waitingSales.length === 0 ? (
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 text-sm app-muted">
                No sales are waiting for payment right now.
              </div>
            ) : (
              <div className="grid gap-3">
                {visibleWaitingSales.map((sale) => (
                  <PaymentQueueCard
                    key={String(sale?.id)}
                    sale={sale}
                    selected={selectedSale?.id === sale?.id}
                    onSelect={(picked) => {
                      const total = picked?.totalAmount ?? picked?.total ?? 0;
                      const sellerMethod =
                        typeof getSellerPaymentMethodFromSale === "function"
                          ? getSellerPaymentMethodFromSale(picked)
                          : "";
                      setSelectedSale?.(picked);
                      setAmount?.(String(Math.round(Number(total) || 0)));
                      setMethod?.(sellerMethod || "CASH");
                      setNote?.("");
                    }}
                    ensureSaleDetails={ensureSaleDetails}
                    saleDetailsById={saleDetailsById}
                    saleDetailsLoadingById={saleDetailsLoadingById}
                    getSellerPaymentMethodFromSale={
                      getSellerPaymentMethodFromSale
                    }
                    itemsSummary={itemsSummary}
                    money={money}
                    safeDate={safeDate}
                  />
                ))}

                {waitingHasMore ? (
                  <div className="flex justify-center pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setWaitingLoadMoreCount((prev) => prev + 1)
                      }
                      className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-bold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
                    >
                      Load 10 more
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Recorded payments"
          hint="This list shows payments already saved for normal sales."
          right={
            <RefreshButton
              loading={paymentsLoading}
              onClick={() => {
                setPaymentsLoadMoreCount(0);
                loadSummary?.();
                loadPayments?.();
              }}
              text="Refresh payments"
            />
          }
        >
          {!canReadPayments ? (
            <Banner kind="warn">
              You do not have permission to view recorded payments.
            </Banner>
          ) : (
            <div className="grid gap-4">
              <Input
                placeholder="Search by payment ID, sale ID, method or amount"
                value={payQ}
                onChange={(e) => {
                  setPaymentsLoadMoreCount(0);
                  setPayQ?.(e.target.value);
                }}
              />

              {paymentsLoading ? (
                <div className="grid gap-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 text-sm app-muted">
                  No recorded payments found.
                </div>
              ) : (
                <div className="grid gap-3">
                  {visiblePayments.map((payment, idx) => (
                    <RecordedPaymentCard
                      key={payment?.id || idx}
                      payment={payment}
                      detailsMap={saleDetailsById}
                      detailsLoadingMap={saleDetailsLoadingById}
                      ensureSaleDetails={ensureSaleDetails}
                      itemsSummary={itemsSummary}
                      money={money}
                      safeDate={safeDate}
                    />
                  ))}

                  {paymentsHasMore ? (
                    <div className="flex justify-center pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setPaymentsLoadMoreCount((prev) => prev + 1)
                        }
                        className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-bold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
                      >
                        Load 10 more
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Record selected payment"
        hint="Save the exact payment for the sale you selected on the left."
      >
        {!currentOpenSession ? (
          <Banner kind="warn" className="mb-4">
            Open a cash session first before recording cashier payments.
          </Banner>
        ) : null}

        {!selectedSale ? (
          <div className="grid gap-4">
            <Banner kind="info">
              Tap any sale in <b>Sales waiting for payment</b> to select it
              here.
            </Banner>

            <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] p-6 text-sm app-muted">
              No sale selected yet.
            </div>
          </div>
        ) : (
          <div
            className={cx(
              "grid gap-4 transition",
              isLocked ? "opacity-60" : "",
            )}
          >
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-base font-extrabold text-[var(--app-fg)]">
                      Sale #{selectedSale?.id}
                    </div>
                    <TinyPill tone="success">Selected</TinyPill>
                  </div>

                  <div className="mt-2 text-sm text-[var(--app-fg)]">
                    {selectedSale?.customerName ??
                      selectedSale?.customer_name ??
                      "Walk-in customer"}
                  </div>

                  <div className="mt-2 text-xs app-muted break-words">
                    <span className="font-semibold">Items:</span>{" "}
                    {(() => {
                      const sid = Number(selectedSale?.id || 0) || null;
                      const isLoadingItems = sid
                        ? !!saleDetailsLoadingById?.[sid]
                        : false;
                      const items = sid
                        ? saleDetailsById?.[sid]?.items || []
                        : [];
                      return isLoadingItems
                        ? "Loading…"
                        : renderItemsText(itemsSummary, items);
                    })()}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
                    Total to collect
                  </div>
                  <div className="mt-1 text-xl font-black text-[var(--app-fg)]">
                    {moneyText(money, selectedSaleExpectedAmount)}
                  </div>
                  <div className="text-[11px] app-muted">RWF</div>
                </div>
              </div>
            </div>

            <PaymentStatusBanner paymentAmountStatus={paymentAmountStatus} />

            <form onSubmit={onSubmitPayment} className="grid gap-3">
              <Input
                placeholder="Payment amount (RWF)"
                value={amount}
                onChange={(e) => setAmount?.(e.target.value)}
                disabled={isLocked}
              />

              <select
                value={method}
                onChange={(e) => setMethod?.(e.target.value)}
                disabled={isLocked}
                className="app-focus w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-3 text-sm text-[var(--app-fg)] outline-none transition hover:border-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {methodRows.length === 0 ? (
                  <option value="CASH">Cash</option>
                ) : (
                  methodRows.map((m, idx) => (
                    <option
                      key={m?.value || m?.label || idx}
                      value={m?.value || "CASH"}
                    >
                      {m?.label || m?.value || "Cash"}
                    </option>
                  ))
                )}
              </select>

              <Input
                placeholder="Note (optional)"
                value={note}
                onChange={(e) => setNote?.(e.target.value)}
                disabled={isLocked}
              />

              <div className="flex flex-wrap gap-2">
                <AsyncButton
                  type="submit"
                  variant="primary"
                  state={paymentBtnState}
                  text="Save payment"
                  loadingText="Saving…"
                  successText="Saved"
                  disabled={isLocked || !paymentAmountStatus?.isValid}
                />

                <button
                  type="button"
                  className="rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--app-fg)] hover:bg-[var(--hover)]"
                  onClick={() => setSelectedSale?.(null)}
                >
                  Clear selection
                </button>
              </div>
            </form>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
