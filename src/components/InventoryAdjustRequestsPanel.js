"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import AsyncButton from "./AsyncButton";

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

function Badge({ kind = "gray", children }) {
  const cls =
    kind === "green"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : kind === "amber"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : kind === "red"
          ? "bg-rose-50 text-rose-800 border-rose-200"
          : "bg-slate-50 text-slate-700 border-slate-200";

  return <span className={cx("inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-semibold", cls)}>{children}</span>;
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 animate-pulse">
      <div className="h-4 w-56 bg-slate-200 rounded" />
      <div className="mt-2 h-3 w-40 bg-slate-200 rounded" />
      <div className="mt-3 h-3 w-full bg-slate-200 rounded" />
      <div className="mt-3 h-8 w-40 bg-slate-200 rounded" />
    </div>
  );
}

function normalizeStatus(s) {
  const x = String(s || "").toUpperCase();
  if (x === "APPROVED") return { label: "Approved", kind: "green" };
  if (x === "DECLINED") return { label: "Declined", kind: "red" };
  return { label: "Pending", kind: "amber" };
}

function qtyLabel(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return "0";
  return v > 0 ? `+${v}` : `${v}`;
}

export default function InventoryAdjustRequestsPanel({ title = "Stock change requests" }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info"); // info | success | danger

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("PENDING"); // ALL | PENDING | APPROVED | DECLINED

  const [refreshState, setRefreshState] = useState("idle");
  const [busyMap, setBusyMap] = useState({}); // { [id]: "loading"|"success"|... }

  function toast(kind, text) {
    setMsgKind(kind);
    setMsg(text || "");
  }

  const load = useCallback(async () => {
    setLoading(true);
    toast("info", "");
    try {
      const qs = new URLSearchParams();
      if (status !== "ALL") qs.set("status", status);

      const data = await apiFetch(`${ENDPOINTS.LIST}?${qs.toString()}`, { method: "GET" });

      const list =
        (Array.isArray(data?.requests) ? data.requests : null) ??
        (Array.isArray(data?.items) ? data.items : null) ??
        (Array.isArray(data?.rows) ? data.rows : null) ??
        [];

      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setRows([]);
      toast("danger", e?.data?.error || e?.message || "Could not load requests.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const qq = String(q || "").trim().toLowerCase();
    if (!qq) return rows;

    return (rows || []).filter((r) => {
      const name = String(r?.productName || r?.product_name || "").toLowerCase();
      const sku = String(r?.sku || "").toLowerCase();
      const reason = String(r?.reason || "").toLowerCase();
      const st = String(r?.status || "").toLowerCase();
      const who = String(r?.requestedByName || r?.requested_by_name || r?.requestedByEmail || "").toLowerCase();
      return name.includes(qq) || sku.includes(qq) || reason.includes(qq) || st.includes(qq) || who.includes(qq);
    });
  }, [rows, q]);

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
      await apiFetch(decision === "approve" ? ENDPOINTS.APPROVE(id) : ENDPOINTS.DECLINE(id), { method: "POST" });

      const product = row?.productName || "the item";
      toast("success", decision === "approve" ? `Approved change for ${product}.` : `Declined change for ${product}.`);

      setBusyMap((m) => ({ ...m, [id]: "success" }));
      setTimeout(() => setBusyMap((m) => ({ ...m, [id]: "idle" })), 800);

      await load();
    } catch (e) {
      setBusyMap((m) => ({ ...m, [id]: "idle" }));
      toast("danger", e?.data?.error || e?.message || "Action failed.");
    }
  }

  const bannerStyle =
    msgKind === "success"
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : msgKind === "danger"
        ? "bg-rose-50 text-rose-900 border-rose-200"
        : "bg-slate-50 text-slate-800 border-slate-200";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="text-xs text-slate-600 mt-1">
            Staff ask to correct stock numbers. You can approve or decline.
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

      {msg ? <div className={cx("m-4 rounded-2xl border px-4 py-3 text-sm", bannerStyle)}>{msg}</div> : null}

      <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-2">
        <input
          className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="Search: item name, SKU, reason, staff…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <select
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="ALL">All</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="DECLINED">Declined</option>
        </select>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="grid gap-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">No requests</div>
            <div className="mt-1 text-xs text-slate-600">Nothing to approve right now.</div>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((r) => {
              const productName = r?.productName || r?.product_name || "Unknown item";
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
                <div key={r?.id ?? `${productName}-${createdAt}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">{productName}</div>

                      <div className="mt-1 text-xs text-slate-600">
                        Change: <b>{change}</b>
                        {sku ? (
                          <>
                            {" "}
                            • SKU: <b>{sku}</b>
                          </>
                        ) : null}
                      </div>

                      <div className="mt-2 text-xs text-slate-700">
                        <b>Reason:</b> {reason}
                      </div>

                      <div className="mt-2 text-xs text-slate-500">
                        {who ? `Requested by: ${who} • ` : ""}
                        {createdAt}
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-2">
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