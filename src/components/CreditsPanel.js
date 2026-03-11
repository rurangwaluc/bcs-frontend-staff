"use client";

import { useEffect, useMemo, useState } from "react";

import InternalNotesPanel from "./InternalNotesPanel";
import { apiFetch } from "../lib/api";

const STATUSES = ["", "PENDING", "APPROVED", "SETTLED", "REJECTED"];

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

function normalizeList(data) {
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.credits)) return data.credits;
  return [];
}

function statusLabel(status) {
  const st = String(status || "").toUpperCase();
  if (!st) return "ALL";
  if (st === "PENDING") return "Waiting approval";
  if (st === "APPROVED") return "Approved";
  if (st === "SETTLED") return "Paid";
  if (st === "REJECTED") return "Rejected";
  return st;
}

function StatusBadge({ status }) {
  const st = String(status || "").toUpperCase();
  const label = statusLabel(st);

  const cls =
    st === "PENDING"
      ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
      : st === "APPROVED"
        ? "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]"
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
      {label}
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
    return <div className="text-sm app-muted">No payments recorded yet.</div>;
  }

  return (
    <div className="grid gap-2">
      {rows.map((p, idx) => {
        const amt = Number(p?.amount ?? 0) || 0;
        const method = toStr(p?.method) || "—";
        const at = p?.createdAt || p?.created_at || null;

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
      setRows(normalizeList(data));
      setNextCursor(data?.nextCursor ?? null);
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
      setCreditDetail(data?.credit ?? null);
    } catch (e) {
      toast(
        "danger",
        e?.data?.error || e?.message || "Failed to load credit detail",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    loadFirstPage();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  const paidSum = payments.reduce(
    (sum, p) => sum + (Number(p?.amount || 0) || 0),
    0,
  );
  const amount = Number(detail?.amount || 0) || 0;
  const remaining = Math.max(0, amount - paidSum);

  return (
    <div className="grid gap-4">
      <SectionCard
        title={title}
        hint="Issue date, payment progress, items taken and payment history."
        right={
          <button
            onClick={loadFirstPage}
            className="app-focus rounded-2xl bg-[var(--app-fg)] px-4 py-2 text-sm font-semibold text-[var(--app-bg)] transition hover:opacity-90 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        }
      >
        {msg ? <Banner kind={msgKind}>{msg}</Banner> : null}
      </SectionCard>

      <SectionCard title="Filters" hint="Search by customer name or phone.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </Select>

          <Input
            placeholder="Search name or phone"
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
            Apply
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
              rows.map((c) => (
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
                        <StatusBadge status={c.status} />
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2">
                          <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
                            Issue date
                          </div>
                          <div className="mt-1 text-sm font-semibold text-[var(--app-fg)]">
                            {formatDate(c.createdAt)}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2">
                          <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
                            Paid date
                          </div>
                          <div className="mt-1 text-sm font-semibold text-[var(--app-fg)]">
                            {c.settledAt ? formatDate(c.settledAt) : "—"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 text-xs app-muted">
                        Sale: <b>#{c.saleId ?? "—"}</b>
                      </div>
                    </div>

                    <div className="shrink-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-right">
                      <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
                        Amount
                      </div>
                      <div className="mt-1 text-base font-black text-[var(--app-fg)]">
                        {money(c.amount)}
                      </div>
                      <div className="text-[11px] app-muted">RWF</div>
                    </div>
                  </div>
                </button>
              ))
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
          hint="Items, payments and internal notes."
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
                  <StatusBadge status={detail.status} />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <MiniStat
                    label="Credit amount"
                    value={`${money(detail.amount)} RWF`}
                  />
                  <MiniStat
                    label="Issue date"
                    value={formatDate(detail.createdAt)}
                  />
                  <MiniStat
                    label="Paid date"
                    value={
                      detail.settledAt ? formatDate(detail.settledAt) : "—"
                    }
                  />
                  <MiniStat label="Paid sum" value={`${money(paidSum)} RWF`} />
                  <MiniStat
                    label="Remaining"
                    value={`${money(remaining)} RWF`}
                  />
                  <MiniStat label="Payments" value={String(payments.length)} />
                </div>
              </div>

              <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="text-sm font-extrabold text-[var(--app-fg)]">
                  Items taken
                </div>
                <div className="mt-3">
                  <ItemsList items={items} />
                </div>
              </div>

              <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="text-sm font-extrabold text-[var(--app-fg)]">
                  Payments
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
