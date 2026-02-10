"use client";

function money(n) {
  const x = Number(n || 0);
  return Number.isFinite(x) ? x.toLocaleString() : "0";
}

function safeDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

export default function Last10PaymentsWidget({ rows = [] }) {
  const list = Array.isArray(rows) ? rows : [];

  return (
    <div>
      <div className="font-semibold">Last 10 payments</div>
      <div className="text-xs text-gray-500 mt-1">Latest activity</div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-2">ID</th>
              <th className="text-left p-2">Sale</th>
              <th className="text-right p-2">Amount</th>
              <th className="text-left p-2">Method</th>
              <th className="text-left p-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p, idx) => (
              <tr key={`${p?.id || "pay"}-${idx}`} className="border-t">
                <td className="p-2 font-medium">{String(p?.id || "-")}</td>
                <td className="p-2">{p?.saleId ?? "-"}</td>
                <td className="p-2 text-right">{money(p?.amount || 0)}</td>
                <td className="p-2">{p?.method || "-"}</td>
                <td className="p-2">{safeDate(p?.createdAt)}</td>
              </tr>
            ))}
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-3 text-sm text-gray-600">
                  No recent payments.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
