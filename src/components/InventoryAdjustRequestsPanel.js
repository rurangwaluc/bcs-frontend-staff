"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import AsyncButton from "./AsyncButton";
import { apiFetch } from "../lib/api";

const ENDPOINTS = {
  LIST: "/inventory-adjust-requests",
  APPROVE: (id) =>
    Number.isFinite(Number(id)) && Number(id) > 0
      ? `/inventory-adjust-requests/${Number(id)}/approve`
      : "",
  DECLINE: (id) =>
    Number.isFinite(Number(id)) && Number(id) > 0
      ? `/inventory-adjust-requests/${Number(id)}/decline`
      : "",
};

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function safeDate(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

function qtyLabel(v) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return "0";
  if (n > 0) return `+${Math.round(n).toLocaleString()}`;
  return `${Math.round(n).toLocaleString()}`;
}

function statusMeta(status) {
  const st = String(status || "")
    .trim()
    .toUpperCase();

  if (st === "APPROVED") {
    return {
      label: "Approved",
      tone: "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]",
    };
  }

  if (st === "DECLINED" || st === "REJECTED") {
    return {
      label: st === "REJECTED" ? "Rejected" : "Declined",
      tone: "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]",
    };
  }

  return {
    label: "Pending",
    tone: "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]",
  };
}

function Banner({ kind = "info", children }) {
  const cls =
    kind === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
      : kind === "danger"
        ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
        : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

  return (
    <div className={cx("rounded-2xl border px-4 py-3 text-sm", cls)}>
      {children}
    </div>
  );
}

function Pill({ children, tone = "default" }) {
  const cls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
        : tone === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
          : tone === "info"
            ? "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]"
            : "border-[var(--border)] bg-[var(--card)] text-[var(--app-fg)]";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em]",
        cls,
      )}
    >
      {children}
    </span>
  );
}

function StatCard({ label, value, sub, tone = "default" }) {
  const cls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)]"
        : tone === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)]"
          : tone === "info"
            ? "border-[var(--info-border)] bg-[var(--info-bg)]"
            : "border-[var(--border)] bg-[var(--card-2)]";

  return (
    <div className={cx("rounded-2xl border p-4", cls)}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
        {label}
      </div>
      <div className="mt-1 text-lg font-black text-[var(--app-fg)]">
        {value}
      </div>
      {sub ? <div className="mt-1 text-xs app-muted">{sub}</div> : null}
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={cx(
        "app-focus w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--app-fg)] outline-none transition",
        "placeholder:text-[var(--muted)] hover:border-[var(--border-strong)] focus:border-[var(--border-strong)]",
        props.className || "",
      )}
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className={cx(
        "app-focus w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--app-fg)] outline-none transition",
        "hover:border-[var(--border-strong)] focus:border-[var(--border-strong)]",
        props.className || "",
      )}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <div className="animate-pulse">
        <div className="h-4 w-56 rounded bg-slate-200/70 dark:bg-slate-800/70" />
        <div className="mt-2 h-3 w-40 rounded bg-slate-200/70 dark:bg-slate-800/70" />
        <div className="mt-4 h-3 w-full rounded bg-slate-200/70 dark:bg-slate-800/70" />
        <div className="mt-2 h-3 w-[80%] rounded bg-slate-200/70 dark:bg-slate-800/70" />
        <div className="mt-4 flex gap-2">
          <div className="h-9 w-24 rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
          <div className="h-9 w-24 rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card-2)] p-8 text-center">
      <div className="text-base font-black text-[var(--app-fg)]">
        No requests found
      </div>
      <div className="mt-2 text-sm app-muted">
        Nothing needs a decision right now for the selected filter.
      </div>
    </div>
  );
}

