
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
