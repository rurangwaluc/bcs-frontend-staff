"use client";

function money(n) {
  const x = Number(n || 0);
  return Number.isFinite(x) ? x.toLocaleString() : "0";
}

function fmtAge(seconds) {
  const s = Number(seconds || 0);
  if (!Number.isFinite(s) || s <= 0) return "-";
  const mins = Math.floor(s / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m`;
}

export default function StuckSalesWidget({ stuck = [], rule }) {
  const rows = Array.isArray(stuck) ? stuck : [];

  return (
    <div>
      <div className="font-semibold">Stuck sales</div>
      <div className="text-xs text-gray-500 mt-1">Rule: {rule || "—"}</div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-2">Sale</th>
              <th className="text-left p-2">Status</th>
              <th className="text-right p-2">Total</th>
              <th className="text-right p-2">Age</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, idx) => (
              <tr key={`${s?.id || "sale"}-${idx}`} className="border-t">
                <td className="p-2 font-medium">{String(s?.id || "-")}</td>
                <td className="p-2">{s?.status || "-"}</td>
                <td className="p-2 text-right">{money(s?.totalAmount || 0)}</td>
                <td className="p-2 text-right">{fmtAge(s?.ageSeconds)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-3 text-sm text-gray-600">
                  No stuck sales.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
