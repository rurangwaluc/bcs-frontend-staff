"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import AsyncButton from "./AsyncButton";
import { apiFetch } from "../lib/api";

function fmtDate(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
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

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Banner({ kind = "info", children }) {
  const styles =
    kind === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
      : kind === "danger"
        ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
        : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

  return (
    <div className={cx("rounded-2xl border px-4 py-3 text-sm", styles)}>
      {children}
    </div>
  );
}

function TextArea({ className = "", ...props }) {
  return (
    <textarea
      {...props}
      className={cx(
        "app-focus w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--app-fg)] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:shadow-none",
        "placeholder:text-[var(--muted-2)]",
        className,
      )}
    />
  );
}

function Skeleton({ className = "" }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-800/70",
        className,
      )}
    />
  );
}

export default function InternalNotesPanel({
  entityType,
  entityId,
  title = "Internal notes",
  canCreate = true,
  defaultLimit = 50,
}) {
  const [rows, setRows] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info");
  const [draft, setDraft] = useState("");
  const [submitState, setSubmitState] = useState("idle");

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
      setMsgKind("danger");
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
      setMsgKind("danger");
      setMsg(e?.data?.error || e?.message || "Failed to load more notes");
    } finally {
      setLoadingMore(false);
    }
  }, [valid, nextCursor, loadingMore, baseQuery]);

  const submit = useCallback(async () => {
    if (!valid.ok || !canCreate) return;

    const message = String(draft || "").trim();
    if (!message) {
      setMsgKind("danger");
      setMsg("Write a note first.");
      return;
    }

    setSubmitState("loading");
    setMsg("");

    try {
      await apiFetch("/notes", {
        method: "POST",
        body: { entityType: valid.t, entityId: valid.id, message },
      });

      setDraft("");
      setMsgKind("success");
      setMsg("Note added.");
      await loadFirstPage();

      setSubmitState("success");
      setTimeout(() => setSubmitState("idle"), 900);
    } catch (e) {
      setSubmitState("idle");
      setMsgKind("danger");
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
      <div className="overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--card)] shadow-sm">
        <div className="border-b border-[var(--border)] p-4">
          <div className="text-sm font-black text-[var(--app-fg)]">{title}</div>
        </div>
        <div className="p-4 text-sm app-muted">
          Select a record to view notes.
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--card)] shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-black text-[var(--app-fg)]">{title}</div>
          <div className="mt-1 text-xs app-muted">
            Staff-only notes for {valid.t} #{valid.id}
          </div>
        </div>

        <AsyncButton
          variant="secondary"
          size="sm"
          state={loading ? "loading" : "idle"}
          text="Refresh"
          loadingText="Loading…"
          successText="Done"
          onClick={loadFirstPage}
        />
      </div>

      <div className="space-y-4 p-4">
        {msg ? <Banner kind={msgKind}>{msg}</Banner> : null}

        {canCreate ? (
          <div className="rounded-3xl border border-[var(--border-strong)] bg-[var(--card-2)] p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] app-muted">
              Add note
            </div>

            <TextArea
              className="mt-3"
              rows={3}
              placeholder="Agreement, warning, follow-up…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={2000}
            />

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs app-muted">
                {2000 - String(draft || "").length} chars left
              </div>

              <AsyncButton
                variant="primary"
                size="sm"
                state={submitState}
                text="Add note"
                loadingText="Saving…"
                successText="Saved"
                onClick={submit}
              />
            </div>
          </div>
        ) : (
          <div className="text-sm app-muted">
            You don’t have permission to add notes.
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--card-2)] shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 text-xs app-muted">
            <div>{rows.length} notes</div>
            <div>{nextCursor ? "More available" : "End"}</div>
          </div>

          {loading ? (
            <div className="grid gap-3 p-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-4 text-sm app-muted">No notes yet.</div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {rows.map((r) => (
                <div key={r.id} className="bg-[var(--card)] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="whitespace-pre-wrap text-sm text-[var(--app-fg)]">
                      {r.message}
                    </div>
                    <div className="shrink-0 text-left text-xs app-muted sm:text-right">
                      <div>{fmtDate(r.createdAt)}</div>
                      <div>User #{r.createdBy ?? "-"}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end border-t border-[var(--border)] p-4">
            <AsyncButton
              variant={nextCursor ? "primary" : "secondary"}
              size="sm"
              state={loadingMore ? "loading" : "idle"}
              text="Load more"
              loadingText="Loading…"
              successText="Done"
              onClick={loadMore}
              disabled={!nextCursor}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
