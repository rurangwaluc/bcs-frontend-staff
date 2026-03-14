"use client";

import { Pill, SectionCard } from "./adminShared";

import CashierPaymentsSection from "../staff/cashier/CashierPaymentsSection";
import CashierSessionsSection from "../staff/cashier/CashierSessionsSection";

function prettyRole(role) {
  return String(role || "")
    .trim()
    .split("_")
    .filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

export default function AdminCashierCoverageSection({
  coverage,

  currentOpenSession,
  sessions,
  sessionsLoading,
  openingBalance,
  setOpeningBalance,
  openBtnState,
  closeNote,
  setCloseNote,
  closeBtnState,
  loadSessions,
  money,
  safeDate,
  onOpenSession,
  onCloseSession,

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
  getSellerPaymentMethodFromSale,
  ensureSaleDetails,
  saleDetailsById,
  saleDetailsLoadingById,
  itemsSummary,
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
  const coverageActive =
    !!coverage?.active &&
    String(coverage?.actingAsRole || "")
      .trim()
      .toLowerCase() === "cashier";

  if (!coverageActive) return null;

  return (
    <div className="grid gap-4">
      <SectionCard
        title="Cashier operator workspace"
        hint="Admin is temporarily covering cashier responsibilities with full collection workflow access."
        right={
          <div className="flex flex-wrap gap-2">
            <Pill tone="warn">Coverage active</Pill>
            <Pill tone="info">{prettyRole(coverage?.actingAsRole)}</Pill>
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="rounded-3xl border border-[var(--warn-border)] bg-[var(--warn-bg)] p-4 sm:p-5">
            <div className="text-sm font-black text-[var(--app-fg)]">
              Cashier coverage mode
            </div>
            <div className="mt-2 text-sm leading-6 text-[var(--app-fg)]">
              You are operating as cashier. Open a session, collect against
              awaiting sales, verify payment method, and keep sale-to-payment
              traceability clean.
            </div>
            <div className="mt-2 text-xs leading-6 app-muted">
              All actions remain attributable to admin with active coverage
              metadata.
            </div>
          </div>

          <CashierSessionsSection
            currentOpenSession={currentOpenSession}
            sessions={sessions}
            sessionsLoading={sessionsLoading}
            openingBalance={openingBalance}
            setOpeningBalance={setOpeningBalance}
            openBtnState={openBtnState}
            closeNote={closeNote}
            setCloseNote={setCloseNote}
            closeBtnState={closeBtnState}
            loadSessions={loadSessions}
            money={money}
            safeDate={safeDate}
            onOpenSession={onOpenSession}
            onCloseSession={onCloseSession}
          />

          <CashierPaymentsSection
            salesLoading={salesLoading}
            loadSales={loadSales}
            salesQ={salesQ}
            setSalesQ={setSalesQ}
            awaitingSales={awaitingSales}
            selectedSale={selectedSale}
            setSelectedSale={setSelectedSale}
            amount={amount}
            setAmount={setAmount}
            method={method}
            setMethod={setMethod}
            note={note}
            setNote={setNote}
            methods={methods}
            paymentBtnState={paymentBtnState}
            currentOpenSession={currentOpenSession}
            getSellerPaymentMethodFromSale={getSellerPaymentMethodFromSale}
            ensureSaleDetails={ensureSaleDetails}
            saleDetailsById={saleDetailsById}
            saleDetailsLoadingById={saleDetailsLoadingById}
            itemsSummary={itemsSummary}
            money={money}
            safeDate={safeDate}
            payments={payments}
            paymentsLoading={paymentsLoading}
            payQ={payQ}
            setPayQ={setPayQ}
            canReadPayments={canReadPayments}
            loadSummary={loadSummary}
            loadPayments={loadPayments}
            paymentAmountStatus={paymentAmountStatus}
            selectedSaleExpectedAmount={selectedSaleExpectedAmount}
            onSubmitPayment={onSubmitPayment}
          />
        </div>
      </SectionCard>
    </div>
  );
}
