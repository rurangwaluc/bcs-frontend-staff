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

export default function CashierRefundsSection({
  currentOpenSession,
  refunds,
  refundsLoading,
  refundQ,
  setRefundQ,
  refundSaleId,
  setRefundSaleId,
  refundReason,
  setRefundReason,
  refundMethod,
  setRefundMethod,
  refundReference,
  setRefundReference,
  refundBtnState,
  methods,
  loadRefunds,
  money,
  safeDate,
  onCreateRefund,
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SectionCard
        title="Create refund"
        hint="Refund a completed sale. Cash refund needs open session."
      >
        <form
          className="grid max-w-md grid-cols-1 gap-3 md:grid-cols-2"
          onSubmit={onCreateRefund}
        >
          <Input
            placeholder="Sale ID"
            value={refundSaleId}
            onChange={(e) => setRefundSaleId(e.target.value)}
          />
          <Select
            value={refundMethod}
            onChange={(e) => setRefundMethod(e.target.value)}
          >
            {methods.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
          <Input
            placeholder="Reference (optional)"
            value={refundReference}
            onChange={(e) => setRefundReference(e.target.value)}
          />
          <Input
            placeholder="Reason (optional)"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
          />

          <div className="md:col-span-2">
            <AsyncButton
              type="submit"
              variant="primary"
              state={refundBtnState}
              text="Save refund"
              loadingText="Saving…"
              successText="Saved"
              className="w-full"
            />
          </div>
        </form>

        {!currentOpenSession ? (
          <div className="mt-3">
            <Banner kind="warn">
              If you refund by cash, open a cash session first.
            </Banner>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Refunds"
        hint="Latest refund records"
        right={<RefreshButton loading={refundsLoading} onClick={loadRefunds} />}
      >
        <Input
          placeholder="Search"
          value={refundQ}
          onChange={(e) => setRefundQ(e.target.value)}
        />

        <div className="mt-3">
          {refundsLoading ? (
            <div className="grid gap-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="grid gap-2">
              {(Array.isArray(refunds) ? refunds : [])
                .filter((r) => {
                  const q = String(refundQ || "")
                    .trim()
                    .toLowerCase();
                  if (!q) return true;
                  const hay = [
                    r?.id,
                    r?.saleId ?? r?.sale_id,
                    r?.amount,
                    r?.method,
                    r?.reason,
                  ]
                    .map((v) => String(v ?? ""))
                    .join(" ")
                    .toLowerCase();
                  return hay.includes(q);
                })
                .slice(0, 60)
                .map((r, idx) => (
                  <div
                    key={r?.id || idx}
                    className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-[var(--app-fg)]">
                          Refund #{r?.id ?? "—"}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs app-muted">
                          <TinyPill tone="info">
                            {String(r?.method ?? "—").toUpperCase()}
                          </TinyPill>
                          <span>
                            Sale: <b>#{r?.saleId ?? r?.sale_id ?? "—"}</b>
                          </span>
                        </div>
                        <div className="mt-1 text-xs app-muted">
                          Time: <b>{safeDate(r?.createdAt || r?.created_at)}</b>
                        </div>
                        <div className="mt-2 break-words text-xs app-muted">
                          Reason: <b>{r?.reason ?? "—"}</b>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-xs app-muted">Amount</div>
                        <div className="text-lg font-extrabold text-[var(--app-fg)]">
                          {money(r?.amount ?? 0)}
                        </div>
                        <div className="text-[11px] app-muted">RWF</div>
                      </div>
                    </div>
                  </div>
                ))}

              {(Array.isArray(refunds) ? refunds : []).length === 0 ? (
                <div className="text-sm app-muted">No refunds yet.</div>
              ) : null}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
