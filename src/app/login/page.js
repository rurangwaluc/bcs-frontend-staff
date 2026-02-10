// frontend-staff/src/app/login/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { apiFetch } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const roleParam = sp.get("role") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const roleHint = useMemo(() => {
    const r = String(roleParam).toLowerCase();
    if (!r) return "Any role";
    return r;
  }, [roleParam]);

  useEffect(() => {
    setMsg("");
  }, [roleParam]);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      // Your backend must have an auth endpoint. Common ones:
      // - POST /auth/login
      // - POST /login
      //
      // Change this endpoint if your project uses a different one.
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: { email, password },
      });

      // Expecting backend to return { ok: true, user, token } or set cookie.
      // Your apiFetch probably stores token/cookie already. If not, you must adapt here.
      const user = data?.user || data?.me || null;

      // Basic redirect by role (adjust routes to your app)
      const role = String(user?.role || "").toLowerCase();
      const map = {
        seller: "/seller",
        store_keeper: "/store-keeper",
        cashier: "/cashier",
        manager: "/manager",
        admin: "/admin",
        owner: "/owner",
      };

      router.replace(map[role] || "/");
    } catch (err) {
      setMsg(err?.data?.error || err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6">
        <div className="text-xl font-semibold">Login</div>
        <div className="text-xs text-gray-500 mt-1">Role: {roleHint}</div>

        {msg ? (
          <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            {msg}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          <button
            disabled={loading}
            className="w-full px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="text-[11px] text-gray-500 mt-4">
          If your backend login endpoint isn’t <code>/auth/login</code>, change
          it in this file.
        </div>
      </div>
    </div>
  );
}
