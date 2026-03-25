"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import AsyncButton from "./AsyncButton";
import { apiFetch } from "../lib/api";

/* ---------------- helpers ---------------- */

const ENTITY_OPTIONS = [
  { value: "sale", label: "Sale" },
  { value: "credit", label: "Credit" },
  { value: "customer", label: "Customer" },
];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function toNum(v, fallback = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
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

function initials(nameOrEmail) {
  const s = toStr(nameOrEmail);
  if (!s) return "U";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function mapNoteRow(r) {
  return {
    id: r?.id ?? null,
    locationId: r?.locationId ?? null,
    userId: r?.userId ?? null,

    entity: r?.entity ?? null,
    entityType: r?.entityType ?? r?.entity ?? null,
    entityId: r?.entityId ?? null,

    parentNoteId: r?.parentNoteId ?? null,
    rootNoteId: r?.rootNoteId ?? null,

    body: toStr(r?.body),
    message: toStr(r?.message ?? r?.body),

    isPinned: !!r?.isPinned,
    isResolved: !!r?.isResolved,
    isDeleted: !!r?.isDeleted,

    resolvedAt: r?.resolvedAt ?? null,
    resolvedBy: r?.resolvedBy ?? null,

    deletedAt: r?.deletedAt ?? null,
    deletedBy: r?.deletedBy ?? null,

    editedAt: r?.editedAt ?? null,
    editedBy: r?.editedBy ?? null,

    createdAt: r?.createdAt ?? null,
    updatedAt: r?.updatedAt ?? null,

    userName: toStr(r?.userName),
    userEmail: toStr(r?.userEmail),

    locationName: toStr(r?.locationName),
    locationCode: toStr(r?.locationCode),
    locationLabel: toStr(r?.locationLabel),
  };
}

function noteAuthor(row) {
  return (
    toStr(row?.userName) ||
    toStr(row?.userEmail) ||
    `User #${row?.userId ?? "—"}`
  );
}

function noteMetaTone(row) {
  if (row?.isDeleted) {
    return "border-[var(--danger-border)] bg-[var(--danger-bg)]";
  }
  if (row?.isResolved) {
    return "border-[var(--success-border)] bg-[var(--success-bg)]";
  }
  if (row?.isPinned) {
    return "border-[var(--info-border)] bg-[var(--info-bg)]";
  }
  return "border-[var(--border)] bg-[var(--card)]";
}

function makeThreadTree(rows) {
  const byId = new Map();
  const childrenMap = new Map();

  for (const row of rows) {
    byId.set(Number(row.id), { ...row, children: [] });
  }

  for (const row of rows) {
    const id = Number(row.id);
    const parentId = toNum(row.parentNoteId, null);

    if (parentId && parentId !== id && byId.has(parentId)) {
      if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
      childrenMap.get(parentId).push(id);
    }
  }

  for (const [parentId, childIds] of childrenMap.entries()) {
    const parent = byId.get(parentId);
    if (!parent) continue;
    parent.children = childIds
      .map((childId) => byId.get(childId))
      .filter(Boolean)
      .sort((a, b) => Number(a.id) - Number(b.id));
  }

  const roots = [];
  for (const row of rows) {
    const id = Number(row.id);
    const parentId = toNum(row.parentNoteId, null);
    if (!parentId || parentId === id || !byId.has(parentId)) {
      roots.push(byId.get(id));
    }
  }

  roots.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return Number(b.id) - Number(a.id);
  });

  return roots;
}

/* ---------------- atoms ---------------- */

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

function SectionShell({ title, subtitle, right, children }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-4">
        <div className="min-w-0">
          <div className="text-base font-black text-[var(--app-fg)]">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-1 text-sm app-muted">{subtitle}</div>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function ActionBtn({ children, onClick, disabled = false, tone = "default" }) {
  const cls =
    tone === "danger"
      ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
      : tone === "info"
        ? "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]"
        : tone === "success"
          ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
          : "border-[var(--border)] bg-[var(--card)] text-[var(--app-fg)]";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "rounded-xl border px-3 py-2 text-xs font-bold transition hover:bg-[var(--card-2)] disabled:cursor-not-allowed disabled:opacity-50",
        cls,
      )}
    >
      {children}
    </button>
  );
}

