"use client";

function money(n) {
  const x = Number(n || 0);
  return Number.isFinite(x) ? x.toLocaleString() : "0";
}

export default function TodayMixWidget({ breakdown = [] }) {
  const rows = Array.isArray(breakdown) ? breakdown : [];
  const total = rows.reduce((s, r) => s + Number(r?.total || 0), 0);

  return (
    <div>
      <div className="font-semibold">Today payment mix</div>
      <div className="text-xs text-gray-500 mt-1">
        Total recorded today:{" "}
        <span className="font-medium">{money(total)}</span>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-2">Method</th>
              <th className="text-right p-2">Count</th>
              <th className="text-right p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={`${r?.method || "OTHER"}-${idx}`} className="border-t">
                <td className="p-2 font-medium">{r?.method || "OTHER"}</td>
                <td className="p-2 text-right">{Number(r?.count || 0)}</td>
                <td className="p-2 text-right">{money(r?.total || 0)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-3 text-sm text-gray-600">
                  No payments recorded today.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
