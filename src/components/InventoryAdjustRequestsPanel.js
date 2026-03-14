"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import AsyncButton from "./AsyncButton";
import { apiFetch } from "../lib/api";

const ENDPOINTS = {
  LIST: "/inventory-adjust-requests",
  APPROVE: (id) => `/inventory-adjust-requests/${id}/approve`,
  DECLINE: (id) => `/inventory-adjust-requests/${id}/decline`,
};

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
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

function toneClass(kind = "default") {
  if (kind === "success") {
    return "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]";
  }
  if (kind === "warn") {
    return "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]";
  }
  if (kind === "danger") {
    return "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]";
  }
  if (kind === "info") {
    return "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]";
  }
  return "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";
}

function Badge({ kind = "default", children }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-xl border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em]",
        toneClass(kind),
      )}
    >
      {children}
    </span>
  );
}

function Banner({ kind = "info", children }) {
  return (
    <div
      className={cx(
        "rounded-2xl border px-4 py-3 text-sm",
        toneClass(
          kind === "success"
            ? "success"
            : kind === "danger"
              ? "danger"
              : kind === "warn"
                ? "warn"
                : "info",
        ),
      )}
    >
      {children}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <div className="h-4 w-56 rounded bg-slate-200/70 dark:bg-slate-800/70" />
      <div className="mt-2 h-3 w-40 rounded bg-slate-200/70 dark:bg-slate-800/70" />
      <div className="mt-3 h-3 w-full rounded bg-slate-200/70 dark:bg-slate-800/70" />
      <div className="mt-3 h-8 w-40 rounded bg-slate-200/70 dark:bg-slate-800/70" />
    </div>
  );
}

function normalizeStatus(s) {
  const x = String(s || "").toUpperCase();

  if (x === "APPROVED") return { label: "Approved", kind: "success" };
  if (x === "DECLINED" || x === "REJECTED") {
    return { label: "Declined", kind: "danger" };
  }
  return { label: "Pending", kind: "warn" };
}

function qtyLabel(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return "0";
  return v > 0 ? `+${v}` : `${v}`;
}

