"use client";

import { cx } from "../../lib/ui";

const TONES = {
  neutral:
    "border border-[var(--border)] bg-[var(--card)] text-[var(--app-fg)]",
  success:
    "border border-emerald-300 bg-emerald-100/70 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200",
  warning:
    "border border-amber-300 bg-amber-100/70 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
  danger:
    "border border-rose-300 bg-rose-100/70 text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200",
  info: "border border-sky-300 bg-sky-100/70 text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200",
};

export default function AppBadge({
  tone = "neutral",
  className = "",
  children,
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        TONES[tone] || TONES.neutral,
        className,
      )}
    >
      {children}
    </span>
  );
}
