"use client";

import MessagesThread from "../../components/MessagesThread";
import { useState } from "react";

const ENTITY_TYPES = ["sale", "inventory", "stock_request"];

export default function CommsPage() {
  const [entityType, setEntityType] = useState("sale");
  const [entityId, setEntityId] = useState("");

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Internal Comms</h1>
        <p className="text-sm text-gray-600 mt-1">
          Attach notes to a record (sale / inventory / stock request).
        </p>
      </div>

      <div className="bg-white border rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <div className="text-xs text-gray-500 mb-1">Entity type</div>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          >
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <div className="text-xs text-gray-500 mb-1">Entity ID</div>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Example: sale id (number)"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
          />
        </div>
      </div>

      <MessagesThread
        title="Thread"
        entityType={entityType}
        entityId={entityId}
      />
    </div>
  );
}