export default function InventoryAdjustRequestsPanel({
  title = "Stock change requests",
  refreshToken = 0,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("PENDING");

  const [refreshState, setRefreshState] = useState("idle");
  const [busyMap, setBusyMap] = useState({});

  function toast(kind, text) {
    setMsgKind(kind || "info");
    setMsg(text || "");
  }

  const load = useCallback(async () => {
    setLoading(true);
    toast("info", "");

    try {
      const qs = new URLSearchParams();
      if (status !== "ALL") qs.set("status", status);

      const suffix = qs.toString();
      const url = suffix ? `${ENDPOINTS.LIST}?${suffix}` : ENDPOINTS.LIST;

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
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!refreshToken) return;
    load();
  }, [refreshToken, load]);

  const filtered = useMemo(() => {
    const qq = String(q || "")
      .trim()
      .toLowerCase();
    if (!qq) return rows;

    return (rows || []).filter((r) => {
      const name = String(
        r?.productName || r?.product_name || "",
      ).toLowerCase();
      const sku = String(r?.sku || "").toLowerCase();
      const reason = String(r?.reason || "").toLowerCase();
      const st = String(r?.status || "").toLowerCase();
      const who = String(
        r?.requestedByName ||
          r?.requested_by_name ||
          r?.requestedByEmail ||
          r?.requested_by_email ||
          "",
      ).toLowerCase();

      return (
        name.includes(qq) ||
        sku.includes(qq) ||
        reason.includes(qq) ||
        st.includes(qq) ||
        who.includes(qq)
      );
    });
  }, [rows, q]);

  const pendingCount = useMemo(
    () =>
      (Array.isArray(rows) ? rows : []).filter(
        (r) => String(r?.status || "").toUpperCase() === "PENDING",
      ).length,
    [rows],
  );

  async function onRefresh() {
    setRefreshState("loading");
    await load();
    setRefreshState("success");
    setTimeout(() => setRefreshState("idle"), 900);
  }

  async function act(row, decision) {
    const id = row?.id;
    if (id == null) return;

    setBusyMap((m) => ({ ...m, [id]: "loading" }));
    toast("info", "");

    try {
      await apiFetch(
        decision === "approve" ? ENDPOINTS.APPROVE(id) : ENDPOINTS.DECLINE(id),
        {
          method: "POST",
          body: {},
        },
      );

      const product = row?.productName || row?.product_name || "the item";

      toast(
        "success",
        decision === "approve"
          ? `Approved change for ${product}.`
          : `Declined change for ${product}.`,
      );

      setBusyMap((m) => ({ ...m, [id]: "success" }));
      setTimeout(() => {
        setBusyMap((m) => ({ ...m, [id]: "idle" }));
      }, 800);

      await load();
    } catch (e) {
      setBusyMap((m) => ({ ...m, [id]: "idle" }));
      toast("danger", e?.data?.error || e?.message || "Action failed.");
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] p-4 sm:p-5">
        <div className="min-w-0">
          <div className="text-base font-black text-[var(--app-fg)]">
            {title}
          </div>
          <div className="mt-1 text-sm app-muted">
            Review, approve, or decline stock correction requests with a clean
            audit trail.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge kind={pendingCount > 0 ? "warn" : "success"}>
            {pendingCount > 0 ? `${pendingCount} pending` : "Queue clear"}
          </Badge>

          <AsyncButton
            state={refreshState}
            text="Refresh"
            loadingText="Loading…"
            successText="Done"
            onClick={onRefresh}
            variant="secondary"
          />
        </div>
      </div>

      {msg ? (
        <div className="p-4 pb-0 sm:p-5 sm:pb-0">
          <Banner kind={msgKind}>{msg}</Banner>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 border-b border-[var(--border)] p-4 sm:p-5 md:flex-row">
        <input
          className="app-focus flex-1 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--app-fg)] outline-none transition placeholder:text-[var(--muted)] hover:border-[var(--border-strong)] focus:border-[var(--border-strong)]"
          placeholder="Search by item, SKU, reason, or staff…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <select
          className="app-focus rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--app-fg)] outline-none transition hover:border-[var(--border-strong)] focus:border-[var(--border-strong)]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="ALL">All</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="DECLINED">Declined</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="p-4 sm:p-5">
        {loading ? (
          <div className="grid gap-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card-2)] p-6 text-center">
            <div className="text-sm font-black text-[var(--app-fg)]">
              No requests
            </div>
            <div className="mt-1 text-sm app-muted">
              Nothing needs approval right now.
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((r) => {
              const productName =
                r?.productName || r?.product_name || "Unknown item";
              const sku = r?.sku || null;
              const change = qtyLabel(r?.qtyChange ?? r?.qty_change ?? 0);
              const reason = r?.reason || "—";
              const createdAt = safeDate(r?.createdAt || r?.created_at);
              const stRaw = r?.status;
              const st = normalizeStatus(stRaw);

              const who =
                r?.requestedByName ||
                r?.requested_by_name ||
                r?.requestedByEmail ||
                r?.requested_by_email ||
                null;

              const pending = String(stRaw || "").toUpperCase() === "PENDING";
              const actState = busyMap?.[r?.id] || "idle";
              const busy = actState === "loading";

              return (
                <div
                  key={r?.id ?? `${productName}-${createdAt}`}
                  className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-[var(--app-fg)] sm:text-base">
                        {productName}
                      </div>

                      <div className="mt-1 text-xs app-muted">
                        Change: <b>{change}</b>
                        {sku ? (
                          <>
                            {" "}
                            • SKU: <b>{sku}</b>
                          </>
                        ) : null}
                      </div>

                      <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3 text-sm text-[var(--app-fg)]">
                        <span className="font-semibold">Reason:</span> {reason}
                      </div>

                      <div className="mt-2 text-xs app-muted">
                        {who ? `Requested by: ${who} • ` : ""}
                        {createdAt}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge kind={st.kind}>{st.label}</Badge>

                      {pending ? (
                        <div className="flex gap-2">
                          <AsyncButton
                            state={actState}
                            text="Approve"
                            loadingText="Working…"
                            successText="Approved"
                            onClick={() => act(r, "approve")}
                            disabled={busy}
                          />
                          <AsyncButton
                            state={busy ? "loading" : "idle"}
                            text="Decline"
                            loadingText="Working…"
                            successText="Done"
                            variant="secondary"
                            onClick={() => act(r, "decline")}
                            disabled={busy}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