function TextArea({ className = "", ...props }) {
  return (
    <textarea
      {...props}
      className={cx(
        "w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-3 text-sm text-[var(--app-fg)] outline-none transition",
        "placeholder:text-[var(--muted)] hover:border-[var(--border-strong)] focus:border-[var(--border-strong)] focus:ring-2 focus:ring-slate-300/50",
        className,
      )}
    />
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-3 text-sm text-[var(--app-fg)] outline-none transition",
        "placeholder:text-[var(--muted)] hover:border-[var(--border-strong)] focus:border-[var(--border-strong)] focus:ring-2 focus:ring-slate-300/50",
        className,
      )}
    />
  );
}

function SmallBadge({ tone = "neutral", children }) {
  const cls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
      : tone === "danger"
        ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
        : tone === "warn"
          ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
          : tone === "info"
            ? "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]"
            : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em]",
        cls,
      )}
    >
      {children}
    </span>
  );
}

/* ---------------- note item ---------------- */

function NoteComposer({
  value,
  onChange,
  onSubmit,
  submitState,
  placeholder,
  onCancel,
  canCancel = false,
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
      <TextArea
        rows={3}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs app-muted">
          {Math.max(0, 2000 - toStr(value).length)} chars left
        </div>

        <div className="flex flex-wrap gap-2">
          {canCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-bold text-[var(--app-fg)] transition hover:bg-[var(--card-2)]"
            >
              Cancel
            </button>
          ) : null}

          <AsyncButton
            variant="primary"
            size="sm"
            state={submitState}
            text="Send"
            loadingText="Saving…"
            successText="Saved"
            onClick={onSubmit}
          />
        </div>
      </div>
    </div>
  );
}

