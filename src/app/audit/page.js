// "use client";

// import { useEffect, useMemo, useState } from "react";

// import Nav from "../../components/Nav";
// import { apiFetch } from "../../lib/api";

// function isoDateLocal(d = new Date()) {
//   const yyyy = d.getFullYear();
//   const mm = String(d.getMonth() + 1).padStart(2, "0");
//   const dd = String(d.getDate()).padStart(2, "0");
//   return `${yyyy}-${mm}-${dd}`;
// }

// function formatDate(value) {
//   if (!value) return "-";
//   try {
//     return new Date(value).toLocaleString();
//   } catch {
//     return String(value);
//   }
// }

// function clean(v) {
//   const s = String(v ?? "").trim();
//   return s ? s : "";
// }

// function toInt(v) {
//   const n = Number(v);
//   return Number.isFinite(n) ? n : null;
// }

// export default function AuditPage() {
//   const [rows, setRows] = useState([]);
//   const [nextCursor, setNextCursor] = useState(null);

//   const [loading, setLoading] = useState(true);
//   const [loadingMore, setLoadingMore] = useState(false);
//   const [msg, setMsg] = useState("");

//   // ---- Filters (server-side) ----
//   const [q, setQ] = useState("");
//   const [action, setAction] = useState("");
//   const [entity, setEntity] = useState("");
//   const [entityId, setEntityId] = useState("");
//   const [userId, setUserId] = useState("");

//   // YYYY-MM-DD (backend expects this)
//   const [from, setFrom] = useState(""); // optional
//   const [to, setTo] = useState(""); // optional

//   const [limit, setLimit] = useState(50);

//   // Optional actions dropdown if backend provides /audit/actions
//   const [actionOptions, setActionOptions] = useState([]);

//   const hasFilters = useMemo(() => {
//     return !!(
//       clean(q) ||
//       clean(action) ||
//       clean(entity) ||
//       clean(entityId) ||
//       clean(userId) ||
//       clean(from) ||
//       clean(to)
//     );
//   }, [q, action, entity, entityId, userId, from, to]);

//   function buildParams({ cursor = null } = {}) {
//     const params = new URLSearchParams();

//     const lim = Math.min(200, Math.max(1, Number(limit) || 50));
//     params.set("limit", String(lim));

//     if (cursor) params.set("cursor", String(cursor));

//     if (clean(q)) params.set("q", clean(q));
//     if (clean(action)) params.set("action", clean(action));
//     if (clean(entity)) params.set("entity", clean(entity));

//     const eid = toInt(entityId);
//     if (eid) params.set("entityId", String(eid));

//     const uid = toInt(userId);
//     if (uid) params.set("userId", String(uid));

//     // Date filters (YYYY-MM-DD)
//     if (clean(from)) params.set("from", clean(from));
//     if (clean(to)) params.set("to", clean(to));

//     return params.toString();
//   }

//   async function loadActionsList() {
//     try {
//       const data = await apiFetch("/audit/actions", { method: "GET" });
//       const list = data?.actions;
//       if (Array.isArray(list)) setActionOptions(list);
//     } catch {
//       // ignore (endpoint optional)
//     }
//   }

//   async function loadFirstPage() {
//     setLoading(true);
//     setMsg("");
//     try {
//       const qs = buildParams({ cursor: null });
//       const data = await apiFetch(`/audit?${qs}`, { method: "GET" });