function RequestCard({ row, state, onApprove, onDecline }) {
  const productName =
    toStr(row?.productDisplayName) ||
    toStr(row?.productName) ||
    toStr(row?.product_name) ||
    (row?.productId ? `Product #${row.productId}` : "Unknown item");

  const sku = toStr(row?.sku);
  const reason = toStr(row?.reason) || "—";
  const status = statusMeta(row?.status);
  const qtyChange = qtyLabel(row?.qtyChange ?? row?.qty_change ?? 0);
  const requestedBy =
    toStr(row?.requestedByName) ||
    toStr(row?.requested_by_name) ||
    toStr(row?.requestedByEmail) ||
    toStr(row?.requested_by_email) ||
    "Unknown staff";
  const decisionNote =
    toStr(row?.decisionReason) ||
    toStr(row?.managerComment) ||
    toStr(row?.declineReason) ||
    "";
  const pending = String(row?.status || "").toUpperCase() === "PENDING";
  const busy = state === "loading";

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-base font-black text-[var(--app-fg)]">
              {productName}
            </div>
            <span
              className={cx(
                "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em]",
                status.tone,
              )}
            >
              {status.label}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {row?.id ? <Pill>Request #{row.id}</Pill> : null}
            {row?.productId ? <Pill>Product #{row.productId}</Pill> : null}
            {sku ? <Pill tone="info">SKU: {sku}</Pill> : null}
            <Pill
              tone={
                String(qtyChange).startsWith("+")
                  ? "success"
                  : String(qtyChange).startsWith("-")
                    ? "warn"
                    : "default"
              }
            >
              {qtyChange}
            </Pill>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            Requested
          </div>
          <div className="mt-1 text-xs app-muted">
            {safeDate(row?.createdAt || row?.created_at)}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Requested by" value={requestedBy} />
        <StatCard
          label="Branch"
          value={toStr(row?.locationName) || toStr(row?.branchName) || "—"}
        />
        <StatCard
          label="Decision date"
          value={safeDate(
            row?.approvedAt ||
              row?.approved_at ||
              row?.declinedAt ||
              row?.declined_at ||
              row?.updatedAt ||
              row?.updated_at,
          )}
        />
        <StatCard
          label="Approver"
          value={
            toStr(row?.approvedByName) ||
            toStr(row?.decidedByName) ||
            toStr(row?.managerName) ||
            "—"
          }
        />
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
          Reason
        </div>
        <div className="mt-2 whitespace-pre-wrap break-words text-sm text-[var(--app-fg)]">
          {reason}
        </div>
      </div>

      {decisionNote ? (
        <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            Decision note
          </div>
          <div className="mt-2 whitespace-pre-wrap break-words text-sm text-[var(--app-fg)]">
            {decisionNote}
          </div>
        </div>
      ) : null}

      {pending ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <AsyncButton
            state={state}
            text="Approve"
            loadingText="Working…"
            successText="Approved"
            onClick={() => onApprove(row)}
            disabled={busy}
          />
          <AsyncButton
            variant="secondary"
            state={busy ? "loading" : "idle"}
            text="Decline"
            loadingText="Working…"
            successText="Done"
            onClick={() => onDecline(row)}
            disabled={busy}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function InventoryAdjustRequestsPanel({
  title = "Stock change requests",
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("PENDING");

  const [refreshState, setRefreshState] = useState("idle");
  const [busyMap, setBusyMap] = useState({});

  const toast = useCallback((kind, text) => {
    setMsgKind(kind || "info");
    setMsg(text || "");
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (status !== "ALL") qs.set("status", status);

      const url = `${ENDPOINTS.LIST}${qs.toString() ? `?${qs.toString()}` : ""}`;
      const data = await apiFetch(url, { method: "GET" });

      const list =
        (Array.isArray(data?.requests) ? data.requests : null) ??
        (Array.isArray(data?.items) ? data.items : null) ??
        (Array.isArray(data?.rows) ? data.rows : null) ??
        [];

      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setRows([]);
      toast(
        "danger",
        e?.data?.error || e?.message || "Could not load requests.",
      );
    } finally {
      setLoading(false);
    }
  }, [status, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const qq = String(q || "")
      .trim()
      .toLowerCase();
    if (!qq) return rows;

    return (Array.isArray(rows) ? rows : []).filter((r) => {
      const hay = [
        r?.id,
        r?.productId,
        r?.productDisplayName,
        r?.productName,
        r?.product_name,
        r?.sku,
        r?.reason,
        r?.status,
        r?.requestedByName,
        r?.requested_by_name,
        r?.requestedByEmail,
        r?.requested_by_email,
      ]
        .map((x) => String(x ?? ""))
        .join(" ")
        .toLowerCase();

      return hay.includes(qq);
    });
  }, [rows, q]);

  const summary = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];

    let pending = 0;
    let approved = 0;
    let declined = 0;

    for (const row of list) {
      const st = String(row?.status || "").toUpperCase();
      if (st === "PENDING") pending += 1;
      else if (st === "APPROVED") approved += 1;
      else if (st === "DECLINED" || st === "REJECTED") declined += 1;
    }

    return { total: list.length, pending, approved, declined };
  }, [rows]);

  const onRefresh = useCallback(async () => {
    setRefreshState("loading");
    await load();
    setRefreshState("success");
    setTimeout(() => setRefreshState("idle"), 900);
  }, [load]);

  const act = useCallback(
    async (row, decision) => {
      const id = Number(row?.id);
      if (!Number.isFinite(id) || id <= 0) {
        toast("danger", "Invalid request id.");
        return;
      }

      const endpoint =
        decision === "approve" ? ENDPOINTS.APPROVE(id) : ENDPOINTS.DECLINE(id);

      if (!endpoint) {
        toast("danger", "Invalid request action.");
        return;
      }

      setBusyMap((prev) => ({ ...prev, [id]: "loading" }));

      try {
        await apiFetch(endpoint, { method: "POST" });

        const label =
          toStr(row?.productDisplayName) ||
          toStr(row?.productName) ||
          "the item";

        toast(
          "success",
          decision === "approve"
            ? `Approved change for ${label}.`
            : `Declined change for ${label}.`,
        );

        setBusyMap((prev) => ({ ...prev, [id]: "success" }));
        setTimeout(() => {
          setBusyMap((prev) => ({ ...prev, [id]: "idle" }));
        }, 800);

        await load();
      } catch (e) {
        setBusyMap((prev) => ({ ...prev, [id]: "idle" }));
        toast("danger", e?.data?.error || e?.message || "Action failed.");
      }
    },
    [load, toast],
  );

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden">
      <div className="border-b border-[var(--border)] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-black text-[var(--app-fg)]">
              {title}
            </div>
            <div className="mt-1 text-sm app-muted">
              Review, approve, or decline inventory correction requests while
              keeping the decision trail clean.
            </div>
          </div>

          <AsyncButton
            state={refreshState}
            text="Refresh"
            loadingText="Loading…"
            successText="Done"
            onClick={onRefresh}
            variant="secondary"
          />
        </div>

        {msg ? (
          <div className="mt-4">
            <Banner kind={msgKind}>{msg}</Banner>
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total"
            value={String(summary.total)}
            sub="Loaded requests"
            tone="info"
          />
          <StatCard
            label="Pending"
            value={String(summary.pending)}
            sub="Waiting decision"
            tone={summary.pending > 0 ? "warn" : "default"}
          />
          <StatCard
            label="Approved"
            value={String(summary.approved)}
            sub="Accepted corrections"
            tone={summary.approved > 0 ? "success" : "default"}
          />
          <StatCard
            label="Declined"
            value={String(summary.declined)}
            sub="Rejected corrections"
            tone={summary.declined > 0 ? "danger" : "default"}
          />
        </div>
      </div>

      <div className="border-b border-[var(--border)] p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
          <Input
            placeholder="Search by product, SKU, reason, request id, or staff…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="DECLINED">Declined</option>
            <option value="REJECTED">Rejected</option>
          </Select>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {loading ? (
          <div className="grid gap-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-3">
            {filtered.map((row) => (
              <RequestCard
                key={String(
                  row?.id ||
                    `${row?.productId || "x"}-${row?.createdAt || row?.created_at || Math.random()}`,
                )}
                row={row}
                state={busyMap?.[row?.id] || "idle"}
                onApprove={(item) => act(item, "approve")}
                onDecline={(item) => act(item, "decline")}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
