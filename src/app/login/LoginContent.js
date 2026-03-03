"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import AsyncButton from "../../components/AsyncButton";
import { apiFetch } from "../../lib/api";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Banner({ kind = "danger", children }) {
  const styles =
    kind === "success"
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : kind === "warn"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : kind === "info"
          ? "bg-slate-50 text-slate-800 border-slate-200"
          : "bg-rose-50 text-rose-900 border-rose-200";

  return (
    <div className={cx("rounded-2xl border px-4 py-3 text-sm", styles)}>
      {children}
    </div>
  );
}

function Input({ label, hint, right, className = "", ...props }) {
  return (
    <label className="block">
      <div className="flex items-end justify-between gap-3">
        <div className="text-xs font-semibold text-slate-600">{label}</div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      <input
        {...props}
        className={cx(
          "mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none",
          "focus:ring-2 focus:ring-slate-300",
          className,
        )}
      />

      {hint ? <div className="mt-2 text-xs text-slate-500">{hint}</div> : null}
    </label>
  );
}

function normalizeRole(roleParam) {
  const r = String(roleParam || "").trim().toLowerCase();
  if (!r) return "Any role";
  const map = {
    store_keeper: "Store keeper",
    cashier: "Cashier",
    seller: "Seller",
    manager: "Manager",
    admin: "Admin",
    owner: "Owner",
  };
  return map[r] || r;
}

function roleKey(roleParam) {
  const r = String(roleParam || "").trim().toLowerCase();
  return r || "";
}

function humanApiError(err) {
  const raw = err?.data?.error || err?.message || "Login failed";

  // common cases you’ll see in real shops
  const t = String(raw).toLowerCase();
  if (t.includes("invalid") || t.includes("credentials") || t.includes("password")) {
    return { kind: "danger", text: "Wrong email or password." };
  }
  if (t.includes("forbidden") || t.includes("permission")) {
    return { kind: "danger", text: "You are not allowed to sign in here." };
  }
  if (t.includes("network") || t.includes("failed to fetch")) {
    return { kind: "warn", text: "Cannot reach server. Check internet or backend." };
  }
  return { kind: "danger", text: raw };
}

export default function LoginContent() {
  const router = useRouter();
  const sp = useSearchParams();

  const roleParam = sp.get("role") || "";
  const roleHint = useMemo(() => normalizeRole(roleParam), [roleParam]);
  const desiredRoleKey = useMemo(() => roleKey(roleParam), [roleParam]);

  // state (keep structure)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("danger");

  // 3-state button (idle/loading/success)
  const [btnState, setBtnState] = useState("idle");

  // UX helpers
  const [showPw, setShowPw] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  const emailRef = useRef(null);

  useEffect(() => {
    setMsg("");
    setMsgKind("danger");
    setBtnState("idle");
    setCapsOn(false);

    // focus email on role change
    setTimeout(() => {
      try {
        emailRef.current?.focus?.();
      } catch {}
    }, 0);
  }, [roleParam, setMsg, setMsgKind]);

  async function onSubmit(e) {
    e.preventDefault();
    if (btnState === "loading") return;

    const em = String(email || "").trim();
    const pw = String(password || "");

    if (!em) {
      setMsgKind("warn");
      setMsg("Enter your email.");
      return;
    }
    if (!pw) {
      setMsgKind("warn");
      setMsg("Enter your password.");
      return;
    }

    setMsg("");
    setBtnState("loading");

    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: { email: em, password: pw },
      });

      const user = data?.user || data?.me || null;
      const role = String(user?.role || "").toLowerCase();

      const map = {
        seller: "/seller",
        store_keeper: "/store-keeper",
        cashier: "/cashier",
        manager: "/manager",
        admin: "/admin",
        owner: "/owner",
      };

      // ✅ Professional: role hint enforcement (warn, but still route correctly)
      if (desiredRoleKey && role && desiredRoleKey !== role) {
        setMsgKind("warn");
        setMsg(`You signed in as "${role}". Redirecting to your dashboard...`);
      } else {
        setMsgKind("success");
        setMsg("Signed in. Redirecting...");
      }

      setBtnState("success");

      setTimeout(() => {
        router.replace(map[role] || "/");
      }, 250);
    } catch (err) {
      const h = humanApiError(err);
      setBtnState("idle");
      setMsgKind(h.kind);
      setMsg(h.text);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-5 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-base font-semibold text-slate-900">
              Business Control System
            </div>
            <div className="text-xs text-slate-600 mt-0.5 truncate">
              Staff sign-in • Role hint: <b>{roleHint}</b>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-6xl px-4 sm:px-5 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-5">
          {/* Left info */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Secure access</div>
            <div className="mt-2 text-sm leading-relaxed text-slate-600">
              Your role controls what you can see and do. Actions are tracked.
              Cash operations require cash sessions.
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-sm font-semibold text-slate-900">Audit trail</div>
                <div className="mt-1 text-xs text-slate-600">
                  Every important action is logged.
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-sm font-semibold text-slate-900">Cash discipline</div>
                <div className="mt-1 text-xs text-slate-600">
                  Sessions → close → reconcile. No shortcuts.
                </div>
              </div>
            </div>

            <div className="mt-6 text-xs text-slate-500">
              Kigali retail mode: simple UI, strict rules.
            </div>
          </div>

          {/* Right form */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <div className="text-lg font-semibold text-slate-900">Login</div>
            <div className="mt-1 text-xs text-slate-600">Use your admin-created account.</div>

            {msg ? (
              <div className="mt-4">
                <Banner kind={msgKind}>{msg}</Banner>
              </div>
            ) : null}

            {capsOn ? (
              <div className="mt-3">
                <Banner kind="warn">Caps Lock is ON.</Banner>
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="mt-5 grid gap-4">
              <Input
                label="Email"
                placeholder="name@shop.rw"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
                ref={emailRef}
              />

              <Input
                label="Password"
                placeholder="Your password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                onKeyUp={(e) => {
                  try {
                    setCapsOn(Boolean(e.getModifierState && e.getModifierState("CapsLock")));
                  } catch {
                    setCapsOn(false);
                  }
                }}
                right={
                  <button
                    type="button"
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                    onClick={() => setShowPw((v) => !v)}
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                }
              />

              <AsyncButton
                type="submit"
                variant="primary"
                state={btnState}
                text="Sign in"
                loadingText="Signing in..."
                successText="Welcome"
                disabled={!email.trim() || !password}
              />

              <div className="text-xs text-slate-500">
                Can’t sign in? Ask Admin to reset your password.
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}