"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { apiFetch } from "../lib/api";
import { useRouter } from "next/navigation";

export default function RoleBar({ title, subtitle }) {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [checking, setChecking] = useState(true);

  // ✅ Determine if user is actually logged in (server session)
  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        const data = await apiFetch("/auth/me", { method: "GET" });
        if (!alive) return;
        setMe(data?.user || null);
      } catch {
        if (!alive) return;
        setMe(null);
      } finally {
        if (!alive) return;
        setChecking(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, []);

  async function logout() {
    try {
      // If your backend uses POST /auth/logout
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // Even if logout call fails, we still force UI to login
    } finally {
      setMe(null);
      router.replace("/login");
      router.refresh();
    }
  }

  const showAuthNav = !checking && !!me;

  return (
    <div className="border-b bg-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-bold">{title || "BCS"}</div>
          {subtitle ? (
            <div className="text-xs text-gray-600 mt-0.5">{subtitle}</div>
          ) : null}
        </div>

        {showAuthNav ? (
          <div className="flex items-center gap-4">
            <Link
              href="/comms"
              className="text-sm underline text-gray-700 hover:text-black"
            >
              Comms
            </Link>

            <Link
              href="/customers"
              className="text-sm underline text-gray-700 hover:text-black"
            >
              Customers
            </Link>

            <button
              type="button"
              onClick={logout}
              className="px-4 py-2 rounded-lg bg-black text-white text-sm"
            >
              Logout
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
