"use client";

import {
  EmptyState,
  Input,
  RefreshButton,
  SectionCard,
  Skeleton,
  TinyPill,
} from "./manager-ui";

import AsyncButton from "../../../components/AsyncButton";

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

function firstItemLabel(items) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return { name: "—", qty: 0 };

  const first = list[0];
  return {
    name:
      first?.productName ||
      first?.name ||
      first?.product?.name ||
      first?.title ||
      "Item",
    qty: Number(first?.qty ?? first?.quantity ?? first?.count ?? 0) || 0,
  };
}

function statusTone(status) {
  const s = String(status || "").toUpperCase();

  if (
    s === "COMPLETED" ||
    s === "PAID" ||
    s === "APPROVED" ||
    s === "FULFILLED" ||
    s === "SETTLED"
  ) {
    return "success";
  }

  if (
    s.includes("AWAIT") ||
    s === "PENDING" ||
    s === "OPEN" ||
    s === "PARTIALLY_PAID" ||
    s === "PENDING_APPROVAL"
  ) {
    return "warn";
  }

  if (
    s === "CANCELLED" ||
    s === "DECLINED" ||
    s === "VOID" ||
    s === "REJECTED"
  ) {
    return "danger";
  }

  return "neutral";
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card-2)] p-3">
      <div className="text-[11px] font-black uppercase tracking-[0.08em] text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold text-[var(--app-fg)]">{value}</div>
    </div>
  );
}

function getCreditStatus(sale) {
  return String(sale?.credit?.status ?? sale?.creditStatus ?? "").toUpperCase();
}

function isStuckSale(sale) {
  const saleStatus = String(sale?.status || "").toUpperCase();
  const creditStatus = getCreditStatus(sale);

  if (
    ["DRAFT", "FULFILLED", "AWAITING_PAYMENT_RECORD", "PENDING"].includes(
      saleStatus,
    )
  ) {
    return true;
  }

  if (
    ["PENDING_APPROVAL", "APPROVED", "PARTIALLY_PAID"].includes(creditStatus)
  ) {
    return true;
  }

  return false;
}

function resolveStuckMessage(sale) {
  const saleStatus = String(sale?.status || "").toUpperCase();
  const creditStatus = getCreditStatus(sale);

  if (saleStatus === "DRAFT") {
    return {
      tone: "warn",
      blocker: "Stock has not been released yet.",
      responsibleRole: "Storekeeper",
      destinationLabel: "Open storekeeper flow",
      hint: "This sale is still draft. A storekeeper must fulfill it before seller or cashier steps can happen.",
    };
  }

  if (saleStatus === "FULFILLED") {
    return {
      tone: "warn",
      blocker: "Seller has not marked this sale as paid yet.",
      responsibleRole: "Seller",
      destinationLabel: "Tell seller to mark paid",
      hint: "Stock is already released. The next valid step is seller mark-paid, not payment recording yet.",
    };
  }

  if (saleStatus === "AWAITING_PAYMENT_RECORD") {
    return {
      tone: "warn",
      blocker: "Payment record is still missing.",
      responsibleRole: "Cashier / Manager",
      destinationLabel: "Open payment recording",
      hint: "Seller already marked this sale as paid. The next valid step is recording the payment so the sale becomes completed.",
    };
  }

  if (saleStatus === "PENDING") {
    return {
      tone: "warn",
      blocker: "This sale is sitting in a pending workflow state.",
      responsibleRole: "Manager",
      destinationLabel: "Open sale workflow",
      hint: "This sale needs manager review to decide the next correct action.",
    };
  }

  if (creditStatus === "PENDING_APPROVAL") {
    return {
      tone: "warn",
      blocker: "Credit request is waiting for approval.",
      responsibleRole: "Manager",
      destinationLabel: "Open credit workflow",
      hint: "This sale is blocked until the credit request is approved or rejected.",
    };
  }

  if (creditStatus === "APPROVED") {
    return {
      tone: "info",
      blocker: "Approved credit is still active.",
      responsibleRole: "Manager / Credit follow-up",
      destinationLabel: "Open credit workflow",
      hint: "The credit was approved, but the sale is still open because collection is not finished yet.",
    };
  }

  if (creditStatus === "PARTIALLY_PAID") {
    return {
      tone: "warn",
      blocker: "Credit collection is still open.",
      responsibleRole: "Manager / Credit follow-up",
      destinationLabel: "Open credit workflow",
      hint: "This credit sale still has a remaining balance to collect.",
    };
  }

  return {
    tone: "neutral",
    blocker: "This sale needs manager review.",
    responsibleRole: "Manager",
    destinationLabel: "Open sale workflow",
    hint: "The current state does not map cleanly, so inspect the sale and move it forward safely.",
  };
}

