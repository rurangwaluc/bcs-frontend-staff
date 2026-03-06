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
  const rem = mins % 60;
  return `${hrs}h ${rem}m`;
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
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : tone === "warn"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : tone === "danger"
          ? "bg-rose-50 text-rose-900 border-rose-200"
          : "bg-slate-50 text-slate-800 border-slate-200";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-xl border px-2.5 py-1 text-[11px] font-extrabold",
        cls,
      )}
    >
      {s || "—"}
    </span>
  );
}

/** ✅ Robust id getter: supports id, saleId, sale_id */
function getSaleId(row) {
  const v = row?.id ?? row?.saleId ?? row?.sale_id ?? null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** ✅ Robustly extract sale object from ANY likely response shape */
function extractSaleFromResponse(data) {
  if (!data) return null;
  // common shapes:
  // { ok:true, sale:{...} }
  if (data.sale) return data.sale;
  // { data:{ sale:{...} } }
  if (data.data?.sale) return data.data.sale;
  // { ok:true, data:{ sale:{...} } }
  if (data.data?.data?.sale) return data.data.data.sale;
  // fallback: if the response itself looks like a sale
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
    String(first?.productName ?? first?.name ?? first?.title ?? "").trim() ||
    null;

  const qtyRaw = first?.qty ?? first?.quantity ?? first?.count ?? null;
  const qtyNum = Number(qtyRaw);
  const qtyText = Number.isFinite(qtyNum) ? String(qtyNum) : null;

  if (!name && !qtyText) return null;

  return { name: name || "—", qtyText: qtyText || "—" };
}

export default function StuckSalesWidget({ stuck = [], rule }) {
  const rows = useMemo(() => (Array.isArray(stuck) ? stuck : []), [stuck]);

  // show 10, load more +10
  const [shown, setShown] = useState(10);
  const visible = rows.slice(0, shown);
  const canLoadMore = shown < rows.length;

  // top item cache: saleId -> {name, qtyText, state}
  // state: "ready" | "loading" | "missing"
  const [topMap, setTopMap] = useState(() => new Map());
  const fetchingRef = useRef(new Set());

  useEffect(() => {
    let alive = true;

    async function ensureTopItems() {
      for (const row of visible) {
        const saleId = getSaleId(row);
        if (!saleId) continue;

        // If we already have it, skip
        if (topMap.has(saleId)) continue;

        // If row already includes itemsPreview/items, use it immediately (no fetch)
        const direct = pickTopItemFromSaleObject(row);
        if (direct) {
          setTopMap((prev) => {
            const next = new Map(prev);
            next.set(saleId, { ...direct, state: "ready" });
            return next;
          });
          continue;
        }

        // Otherwise fetch /sales/:id (once)
        if (fetchingRef.current.has(saleId)) continue;
        fetchingRef.current.add(saleId);

        // mark as loading (so UI doesn't show fake 0)
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
            if (extracted) next.set(saleId, { ...extracted, state: "ready" });
            else
              next.set(saleId, { name: "—", qtyText: "—", state: "missing" });
            return next;
          });
        } catch {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, rows]);

  return (
    <div className="grid gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-slate-900">
            Stuck sales
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Rule: <span className="font-semibold">{rule || "—"}</span>
          </div>
        </div>
        <span className="shrink-0 inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-extrabold text-slate-900">
          {rows.length} item(s)
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          No stuck sales.
        </div>
      ) : (
        <>
          <div className="grid gap-2">
            {visible.map((row, idx) => {
              const saleId = getSaleId(row);
              const cached = saleId ? topMap.get(saleId) : null;

              const topName = cached?.name ?? "—";
              const topQty = cached?.qtyText ?? "—";

              return (
                <div
                  key={`${saleId || "sale"}-${idx}`}
                  className="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-sm font-extrabold text-slate-900">
                          Sale #{String(saleId ?? row?.id ?? "—")}
                        </div>
                        <StatusPill status={row?.status} />
                      </div>

                      {/* ✅ Two columns inside card */}
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 min-w-0">
                          <div className="text-[11px] font-semibold text-slate-600">
                            Top item
                          </div>
                          <div className="mt-1 text-sm font-extrabold text-slate-900 truncate">
                            {topName}
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="text-[11px] font-semibold text-slate-600">
                            Qty
                          </div>
                          <div className="mt-1 text-sm font-extrabold text-slate-900">
                            {topQty}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-slate-600">
                        Age:{" "}
                        <span className="font-semibold">
                          {fmtAge(row?.ageSeconds)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] font-semibold text-slate-600">
                        Total
                      </div>
                      <div className="text-lg font-extrabold text-slate-900">
                        {money(row?.totalAmount || 0)}
                      </div>
                      <div className="text-[11px] text-slate-500">RWF</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {canLoadMore ? (
            <button
              type="button"
              onClick={() => setShown((n) => n + 10)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
            >
              Load more (+10)
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
