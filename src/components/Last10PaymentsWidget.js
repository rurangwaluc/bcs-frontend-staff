"use client";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function money(n) {
  const x = Number(n || 0);
  return Number.isFinite(x) ? Math.round(x).toLocaleString() : "0";
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

function MethodPill({ method }) {
  const m = String(method || "").toUpperCase() || "—";
  const tone = m.includes("CASH")
    ? "neutral"
    : m.includes("MOMO") || m.includes("MOBILE")
      ? "info"
      : m.includes("CARD")
        ? "success"
        : "neutral";

  const cls =
    tone === "success"
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : tone === "info"
        ? "bg-sky-50 text-sky-900 border-sky-200"
        : "bg-slate-50 text-slate-800 border-slate-200";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-xl border px-2.5 py-1 text-[11px] font-extrabold",
        cls,
      )}
    >
      {m}
    </span>
  );
}

export default function Last10PaymentsWidget({ rows = [] }) {
  const list = Array.isArray(rows) ? rows : [];

  return (
    <div className="grid gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-slate-900">
            Last 10 payments
          </div>
          <div className="mt-1 text-xs text-slate-600">Latest activity</div>
        </div>
        <span className="shrink-0 inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-extrabold text-slate-900">
          {list.length} item(s)
        </span>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          No recent payments.
        </div>
      ) : (
        <div className="grid gap-2">
          {list.slice(0, 10).map((p, idx) => {
            const amount = Number(p?.amount || 0) || 0;
            const saleId = p?.saleId ?? p?.sale_id ?? "—";
            return (
              <div
                key={`${p?.id || "pay"}-${idx}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-sm font-extrabold text-slate-900">
                        Payment #{String(p?.id ?? "—")}
                      </div>
                      <MethodPill method={p?.method} />
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      Sale:{" "}
                      <span className="font-semibold">#{String(saleId)}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-600 truncate">
                      Time:{" "}
                      <span className="font-semibold">
                        {safeDate(p?.createdAt || p?.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] font-semibold text-slate-600">
                      Amount
                    </div>
                    <div className="text-lg font-extrabold text-slate-900">
                      {money(amount)}
                    </div>
                    <div className="text-[11px] text-slate-500">RWF</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
