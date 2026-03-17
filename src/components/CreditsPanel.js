"use client";

import { useEffect, useMemo, useState } from "react";

import InternalNotesPanel from "./InternalNotesPanel";
import { apiFetch } from "../lib/api";

const STATUSES = [
  "",
  "PENDING",
  "APPROVED",
  "PARTIALLY_PAID",
  "SETTLED",
  "REJECTED",
];

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "MOMO", label: "MoMo" },
  { value: "CARD", label: "Card" },
  { value: "BANK", label: "Bank" },
  { value: "OTHER", label: "Other" },
];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function money(n) {
  const x = Number(n || 0);
  return Number.isFinite(x) ? Math.round(x).toLocaleString() : "0";
}

function formatDate(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

function formatDateOnly(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString();
  } catch {
    return String(value);
  }
}

function normalizeList(data) {
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.credits)) return data.credits;
  return [];
}

function normalizeMode(mode) {
  return String(mode || "").toUpperCase();
}

function localStatusLabel(status, mode) {
  const st = String(status || "").toUpperCase();
  const m = normalizeMode(mode);

  if (!st) return "ALL";
  if (st === "PENDING" || st === "PENDING_APPROVAL") return "Pending approval";
  if (st === "APPROVED") {
    return m === "INSTALLMENT_PLAN"
      ? "Approved as installment plan"
      : "Approved as open balance";
  }
  if (st === "PARTIALLY_PAID") return "Partially paid";
  if (st === "SETTLED") return "Settled";
  if (st === "REJECTED") return "Credit request rejected";
  return st;
}

function resolveStatusLabel(rowOrDetail) {
  return (
    toStr(rowOrDetail?.statusLabel) ||
    localStatusLabel(
      rowOrDetail?.status,
      rowOrDetail?.creditMode ?? rowOrDetail?.credit_mode,
    )
  );
}

function creditModeLabel(mode) {
  const m = String(mode || "").toUpperCase();
  if (m === "INSTALLMENT_PLAN") return "Installment plan";
  if (m === "OPEN_BALANCE") return "Open balance";
  return m || "—";
}

function collectibleScopeLabel(detail) {
  const mode = String(
    detail?.creditMode ?? detail?.credit_mode ?? "OPEN_BALANCE",
  ).toUpperCase();

  const status = String(detail?.status || "").toUpperCase();

  if (!["APPROVED", "PARTIALLY_PAID"].includes(status)) {
    return "Collection locked";
  }

  if (mode === "INSTALLMENT_PLAN") {
    return "Collect against active installments";
  }

  return "Collect against remaining balance";
}

function installmentStatusLabel(status) {
  const st = String(status || "").toUpperCase();
  if (st === "PAID") return "Paid";
  if (st === "PARTIALLY_PAID") return "Partially paid";
  if (st === "OVERDUE") return "Overdue";
  return st || "Pending";
}

function preferredMessage(payload, fallback) {
  return (
    payload?.detailMessage ||
    payload?.message ||
    payload?.data?.detailMessage ||
    payload?.data?.message ||
    fallback
  );
}

function resolvePlanSummary(detail) {
  if (toStr(detail?.planSummary)) return toStr(detail.planSummary);

  const mode = String(
    detail?.creditMode ?? detail?.credit_mode ?? "OPEN_BALANCE",
  ).toUpperCase();

  const installments = Array.isArray(detail?.installments)
    ? detail.installments
    : [];

  if (mode === "INSTALLMENT_PLAN") {
    return installments.length
      ? `${installments.length} installment${installments.length === 1 ? "" : "s"} planned`
      : "Installment plan";
  }

  return "Single running balance";
}

function resolveRemainingBalanceLabel(detail, remaining) {
  if (toStr(detail?.remainingBalanceLabel)) {
    return toStr(detail.remainingBalanceLabel);
  }
  return `Remaining balance ${money(remaining)} RWF`;
}

function resolveNextInstallmentDueLabel(detail) {
  const raw = detail?.nextInstallmentDue;
  if (!raw) return "—";
  return formatDateOnly(raw);
}

