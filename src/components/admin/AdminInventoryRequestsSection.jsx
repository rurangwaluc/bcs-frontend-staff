"use client";

import {
  AdminEmptyState,
  AdminInfoCard,
  AdminSectionCard,
  AdminSkeletonBlock,
  AdminStatCard,
  cx,
} from "./adminShared";

import AsyncButton from "../AsyncButton";
import InventoryAdjustRequestsPanel from "../InventoryAdjustRequestsPanel";

function RequestPlaybookCard({ title, body, tone = "default" }) {
  const toneCls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)]"
        : tone === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)]"
          : "border-[var(--border)] bg-[var(--card-2)]";

  return (
    <div className={cx("rounded-2xl border p-4", toneCls)}>
      <div className="text-sm font-extrabold text-[var(--app-fg)]">{title}</div>
      <div className="mt-2 text-sm text-[var(--app-fg)]">{body}</div>
    </div>
  );
}

export default function AdminInventoryRequestsSection({
  refreshNonce = 0,
  invReqPendingCount = 0,
  invReqCountLoading = false,
  loadInvReqPendingCount,
}) {
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="Pending"
          value={invReqCountLoading ? "…" : String(invReqPendingCount)}
          sub="Waiting decision"
          tone={invReqPendingCount > 0 ? "warn" : "success"}
        />
        <AdminStatCard
          label="Admin authority"
          value="Full"
          sub="Can review, approve, decline"
          tone="info"
        />
        <AdminStatCard
          label="Control model"
          value="Protected"
          sub="Requests should stay auditable"
        />
        <AdminStatCard
          label="Escalation"
          value="Manual"
          sub="Open proof when request feels suspicious"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.18fr_0.82fr]">
        <AdminSectionCard
          title="Inventory adjustment requests"
          hint="Admin has broader control than manager, but every approval should still be evidence-based."
          right={
            <div className="flex items-center gap-2">
              {invReqPendingCount > 0 ? (
                <span className="inline-flex items-center rounded-full border border-[var(--warn-border)] bg-[var(--warn-bg)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--warn-fg)]">
                  {invReqPendingCount} pending
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-[var(--success-border)] bg-[var(--success-bg)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--success-fg)]">
                  Clear
                </span>
              )}

              <AsyncButton
                variant="secondary"
                size="sm"
                state={invReqCountLoading ? "loading" : "idle"}
                text="Refresh count"
                loadingText="Refreshing…"
                successText="Done"
                onClick={loadInvReqPendingCount}
              />
            </div>
          }
        >
          <InventoryAdjustRequestsPanel refreshToken={refreshNonce} />
        </AdminSectionCard>

        <div className="grid gap-4">
          <AdminSectionCard
            title="Approval playbook"
            hint="Use this standard before you approve quantity movement."
          >
            <div className="grid gap-3">
              <RequestPlaybookCard
                title="Approve when"
                tone="success"
                body="The product matches, the quantity is plausible, the reason is specific, and the movement can be explained by a real business event."
              />
              <RequestPlaybookCard
                title="Pause when"
                tone="warn"
                body="The reason is vague, the quantity is unusually large, the item is fast-moving and high-value, or the request arrives without supporting history."
              />
              <RequestPlaybookCard
                title="Decline when"
                tone="danger"
                body="The request would hide shrinkage, force negative stock logic, or contradict available arrival, sale, or count evidence."
              />
            </div>
          </AdminSectionCard>

          <AdminSectionCard
            title="Investigation shortcuts"
            hint="Where admin should look next."
          >
            {invReqCountLoading ? (
              <div className="grid gap-3">
                <AdminSkeletonBlock className="h-20 w-full rounded-2xl" />
                <AdminSkeletonBlock className="h-20 w-full rounded-2xl" />
                <AdminSkeletonBlock className="h-20 w-full rounded-2xl" />
              </div>
            ) : invReqPendingCount === 0 ? (
              <AdminEmptyState
                title="No pending pressure"
                description="The queue is clean right now. Refresh later if staff submits new requests."
              />
            ) : (
              <div className="grid gap-3">
                <AdminInfoCard
                  title="Queue pressure"
                  value={String(invReqPendingCount)}
                  sub="Pending request(s) need review"
                  tone={invReqPendingCount > 5 ? "danger" : "warn"}
                />
                <AdminInfoCard
                  title="Best next check"
                  value="Proof & history"
                  sub="Verify the product trail before making a decision"
                  tone="info"
                />
                <AdminInfoCard
                  title="Admin reminder"
                  value="Do not normalize bad stock habits"
                  sub="One careless approval creates repeated inventory drift"
                  tone="danger"
                />
              </div>
            )}
          </AdminSectionCard>
        </div>
      </div>
    </div>
  );
}
