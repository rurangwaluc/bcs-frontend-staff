"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiFetch } from "../lib/api";

function safeDate(v) {
  if (!v) return "-";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function uniqStrings(arr) {
  const out = [];
  const seen = new Set();
  for (const v of arr || []) {
    const s = toStr(v);
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function safeNum(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function isPresent(v) {
  return v !== undefined && v !== null && String(v) !== "";
}

/**
 * AuditLogsPanel
 * - Uses backend GET /audit with filters + cursor pagination.
 * - Uses backend GET /audit/actions to populate action dropdown (optional).
 *
 * Expected backend:
 * GET /audit -> { ok: true, rows: [], nextCursor: number|null }
 * GET /audit/actions -> { ok: true, actions: [] }
 */
export default function AuditLogsPanel({
  title = "Audit logs",
  subtitle = "",
  defaultLimit = 50,

  // Optional initial server-side filters for deep links / evidence views.
  // Example: { entity: "sale", entityId: "uuid", from: "2026-01-01", to: "2026-01-31", q: "john" }
  initialFilters = null,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const init =
    initialFilters && typeof initialFilters === "object" ? initialFilters : {};

  // server-side filters
  const [q, setQ] = useState(() => toStr(init.q));
  const [action, setAction] = useState(() => toStr(init.action));
  const [entity, setEntity] = useState(() => toStr(init.entity));
  const [userId, setUserId] = useState(() => toStr(init.userId));
  const [entityId, setEntityId] = useState(() => toStr(init.entityId));
  const [from, setFrom] = useState(() => toStr(init.from)); // YYYY-MM-DD
  const [to, setTo] = useState(() => toStr(init.to)); // YYYY-MM-DD
  const [limit, setLimit] = useState(() => {
    const n = Number(init.limit ?? defaultLimit);
    return Number.isFinite(n) && n > 0 ? n : 50;
  });

  // cursor pagination
  const [cursor, setCursor] = useState(() =>
    init.cursor === undefined ? null : init.cursor,
  );
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // dropdown data
  const [actionsRaw, setActionsRaw] = useState([]);
  const actions = useMemo(() => uniqStrings(actionsRaw), [actionsRaw]);

  const buildParams = useCallback(
    (overrideCursor) => {
      const params = new URLSearchParams();

      const l = safeNum(limit, Number(defaultLimit) || 50);
      params.set("limit", String(l));

      const cur = overrideCursor === undefined ? cursor : overrideCursor;
      if (isPresent(cur)) params.set("cursor", String(cur));

      const a = toStr(action);
      const e = toStr(entity);
      const qq = toStr(q);
      const uid = toStr(userId);
      const eid = toStr(entityId);
      const f = toStr(from);
      const t = toStr(to);

      if (a) params.set("action", a);
      if (e) params.set("entity", e);
      if (qq) params.set("q", qq);
      if (uid) params.set("userId", uid);
      if (eid) params.set("entityId", eid);
      if (f) params.set("from", f);
      if (t) params.set("to", t);

      return params.toString();
    },
    [
      action,
      cursor,
      defaultLimit,
      entity,
      entityId,
      from,
      limit,
      q,
      to,
      userId,
    ],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      // New load resets pagination cursor
      setCursor(null);

      const qs = buildParams(null);
      const data = await apiFetch(`/audit?${qs}`);
      const list = data?.rows ?? data?.audit ?? data?.logs ?? [];
      setRows(Array.isArray(list) ? list : []);
      setNextCursor(data?.nextCursor === undefined ? null : data?.nextCursor);
    } catch (e) {
      setRows([]);
      setNextCursor(null);
      setMsg(e?.data?.error || e?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  const loadMore = useCallback(async () => {
    if (!isPresent(nextCursor)) return;

    setLoadingMore(true);
    setMsg("");

    try {
      const qs = buildParams(nextCursor);
      const data = await apiFetch(`/audit?${qs}`);
      const newRows = data?.rows ?? data?.audit ?? data?.logs ?? [];

      setRows((prev) => {
        const prevArr = Array.isArray(prev) ? prev : [];
        const incoming = Array.isArray(newRows) ? newRows : [];

        // de-dup by id (defensive)
        const seen = new Set(prevArr.map((r) => r?.id).filter(Boolean));
        const merged = prevArr.slice();
        for (const r of incoming) {
          if (!r?.id || seen.has(r.id)) continue;
          seen.add(r.id);
          merged.push(r);
        }
        return merged;
      });

      setCursor(nextCursor);
      setNextCursor(data?.nextCursor === undefined ? null : data?.nextCursor);
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }, [buildParams, nextCursor]);

  // load action dropdown options (best effort)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await apiFetch("/audit/actions");
        if (!alive) return;
        const list = data?.actions ?? data?.rows ?? [];
        setActionsRaw(Array.isArray(list) ? list : []);
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // auto-load on mount (and when initialFilters change)
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFilters]);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {subtitle ? (
            <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
          ) : null}
        </div>

        <button
          onClick={load}
          className="px-3 py-1.5 rounded-lg text-sm bg-black text-white"
          disabled={loading}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {msg ? (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
          {msg}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-2">
        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Search (q)…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        >
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Entity (sale/payment/credit…) "
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
        />

        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Entity ID"
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
        />

        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />

        <input
          type="date"
          className="border rounded-lg px-3 py-2 text-sm"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />

        <input
          type="date"
          className="border rounded-lg px-3 py-2 text-sm"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-gray-500">
          {rows.length} row(s)
          {isPresent(nextCursor) ? " • More available" : " • End"}
        </div>

        <div className="flex items-center gap-2">
          <input
            className="border rounded-lg px-3 py-2 text-sm w-24"
            placeholder="Limit"
            value={String(limit)}
            onChange={(e) => setLimit(e.target.value)}
          />
          <button
            onClick={load}
            className="px-3 py-2 rounded-lg text-sm bg-white border hover:bg-gray-50"
            disabled={loading}
          >
            Apply filters
          </button>

          <button
            onClick={loadMore}
            className="px-3 py-2 rounded-lg text-sm bg-white border hover:bg-gray-50"
            disabled={!isPresent(nextCursor) || loadingMore}
            title={!isPresent(nextCursor) ? "No more pages" : "Load next page"}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      </div>

      <div className="overflow-auto border rounded-2xl bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-3 py-2 border-b">When</th>
              <th className="text-left px-3 py-2 border-b">Action</th>
              <th className="text-left px-3 py-2 border-b">Entity</th>
              <th className="text-left px-3 py-2 border-b">Entity ID</th>
              <th className="text-left px-3 py-2 border-b">User</th>
              <th className="text-left px-3 py-2 border-b">Location</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r?.id || i} className="border-b last:border-b-0">
                <td className="px-3 py-2 whitespace-nowrap">
                  {safeDate(r?.createdAt || r?.created_at)}
                </td>
                <td className="px-3 py-2">{r?.action}</td>
                <td className="px-3 py-2">{r?.entity}</td>
                <td className="px-3 py-2">
                  {r?.entityId || r?.entity_id || "-"}
                </td>
                <td className="px-3 py-2">{r?.userId || r?.user_id || "-"}</td>
                <td className="px-3 py-2">
                  {r?.locationId || r?.location_id || "-"}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                  No results.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
