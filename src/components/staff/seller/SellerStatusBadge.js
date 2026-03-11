"use client";

import { statusUi } from "./seller-utils";

function statusToneClass(tone) {
  if (tone === "success") {
    return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200";
  }
  if (tone === "warn") {
    return "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200";
  }
  if (tone === "danger") {
    return "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200";
  }
  if (tone === "info") {
    return "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200";
  }
  return "border-[var(--border-strong)] bg-[var(--card-2)] text-[var(--app-fg)]";
}

export default function SellerStatusBadge({ status }) {
  const meta = statusUi(status);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] ${statusToneClass(
        meta.tone,
      )}`}
    >
      {meta.label}
    </span>
  );
}
