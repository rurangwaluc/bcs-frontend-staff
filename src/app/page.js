"use client";

import { apiFetch } from "../lib/api";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

function routeFor(role) {
  const r = String(role || "").toLowerCase();
  if (r === "owner") return "/owner";
  if (r === "admin") return "/admin";
  if (r === "manager") return "/manager";
  if (r === "store_keeper") return "/store-keeper";
  if (r === "seller") return "/seller";
  if (r === "cashier") return "/cashier";
  return "/login";
}

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        const me = await apiFetch("/auth/me", { method: "GET" });
        if (!alive) return;

        const role = me?.user?.role;
        router.replace(routeFor(role));
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

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow p-6">
        <div className="text-xl font-bold">Business Control System</div>
        <div className="text-sm text-gray-600 mt-2">Checking your session…</div>
      </div>
    </div>
  );
}
