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
  if (st === "APPROVED") return "Approved (awaiting payment)";
  if (st === "SETTLED") return "Paid";
  if (st === "REJECTED") return "Rejected";
  return st;
}

function StatusBadge({ status }) {
  const st = String(status || "").toUpperCase();
  const label = statusLabel(st);

  const cls =
    st === "PENDING"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : st === "APPROVED"
        ? "bg-sky-50 text-sky-800 border-sky-200"
        : st === "SETTLED"
          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
          : st === "REJECTED"
            ? "bg-rose-50 text-rose-800 border-rose-200"
            : "bg-slate-50 text-slate-700 border-slate-200";

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
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : kind === "warn"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : kind === "danger"
          ? "bg-rose-50 text-rose-900 border-rose-200"
          : "bg-slate-50 text-slate-800 border-slate-200";

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
        "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none",
        "focus:ring-2 focus:ring-slate-300",
        className,
      )}
    />
  );
}

function SectionCard({ title, hint, right, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {hint ? (
            <div className="mt-1 text-xs text-slate-600">{hint}</div>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="text-xs font-semibold text-slate-600">{label}</div>
      <div className="mt-1 text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}

function ItemsList({ items }) {
  const rows = Array.isArray(items) ? items : [];
  if (!rows.length) {
    return <div className="text-sm text-slate-600">No items found.</div>;
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
            className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-slate-900 truncate">
                  {name}
                </div>
                <div className="mt-1 text-xs text-slate-600 break-words">
                  SKU: <b>{sku}</b>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-xs text-slate-600">Qty</div>
                <div className="text-lg font-extrabold text-slate-900">
                  {qty}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-200 bg-white p-2">
                <div className="text-[11px] text-slate-600">Unit</div>
                <div className="text-sm font-bold text-slate-900">
                  {money(unit)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-2">
                <div className="text-[11px] text-slate-600">Line</div>
                <div className="text-sm font-bold text-slate-900">
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
      <div className="text-sm text-slate-600">No payments recorded yet.</div>
    );
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
            className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-slate-900">
                  {money(amt)} RWF
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  Method: <b>{method}</b>
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  Date: <b>{formatDate(at)}</b>
                </div>
                {p?.note ? (
                  <div className="mt-1 text-xs text-slate-600 break-words">
                    Note: {toStr(p.note)}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
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

  const [status, setStatus] = useState(""); // ALL
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
    const lim = Math.min(200, Math.max(1, Number(limit || 30)));
    params.set("limit", String(lim));
    return params.toString();
  }, [status, q, limit]);

  async function loadFirstPage() {
    if (!capabilities.canView) return;
    setLoading(true);
    toast("info", "");
    try {
      const data = await apiFetch(`/credits?${queryString}`, { method: "GET" });
      const list = normalizeList(data);
      setRows(list);
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
      const list = normalizeList(data);
      setRows((prev) => prev.concat(list));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!capabilities.canView) {
    return (
      <SectionCard title={title} hint="">
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
        hint="Issue date + paid date + what items were taken."
        right={
          <button
            onClick={loadFirstPage}
            className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        }
      >
        {msg ? <Banner kind={msgKind}>{msg}</Banner> : null}
      </SectionCard>

      <SectionCard title="Filters" hint="Search by customer name or phone.">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>

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
            className="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
            disabled={loading}
          >
            Apply
          </button>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Credits list" hint="Click a card to open details.">
          <div className="grid gap-2">
            {loading ? (
              <div className="text-sm text-slate-600">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="text-sm text-slate-600">No credits found.</div>
            ) : (
              rows.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openCredit(c.id)}
                  className={cx(
                    "w-full text-left rounded-2xl border p-3 hover:bg-slate-50",
                    selectedId === c.id
                      ? "border-slate-400 bg-slate-50"
                      : "border-slate-200 bg-white",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-sm font-extrabold text-slate-900 truncate">
                          {c.customerName || "—"}
                          {c.customerPhone ? ` • ${c.customerPhone}` : ""}
                        </div>
                        <StatusBadge status={c.status} />
                      </div>

                      <div className="mt-2 text-xs text-slate-600">
                        Issue date: <b>{formatDate(c.createdAt)}</b>
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        Paid date:{" "}
                        <b>{c.settledAt ? formatDate(c.settledAt) : "—"}</b>
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        Sale: <b>#{c.saleId ?? "—"}</b>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs text-slate-600">Amount</div>
                      <div className="text-sm font-extrabold text-slate-900">
                        {money(c.amount)}
                      </div>
                      <div className="text-[11px] text-slate-500">RWF</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="text-xs text-slate-600">
              {nextCursor ? "More rows exist." : "End."}
            </div>
            <button
              onClick={loadMore}
              disabled={!nextCursor || loadingMore}
              className={cx(
                "rounded-xl px-4 py-2.5 text-sm font-semibold",
                nextCursor
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "bg-slate-100 text-slate-400",
              )}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        </SectionCard>

        <SectionCard
          title="Credit detail"
          hint="Items + payments (future-ready for installments)."
        >
          {detailLoading ? (
            <div className="text-sm text-slate-600">Loading…</div>
          ) : !detail ? (
            <div className="text-sm text-slate-600">
              Pick a credit from the list.
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-slate-900">
                      Credit #{detail.id}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      Customer: <b>{detail.customerName || "—"}</b>{" "}
                      {detail.customerPhone ? `(${detail.customerPhone})` : ""}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      Sale: <b>#{detail.saleId ?? "—"}</b>
                    </div>
                  </div>
                  <StatusBadge status={detail.status} />
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <MiniStat
                    label="Paid (sum)"
                    value={`${money(paidSum)} RWF`}
                  />
                  <MiniStat
                    label="Remaining"
                    value={`${money(remaining)} RWF`}
                  />
                  <MiniStat label="Payments" value={String(payments.length)} />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-extrabold text-slate-900">
                  Items taken
                </div>
                <div className="mt-2">
                  <ItemsList items={items} />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-extrabold text-slate-900">
                  Payments
                </div>
                <div className="mt-2">
                  <PaymentsList payments={payments} />
                </div>
              </div>

              {detail.note ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
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
