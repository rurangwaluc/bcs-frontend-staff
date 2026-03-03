"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

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

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
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

  return (
    <span className={cx("inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-semibold", cls)}>
      {children}
    </span>
  );
}

/**
 * AuditLogsPanel
 * - GET /audit -> { ok: true, rows: [], nextCursor: number|null }
 * - GET /audit/actions -> { ok: true, actions: [] }
 *
 * NEW:
 * - GET /users (best effort) to map userId -> name
 *
 * Props:
 * - currentLocationLabel: string (example: "Kigali HQ (KGL)")
 * - locationLabelById: { [id]: "Name (Code)" } optional
 */
export default function AuditLogsPanel({
  title = "Actions history",
  subtitle = "",
  defaultLimit = 50,
  initialFilters = null,

  // ✅ new
  currentLocationLabel = "",
  locationLabelById = null,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const init = initialFilters && typeof initialFilters === "object" ? initialFilters : {};

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
  const [cursor, setCursor] = useState(() => (init.cursor === undefined ? null : init.cursor));
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // dropdown data
  const [actionsRaw, setActionsRaw] = useState([]);
  const actions = useMemo(() => uniqStrings(actionsRaw), [actionsRaw]);

  // ✅ staff map (userId -> {name,email})
  const [staffMap, setStaffMap] = useState({});

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
    [action, cursor, defaultLimit, entity, entityId, from, limit, q, to, userId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      setCursor(null);
      const qs = buildParams(null);
      const data = await apiFetch(`/audit?${qs}`);
      const list = data?.rows ?? data?.audit ?? data?.logs ?? [];
      setRows(Array.isArray(list) ? list : []);
      setNextCursor(data?.nextCursor === undefined ? null : data?.nextCursor);
    } catch (e) {
      setRows([]);
      setNextCursor(null);
      setMsg(e?.data?.error || e?.message || "Failed to load history");
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

  // ✅ load staff list (best effort) so we can show names instead of emails/ids
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await apiFetch("/users", { method: "GET" });
        if (!alive) return;
        const list = Array.isArray(data?.users) ? data.users : [];
        const map = {};
        for (const u of list) {
          if (u?.id == null) continue;
          map[String(u.id)] = { name: u?.name || "", email: u?.email || "" };
        }
        setStaffMap(map);
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

  function staffNameForRow(r) {
    const uid = String(r?.userId ?? r?.user_id ?? "");
    if (!uid) return "—";
    const info = staffMap[uid];
    if (info?.name) return info.name; // ✅ prefer name
    return "Staff member"; // don’t show raw id if we can’t map
  }

  function placeForRow(r) {
    // if backend ever sends it, use it
    const explicit =
      r?.locationName ||
      r?.location_name ||
      r?.location?.name ||
      null;

    if (explicit) return String(explicit);

    const locId = r?.locationId ?? r?.location_id ?? null;

    // best: map by id if provided
    if (locId != null && locationLabelById && typeof locationLabelById === "object") {
      const hit = locationLabelById[String(locId)];
      if (hit) return hit;
    }

    // fallback: current logged-in location label
    if (currentLocationLabel) return currentLocationLabel;

    // last resort
    return "Store / branch";
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {subtitle ? <div className="text-xs text-slate-600 mt-1">{subtitle}</div> : null}
        </div>

        <button
          onClick={load}
          className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {msg ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {msg}
        </div>
      ) : null}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-2">
        <input
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <select
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-300"
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
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="Record type (sale, payment…)"
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
        />

        <input
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="Record code"
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
        />

        <input
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="Staff (optional)"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />

        <input
          type="date"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />

        <input
          type="date"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          {rows.length} row(s)
          {isPresent(nextCursor) ? " • More available" : " • End"}
        </div>

        <div className="flex items-center gap-2">
          <input
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm w-24 outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="Limit"
            value={String(limit)}
            onChange={(e) => setLimit(e.target.value)}
            inputMode="numeric"
          />
          <button
            onClick={load}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
            disabled={loading}
          >
            Apply
          </button>

          <button
            onClick={loadMore}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
            disabled={!isPresent(nextCursor) || loadingMore}
            title={!isPresent(nextCursor) ? "No more pages" : "Load next page"}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr className="border-b border-slate-200">
              <th className="text-left px-3 py-2 text-xs font-semibold">Time</th>
              <th className="text-left px-3 py-2 text-xs font-semibold">Action</th>
              <th className="text-left px-3 py-2 text-xs font-semibold">Record</th>
              <th className="text-left px-3 py-2 text-xs font-semibold">Staff</th>
              <th className="text-left px-3 py-2 text-xs font-semibold">Place</th>
            </tr>
          </thead>

          {/* ✅ IMPORTANT: only <tr> inside <tbody> */}
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-b border-slate-100">
                  <td className="px-3 py-3">
                    <div className="h-4 w-32 bg-slate-200/70 rounded animate-pulse" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-4 w-28 bg-slate-200/70 rounded animate-pulse" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-4 w-40 bg-slate-200/70 rounded animate-pulse" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-4 w-32 bg-slate-200/70 rounded animate-pulse" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-4 w-40 bg-slate-200/70 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-slate-500">
                  No results.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r?.id || i} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-3 py-2 whitespace-nowrap">{safeDate(r?.createdAt || r?.created_at)}</td>

                  <td className="px-3 py-2">
                    <Badge kind="gray">{r?.action || "—"}</Badge>
                  </td>

                  <td className="px-3 py-2">
                    {/* no raw ids here */}
                    <div className="font-semibold text-slate-900">{r?.entity || "—"}</div>
                    {r?.entityId || r?.entity_id ? (
                      <div className="text-xs text-slate-500">Record code saved</div>
                    ) : null}
                  </td>

                  <td className="px-3 py-2">{staffNameForRow(r)}</td>

                  <td className="px-3 py-2">{placeForRow(r)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}