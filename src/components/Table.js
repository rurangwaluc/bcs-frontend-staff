import React from "react";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function StatCard({
  title,
  value,
  sub,
  right,
  className = "",
}) {
  return (
    <div className={cx("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-600">{title}</div>
          <div className="mt-1 text-xl font-bold text-slate-900 truncate">{value}</div>
          {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </div>
  );
}