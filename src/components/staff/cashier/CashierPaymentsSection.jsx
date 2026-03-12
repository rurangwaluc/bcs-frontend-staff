"use client";

import {
  Banner,
  Input,
  RefreshButton,
  SectionCard,
  Select,
  Skeleton,
  TinyPill,
} from "./cashier-ui";

import AsyncButton from "../../../components/AsyncButton";

export default function CashierPaymentsSection({
  salesLoading,
  loadSales,
  salesQ,
  setSalesQ,
  awaitingSales,
  selectedSale,
  setSelectedSale,
  amount,
  setAmount,
  method,
  setMethod,
  note,
  setNote,
  methods,
  paymentBtnState,
  currentOpenSession,
  getSellerPaymentMethodFromSale,
  ensureSaleDetails,
  saleDetailsById,
  saleDetailsLoadingById,
  itemsSummary,
  money,
  safeDate,
  payments,
  paymentsLoading,
  payQ,
  setPayQ,
  canReadPayments,
  loadSummary,
  loadPayments,
  paymentAmountStatus,
  selectedSaleExpectedAmount,
  onSubmitPayment,
}) {
  const isLocked = !currentOpenSession;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SectionCard
        title="Sales waiting for payment"
        hint="Pick a sale, confirm items, then record payment."
        right={<RefreshButton loading={salesLoading} onClick={loadSales} />}
      >
        <div className="grid gap-3">
          <Input
            placeholder="Search by sale ID, customer or phone"
            value={salesQ}
            onChange={(e) => setSalesQ(e.target.value)}
          />

          {salesLoading ? (
            <div className="grid gap-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : awaitingSales.length === 0 ? (
            <div className="text-sm app-muted">No sales waiting.</div>
          ) : (
            <div className="grid gap-2">
              {awaitingSales.slice(0, 20).map((s) => {
                const total = s?.totalAmount ?? s?.total ?? 0;
                const cname = s?.customerName ?? s?.customer_name ?? "—";
                const cphone = s?.customerPhone ?? s?.customer_phone ?? "";
                const sellerMethod = getSellerPaymentMethodFromSale(s);
                const sid = Number(s?.id || 0) || null;
                const isLoadingItems = sid
                  ? !!saleDetailsLoadingById[sid]
                  : false;
                const items = sid ? saleDetailsById[sid]?.items || [] : [];

                return (
                  <button
                    key={String(s?.id)}
                    type="button"
                    className={[
                      "w-full rounded-3xl border p-4 text-left transition",
                      selectedSale?.id === s?.id
                        ? "border-[var(--border-strong)] bg-[var(--card-2)]"
                        : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--hover)]",
                    ].join(" ")}
                    onClick={() => {
                      if (sid) ensureSaleDetails(sid);
                      const sm = getSellerPaymentMethodFromSale(s);
                      setSelectedSale(s);
                      setAmount(String(Math.round(Number(total) || 0)));
                      setMethod(sm || "CASH");
                      setNote("");
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-[var(--app-fg)]">
                          Sale #{s?.id}
                        </div>
                        <div className="mt-1 truncate text-xs app-muted">
                          {cname}
                          {cphone ? ` • ${cphone}` : ""}
                        </div>
                        <div className="mt-2 text-xs app-muted">
                          Seller said: <b>{sellerMethod || "—"}</b>
                        </div>
                        <div className="mt-2 text-xs app-muted break-words">
                          <span className="font-semibold">Items:</span>{" "}
                          {isLoadingItems ? "Loading…" : itemsSummary(items)}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-sm font-extrabold text-[var(--app-fg)]">
                          {money(total)}
                        </div>
                        <div className="text-[11px] app-muted">RWF</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Record payment"
        hint="Open session required. Amount must match the sale total."
      >
        {!currentOpenSession ? (
          <Banner kind="warn">Open a cash session first.</Banner>
        ) : null}

        {!selectedSale ? (
          <div className="text-sm app-muted">Pick a sale on the left.</div>
        ) : (
          <div
            className={[
              "grid gap-4 rounded-3xl transition",
              isLocked ? "opacity-60" : "",
            ].join(" ")}
          >
            {(() => {
              const sid = Number(selectedSale?.id || 0) || null;
              const isLoadingItems = sid
                ? !!saleDetailsLoadingById[sid]
                : false;
              const items = sid ? saleDetailsById[sid]?.items || [] : [];

              return (
                <>
                  <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4">
                    <div className="text-sm font-extrabold text-[var(--app-fg)]">
                      Sale #{selectedSale?.id}
                    </div>
                    <div className="mt-1 text-xs app-muted">
                      Total: <b>{money(selectedSaleExpectedAmount)}</b> RWF
                    </div>
                    <div className="mt-2 text-xs app-muted break-words">
                      <span className="font-semibold">Items:</span>{" "}
                      {isLoadingItems ? "Loading…" : itemsSummary(items)}
                    </div>
                  </div>

                  <div
                    className={[
                      "rounded-2xl border px-4 py-3 text-sm",
                      paymentAmountStatus?.tone === "success"
                        ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
                        : paymentAmountStatus?.tone === "warn"
                          ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
                          : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]",
                    ].join(" ")}
                  >
                    {paymentAmountStatus?.message || "Enter payment amount."}
                  </div>

                  <form onSubmit={onSubmitPayment} className="grid gap-3">
                    <Input
                      placeholder="Amount (RWF)"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      disabled={isLocked}
                    />

                    <Select
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      disabled={isLocked}
                    >
                      {methods.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </Select>

                    <Input
                      placeholder="Note (optional)"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
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
                        className="rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--app-fg)]"
                        onClick={() => setSelectedSale(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </>
              );
            })()}
          </div>
        )}

        <div className="mt-6 border-t border-[var(--border)] pt-4">
          <div className="text-sm font-semibold text-[var(--app-fg)]">
            Payments list
          </div>

          {!canReadPayments ? (
            <div className="mt-3">
              <Banner kind="warn">
                You can’t view this list (permission).
              </Banner>
            </div>
          ) : (
            <div className="mt-3 grid gap-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  className="flex-1"
                  placeholder="Search"
                  value={payQ}
                  onChange={(e) => setPayQ(e.target.value)}
                />
                <RefreshButton
                  loading={paymentsLoading}
                  onClick={() => {
                    loadSummary();
                    loadPayments();
                  }}
                />
              </div>

              {paymentsLoading ? (
                <div className="grid gap-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                <div className="grid gap-2">
                  {(Array.isArray(payments) ? payments : [])
                    .filter((p) => {
                      const q = String(payQ || "")
                        .trim()
                        .toLowerCase();
                      if (!q) return true;
                      const hay = [
                        p?.id,
                        p?.saleId ?? p?.sale_id,
                        p?.method,
                        p?.amount,
                      ]
                        .map((x) => String(x ?? ""))
                        .join(" ")
                        .toLowerCase();
                      return hay.includes(q);
                    })
                    .slice(0, 50)
                    .map((p, idx) => {
                      const saleId =
                        Number(p?.saleId ?? p?.sale_id ?? 0) || null;
                      const details = saleId ? saleDetailsById[saleId] : null;
                      const items = details?.items || [];
                      const isLoadingItems = saleId
                        ? !!saleDetailsLoadingById[saleId]
                        : false;

                      return (
                        <div
                          key={p?.id || idx}
                          className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-sm font-extrabold text-[var(--app-fg)]">
                                  Payment #{p?.id ?? "—"}
                                </div>
                                <TinyPill tone="info">
                                  {String(p?.method ?? "—").toUpperCase()}
                                </TinyPill>
                              </div>

                              <div className="mt-2 text-sm text-[var(--app-fg)]">
                                Sale: <b>#{saleId ?? "—"}</b>
                              </div>

                              <div className="mt-1 text-xs app-muted">
                                Time:{" "}
                                <b>{safeDate(p?.createdAt || p?.created_at)}</b>
                              </div>

                              <div className="mt-2 text-xs app-muted break-words">
                                <span className="font-semibold">Items:</span>{" "}
                                {isLoadingItems
                                  ? "Loading…"
                                  : itemsSummary(items)}
                              </div>

                              {saleId && !details && !isLoadingItems ? (
                                <div className="mt-3">
                                  <button
                                    type="button"
                                    className="rounded-2xl border border-[var(--border)] px-3 py-2 text-xs font-extrabold text-[var(--app-fg)]"
                                    onClick={() => ensureSaleDetails(saleId)}
                                  >
                                    Load items
                                  </button>
                                </div>
                              ) : null}
                            </div>

                            <div className="shrink-0 text-right">
                              <div className="text-xs app-muted">Paid</div>
                              <div className="text-lg font-extrabold text-[var(--app-fg)]">
                                {money(p?.amount ?? 0)}
                              </div>
                              <div className="text-[11px] app-muted">RWF</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {(Array.isArray(payments) ? payments : []).length === 0 ? (
                    <div className="text-sm app-muted">No payments yet.</div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
