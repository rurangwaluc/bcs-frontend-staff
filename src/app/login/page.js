"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "../../lib/api";
import { useRouter } from "next/navigation";

function routeFor(role) {
  const r = String(role || "").toLowerCase();
  // IMPORTANT: owner is NOT allowed inside frontend-staff
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
  const [checking, setChecking] = useState(true);

  // if already logged in
  const [sessionRole, setSessionRole] = useState("");
  const [sessionEmail, setSessionEmail] = useState("");

  useEffect(() => {
    let alive = true;

    async function run() {
      setChecking(true);
      setMsg("");

      try {
        const me = await apiFetch("/auth/me", { method: "GET" });
        if (!alive) return;

        const role = String(me?.user?.role || "");
        const em = String(me?.user?.email || "");

        setSessionRole(role);
        setSessionEmail(em);

        // If already logged in as staff, route away.
        // If logged in as OWNER, DO NOT auto-redirect (owner portal is separate).
        if (role && role.toLowerCase() !== "owner") {
          router.replace(routeFor(role));
          return;
        }
      } catch {
        // Not logged in -> show login form
      } finally {
        if (!alive) return;
        setChecking(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [router]);

  async function doLogout() {
    setMsg("");
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // some backends use GET /auth/logout; try best-effort
      try {
        await apiFetch("/auth/logout", { method: "GET" });
      } catch {
        // ignore
      }
    } finally {
      // reset local session view
      setSessionRole("");
      setSessionEmail("");
      setPassword("");
      setChecking(false);
      // Stay on login
      router.replace("/login");
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");

    try {
      await apiFetch("/auth/login", {
        method: "POST",
        body: { email, password },
      });

      const me = await apiFetch("/auth/me", { method: "GET" });
      const role = String(me?.user?.role || "");

      if (!role) {
        setMsg("Login succeeded but role is missing. Contact admin.");
        return;
      }

      if (role.toLowerCase() === "owner") {
        // Owner is not allowed in staff portal
        setSessionRole(role);
        setSessionEmail(String(me?.user?.email || ""));
        setMsg(
          "This is the Staff Portal. Owner accounts must use the Owner Portal.",
        );
        return;
      }

      router.replace(routeFor(role));
    } catch (err) {
      setMsg(err?.data?.error || err.message || "Login failed");
    }
  }

  // Loading state while checking existing session
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-xl shadow p-6">
          <div className="text-sm text-gray-600">Checking session…</div>
        </div>
      </div>
    );
  }

  const isOwnerSession = String(sessionRole || "").toLowerCase() === "owner";

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow p-6">
        <div className="text-xl font-bold">Staff Login</div>
        <div className="text-sm text-gray-600 mt-1">
          Sign in to the staff portal (admin / manager / cashier / seller /
          store keeper).
        </div>

        {msg ? (
          <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            {msg}
          </div>
        ) : null}

        {isOwnerSession ? (
          <div className="mt-4 p-4 border rounded-xl bg-white">
            <div className="font-semibold">Owner account detected</div>
            <div className="text-sm text-gray-600 mt-1">
              You are logged in as{" "}
              <span className="font-medium">{sessionEmail || "owner"}</span>.
              The Owner Portal is a separate application.
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={doLogout}
                className="px-4 py-2 rounded-lg bg-black text-white text-sm"
              >
                Logout & switch account
              </button>
              <button
                onClick={() => {
                  // Keep as a placeholder. In production you can set OWNER_PORTAL_URL and redirect there.
                  const url = process.env.NEXT_PUBLIC_OWNER_PORTAL_URL;
                  if (url) window.location.href = url;
                  else
                    setMsg("Owner Portal URL is not configured in this app.");
                }}
                className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
              >
                Open Owner Portal
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 grid gap-3">
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            <button className="px-4 py-2 rounded-lg bg-black text-white">
              Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
