"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import AuditLogsPanel from "../../components/AuditLogsPanel";
import RoleBar from "../../components/RoleBar";
import { getMe } from "../../lib/auth";

function pick(sp, key) {
  const v = sp.get(key);
  return v ? String(v).trim() : "";
}

export default function EvidencePage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);

  // --------- ROLE GUARD (ADMIN ONLY) ----------
  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        const data = await getMe();
        if (!alive) return;

        const user = data?.user || null;
        setMe(user);

        if (!user?.role) {
          router.replace("/login");
          return;
        }

        if (user.role !== "admin") {
          // Keep your existing role map behavior consistent
          const map = {
            owner: "/owner",
            manager: "/manager",
            store_keeper: "/store-keeper",
            cashier: "/cashier",
            seller: "/seller",
          };
          router.replace(map[user.role] || "/");
          return;
        }
      } catch {
        if (!alive) return;
        router.replace("/login");
        return;
      } finally {
        if (alive) setLoadingMe(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [router]);

  const initialFilters = useMemo(() => {
    const entity = pick(sp, "entity");
    const entityId = pick(sp, "entityId");
    const from = pick(sp, "from");
    const to = pick(sp, "to");
    const action = pick(sp, "action");
    const userId = pick(sp, "userId");
    const q = pick(sp, "q");
    const limitRaw = pick(sp, "limit");

    const limit = limitRaw ? Number(limitRaw) : undefined;

    return {
      entity: entity || undefined,
      entityId: entityId || undefined,
      from: from || undefined,
      to: to || undefined,
      action: action || undefined,
      userId: userId || undefined,
      q: q || undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
    };
  }, [sp]);

  const entity = pick(sp, "entity");
  const entityId = pick(sp, "entityId");

  if (loadingMe) {
    return <div className="p-6 text-sm text-gray-600">Loading...</div>;
  }

  if (!me || me.role !== "admin") {
    return <div className="p-6 text-sm text-gray-600">Redirecting...</div>;
  }

  return (
    <div>
      <RoleBar
        title="Evidence"
        subtitle={`Admin investigation • User: ${me.email} • Location: ${me.locationId}`}
      />

      <div className="max-w-6xl mx-auto p-6 space-y-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="font-semibold">Evidence (audit trail)</div>
          <div className="text-sm text-gray-600 mt-1">
            This page shows the audit trail for a specific business record. Use
            it for disputes, fraud checks, and accountability.
          </div>

          {!entity || !entityId ? (
            <div className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
              Missing <b>entity</b> or <b>entityId</b>.
              <div className="mt-2 text-xs text-amber-900">
                Example:{" "}
                <span className="font-mono">
                  /evidence?entity=sale&entityId=&lt;saleId&gt;
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <AuditLogsPanel
            title="Audit evidence"
            subtitle="Filtered audit logs. The backend still enforces permission (AUDIT_VIEW)."
            initialFilters={initialFilters}
            defaultLimit={100}
          />
        </div>
      </div>
    </div>
  );
}