function toneClasses(tone) {
  if (tone === "warn") {
    return "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]";
  }
  if (tone === "danger") {
    return "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]";
  }
  if (tone === "success") {
    return "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]";
  }
  if (tone === "info") {
    return "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]";
  }
  return "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";
}

export default function ManagerSalesSection({
  loadingSales,
  loadSales,
  salesQ,
  setSalesQ,
  salesShown,
  canLoadMoreSales,
  setSalesPage,
  saleDetailsById,
  saleDetailsLoadingById,
  ensureSaleDetails,
  fmt,
  money,
  getCustomerTin,
  getCustomerAddress,
  canCancelSale,
  openCancel,
  openSaleWorkflow,
  openPaymentRecord,
  openCreditRequest,
  canRecordPayment,
  canOpenCreditRequest,
}) {
  const formatMoney = typeof money === "function" ? money : fallbackMoney;
  const formatDate = typeof fmt === "function" ? fmt : fallbackFmt;

  const list = Array.isArray(salesShown) ? salesShown : [];

  return (
    <SectionCard
      title="Sales"
      hint="Review sales, inspect customer details, and move blocked sales forward."
      right={<RefreshButton loading={loadingSales} onClick={loadSales} />}
    >
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <Input
            placeholder="Search: id, status, customer name, phone, tin, address"
            value={salesQ}
            onChange={(e) => setSalesQ(e.target.value)}
          />

          <div className="rounded-full border border-[var(--border)] bg-[var(--card-2)] px-4 py-2 text-sm font-bold text-[var(--app-fg)]">
            {list.length} shown
          </div>
        </div>

        {loadingSales ? (
          <div className="grid gap-3">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            title="No sales found"
            hint="Try another search or refresh the sales list."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {list.map((s) => {
                const sid = s?.id;
                const details = sid ? saleDetailsById?.[sid] : null;
                const items = details?.items || s?.items || [];
                const isItemsLoading = sid
                  ? !!saleDetailsLoadingById?.[sid]
                  : false;
                const top = firstItemLabel(items);

                const customerName =
                  (s?.customerName || s?.customer_name || "").trim() || "—";
                const customerPhone =
                  s?.customerPhone || s?.customer_phone || "";
                const customerTin = getCustomerTin?.(s);
                const customerAddress = getCustomerAddress?.(s);

                const stuck = isStuckSale(s);
                const stuckMessage = resolveStuckMessage(s);
                const saleStatus = String(s?.status || "").toUpperCase();
                const creditStatus = getCreditStatus(s);

                const allowPaymentRecording =
                  typeof canRecordPayment === "function"
                    ? !!canRecordPayment(s)
                    : saleStatus === "AWAITING_PAYMENT_RECORD";

                const allowCreditWorkflow =
                  typeof canOpenCreditRequest === "function"
                    ? !!canOpenCreditRequest(s)
                    : [
                        "PENDING_APPROVAL",
                        "APPROVED",
                        "PARTIALLY_PAID",
                      ].includes(creditStatus);

                const showStorekeeperAction = saleStatus === "DRAFT";
                const showSellerAction = saleStatus === "FULFILLED";
                const showWorkflowAction =
                  saleStatus === "PENDING" ||
                  (!showStorekeeperAction &&
                    !showSellerAction &&
                    !allowPaymentRecording &&
                    !allowCreditWorkflow);

                return (
                  <div
                    key={sid}
                    className="rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] dark:shadow-[0_12px_28px_rgba(0,0,0,0.18)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-black text-[var(--app-fg)]">
                            Sale #{sid ?? "—"}
                          </div>

                          <TinyPill tone={statusTone(s?.status)}>
                            {String(s?.status || "—")}
                          </TinyPill>

                          {creditStatus ? (
                            <TinyPill tone={statusTone(creditStatus)}>
                              Credit: {creditStatus}
                            </TinyPill>
                          ) : null}

                          {stuck ? (
                            <TinyPill tone="warn">Needs action</TinyPill>
                          ) : null}
                        </div>

                        <div className="mt-2 text-xs text-[var(--muted)]">
                          Created:{" "}
                          <b className="text-[var(--app-fg)]">
                            {formatDate(s?.createdAt || s?.created_at)}
                          </b>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                          Total
                        </div>
                        <div className="mt-1 text-2xl font-black tracking-[-0.03em] text-[var(--app-fg)]">
                          {formatMoney(s?.totalAmount ?? s?.total ?? 0)}
                        </div>
                        <div className="text-[11px] text-[var(--muted)]">
                          RWF
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <InfoBox
                        label="Top item"
                        value={isItemsLoading ? "Loading…" : top.name}
                      />
                      <InfoBox label="Customer" value={customerName} />
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <InfoBox
                        label="Quantity"
                        value={isItemsLoading ? "…" : String(top.qty || 0)}
                      />
                      <InfoBox label="Phone" value={customerPhone || "—"} />
                      <InfoBox label="TIN" value={customerTin || "—"} />
                    </div>

                    <div className="mt-3 rounded-[18px] border border-[var(--border)] bg-[var(--card-2)] p-3">
                      <div className="text-[11px] font-black uppercase tracking-[0.08em] text-[var(--muted)]">
                        Address
                      </div>
                      <div className="mt-1 text-sm text-[var(--app-fg)]">
                        {customerAddress || "—"}
                      </div>
                    </div>

                    {stuck ? (
                      <div
                        className={[
                          "mt-4 rounded-[18px] border p-3",
                          toneClasses(stuckMessage.tone),
                        ].join(" ")}
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <div className="text-[11px] font-black uppercase tracking-[0.08em]">
                              Real blocker
                            </div>
                            <div className="mt-1 text-sm font-black">
                              {stuckMessage.blocker}
                            </div>
                          </div>

                          <div>
                            <div className="text-[11px] font-black uppercase tracking-[0.08em]">
                              Responsible role
                            </div>
                            <div className="mt-1 text-sm font-black">
                              {stuckMessage.responsibleRole}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 border-t border-current/15 pt-3">
                          <div className="text-[11px] font-black uppercase tracking-[0.08em]">
                            Action hint
                          </div>
                          <div className="mt-1 text-sm leading-6">
                            {stuckMessage.hint}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {showStorekeeperAction &&
                          typeof openSaleWorkflow === "function" ? (
                            <button
                              type="button"
                              onClick={() => openSaleWorkflow(s)}
                              className="rounded-2xl border border-current px-4 py-2 text-xs font-black uppercase tracking-[0.08em] transition hover:opacity-90"
                            >
                              Open storekeeper flow
                            </button>
                          ) : null}

                          {showSellerAction &&
                          typeof openSaleWorkflow === "function" ? (
                            <button
                              type="button"
                              onClick={() => openSaleWorkflow(s)}
                              className="rounded-2xl border border-current px-4 py-2 text-xs font-black uppercase tracking-[0.08em] transition hover:opacity-90"
                            >
                              Tell seller to mark paid
                            </button>
                          ) : null}

                          {allowPaymentRecording &&
                          typeof openPaymentRecord === "function" ? (
                            <button
                              type="button"
                              onClick={() => openPaymentRecord(s)}
                              className="rounded-2xl border border-current px-4 py-2 text-xs font-black uppercase tracking-[0.08em] transition hover:opacity-90"
                            >
                              Open payment recording
                            </button>
                          ) : null}

                          {allowCreditWorkflow &&
                          typeof openCreditRequest === "function" ? (
                            <button
                              type="button"
                              onClick={() => openCreditRequest(s)}
                              className="rounded-2xl border border-current px-4 py-2 text-xs font-black uppercase tracking-[0.08em] transition hover:opacity-90"
                            >
                              Open credit workflow
                            </button>
                          ) : null}

                          {showWorkflowAction &&
                          typeof openSaleWorkflow === "function" ? (
                            <button
                              type="button"
                              onClick={() => openSaleWorkflow(s)}
                              className="rounded-2xl border border-current px-4 py-2 text-xs font-black uppercase tracking-[0.08em] transition hover:opacity-90"
                            >
                              Open sale workflow
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex gap-2 flex-wrap">
                        {sid && !details && !isItemsLoading ? (
                          <AsyncButton
                            variant="secondary"
                            size="sm"
                            state="idle"
                            text="Load items"
                            loadingText="Loading…"
                            successText="Done"
                            onClick={() => ensureSaleDetails?.(sid)}
                          />
                        ) : null}
                      </div>

                      <AsyncButton
                        variant="danger"
                        size="sm"
                        state="idle"
                        text="Cancel sale"
                        loadingText="Cancelling…"
                        successText="Done"
                        disabled={!canCancelSale?.(s)}
                        onClick={() => openCancel?.(sid)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {canLoadMoreSales ? (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setSalesPage?.((p) => p + 1)}
                  className="rounded-full border border-[var(--border)] bg-[var(--card)] px-5 py-3 text-sm font-bold text-[var(--app-fg)] transition hover:border-[var(--border-strong)] hover:bg-[var(--hover)]"
                >
                  Load more sales
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </SectionCard>
  );
}
