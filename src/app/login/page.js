"use client";

<<<<<<< HEAD
import { login } from "../../lib/auth";
=======
import { apiFetch } from "../../lib/api";
>>>>>>> 340607d (Update project - 16/01/2026)
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
<<<<<<< HEAD
  const [email, setEmail] = useState("admin@bcs.local");
  const [password, setPassword] = useState("Admin@12345");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err?.data?.error || err.message || "Login failed");
=======

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      await apiFetch("/auth/login", {
        method: "POST",
        body: { email, password }
      });

      const me = await apiFetch("/auth/me", { method: "GET" });
      const role = me?.user?.role;

      const map = {
        seller: "/seller",
        store_keeper: "/store-keeper",
        cashier: "/cashier",
        manager: "/manager",
        admin: "/admin"
      };

      router.replace(map[role] || "/");
    } catch (err) {
      setMsg(err?.data?.error || err.message || "Login failed");
>>>>>>> 340607d (Update project - 16/01/2026)
    } finally {
      setLoading(false);
    }
  }

  return (
<<<<<<< HEAD
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-xl shadow p-6">
        <h1 className="text-xl font-semibold">BCS Admin Login</h1>
        <p className="text-sm text-gray-600 mt-1">Use your admin credentials.</p>

        <div className="mt-4">
          <label className="block text-sm font-medium">Email</label>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div className="mt-3">
          <label className="block text-sm font-medium">Password</label>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2"
=======
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      

      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6">
        <div className="text-xl font-semibold">Staff Login</div>
        <div className="text-xs text-gray-500 mt-1">Use your staff account</div>

        {msg ? (
          <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            {msg}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Password"
>>>>>>> 340607d (Update project - 16/01/2026)
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
<<<<<<< HEAD
        </div>

        {error ? (
          <div className="mt-3 text-sm text-red-600">{error}</div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-lg bg-black text-white py-2 disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
=======

          <button
            disabled={loading}
            className="w-full px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
>>>>>>> 340607d (Update project - 16/01/2026)
    </div>
  );
}
