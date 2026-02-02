"use client";

import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "../lib/api";

const ENTITY_TYPES = [
  { value: "sale", label: "Sale" },
  { value: "stock_request", label: "Stock Request" },
  { value: "inventory", label: "Inventory" },
];

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

export default function MessagesThread({
  title = "Internal communication",
  subtitle = "Threaded messages are audited and location-scoped.",

  // passed by parent
  entityType: lockedEntityType = "",
  entityId: lockedEntityId = "",

  allowThreadPicker = false,
}) {
  // internal editable values (used when picker is enabled)
  const [entityType, setEntityType] = useState(() => toStr(lockedEntityType));
  const [entityId, setEntityId] = useState(() => toStr(lockedEntityId));

  // ✅ KEY FIX: when parent changes props, update internal state
  useEffect(() => {
    setEntityType(toStr(lockedEntityType));
  }, [lockedEntityType]);

  useEffect(() => {
    setEntityId(toStr(lockedEntityId));
  }, [lockedEntityId]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [msg, setMsg] = useState("");
  const [text, setText] = useState("");

  const canLoad = useMemo(() => {
    const t = toStr(entityType);
    const id = Number(entityId);
    return !!t && Number.isFinite(id) && id > 0;
  }, [entityType, entityId]);

  async function load() {
    if (!canLoad) {
      setRows([]);
      return;
    }

    setLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(`/messages/${entityType}/${entityId}`, {
        method: "GET",
      });
      const list = data?.messages ?? data?.rows ?? [];
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setRows([]);
      setMsg(e?.data?.error || e?.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }

  async function post() {
    const bodyText = toStr(text);
    if (!bodyText) return;

    if (!canLoad) {
      setMsg("Pick a valid thread first.");
      return;
    }

    setPosting(true);
    setMsg("");
    try {
      await apiFetch("/messages", {
        method: "POST",
        body: {
          entityType,
          entityId: Number(entityId),
          message: bodyText,
        },
      });

      setText("");
      await load();
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Failed to post message");
    } finally {
      setPosting(false);
    }
  }

  useEffect(() => {
    if (canLoad) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="p-4 border-b flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{title}</div>
          {subtitle ? (
            <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
          ) : null}
        </div>

        <button
          onClick={load}
          className="px-3 py-1.5 rounded-lg text-sm bg-black text-white"
          disabled={loading || !canLoad}
          title={!canLoad ? "Select entity type and id" : "Reload"}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {msg ? (
        <div className="m-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
          {msg}
        </div>
      ) : null}

      {allowThreadPicker ? (
        <div className="px-4 pt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          >
            <option value="">Select entity type</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <input
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="Entity ID (number)"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
          />

          <div className="text-xs text-gray-500 flex items-center">
            Example: Sale #123 → entityType “sale”, entityId “123”
          </div>
        </div>
      ) : null}

      <div className="p-4">
        <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
          {rows.map((r, idx) => (
            <div
              key={r?.id ?? idx}
              className={
                "border rounded-xl p-3 " +
                (r?.isSystem ? "bg-gray-50" : "bg-white")
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium">
                  User #{r?.userId ?? r?.user_id ?? "-"}
                  <span className="text-xs text-gray-500 ml-2">
                    {r?.role ? `(${r.role})` : ""}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {safeDate(r?.createdAt || r?.created_at)}
                </div>
              </div>

              <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                {r?.message || ""}
              </div>
            </div>
          ))}

          {!loading && rows.length === 0 ? (
            <div className="text-sm text-gray-500">No messages yet.</div>
          ) : null}
        </div>

        <div className="mt-4 border-t pt-4">
          <div className="text-sm font-medium">Post a message</div>

          <textarea
            className="mt-2 w-full border rounded-lg px-3 py-2 text-sm min-h-[90px]"
            placeholder="Write a short note…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="text-xs text-gray-500">
              Keep it factual: what happened, who did it, what should be done.
            </div>
            <button
              onClick={post}
              disabled={posting || !toStr(text) || !canLoad}
              className={
                "px-4 py-2 rounded-lg text-sm " +
                (posting || !toStr(text) || !canLoad
                  ? "bg-gray-100 text-gray-400"
                  : "bg-black text-white")
              }
            >
              {posting ? "Posting…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
