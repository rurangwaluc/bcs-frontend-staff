"use client";

import {
  Banner,
  RefreshButton,
  SectionCard,
  Skeleton,
  TinyPill,
} from "./cashier-ui";

function getNotifKey(n, idx) {
  if (n?.id != null) return `id-${n.id}`;
  const created = n?.createdAt || n?.created_at || "";
  const title = n?.title || n?.type || "";
  const body = n?.body || "";
  return `fallback-${created}-${title}-${body}-${idx}`;
}

export default function CashierNotificationsSection({
  unread,
  streamStatus,
  notifs,
  notifsLoading,
  notifsErr,
  loadUnread,
  loadNotificationsList,
  safeDate,
}) {
  const list = Array.isArray(notifs) ? notifs : [];

  return (
    <SectionCard
      title="Notifications"
      hint="Messages about sales, credits and sessions."
      right={
        <RefreshButton
          loading={notifsLoading}
          onClick={() => {
            loadUnread();
            loadNotificationsList();
          }}
        />
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <TinyPill tone={unread > 0 ? "warn" : "neutral"}>
          Unread: {String(unread)}
        </TinyPill>

        <TinyPill
          tone={
            streamStatus === "live"
              ? "success"
              : streamStatus === "error"
                ? "warn"
                : "neutral"
          }
        >
          Live:{" "}
          {streamStatus === "live"
            ? "ON"
            : streamStatus === "error"
              ? "OFF"
              : "—"}
        </TinyPill>
      </div>

      <div className="mt-3">
        {notifsLoading ? (
          <div className="grid gap-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : notifsErr ? (
          <Banner kind="warn">{notifsErr}</Banner>
        ) : list.length === 0 ? (
          <div className="text-sm app-muted">No notifications yet.</div>
        ) : (
          <div className="grid gap-2">
            {list.slice(0, 25).map((n, idx) => {
              const isRead = n?.is_read ?? n?.isRead ?? null;
              const priority = String(n?.priority || "").toLowerCase();
              const type = String(n?.type || "").trim();
              const title = n?.title ?? n?.type ?? "Notification";
              const body = n?.body ?? "";
              const createdAt = n?.createdAt || n?.created_at || null;

              const priorityTone =
                priority === "danger"
                  ? "danger"
                  : priority === "high"
                    ? "warn"
                    : priority === "medium"
                      ? "info"
                      : "neutral";

              return (
                <div
                  key={getNotifKey(n, idx)}
                  className={[
                    "rounded-3xl border bg-[var(--card)] p-4 transition",
                    isRead === false
                      ? "border-[var(--border-strong)]"
                      : "border-[var(--border)]",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-extrabold text-[var(--app-fg)]">
                          {title}
                        </div>

                        {isRead === false ? (
                          <TinyPill tone="warn">NEW</TinyPill>
                        ) : null}

                        {type ? (
                          <TinyPill tone="info">{type.slice(0, 30)}</TinyPill>
                        ) : null}
                      </div>

                      {body ? (
                        <div className="mt-2 break-words text-sm text-[var(--app-fg)]">
                          {body}
                        </div>
                      ) : null}

                      <div className="mt-2 text-[11px] app-muted">
                        {safeDate(createdAt)}
                      </div>
                    </div>

                    {priority ? (
                      <TinyPill tone={priorityTone}>
                        {priority.toUpperCase()}
                      </TinyPill>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
