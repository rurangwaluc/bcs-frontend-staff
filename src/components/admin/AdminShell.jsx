"use client";

import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import AsyncButton from "../AsyncButton";
import RoleBar from "../RoleBar";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Banner({ kind = "info", children }) {
  const styles =
    kind === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
      : kind === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
        : kind === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
          : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

  return (
    <div className={cx("rounded-3xl border px-4 py-3 text-sm", styles)}>
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

export default function AdminShell({
  bootLoading,
  isAuthorized,
  me,
  subtitle,
  msg,
  msgKind,
  section,
  setSection,
  showAdvanced,
  setShowAdvanced,
  refreshState,
  refreshCurrent,
  actAs,
  setActAs,
  actAsHref,
  badgeForSectionKey,
  toast,
  router,
  SECTIONS,
  ADVANCED,
  children,
}) {
  if (bootLoading) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-[var(--app-bg)]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
            <div className="rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="mt-3 h-4 w-52" />
              <div className="mt-6 grid gap-3">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </div>
            </div>

            <div className="grid gap-4">
              <Skeleton className="h-14 w-full rounded-[28px]" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Skeleton className="h-28 w-full rounded-[28px]" />
                <Skeleton className="h-28 w-full rounded-[28px]" />
                <Skeleton className="h-28 w-full rounded-[28px]" />
                <Skeleton className="h-28 w-full rounded-[28px]" />
              </div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Skeleton className="h-72 w-full rounded-[28px]" />
                <Skeleton className="h-72 w-full rounded-[28px]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <div className="p-6 text-sm app-muted">Redirecting…</div>;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--app-bg)]">
      <RoleBar title="Admin" subtitle={subtitle} user={me} />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-5">
        {msg ? (
          <div className="mb-4">
            <Banner kind={msgKind}>{msg}</Banner>
          </div>
        ) : null}

        <AdminTopbar
          actAs={actAs}
          setActAs={setActAs}
          actAsHref={actAsHref}
          router={router}
          section={section}
          setSection={setSection}
          showAdvanced={showAdvanced}
          SECTIONS={SECTIONS}
          ADVANCED={ADVANCED}
          refreshState={refreshState}
          refreshCurrent={refreshCurrent}
        />

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          <AdminSidebar
            section={section}
            setSection={setSection}
            showAdvanced={showAdvanced}
            setShowAdvanced={setShowAdvanced}
            refreshState={refreshState}
            refreshCurrent={refreshCurrent}
            badgeForSectionKey={badgeForSectionKey}
            SECTIONS={SECTIONS}
            ADVANCED={ADVANCED}
          />

          <main className="min-w-0 grid gap-4">{children}</main>
        </div>
      </div>
    </div>
  );
}
