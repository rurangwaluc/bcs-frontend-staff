"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { apiFetch } from "../lib/api";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function money(n) {
  const x = Number(n || 0);
  return Number.isFinite(x) ? Math.round(x).toLocaleString() : "0";
}

function fmtAge(seconds) {
  const s = Number(seconds || 0);
  if (!Number.isFinite(s) || s <= 0) return "—";

  const mins = Math.floor(s / 60);
  if (mins < 60) return `${mins}m`;

  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs < 24) return `${hrs}h ${remMins}m`;

  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  return `${days}d ${remHrs}h`;
}

function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function StatusPill({ status }) {
  const s = String(status || "").toUpperCase();

  const tone =
    s.includes("CANCEL") || s.includes("VOID")
      ? "danger"
      : s.includes("COMPLETE") || s === "PAID"
        ? "success"
        : s.includes("AWAIT") || s.includes("PEND") || s.includes("DRAFT")
          ? "warn"
          : "neutral";

  const cls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
        : tone === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
          : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em]",
        cls,
      )}
    >
      {s || "—"}
    </span>
  );
}

function MiniStat({ label, value, tone = "default" }) {
  const toneCls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)]"
        : tone === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)]"
          : "border-[var(--border)] bg-[var(--card-2)]";

  return (
    <div className={cx("rounded-2xl border p-3", toneCls)}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
        {label}
      </div>
      <div className="mt-1 text-sm font-black text-[var(--app-fg)]">
        {value}
      </div>
    </div>
  );
}

function Skeleton({ className = "" }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70",
        className,
      )}
    />
  );
}

function LoadingCard() {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-2 h-4 w-28" />

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>

          <Skeleton className="mt-3 h-4 w-24" />
        </div>

        <div className="w-20 shrink-0">
          <Skeleton className="h-4 w-12 ml-auto" />
          <Skeleton className="mt-2 h-7 w-16 ml-auto" />
        </div>
      </div>
    </div>
  );
}

