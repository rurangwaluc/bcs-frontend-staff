"use client";

import { useEffect, useState } from "react";

import ReportsPanel from "../../components/ReportsPanel";
import RoleBar from "../../components/RoleBar";
import { apiFetch } from "../../lib/api";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);

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
          const map = {
            manager: "/manager",
            store_keeper: "/store-keeper",
            cashier: "/cashier",
            seller: "/seller",
          };
          router.replace(map[user.role] || "/");
        }
      } catch {
        if (!alive) return;
        router.replace("/login");
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [router]);

  const isAuthorized = !!me && me.role === "admin";
  if (!isAuthorized)
    return <div className="p-6 text-sm text-gray-600">Redirecting...</div>;

  return (
    <div>
      <RoleBar
        title="Admin Dashboard"
        subtitle={`User: ${me.email} • Location: ${me.locationId}`}
      />

      <div className="max-w-6xl mx-auto p-6">
        <div className="text-sm text-gray-600">
          Reports below are computed from live data (sales, inventory,
          requests).
        </div>

        <ReportsPanel />
      </div>
    </div>
  );
}