//       setRows(Array.isArray(data?.rows) ? data.rows : []);
//       setNextCursor(data?.nextCursor ?? null);
//     } catch (e) {
//       setRows([]);
//       setNextCursor(null);
//       setMsg(e?.data?.error || e?.message || "Failed to load audit logs");
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function loadMore() {
//     if (!nextCursor) return;

//     setLoadingMore(true);
//     setMsg("");
//     try {
//       const qs = buildParams({ cursor: nextCursor });
//       const data = await apiFetch(`/audit?${qs}`, { method: "GET" });

//       const more = Array.isArray(data?.rows) ? data.rows : [];
//       setRows((prev) => [...prev, ...more]);
//       setNextCursor(data?.nextCursor ?? null);
//     } catch (e) {
//       setMsg(e?.data?.error || e?.message || "Failed to load more logs");
//     } finally {
//       setLoadingMore(false);
//     }
//   }

//   useEffect(() => {
//     loadActionsList();
//     loadFirstPage();
//     // default date range optional (commented)
//     // setFrom(isoDateLocal(new Date(Date.now() - 1000 * 60 * 60 * 24 * 7))); // 7 days ago
//     // setTo(isoDateLocal());
//   }, []);

//   return (
//     <div>
//       <Nav active="audit" />

//       <div className="max-w-6xl mx-auto p-6">
//         <div className="flex items-center justify-between gap-3">
//           <div>
//             <h1 className="text-2xl font-bold">Audit Logs</h1>
//             <p className="text-sm text-gray-600 mt-1">
//               Server-filtered + cursor pagination (real-world).
//             </p>
//           </div>

//           <div className="flex gap-2">
//             <button
//               onClick={loadFirstPage}
//               className="px-4 py-2 rounded-lg bg-black text-white"
//               disabled={loading}
//             >
//               {loading ? "Loading..." : "Refresh"}
//             </button>
//           </div>
//         </div>

//         {msg ? (
//           <div className="mt-4 text-sm">
//             <div className="p-3 rounded-lg bg-red-50 text-red-700">{msg}</div>
//           </div>
//         ) : null}

//         {/* Filters */}
//         <div className="mt-6 bg-white rounded-xl shadow p-4">
//           <div className="flex items-center justify-between gap-3">
//             <div className="font-semibold">Filters</div>

//             <div className="text-xs text-gray-500">
//               {hasFilters ? "Active filters applied" : "No filters"}
//             </div>
//           </div>

//           <div className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-3">
//             <input
//               className="border rounded-lg px-3 py-2 text-sm"
//               placeholder="Search q (description)"
//               value={q}
//               onChange={(e) => setQ(e.target.value)}
//             />

//             {/* Action: dropdown if available else free text */}
//             {actionOptions.length ? (
//               <select
//                 className="border rounded-lg px-3 py-2 text-sm"
//                 value={action}
//                 onChange={(e) => setAction(e.target.value)}
//               >
//                 <option value="">ALL actions</option>
//                 {actionOptions.map((a) => (
//                   <option key={a} value={a}>
//                     {a}
//                   </option>
//                 ))}
//               </select>
//             ) : (
//               <input
//                 className="border rounded-lg px-3 py-2 text-sm"
//                 placeholder="Action (e.g. SALE_CREATE)"
//                 value={action}
//                 onChange={(e) => setAction(e.target.value)}
//               />
//             )}

//             <input
//               className="border rounded-lg px-3 py-2 text-sm"
//               placeholder="Entity (e.g. sale, user)"
//               value={entity}
//               onChange={(e) => setEntity(e.target.value)}
//             />

//             <input
//               className="border rounded-lg px-3 py-2 text-sm"
//               placeholder="Entity ID"
//               value={entityId}
//               onChange={(e) => setEntityId(e.target.value)}
//             />

//             <input
//               className="border rounded-lg px-3 py-2 text-sm"
//               placeholder="User ID"
//               value={userId}
//               onChange={(e) => setUserId(e.target.value)}
//             />

//             <input
//               className="border rounded-lg px-3 py-2 text-sm"
//               type="number"
//               min="1"
//               max="200"
//               value={limit}
//               onChange={(e) => setLimit(Number(e.target.value))}
//               title="Limit (max 200)"
//             />
//           </div>

//           <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
//             <div>
//               <div className="text-xs text-gray-500 mb-1">
//                 From (YYYY-MM-DD)
//               </div>
//               <input
//                 className="border rounded-lg px-3 py-2 text-sm w-full"
//                 type="date"
//                 value={from}
//                 onChange={(e) => setFrom(e.target.value)}
//                 max={to || undefined}
//               />
//             </div>

//             <div>
//               <div className="text-xs text-gray-500 mb-1">To (YYYY-MM-DD)</div>
//               <input
//                 className="border rounded-lg px-3 py-2 text-sm w-full"
//                 type="date"
//                 value={to}
//                 onChange={(e) => setTo(e.target.value)}
//                 min={from || undefined}
//               />
//             </div>

//             <div className="flex items-end gap-2">
//               <button
//                 onClick={() => {
//                   // applying filters resets cursor
//                   loadFirstPage();
//                 }}
//                 className="rounded-lg bg-black text-white px-4 py-2 text-sm"
//                 disabled={loading}
//               >
//                 Apply
//               </button>

//               <button
//                 onClick={() => {
//                   setQ("");
//                   setAction("");
//                   setEntity("");
//                   setEntityId("");
//                   setUserId("");
//                   setFrom("");
//                   setTo("");
//                   setLimit(50);
//                   // then load
//                   setTimeout(loadFirstPage, 0);
//                 }}
//                 className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
//                 disabled={loading}
//               >
//                 Reset
//               </button>
//             </div>

//             <div className="flex items-end justify-end text-xs text-gray-500">
//               Tip: use From/To to avoid loading huge history.
//             </div>
//           </div>
//         </div>

//         {/* Table */}
//         <div className="mt-6 bg-white rounded-xl shadow overflow-hidden">
//           <div className="p-4 border-b flex items-center justify-between gap-3">
//             <div>
//               <div className="font-semibold">Logs</div>
//               <div className="text-xs text-gray-500 mt-1">
//                 Showing {rows.length} rows
//                 {nextCursor ? " (more available)" : " (end)"}.
//               </div>
//             </div>

//             {nextCursor ? (
//               <button
//                 onClick={loadMore}
//                 className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
//                 disabled={loadingMore}
//               >
//                 {loadingMore ? "Loading..." : "Load more"}
//               </button>
//             ) : null}
//           </div>

//           {loading ? (
//             <div className="p-4 text-sm text-gray-600">Loading...</div>
//           ) : (
//             <div className="overflow-x-auto">
//               <table className="w-full text-sm">
//                 <thead className="bg-gray-50 text-gray-600">
//                   <tr>
//                     <th className="text-left p-3">Time</th>
//                     <th className="text-left p-3">User</th>
//                     <th className="text-left p-3">Action</th>
//                     <th className="text-left p-3">Entity</th>
//                     <th className="text-left p-3">Entity ID</th>
//                     <th className="text-left p-3">Description</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {rows.map((r) => (
//                     <tr key={r.id} className="border-t">
//                       <td className="p-3">{formatDate(r.createdAt)}</td>
//                       <td className="p-3">
//                         {r.userEmail ? (
//                           <div>
//                             <div className="font-medium">{r.userEmail}</div>
//                             <div className="text-xs text-gray-500">
//                               ID: {r.userId ?? "-"}
//                             </div>
//                           </div>
//                         ) : (
//                           (r.userId ?? "-")
//                         )}
//                       </td>
//                       <td className="p-3 font-medium">{r.action}</td>
//                       <td className="p-3">{r.entity}</td>
//                       <td className="p-3">{r.entityId ?? "-"}</td>
//                       <td className="p-3 text-gray-700">
//                         {r.description ?? "-"}
//                       </td>
//                     </tr>
//                   ))}

//                   {rows.length === 0 ? (
//                     <tr>
//                       <td colSpan={6} className="p-4 text-sm text-gray-600">
//                         No logs found.
//                       </td>
//                     </tr>
//                   ) : null}
//                 </tbody>
//               </table>
//             </div>
//           )}
//         </div>

//         {/* Footer: helpful debug */}
//         <div className="mt-4 text-xs text-gray-500">
//           Backend query used:{" "}
//           <code>/audit?{buildParams({ cursor: null })}</code>
//         </div>
//       </div>
//     </div>
//   );
// }
"use client";

import AuditLogsPanel from "../../components/AuditLogsPanel";
import Nav from "../../components/Nav";

export default function AuditPage() {
  return (
    <div>
      <Nav active="audit" />
      <div className="max-w-6xl mx-auto p-6">
        <AuditLogsPanel />
      </div>
    </div>
  );
}