/** supports id, saleId, sale_id */
function getSaleId(row) {
  const v = row?.id ?? row?.saleId ?? row?.sale_id ?? null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function extractSaleFromResponse(data) {
  if (!data) return null;
  if (data.sale) return data.sale;
  if (data.data?.sale) return data.data.sale;
  if (data.data?.data?.sale) return data.data.data.sale;
  if (data.items || data.itemsPreview) return data;
  return null;
}

function pickTopItemFromSaleObject(saleLike) {
  const preview = Array.isArray(saleLike?.itemsPreview)
    ? saleLike.itemsPreview
    : null;

  const items = Array.isArray(saleLike?.items) ? saleLike.items : null;

  const first = (preview && preview[0]) || (items && items[0]) || null;

  const name =
    toStr(first?.productName ?? first?.name ?? first?.title ?? first?.label) ||
    null;

  const qtyRaw = first?.qty ?? first?.quantity ?? first?.count ?? null;
  const qtyNum = Number(qtyRaw);
  const qtyText = Number.isFinite(qtyNum) ? String(qtyNum) : null;

  if (!name && !qtyText) return null;

  return {
    name: name || "—",
    qtyText: qtyText || "—",
  };
}

function topItemTone(state) {
  if (state === "loading") return "warn";
  if (state === "missing") return "default";
  return "success";
}

export default function StuckSalesWidget({ stuck = [], rule }) {
  const rows = useMemo(() => (Array.isArray(stuck) ? stuck : []), [stuck]);

  const [shown, setShown] = useState(10);
  const visible = rows.slice(0, shown);
  const canLoadMore = shown < rows.length;

  // saleId -> { name, qtyText, state }
  const [topMap, setTopMap] = useState(() => new Map());
  const fetchingRef = useRef(new Set());

  useEffect(() => {
    setShown(10);
  }, [rows]);

  useEffect(() => {
    let alive = true;

    async function ensureTopItems() {
      for (const row of visible) {
        const saleId = getSaleId(row);
        if (!saleId) continue;

        if (topMap.has(saleId)) continue;
        if (fetchingRef.current.has(saleId)) continue;

        const direct = pickTopItemFromSaleObject(row);
        if (direct) {
          setTopMap((prev) => {
            const next = new Map(prev);
            next.set(saleId, { ...direct, state: "ready" });
            return next;
          });
          continue;
        }

        fetchingRef.current.add(saleId);

        setTopMap((prev) => {
          const next = new Map(prev);
          next.set(saleId, {
            name: "Loading…",
            qtyText: "…",
            state: "loading",
          });
          return next;
        });

        try {
          const data = await apiFetch(`/sales/${saleId}`, { method: "GET" });
          if (!alive) return;

          const sale = extractSaleFromResponse(data);
          const extracted = pickTopItemFromSaleObject(sale);

          setTopMap((prev) => {
            const next = new Map(prev);
            if (extracted) {
              next.set(saleId, { ...extracted, state: "ready" });
            } else {
              next.set(saleId, { name: "—", qtyText: "—", state: "missing" });
            }
            return next;
          });
        } catch {
          if (!alive) return;
          setTopMap((prev) => {
            const next = new Map(prev);
            next.set(saleId, { name: "—", qtyText: "—", state: "missing" });
            return next;
          });
        } finally {
          fetchingRef.current.delete(saleId);
        }
      }
    }

    ensureTopItems();

    return () => {
      alive = false;
    };
  }, [visible, topMap]);

  const totalValue = useMemo(
    () =>
      rows.reduce((sum, row) => sum + (Number(row?.totalAmount ?? 0) || 0), 0),
    [rows],
  );

  const longestAgeSeconds = useMemo(
    () =>
      rows.reduce(
        (max, row) => Math.max(max, Number(row?.ageSeconds ?? 0) || 0),
        0,
      ),
    [rows],
  );

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MiniStat
          label="Stuck sales"
          value={String(rows.length)}
          tone={rows.length > 0 ? "warn" : "success"}
        />
        <MiniStat
          label="Total value"
          value={`${money(totalValue)} RWF`}
          tone="default"
        />
        <MiniStat
          label="Oldest age"
          value={fmtAge(longestAgeSeconds)}
          tone={longestAgeSeconds > 0 ? "danger" : "default"}
        />
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <div className="text-base font-black text-[var(--app-fg)]">
              Stuck sales
            </div>
            <div className="mt-1 text-sm app-muted">
              Rule:{" "}
              <span className="font-semibold text-[var(--app-fg)]">
                {rule || "—"}
              </span>
            </div>
          </div>

          <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--card-2)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--app-fg)]">
            {rows.length} item(s)
          </span>
        </div>

        <div className="p-4 sm:p-5">
          {rows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card-2)] p-8 text-center">
              <div className="text-base font-black text-[var(--app-fg)]">
                No stuck sales
              </div>
              <div className="mt-2 text-sm app-muted">
                Everything is moving normally right now.
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-3">
                {visible.map((row, idx) => {
                  const saleId = getSaleId(row);
                  const cached = saleId ? topMap.get(saleId) : null;

                  const topName = cached?.name ?? "—";
                  const topQty = cached?.qtyText ?? "—";
                  const topState = cached?.state ?? "missing";

                  return (
                    <div
                      key={`${saleId || "sale"}-${idx}`}
                      className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm transition hover:bg-[var(--hover)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-black text-[var(--app-fg)] sm:text-base">
                              Sale #{String(saleId ?? row?.id ?? "—")}
                            </div>
                            <StatusPill status={row?.status} />
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div
                              className={cx(
                                "rounded-2xl border p-3",
                                topState === "loading"
                                  ? "border-[var(--warn-border)] bg-[var(--warn-bg)]"
                                  : "border-[var(--border)] bg-[var(--card-2)]",
                              )}
                            >
                              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
                                Top item
                              </div>
                              <div className="mt-1 truncate text-sm font-black text-[var(--app-fg)]">
                                {topName}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
                                Qty
                              </div>
                              <div className="mt-1 text-sm font-black text-[var(--app-fg)]">
                                {topQty}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--card-2)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--app-fg)]">
                              Age {fmtAge(row?.ageSeconds)}
                            </span>

                            {topState === "loading" ? (
                              <span className="inline-flex items-center rounded-full border border-[var(--warn-border)] bg-[var(--warn-bg)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--warn-fg)]">
                                Loading item
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
                            Total
                          </div>
                          <div className="mt-1 text-lg font-black text-[var(--app-fg)]">
                            {money(row?.totalAmount || 0)}
                          </div>
                          <div className="text-[11px] app-muted">RWF</div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {visible.some((row) => {
                  const saleId = getSaleId(row);
                  const state = saleId ? topMap.get(saleId)?.state : null;
                  return state === "loading";
                }) ? (
                  <div className="grid gap-3">
                    <LoadingCard />
                  </div>
                ) : null}
              </div>

              {canLoadMore ? (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShown((n) => n + 10)}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-3 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
                  >
                    Load more (+10)
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