function buildRowSummaryLine(row) {
  const planSummary =
    toStr(row?.planSummary) ||
    (normalizeMode(row?.creditMode ?? row?.credit_mode) === "INSTALLMENT_PLAN"
      ? "Installment plan"
      : "Open balance");

  const nextDue = row?.nextInstallmentDue
    ? `Next due ${formatDateOnly(row.nextInstallmentDue)}`
    : "";

  const remaining =
    toStr(row?.remainingBalanceLabel) ||
    `Remaining balance ${money(row?.remainingAmount || 0)} RWF`;

  return [planSummary, nextDue, remaining].filter(Boolean).join(" • ");
}

function StatusBadge({ status, mode, label }) {
  const st = String(status || "").toUpperCase();
  const resolvedLabel = toStr(label) || localStatusLabel(st, mode);

  const cls =
    st === "PENDING" || st === "PENDING_APPROVAL"
      ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
      : st === "APPROVED"
        ? "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]"
        : st === "PARTIALLY_PAID"
          ? "border-sky-300 bg-sky-100 text-sky-800"
          : st === "SETTLED"
            ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
            : st === "REJECTED"
              ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
              : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-extrabold",
        cls,
      )}
    >
      {resolvedLabel}
    </span>
  );
}

function Banner({ kind = "info", children }) {
  const styles =
    kind === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
      : kind === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
        : kind === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
          : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

  return (
    <div className={cx("rounded-2xl border px-4 py-3 text-sm", styles)}>
      {children}
    </div>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={cx(
        "app-focus w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--app-fg)] outline-none",
        "placeholder:text-[var(--muted-2)]",
        className,
      )}
    />
  );
}

function Select({ className = "", ...props }) {
  return (
    <select
      {...props}
      className={cx(
        "app-focus w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--app-fg)] outline-none",
        className,
      )}
    />
  );
}

function TextArea({ className = "", ...props }) {
  return (
    <textarea
      {...props}
      className={cx(
        "app-focus w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--app-fg)] outline-none",
        "placeholder:text-[var(--muted-2)]",
        className,
      )}
    />
  );
}

function SectionCard({ title, hint, right, children }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-base font-black text-[var(--app-fg)]">
            {title}
          </div>
          {hint ? <div className="mt-1 text-sm app-muted">{hint}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
        {label}
      </div>
      <div className="mt-1 text-sm font-black text-[var(--app-fg)]">
        {value}
      </div>
    </div>
  );
}

