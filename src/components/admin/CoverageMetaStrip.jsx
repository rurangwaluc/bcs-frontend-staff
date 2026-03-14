"use client";

import { Pill } from "./adminShared";

function prettyRole(role) {
  return String(role || "")
    .trim()
    .split("_")
    .filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

function prettyReason(reason) {
  return String(reason || "")
    .trim()
    .split("_")
    .filter(Boolean)
    .map((x) => x.charAt(0) + x.slice(1).toLowerCase())
    .join(" ");
}

function fmtDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString();
}

export default function CoverageMetaStrip({ coverage }) {
  if (!coverage?.actingAsRole) return null;

  const startedAt = fmtDate(coverage?.startedAt);

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <Pill tone="warn">Coverage action</Pill>
      <Pill tone="info">Role: {prettyRole(coverage.actingAsRole)}</Pill>
      {coverage?.reason ? (
        <Pill>Reason: {prettyReason(coverage.reason)}</Pill>
      ) : null}
      {startedAt ? <Pill>Since: {startedAt}</Pill> : null}
      {coverage?.note ? <Pill>Note: {coverage.note}</Pill> : null}
    </div>
  );
}
