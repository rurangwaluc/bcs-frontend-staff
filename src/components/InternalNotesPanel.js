"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiFetch } from "../lib/api";

/**
 * Backend:
 *  GET  /notes?entityType=sale|credit|customer&entityId=123&limit=50&cursor=...
 *  POST /notes { entityType, entityId, message }
 */

function fmtDate(v) {
  if (!v) return "-";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

function normRow(r) {
  return {
    id: r?.id,
    entityType: r?.entityType ?? r?.entity_type ?? null,
    entityId: r?.entityId ?? r?.entity_id ?? null,
    message: r?.message ?? "",
    createdBy: r?.createdBy ?? r?.created_by ?? null,
    createdAt: r?.createdAt ?? r?.created_at ?? null,
  };
}

export default function InternalNotesPanel({
  entityType, // "sale" | "credit" | "customer"
  entityId, // number
  title = "Internal notes",
  canCreate = true,
  defaultLimit = 50,
}) {
  const [rows, setRows] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [msg, setMsg] = useState("");
  const [draft, setDraft] = useState("");

  const valid = useMemo(() => {
    const t = String(entityType || "")
      .trim()
      .toLowerCase();
    const id = Number(entityId);
    const okType = t === "sale" || t === "credit" || t === "customer";
    const okId = Number.isFinite(id) && id > 0;
    return { ok: okType && okId, t, id };
  }, [entityType, entityId]);

  const baseQuery = useMemo(() => {
    if (!valid.ok) return "";
    const p = new URLSearchParams();
    p.set("entityType", valid.t);
    p.set("entityId", String(valid.id));
    p.set(
      "limit",
      String(Math.min(200, Math.max(1, Number(defaultLimit || 50)))),
    );
    return p.toString();
  }, [valid, defaultLimit]);

  const loadFirstPage = useCallback(async () => {
    if (!valid.ok) return;
    setLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(`/notes?${baseQuery}`, { method: "GET" });
      const list = Array.isArray(data?.rows) ? data.rows.map(normRow) : [];
      setRows(list);
      setNextCursor(data?.nextCursor ?? null);
    } catch (e) {
      setRows([]);
      setNextCursor(null);
      setMsg(e?.data?.error || e?.message || "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, [valid, baseQuery]);

  const loadMore = useCallback(async () => {
    if (!valid.ok || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    setMsg("");
    try {
      const url = `/notes?${baseQuery}&cursor=${encodeURIComponent(
        String(nextCursor),
      )}`;
      const data = await apiFetch(url, { method: "GET" });
      const list = Array.isArray(data?.rows) ? data.rows.map(normRow) : [];
      setRows((prev) => prev.concat(list));
      setNextCursor(data?.nextCursor ?? null);
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Failed to load more notes");
    } finally {
      setLoadingMore(false);
    }
  }, [valid, nextCursor, loadingMore, baseQuery]);

  const submit = useCallback(async () => {
    if (!valid.ok) return;
    if (!canCreate) return;

    const message = String(draft || "").trim();
    if (!message) {
      setMsg("Write a note first.");
      return;
    }

    setMsg("");
    try {
      await apiFetch("/notes", {
        method: "POST",
        body: { entityType: valid.t, entityId: valid.id, message },
      });
      setDraft("");
      setMsg("✅ Note added.");
      await loadFirstPage();
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Failed to add note");
    }
  }, [valid, canCreate, draft, loadFirstPage]);

  useEffect(() => {
    setRows([]);
    setNextCursor(null);
    setMsg("");
    if (valid.ok) loadFirstPage();
  }, [valid.ok, valid.t, valid.id, loadFirstPage]);

  if (!valid.ok) {
    return (
      <div className="bg-white rounded-xl shadow p-4">
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-gray-600 mt-2">
          Select a record to view notes.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="p-4 border-b flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-xs text-gray-500 mt-1">
            Staff-only notes for {valid.t} #{valid.id}
          </div>
        </div>

        <button
          onClick={loadFirstPage}
          className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="p-4 space-y-3">
        {msg ? (
          <div
            className={
              "p-3 rounded-lg text-sm " +
              (String(msg).startsWith("✅")
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-700")
            }
          >
            {msg}
          </div>
        ) : null}

        {canCreate ? (
          <div className="border rounded-xl p-3">
            <div className="text-xs text-gray-500">Add note</div>

            <textarea
              className="mt-2 w-full border rounded-lg px-3 py-2 text-sm"
              rows={3}
              placeholder="Agreement, warning, follow-up…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={2000}
            />

            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="text-xs text-gray-500">
                {2000 - String(draft || "").length} chars left
              </div>

              <button
                onClick={submit}
                className="px-4 py-2 rounded-lg bg-black text-white text-sm"
              >
                Add note
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            You don’t have permission to add notes.
          </div>
        )}

        <div className="border rounded-xl overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 text-xs text-gray-600 flex items-center justify-between">
            <div>{rows.length} notes</div>
            <div>{nextCursor ? "More available" : "End"}</div>
          </div>

          {loading ? (
            <div className="p-3 text-sm text-gray-600">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-3 text-sm text-gray-600">No notes yet.</div>
          ) : (
            <div className="divide-y">
              {rows.map((r) => (
                <div key={r.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm whitespace-pre-wrap">
                      {r.message}
                    </div>
                    <div className="text-right text-xs text-gray-500 shrink-0">
                      <div>{fmtDate(r.createdAt)}</div>
                      <div>User #{r.createdBy ?? "-"}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 border-t flex justify-end">
            <button
              onClick={loadMore}
              disabled={!nextCursor || loadingMore}
              className={
                "px-4 py-2 rounded-lg text-sm " +
                (nextCursor
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-400")
              }
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
