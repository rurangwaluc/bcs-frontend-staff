"use client";

import { statusUi } from "./seller-utils";

function statusToneClass(tone) {
  if (tone === "success") {
    return "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:shadow-none";
  }

  if (tone === "warn") {
    return "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] dark:shadow-none";
  }

  if (tone === "danger") {
    return "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] dark:shadow-none";
  }

  if (tone === "info") {
    return "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] dark:shadow-none";
  }

  return "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";
}

export default function SellerStatusBadge({ status }) {
  const meta = statusUi(status);

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em]",
        statusToneClass(meta.tone),
      ].join(" ")}
    >
      {meta.label}
    </span>
  );
}