function NoteItem({
  row,
  depth = 0,
  replyDraft,
  onReplyDraftChange,
  onReplySubmit,
  onToggleReply,
  replyingToId,

  editingId,
  editDraft,
  onEditDraftChange,
  onEditSubmit,
  onToggleEdit,

  actionLoadingKey,
  onPinToggle,
  onResolveToggle,
  onDelete,
}) {
  const author = noteAuthor(row);
  const isReplying = Number(replyingToId) === Number(row.id);
  const isEditing = Number(editingId) === Number(row.id);

  return (
    <div
      className={cx(
        "rounded-3xl border p-4",
        noteMetaTone(row),
        depth > 0 ? "ml-0 sm:ml-6" : "",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--app-fg)] text-sm font-black text-[var(--app-bg)]">
          {initials(author)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-black text-[var(--app-fg)]">
                  {author}
                </div>

                <SmallBadge tone="neutral">#{row.id}</SmallBadge>

                {row.isPinned ? (
                  <SmallBadge tone="info">Pinned</SmallBadge>
                ) : null}
                {row.isResolved ? (
                  <SmallBadge tone="success">Resolved</SmallBadge>
                ) : null}
                {row.isDeleted ? (
                  <SmallBadge tone="danger">Deleted</SmallBadge>
                ) : null}
                {row.editedAt ? (
                  <SmallBadge tone="warn">Edited</SmallBadge>
                ) : null}
                {row.parentNoteId ? (
                  <SmallBadge tone="neutral">Reply</SmallBadge>
                ) : null}
              </div>

              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs app-muted">
                <span>{safeDate(row.createdAt)}</span>
                {row.locationLabel ? <span>{row.locationLabel}</span> : null}
                {row.userEmail ? <span>{row.userEmail}</span> : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {!row.isDeleted ? (
                <>
                  <ActionBtn
                    tone={row.isPinned ? "info" : "default"}
                    disabled={!!actionLoadingKey}
                    onClick={() => onPinToggle(row)}
                  >
                    {actionLoadingKey === `pin-${row.id}`
                      ? "Saving…"
                      : row.isPinned
                        ? "Unpin"
                        : "Pin"}
                  </ActionBtn>

                  <ActionBtn
                    tone={row.isResolved ? "success" : "default"}
                    disabled={!!actionLoadingKey}
                    onClick={() => onResolveToggle(row)}
                  >
                    {actionLoadingKey === `resolve-${row.id}`
                      ? "Saving…"
                      : row.isResolved
                        ? "Reopen"
                        : "Resolve"}
                  </ActionBtn>

                  <ActionBtn
                    disabled={!!actionLoadingKey}
                    onClick={() => onToggleEdit(row)}
                  >
                    {isEditing ? "Close edit" : "Edit"}
                  </ActionBtn>

                  <ActionBtn
                    disabled={!!actionLoadingKey}
                    onClick={() => onToggleReply(row)}
                  >
                    {isReplying ? "Close reply" : "Reply"}
                  </ActionBtn>

                  <ActionBtn
                    tone="danger"
                    disabled={!!actionLoadingKey}
                    onClick={() => onDelete(row)}
                  >
                    {actionLoadingKey === `delete-${row.id}`
                      ? "Deleting…"
                      : "Delete"}
                  </ActionBtn>
                </>
              ) : null}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
            {row.isDeleted ? (
              <div className="text-sm italic text-[var(--muted)]">
                This note was deleted.
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-sm text-[var(--app-fg)]">
                {row.message}
              </div>
            )}
          </div>

          {row.editedAt ? (
            <div className="mt-2 text-xs app-muted">
              Edited {safeDate(row.editedAt)}
            </div>
          ) : null}

          {row.isResolved && row.resolvedAt ? (
            <div className="mt-2 text-xs app-muted">
              Resolved {safeDate(row.resolvedAt)}
            </div>
          ) : null}

          {isEditing && !row.isDeleted ? (
            <div className="mt-4">
              <NoteComposer
                value={editDraft}
                onChange={onEditDraftChange}
                onSubmit={() => onEditSubmit(row)}
                submitState={
                  actionLoadingKey === `edit-${row.id}` ? "loading" : "idle"
                }
                placeholder="Update this internal note…"
                onCancel={() => onToggleEdit(null)}
                canCancel
              />
            </div>
          ) : null}

          {isReplying && !row.isDeleted ? (
            <div className="mt-4">
              <NoteComposer
                value={replyDraft}
                onChange={onReplyDraftChange}
                onSubmit={() => onReplySubmit(row)}
                submitState={
                  actionLoadingKey === `reply-${row.id}` ? "loading" : "idle"
                }
                placeholder="Write a reply to this internal note…"
                onCancel={() => onToggleReply(null)}
                canCancel
              />
            </div>
          ) : null}

          {Array.isArray(row.children) && row.children.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {row.children.map((child) => (
                <NoteItem
                  key={child.id}
                  row={child}
                  depth={depth + 1}
                  replyDraft={replyDraft}
                  onReplyDraftChange={onReplyDraftChange}
                  onReplySubmit={onReplySubmit}
                  onToggleReply={onToggleReply}
                  replyingToId={replyingToId}
                  editingId={editingId}
                  editDraft={editDraft}
                  onEditDraftChange={onEditDraftChange}
                  onEditSubmit={onEditSubmit}
                  onToggleEdit={onToggleEdit}
                  actionLoadingKey={actionLoadingKey}
                  onPinToggle={onPinToggle}
                  onResolveToggle={onResolveToggle}
                  onDelete={onDelete}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ---------------- main component ---------------- */

export default function MessagesThread({
  title = "Internal communication",
  subtitle = "Threaded, audited, and scoped to the record.",
  entityType: lockedEntityType = "",
  entityId: lockedEntityId = "",
  allowThreadPicker = false,
}) {
  const [entityType, setEntityType] = useState(() => toStr(lockedEntityType));
  const [entityId, setEntityId] = useState(() => toStr(lockedEntityId));

  useEffect(() => {
    setEntityType(toStr(lockedEntityType));
  }, [lockedEntityType]);

  useEffect(() => {
    setEntityId(toStr(lockedEntityId));
  }, [lockedEntityId]);

  const [rows, setRows] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [banner, setBanner] = useState("");
  const [bannerKind, setBannerKind] = useState("info");

  const [newDraft, setNewDraft] = useState("");
  const [newState, setNewState] = useState("idle");

  const [replyingToId, setReplyingToId] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState("");

  const [actionLoadingKey, setActionLoadingKey] = useState("");

  const valid = useMemo(() => {
    const t = toStr(entityType).toLowerCase();
    const id = toNum(entityId, null);
    const okType = ["sale", "credit", "customer"].includes(t);
    const okId = Number.isFinite(id) && id > 0;
    return { ok: okType && okId, t, id };
  }, [entityType, entityId]);

  const queryBase = useMemo(() => {
    if (!valid.ok) return "";
    const p = new URLSearchParams();
    p.set("entityType", valid.t);
    p.set("entityId", String(valid.id));
    p.set("limit", "20");
    return p.toString();
  }, [valid]);

  const threadRows = useMemo(() => makeThreadTree(rows), [rows]);

  function flash(kind, text) {
    setBannerKind(kind);
    setBanner(text || "");
  }

  const loadFirstPage = useCallback(async () => {
    if (!valid.ok) {
      setRows([]);
      setNextCursor(null);
      return;
    }

    setLoading(true);
    setBanner("");

    try {
      const data = await apiFetch(`/notes?${queryBase}`, { method: "GET" });
      const list = Array.isArray(data?.rows) ? data.rows.map(mapNoteRow) : [];
      setRows(list);
      setNextCursor(data?.nextCursor ?? null);
    } catch (e) {
      setRows([]);
      setNextCursor(null);
      flash("danger", e?.data?.error || e?.message || "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, [valid, queryBase]);

  const loadMore = useCallback(async () => {
    if (!valid.ok || !nextCursor || loadingMore) return;

    setLoadingMore(true);
    setBanner("");

    try {
      const url = `/notes?${queryBase}&cursor=${encodeURIComponent(String(nextCursor))}`;
      const data = await apiFetch(url, { method: "GET" });
      const list = Array.isArray(data?.rows) ? data.rows.map(mapNoteRow) : [];

      setRows((prev) => {
        const seen = new Set(prev.map((x) => Number(x.id)));
        const merged = prev.slice();
        for (const item of list) {
          if (!seen.has(Number(item.id))) merged.push(item);
        }
        return merged;
      });

      setNextCursor(data?.nextCursor ?? null);
    } catch (e) {
      flash(
        "danger",
        e?.data?.error || e?.message || "Failed to load more notes",
      );
    } finally {
      setLoadingMore(false);
    }
  }, [valid, nextCursor, loadingMore, queryBase]);

  useEffect(() => {
    if (valid.ok) loadFirstPage();
    else {
      setRows([]);
      setNextCursor(null);
    }
  }, [valid.ok, valid.t, valid.id, loadFirstPage]);

  async function createRootNote() {
    const message = toStr(newDraft);
    if (!message || !valid.ok) return;

    setNewState("loading");
    setBanner("");

    try {
      await apiFetch("/notes", {
        method: "POST",
        body: {
          entityType: valid.t,
          entityId: valid.id,
          message,
        },
      });

      setNewDraft("");
      await loadFirstPage();
      setNewState("success");
      flash("success", "Note added.");
      setTimeout(() => setNewState("idle"), 900);
    } catch (e) {
      setNewState("idle");
      flash("danger", e?.data?.error || e?.message || "Failed to add note");
    }
  }

  async function submitReply(parentRow) {
    const message = toStr(replyDraft);
    if (!message || !valid.ok || !parentRow?.id) return;

    const key = `reply-${parentRow.id}`;
    setActionLoadingKey(key);
    setBanner("");

    try {
      await apiFetch("/notes", {
        method: "POST",
        body: {
          entityType: valid.t,
          entityId: valid.id,
          message,
          parentNoteId: Number(parentRow.id),
        },
      });

      setReplyDraft("");
      setReplyingToId(null);
      await loadFirstPage();
      flash("success", "Reply added.");
    } catch (e) {
      flash("danger", e?.data?.error || e?.message || "Failed to add reply");
    } finally {
      setActionLoadingKey("");
    }
  }

  async function submitEdit(row) {
    const message = toStr(editDraft);
    if (!message || !row?.id) return;

    const key = `edit-${row.id}`;
    setActionLoadingKey(key);
    setBanner("");

    try {
      await apiFetch(`/notes/${row.id}`, {
        method: "PATCH",
        body: { message },
      });

      setEditDraft("");
      setEditingId(null);
      await loadFirstPage();
      flash("success", "Note updated.");
    } catch (e) {
      flash("danger", e?.data?.error || e?.message || "Failed to edit note");
    } finally {
      setActionLoadingKey("");
    }
  }

  async function togglePin(row) {
    if (!row?.id) return;

    const key = `pin-${row.id}`;
    setActionLoadingKey(key);
    setBanner("");

    try {
      await apiFetch(`/notes/${row.id}/pin`, {
        method: "PATCH",
        body: { pinned: !row.isPinned },
      });

      await loadFirstPage();
      flash("success", row.isPinned ? "Note unpinned." : "Note pinned.");
    } catch (e) {
      flash(
        "danger",
        e?.data?.error || e?.message || "Failed to change pin state",
      );
    } finally {
      setActionLoadingKey("");
    }
  }

  async function toggleResolve(row) {
    if (!row?.id) return;

    const key = `resolve-${row.id}`;
    setActionLoadingKey(key);
    setBanner("");

    try {
      await apiFetch(`/notes/${row.id}/resolve`, {
        method: "PATCH",
        body: { resolved: !row.isResolved },
      });

      await loadFirstPage();
      flash(
        "success",
        row.isResolved ? "Thread reopened." : "Thread resolved.",
      );
    } catch (e) {
      flash(
        "danger",
        e?.data?.error || e?.message || "Failed to change resolved state",
      );
    } finally {
      setActionLoadingKey("");
    }
  }

  async function removeNote(row) {
    if (!row?.id) return;
    const ok = window.confirm("Delete this note?");
    if (!ok) return;

    const key = `delete-${row.id}`;
    setActionLoadingKey(key);
    setBanner("");

    try {
      await apiFetch(`/notes/${row.id}`, {
        method: "DELETE",
      });

      await loadFirstPage();
      flash("success", "Note deleted.");
    } catch (e) {
      flash("danger", e?.data?.error || e?.message || "Failed to delete note");
    } finally {
      setActionLoadingKey("");
    }
  }

  function handleToggleReply(row) {
    if (!row) {
      setReplyingToId(null);
      setReplyDraft("");
      return;
    }

    const nextId = Number(row.id);
    if (Number(replyingToId) === nextId) {
      setReplyingToId(null);
      setReplyDraft("");
      return;
    }

    setEditingId(null);
    setEditDraft("");
    setReplyingToId(nextId);
    setReplyDraft("");
  }

  function handleToggleEdit(row) {
    if (!row) {
      setEditingId(null);
      setEditDraft("");
      return;
    }

    const nextId = Number(row.id);
    if (Number(editingId) === nextId) {
      setEditingId(null);
      setEditDraft("");
      return;
    }

    setReplyingToId(null);
    setReplyDraft("");
    setEditingId(nextId);
    setEditDraft(toStr(row.message));
  }

  if (!valid.ok) {
    return (
      <SectionShell title={title} subtitle={subtitle}>
        {allowThreadPicker ? (
          <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-3 text-sm text-[var(--app-fg)] outline-none"
            >
              <option value="">Select entity type</option>
              {ENTITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <Input
              placeholder="Entity ID"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
            />
          </div>
        ) : null}

        <div className="mt-4 rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card-2)] p-8 text-center">
          <div className="text-base font-black text-[var(--app-fg)]">
            Select a valid record first
          </div>
          <div className="mt-2 text-sm app-muted">
            Notes only load when entity type is sale, credit, or customer and
            entity id is a valid number.
          </div>
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell
      title={title}
      subtitle={`${subtitle} • ${valid.t} #${valid.id}`}
      right={
        <div className="flex flex-wrap gap-2">
          {allowThreadPicker ? (
            <>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--app-fg)] outline-none"
              >
                {ENTITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <Input
                className="w-[120px]"
                placeholder="ID"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
              />
            </>
          ) : null}

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
      }
    >
      <div className="space-y-4">
        {banner ? <Banner kind={bannerKind}>{banner}</Banner> : null}

        <NoteComposer
          value={newDraft}
          onChange={setNewDraft}
          onSubmit={createRootNote}
          submitState={newState}
          placeholder="Write a new internal note for this record…"
        />

        <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card-2)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
            <div className="text-sm font-semibold text-[var(--app-fg)]">
              Thread items
            </div>
            <div className="text-xs app-muted">
              {rows.length} loaded {nextCursor ? "• more available" : "• end"}
            </div>
          </div>

          {loading ? (
            <div className="grid gap-3 p-4">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-sm app-muted">No notes yet.</div>
          ) : (
            <div className="grid gap-3 p-4">
              {threadRows.map((row) => (
                <NoteItem
                  key={row.id}
                  row={row}
                  replyDraft={replyDraft}
                  onReplyDraftChange={setReplyDraft}
                  onReplySubmit={submitReply}
                  onToggleReply={handleToggleReply}
                  replyingToId={replyingToId}
                  editingId={editingId}
                  editDraft={editDraft}
                  onEditDraftChange={setEditDraft}
                  onEditSubmit={submitEdit}
                  onToggleEdit={handleToggleEdit}
                  actionLoadingKey={actionLoadingKey}
                  onPinToggle={togglePin}
                  onResolveToggle={toggleResolve}
                  onDelete={removeNote}
                />
              ))}
            </div>
          )}

          <div className="flex justify-end border-t border-[var(--border)] px-4 py-4">
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
    </SectionShell>
  );
}