function ItemsList({ items }) {
  const rows = Array.isArray(items) ? items : [];
  if (!rows.length) {
    return <div className="text-sm app-muted">No items found.</div>;
  }

  return (
    <div className="grid gap-2">
      {rows.map((it, idx) => {
        const name = it?.productName || it?.name || `#${it?.productId ?? "—"}`;
        const sku = it?.sku || "—";
        const qty = Number(it?.qty ?? 0) || 0;
        const unit = Number(it?.unitPrice ?? 0) || 0;
        const line = Number(it?.lineTotal ?? 0) || 0;

        return (
          <div
            key={it?.id || `${it?.productId}-${idx}`}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-extrabold text-[var(--app-fg)]">
                  {name}
                </div>
                <div className="mt-1 break-words text-xs app-muted">
                  SKU: <b>{sku}</b>
                </div>
              </div>

              <div className="shrink-0 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-right">
                <div className="text-[11px] app-muted">Qty</div>
                <div className="text-lg font-extrabold text-[var(--app-fg)]">
                  {qty}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-2">
                <div className="text-[11px] app-muted">Unit</div>
                <div className="text-sm font-bold text-[var(--app-fg)]">
                  {money(unit)}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-2">
                <div className="text-[11px] app-muted">Line</div>
                <div className="text-sm font-bold text-[var(--app-fg)]">
                  {money(line)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PaymentsList({ payments }) {
  const rows = Array.isArray(payments) ? payments : [];
  if (!rows.length) {
    return (
      <div className="text-sm app-muted">No credit payments recorded yet.</div>
    );
  }

  return (
    <div className="grid gap-2">
      {rows.map((p, idx) => {
        const amt = Number(p?.amount ?? 0) || 0;
        const method = toStr(p?.method) || "—";
        const at = p?.createdAt || p?.created_at || null;
        const installmentLabel =
          p?.installmentSequenceNo != null
            ? `Installment #${p.installmentSequenceNo}`
            : null;

        return (
          <div
            key={p?.id || idx}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3"
          >
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-[var(--app-fg)]">
                {money(amt)} RWF
              </div>
              <div className="mt-1 text-xs app-muted">
                Method: <b>{method}</b>
              </div>
              <div className="mt-1 text-xs app-muted">
                Date: <b>{formatDate(at)}</b>
              </div>
              {installmentLabel ? (
                <div className="mt-1 text-xs app-muted">
                  Schedule: <b>{installmentLabel}</b>
                </div>
              ) : null}
              {p?.reference ? (
                <div className="mt-1 break-words text-xs app-muted">
                  Ref: {toStr(p.reference)}
                </div>
              ) : null}
              {p?.note ? (
                <div className="mt-1 break-words text-xs app-muted">
                  Note: {toStr(p.note)}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InstallmentsList({ installments }) {
  const rows = Array.isArray(installments) ? installments : [];
  if (!rows.length) {
    return <div className="text-sm app-muted">No installment schedule.</div>;
  }

  return (
    <div className="grid gap-2">
      {rows.map((it, idx) => {
        const status = String(it?.status || "PENDING").toUpperCase();

        const pillCls =
          status === "PAID"
            ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
            : status === "PARTIALLY_PAID"
              ? "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]"
              : status === "OVERDUE"
                ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
                : "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]";

        return (
          <div
            key={it?.id || idx}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-[var(--app-fg)]">
                  Installment #{it?.installmentNo ?? it?.sequenceNo ?? idx + 1}
                </div>
                <div className="mt-1 text-xs app-muted">
                  Due: <b>{formatDate(it?.dueDate || it?.due_date)}</b>
                </div>
                {it?.note ? (
                  <div className="mt-1 break-words text-xs app-muted">
                    Note: {toStr(it.note)}
                  </div>
                ) : null}
              </div>

              <span
                className={cx(
                  "inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-extrabold",
                  pillCls,
                )}
              >
                {installmentStatusLabel(status)}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <MiniStat
                label="Amount"
                value={`${money(it?.amount ?? 0)} RWF`}
              />
              <MiniStat
                label="Paid"
                value={`${money(it?.paidAmount ?? 0)} RWF`}
              />
              <MiniStat
                label="Remaining"
                value={`${money(it?.remainingAmount ?? 0)} RWF`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CreditCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
      <div className="h-5 w-40 rounded-xl bg-slate-200/70 dark:bg-slate-700/60" />
      <div className="mt-3 h-4 w-48 rounded-xl bg-slate-200/70 dark:bg-slate-700/60" />
      <div className="mt-2 h-4 w-40 rounded-xl bg-slate-200/70 dark:bg-slate-700/60" />
      <div className="mt-2 h-4 w-24 rounded-xl bg-slate-200/70 dark:bg-slate-700/60" />
    </div>
  );
}

export default function CreditsPanel({
  title = "Credits",
  capabilities = {
    canView: true,
    canCreate: false,
    canDecide: false,
    canSettle: false,
  },
}) {
  const [rows, setRows] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(30);
  const [selectedId, setSelectedId] = useState(null);
  const [creditDetail, setCreditDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionNote, setDecisionNote] = useState("");

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "CASH",
    note: "",
    reference: "",
    cashSessionId: "",
    installmentId: "",
  });

  function toast(kind, text) {
    setMsgKind(kind);
    setMsg(text || "");
  }

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", String(q).trim());
    params.set(
      "limit",
      String(Math.min(200, Math.max(1, Number(limit || 30)))),
    );
    return params.toString();
  }, [status, q, limit]);

  async function loadFirstPage() {
    if (!capabilities.canView) return;
    setLoading(true);
    toast("info", "");
    try {
      const data = await apiFetch(`/credits?${queryString}`, { method: "GET" });
      const items = normalizeList(data);
      setRows(items);
      setNextCursor(data?.nextCursor ?? null);

      if (items.length > 0 && !selectedId) {
        setSelectedId(items[0].id);
      }
    } catch (e) {
      setRows([]);
      setNextCursor(null);
      toast("danger", e?.data?.error || e?.message || "Failed to load credits");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!nextCursor || loadingMore || !capabilities.canView) return;
    setLoadingMore(true);
    toast("info", "");
    try {
      const data = await apiFetch(
        `/credits?${queryString}&cursor=${encodeURIComponent(String(nextCursor))}`,
        { method: "GET" },
      );
      setRows((prev) => prev.concat(normalizeList(data)));
      setNextCursor(data?.nextCursor ?? null);
    } catch (e) {
      toast(
        "danger",
        e?.data?.error || e?.message || "Failed to load more credits",
      );
    } finally {
      setLoadingMore(false);
    }
  }

  async function openCredit(id) {
    if (!capabilities.canView) return;
    setSelectedId(id);
    setCreditDetail(null);
    setDetailLoading(true);
    toast("info", "");

    try {
      const data = await apiFetch(`/credits/${id}`, { method: "GET" });
      const detail = data?.credit ?? null;
      setCreditDetail(detail);

      const remaining = Number(detail?.remainingAmount ?? 0) || 0;
      const installments = Array.isArray(detail?.installments)
        ? detail.installments
        : [];

      const nextInstallment =
        installments.find((x) =>
          ["PENDING", "PARTIALLY_PAID", "OVERDUE"].includes(
            String(x?.status || "").toUpperCase(),
          ),
        ) || null;

      const nextInstallmentRemainingRaw =
        nextInstallment?.remainingAmount != null
          ? Number(nextInstallment.remainingAmount)
          : Math.max(
              0,
              (Number(nextInstallment?.amount ?? 0) || 0) -
                (Number(nextInstallment?.paidAmount ?? 0) || 0),
            );

      const nextInstallmentRemaining = Number.isFinite(
        nextInstallmentRemainingRaw,
      )
        ? nextInstallmentRemainingRaw
        : 0;

      const suggestedAmount =
        nextInstallmentRemaining > 0 ? nextInstallmentRemaining : remaining;

      setPaymentForm({
        amount: suggestedAmount > 0 ? String(suggestedAmount) : "",
        method: "CASH",
        note: "",
        reference: "",
        cashSessionId: "",
        installmentId: nextInstallment?.id ? String(nextInstallment.id) : "",
      });
      setDecisionNote("");
    } catch (e) {
      toast(
        "danger",
        e?.data?.error || e?.message || "Failed to load credit detail",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function decideCredit(decision) {
    if (!capabilities.canDecide || !creditDetail?.id || decisionLoading) return;

    setDecisionLoading(true);
    toast("info", "");
    try {
      const res = await apiFetch(`/credits/${creditDetail.id}/decision`, {
        method: "PATCH",
        body: {
          decision,
          note: toStr(decisionNote) || undefined,
        },
      });

      toast(
        "success",
        preferredMessage(
          res,
          decision === "APPROVE"
            ? "Approved successfully"
            : "Rejected successfully",
        ),
      );

      await Promise.all([loadFirstPage(), openCredit(creditDetail.id)]);
    } catch (e) {
      toast("danger", preferredMessage(e, "Failed to process credit decision"));
    } finally {
      setDecisionLoading(false);
    }
  }

  async function recordCreditPayment() {
    if (!capabilities.canSettle || !creditDetail?.id || paymentLoading) return;

    const amt = Number(paymentForm.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast("warn", "Enter a valid amount.");
      return;
    }

    setPaymentLoading(true);
    toast("info", "");
    try {
      const body = {
        amount: Math.round(amt),
        method: toStr(paymentForm.method || "CASH").toUpperCase(),
      };

      if (toStr(paymentForm.note)) body.note = toStr(paymentForm.note);
      if (toStr(paymentForm.reference)) {
        body.reference = toStr(paymentForm.reference);
      }
      if (toStr(paymentForm.cashSessionId)) {
        body.cashSessionId = Number(paymentForm.cashSessionId);
      }
      if (toStr(paymentForm.installmentId)) {
        body.installmentId = Number(paymentForm.installmentId);
      }

      const res = await apiFetch(`/credits/${creditDetail.id}/payment`, {
        method: "PATCH",
        body,
      });

      toast("success", preferredMessage(res, "Credit payment recorded"));

      await Promise.all([loadFirstPage(), openCredit(creditDetail.id)]);
    } catch (e) {
      toast("danger", preferredMessage(e, "Failed to record credit payment"));
    } finally {
      setPaymentLoading(false);
    }
  }

  useEffect(() => {
    loadFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!capabilities.canView) {
    return (
      <SectionCard title={title}>
        <Banner kind="warn">You cannot view credits.</Banner>
      </SectionCard>
    );
  }

  const detail = creditDetail || null;
  const payments = Array.isArray(detail?.payments) ? detail.payments : [];
  const items = Array.isArray(detail?.items) ? detail.items : [];
  const installments = Array.isArray(detail?.installments)
    ? detail.installments
    : [];

  const principal = Number(detail?.principalAmount ?? detail?.amount ?? 0) || 0;
  const paidSum =
    Number(detail?.paidAmount ?? 0) ||
    payments.reduce((sum, p) => sum + (Number(p?.amount || 0) || 0), 0);
  const remaining =
    Number(detail?.remainingAmount ?? Math.max(0, principal - paidSum)) || 0;

  const detailStatus = String(detail?.status || "").toUpperCase();
  const creditMode = String(
    detail?.creditMode ?? detail?.credit_mode ?? "OPEN_BALANCE",
  ).toUpperCase();

  const modeLabel = creditModeLabel(creditMode);
  const collectionLabel = collectibleScopeLabel(detail);

  const hasInstallmentPlan = creditMode === "INSTALLMENT_PLAN";
  const canCollect =
    capabilities.canSettle &&
    ["APPROVED", "PARTIALLY_PAID"].includes(detailStatus);

  const detailStatusLabel = resolveStatusLabel(detail);
  const detailPlanSummary = resolvePlanSummary(detail);
  const detailRemainingBalanceLabel = resolveRemainingBalanceLabel(
    detail,
    remaining,
  );
  const detailNextInstallmentDueLabel = resolveNextInstallmentDueLabel(detail);

  return (
    <div className="grid gap-4">
      <SectionCard
        title={title}
        hint="Credit request, approval, partial collection, and final settlement."
      >
        {msg ? <Banner kind={msgKind}>{msg}</Banner> : null}
      </SectionCard>

      <SectionCard
        title="Filters"
        hint="Search by customer name, phone, sale id, or credit id."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {localStatusLabel(s)}
              </option>
            ))}
          </Select>

          <Input
            placeholder="Search name, phone, sale or credit"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <Input
            type="number"
            min="1"
            max="200"
            value={String(limit)}
            onChange={(e) => setLimit(Number(e.target.value))}
          />

          <button
            onClick={loadFirstPage}
            className="app-focus rounded-2xl bg-[var(--app-fg)] px-4 py-2.5 text-sm font-semibold text-[var(--app-bg)] transition hover:opacity-90 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Loading…" : "Apply"}
          </button>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          title="Credits list"
          hint="Select a credit to open full detail."
        >
          <div className="grid gap-3">
            {loading ? (
              <>
                <CreditCardSkeleton />
                <CreditCardSkeleton />
                <CreditCardSkeleton />
              </>
            ) : rows.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-5 text-sm app-muted">
                No credits found.
              </div>
            ) : (
              rows.map((c) => {
                const rowModeValue =
                  c?.creditMode ?? c?.credit_mode ?? "OPEN_BALANCE";
                const rowMode = creditModeLabel(rowModeValue);
                const rowStatusLabel = resolveStatusLabel(c);
                const rowSummary = buildRowSummaryLine(c);

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => openCredit(c.id)}
                    className={cx(
                      "w-full rounded-3xl border p-4 text-left transition",
                      selectedId === c.id
                        ? "border-[var(--border-strong)] bg-[var(--card-2)] shadow-sm"
                        : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--hover)]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-base font-black text-[var(--app-fg)]">
                            {c.customerName || "—"}
                            {c.customerPhone ? ` • ${c.customerPhone}` : ""}
                          </div>
                          <StatusBadge
                            status={c.status}
                            mode={rowModeValue}
                            label={rowStatusLabel}
                          />
                        </div>

                        <div className="mt-2 text-xs app-muted">
                          Sale: <b>#{c.saleId ?? "—"}</b> • Mode:{" "}
                          <b>{rowMode}</b>
                        </div>

                        <div className="mt-2 text-xs app-muted">
                          {rowSummary}
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2">
                            <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
                              Principal
                            </div>
                            <div className="mt-1 text-sm font-semibold text-[var(--app-fg)]">
                              {money(c.principalAmount ?? c.amount)} RWF
                            </div>
                          </div>

                          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2">
                            <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
                              Remaining
                            </div>
                            <div className="mt-1 text-sm font-semibold text-[var(--app-fg)]">
                              {money(c.remainingAmount)} RWF
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-right">
                        <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
                          Paid
                        </div>
                        <div className="mt-1 text-base font-black text-[var(--app-fg)]">
                          {money(c.paidAmount)}
                        </div>
                        <div className="text-[11px] app-muted">RWF</div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-xs app-muted">
              {nextCursor ? "More credits available." : "End of list."}
            </div>
            <button
              onClick={loadMore}
              disabled={!nextCursor || loadingMore}
              className={cx(
                "app-focus rounded-2xl px-4 py-2.5 text-sm font-semibold transition",
                nextCursor
                  ? "bg-[var(--app-fg)] text-[var(--app-bg)] hover:opacity-90"
                  : "bg-[var(--card-2)] text-[var(--muted-2)]",
              )}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        </SectionCard>

        <SectionCard
          title="Credit detail"
          hint="Items, schedule, collection history, and internal notes."
        >
          {detailLoading ? (
            <div className="grid gap-3">
              <CreditCardSkeleton />
              <CreditCardSkeleton />
            </div>
          ) : !detail ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-5 text-sm app-muted">
              Pick a credit from the list.
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-base font-black text-[var(--app-fg)]">
                      Credit #{detail.id}
                    </div>
                    <div className="mt-1 text-sm app-muted">
                      Customer: <b>{detail.customerName || "—"}</b>{" "}
                      {detail.customerPhone ? `(${detail.customerPhone})` : ""}
                    </div>
                    <div className="mt-1 text-sm app-muted">
                      Sale: <b>#{detail.saleId ?? "—"}</b>
                    </div>
                  </div>
                  <StatusBadge
                    status={detail.status}
                    mode={creditMode}
                    label={detailStatusLabel}
                  />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <MiniStat
                    label="Principal"
                    value={`${money(principal)} RWF`}
                  />
                  <MiniStat label="Paid" value={`${money(paidSum)} RWF`} />
                  <MiniStat
                    label="Remaining"
                    value={`${money(remaining)} RWF`}
                  />
                  <MiniStat
                    label="Issue date"
                    value={formatDate(detail.createdAt)}
                  />
                  <MiniStat
                    label="Due date"
                    value={detail.dueDate ? formatDate(detail.dueDate) : "—"}
                  />
                  <MiniStat label="Mode" value={modeLabel} />
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
                      Collection scope
                    </div>
                    <div className="mt-1 text-sm font-bold text-[var(--app-fg)]">
                      {collectionLabel}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
                      Status
                    </div>
                    <div className="mt-1 text-sm font-bold text-[var(--app-fg)]">
                      {detailStatusLabel}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <MiniStat label="Plan summary" value={detailPlanSummary} />
                  <MiniStat
                    label="Next due"
                    value={detailNextInstallmentDueLabel}
                  />
                  <MiniStat
                    label="Remaining balance"
                    value={detailRemainingBalanceLabel}
                  />
                </div>
              </div>

              {capabilities.canDecide && detailStatus === "PENDING" ? (
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="text-sm font-extrabold text-[var(--app-fg)]">
                    Decision
                  </div>

                  <div className="mt-1 text-sm app-muted">
                    Approve to activate collection. Reject to stop the request.
                  </div>

                  <div className="mt-3">
                    <TextArea
                      rows={3}
                      placeholder="Decision note (optional)"
                      value={decisionNote}
                      onChange={(e) => setDecisionNote(e.target.value)}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={decisionLoading}
                      onClick={() => decideCredit("APPROVE")}
                      className="app-focus rounded-2xl bg-[var(--app-fg)] px-4 py-2.5 text-sm font-semibold text-[var(--app-bg)] transition hover:opacity-90 disabled:opacity-60"
                    >
                      {decisionLoading ? "Saving…" : "Approve"}
                    </button>
                    <button
                      type="button"
                      disabled={decisionLoading}
                      onClick={() => decideCredit("REJECT")}
                      className="app-focus rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--danger-fg)] transition hover:opacity-90 disabled:opacity-60"
                    >
                      {decisionLoading ? "Saving…" : "Reject"}
                    </button>
                  </div>
                </div>
              ) : null}

              {canCollect ? (
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="text-sm font-extrabold text-[var(--app-fg)]">
                    Record payment
                  </div>
                  <div className="mt-1 text-sm app-muted">
                    {hasInstallmentPlan
                      ? "Record a collection for this approved installment plan."
                      : "Record a partial or full collection against this approved open balance."}
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input
                      type="number"
                      min="1"
                      max={String(remaining || 0)}
                      placeholder="Amount"
                      value={paymentForm.amount}
                      onChange={(e) =>
                        setPaymentForm((p) => ({
                          ...p,
                          amount: e.target.value,
                        }))
                      }
                    />

                    <Select
                      value={paymentForm.method}
                      onChange={(e) =>
                        setPaymentForm((p) => ({
                          ...p,
                          method: e.target.value,
                        }))
                      }
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </Select>

                    {hasInstallmentPlan ? (
                      <Select
                        value={paymentForm.installmentId}
                        onChange={(e) =>
                          setPaymentForm((p) => ({
                            ...p,
                            installmentId: e.target.value,
                          }))
                        }
                      >
                        <option value="">Auto-pick next installment</option>
                        {installments
                          .filter((x) =>
                            ["PENDING", "PARTIALLY_PAID", "OVERDUE"].includes(
                              String(x?.status || "").toUpperCase(),
                            ),
                          )
                          .map((x, idx) => {
                            const instRemaining =
                              x?.remainingAmount != null
                                ? Number(x.remainingAmount)
                                : Math.max(
                                    0,
                                    (Number(x?.amount ?? 0) || 0) -
                                      (Number(x?.paidAmount ?? 0) || 0),
                                  );

                            return (
                              <option key={x.id || idx} value={String(x.id)}>
                                {`Installment #${x.installmentNo ?? x.sequenceNo ?? idx + 1} • Remaining ${money(instRemaining)} RWF`}
                              </option>
                            );
                          })}
                      </Select>
                    ) : (
                      <Input
                        placeholder="Cash session id (optional)"
                        value={paymentForm.cashSessionId}
                        onChange={(e) =>
                          setPaymentForm((p) => ({
                            ...p,
                            cashSessionId: e.target.value,
                          }))
                        }
                      />
                    )}

                    <Input
                      placeholder="Reference (optional)"
                      value={paymentForm.reference}
                      onChange={(e) =>
                        setPaymentForm((p) => ({
                          ...p,
                          reference: e.target.value,
                        }))
                      }
                    />
                  </div>

                  {hasInstallmentPlan ? (
                    <div className="mt-3">
                      <Input
                        placeholder="Cash session id (optional)"
                        value={paymentForm.cashSessionId}
                        onChange={(e) =>
                          setPaymentForm((p) => ({
                            ...p,
                            cashSessionId: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ) : null}

                  <div className="mt-3">
                    <TextArea
                      rows={3}
                      placeholder="Payment note (optional)"
                      value={paymentForm.note}
                      onChange={(e) =>
                        setPaymentForm((p) => ({
                          ...p,
                          note: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={paymentLoading}
                      onClick={recordCreditPayment}
                      className="app-focus rounded-2xl bg-[var(--app-fg)] px-4 py-2.5 text-sm font-semibold text-[var(--app-bg)] transition hover:opacity-90 disabled:opacity-60"
                    >
                      {paymentLoading ? "Saving…" : "Record payment"}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="text-sm font-extrabold text-[var(--app-fg)]">
                  Items taken
                </div>
                <div className="mt-3">
                  <ItemsList items={items} />
                </div>
              </div>

              {hasInstallmentPlan ? (
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-extrabold text-[var(--app-fg)]">
                        Installment schedule
                      </div>
                      <div className="mt-1 text-sm app-muted">
                        Planned repayment milestones for this credit.
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-sm font-bold text-[var(--app-fg)]">
                      {installments.length} row
                      {installments.length === 1 ? "" : "s"}
                    </div>
                  </div>

                  <div className="mt-3">
                    <InstallmentsList installments={installments} />
                  </div>
                </div>
              ) : null}

              <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="text-sm font-extrabold text-[var(--app-fg)]">
                  Payment history
                </div>
                <div className="mt-1 text-sm app-muted">
                  Recorded collections for this credit.
                </div>
                <div className="mt-3">
                  <PaymentsList payments={payments} />
                </div>
              </div>

              {detail.note ? (
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--app-fg)]">
                  <b>Note:</b> {detail.note}
                </div>
              ) : null}

              <InternalNotesPanel
                title="Internal notes (Credit)"
                entityType="credit"
                entityId={detail.id}
                canCreate={false}
              />
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
