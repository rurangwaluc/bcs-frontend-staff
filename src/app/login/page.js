"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "../../lib/api";
import { useRouter } from "next/navigation";

function routeFor(role) {
  const r = String(role || "").toLowerCase();
  if (r === "owner") return "/owner";
  if (r === "admin") return "/admin";
  if (r === "manager") return "/manager";
  if (r === "store_keeper") return "/store-keeper";
  if (r === "seller") return "/seller";
  if (r === "cashier") return "/cashier";
  return "/";
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  // ✅ If already logged in, kick out of login page
  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        const me = await apiFetch("/auth/me", { method: "GET" });
        if (!alive) return;

        const role = me?.user?.role;
        router.replace(routeFor(role));
      } catch {
        // not logged in -> allow login page
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [router]);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");

    try {
      await apiFetch("/auth/login", {
        method: "POST",
        body: { email, password },
      });

      // after login, fetch role and route correctly
      const me = await apiFetch("/auth/me", { method: "GET" });
      router.replace(routeFor(me?.user?.role));
    } catch (err) {
      setMsg(err?.data?.error || err.message || "Login failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow p-6">
        <div className="text-xl font-bold">Login</div>
        <div className="text-sm text-gray-600 mt-1">Sign in to continue.</div>

        {msg ? (
          <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            {msg}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-4 grid gap-3">
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="px-4 py-2 rounded-lg bg-black text-white">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
