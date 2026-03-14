"use client";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function AdminShell({ children, className = "" }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--app-bg)]">
      <div className={cx("mx-auto max-w-7xl px-4 py-6 sm:px-5", className)}>
        <main className="min-w-0 grid gap-4">{children}</main>
      </div>
    </div>
  );
}
