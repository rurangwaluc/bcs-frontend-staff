"use client";

import { useEffect, useMemo, useState } from "react";

import { getMe } from "./auth";
import { useRouter } from "next/navigation";

export const ROLE_HOME = Object.freeze({
  owner: "/owner",
  admin: "/admin",
  manager: "/manager",
  store_keeper: "/store-keeper",
  cashier: "/cashier",
  seller: "/seller",
});

function normalizeRole(role) {
  return String(role || "").trim();
}

export function homeForRole(role) {
  const r = normalizeRole(role);
  return ROLE_HOME[r] || "/login";
}

/**
 * Client-side role guard (for App Router client pages).
 * - If not logged in -> /login
 * - If logged in but role mismatch -> role home
 *
 * Usage:
 *   const { me, loading } = useRequireRole(["admin"]);
 */
export function useRequireRole(allowedRoles) {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  const allowed = useMemo(() => {
    const arr = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return new Set(arr.map(normalizeRole).filter(Boolean));
  }, [allowedRoles]);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      try {
        const data = await getMe();
        if (!alive) return;

        const user = data?.user || null;
        setMe(user);

        if (!user?.role) {
          router.replace("/login");
          return;
        }

        const role = normalizeRole(user.role);

        if (!allowed.has(role)) {
          router.replace(homeForRole(role));
          return;
        }
      } catch {
        if (!alive) return;
        router.replace("/login");
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [allowed, router]);

  return { me, loading };
}
