"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import AsyncButton from "../../components/AsyncButton";
import ThemeToggle from "../../components/ThemeToggle";
import { apiFetch } from "../../lib/api";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 10.7A3 3 0 0 0 12 15a3 3 0 0 0 2.2-.9" />
      <path d="M9.9 5.2A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.1 4.2" />
      <path d="M6.7 6.7C4.1 8.5 2 12 2 12s3.5 7 10 7a10.7 10.7 0 0 0 5.3-1.4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 1 1 8 0v3" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function Banner({ kind = "danger", children }) {
  const styles =
    kind === "success"
      ? "border-emerald-300 bg-emerald-100/70 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
      : kind === "warn"
        ? "border-amber-300 bg-amber-100/70 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
        : kind === "info"
          ? "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]"
          : "border-rose-300 bg-rose-100/70 text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200";

  return (
    <div className={cx("rounded-2xl border px-4 py-3 text-sm", styles)}>
      {children}
    </div>
  );
}

const Input = ({
  label,
  hint,
  right,
  leftIcon,
  className = "",
  inputRef,
  ...props
}) => {
  return (
    <label className="block">
      <div className="mb-2 flex items-end justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] app-muted">
          {label}
        </div>
      </div>

      <div className="relative">
        {leftIcon ? (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[var(--muted)]">
            {leftIcon}
          </div>
        ) : null}

        <input
          {...props}
          ref={inputRef}
          className={cx(
            "app-focus h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--app-fg)] outline-none transition",
            "placeholder:text-[var(--muted-2)] hover:border-[var(--muted-2)]",
            leftIcon ? "pl-11" : "pl-4",
            right ? "pr-14" : "pr-4",
            className,
          )}
        />

        {right ? (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {right}
          </div>
        ) : null}
      </div>

      {hint ? <div className="mt-2 text-xs app-muted">{hint}</div> : null}
    </label>
  );
};

function normalizeRole(roleParam) {
  const r = String(roleParam || "")
    .trim()
    .toLowerCase();

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
  const r = String(roleParam || "")
    .trim()
    .toLowerCase();
  return r || "";
}

function humanApiError(err) {
  const raw = err?.data?.error || err?.message || "Login failed";
  const t = String(raw).toLowerCase();

  if (
    t.includes("invalid") ||
    t.includes("credentials") ||
    t.includes("password")
  ) {
    return { kind: "danger", text: "Wrong email or password." };
  }

  if (t.includes("forbidden") || t.includes("permission")) {
    return { kind: "danger", text: "You are not allowed to sign in here." };
  }

  if (t.includes("network") || t.includes("failed to fetch")) {
    return {
      kind: "warn",
      text: "Cannot reach server. Check internet or backend.",
    };
  }

  return { kind: "danger", text: raw };
}

export default function LoginContent() {
  const router = useRouter();
  const sp = useSearchParams();

  const roleParam = sp.get("role") || "";
  const roleHint = useMemo(() => normalizeRole(roleParam), [roleParam]);
  const desiredRoleKey = useMemo(() => roleKey(roleParam), [roleParam]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("danger");
  const [btnState, setBtnState] = useState("idle");

  const [showPw, setShowPw] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  const emailRef = useRef(null);

  useEffect(() => {
    setMsg("");
    setMsgKind("danger");
    setBtnState("idle");
    setCapsOn(false);

    const timer = setTimeout(() => {
      try {
        emailRef.current?.focus?.();
      } catch {}
    }, 0);

    return () => clearTimeout(timer);
  }, [roleParam]);

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
      }, 260);
    } catch (err) {
      const h = humanApiError(err);
      setBtnState("idle");
      setMsgKind(h.kind);
      setMsg(h.text);
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--app-bg)] text-[var(--app-fg)]">
      <div className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <div className="text-base font-semibold text-[var(--app-fg)]">
              Business Control System
            </div>
            <div className="mt-0.5 truncate text-xs app-muted">
              Staff sign-in • Role hint: <b>{roleHint}</b>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle size="sm" />

            <button
              type="button"
              onClick={() => router.push("/")}
              className="app-focus rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
            >
              Back
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-5">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_430px]">
          <div className="app-card rounded-[32px] p-6 sm:p-8 lg:p-10">
            <div className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--card-2)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] app-muted">
              Secure branch access
            </div>

            <h1 className="mt-5 text-2xl font-bold tracking-tight text-[var(--app-fg)] sm:text-4xl">
              Sign in to your staff workspace.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 app-muted sm:text-base">
              Your role controls what you can see and do. Actions are tracked.
              Cash operations require active cash sessions. Branch workflows
              stay strict so staff cannot skip the real operational flow.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="app-card-soft rounded-[24px] p-5">
                <div className="text-sm font-semibold text-[var(--app-fg)]">
                  Audit trail
                </div>
                <div className="mt-2 text-sm leading-6 app-muted">
                  Every important action is logged clearly and tied to the user
                  and branch.
                </div>
              </div>

              <div className="app-card-soft rounded-[24px] p-5">
                <div className="text-sm font-semibold text-[var(--app-fg)]">
                  Cash discipline
                </div>
                <div className="mt-2 text-sm leading-6 app-muted">
                  Sessions, ledger flow, and reconciliation are enforced instead
                  of left to memory.
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-[24px] border border-[var(--border)] bg-[var(--card-2)] p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] app-muted">
                Built and maintained by
              </div>

              <div className="mt-2 text-base font-semibold text-[var(--app-fg)]">
                <a
                  href="https://webimpactlab.com"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[var(--app-fg)] underline underline-offset-4"
                >
                  Web Impact Lab
                </a>
              </div>

              <div className="mt-2 text-sm leading-6 app-muted">
                Retail systems, operations software, and modern business tools.
              </div>

              <div className="mt-4">
                <a
                  href="https://wa.me/250785587830"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
                >
                  WhatsApp: +250 785 587 830
                </a>
              </div>
            </div>
          </div>

          <div className="app-card rounded-[32px] p-6 sm:p-8">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] app-muted">
              Welcome back
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-[var(--app-fg)]">
              Login
            </div>
            <div className="mt-2 text-sm app-muted">
              Use your admin-created account to continue.
            </div>

            {msg ? (
              <div className="mt-5">
                <Banner kind={msgKind}>{msg}</Banner>
              </div>
            ) : null}

            {capsOn ? (
              <div className="mt-3">
                <Banner kind="warn">Caps Lock is ON.</Banner>
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="mt-6 grid gap-5">
              <Input
                label="Email"
                placeholder="name@shop.rw"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
                inputRef={emailRef}
                leftIcon={<MailIcon />}
              />

              <Input
                label="Password"
                placeholder="Enter your password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                onKeyUp={(e) => {
                  try {
                    setCapsOn(
                      Boolean(
                        e.getModifierState && e.getModifierState("CapsLock"),
                      ),
                    );
                  } catch {
                    setCapsOn(false);
                  }
                }}
                leftIcon={<LockIcon />}
                right={
                  <button
                    type="button"
                    aria-label={showPw ? "Hide password" : "Show password"}
                    title={showPw ? "Hide password" : "Show password"}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card-2)] text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--app-fg)]"
                    onClick={() => setShowPw((v) => !v)}
                  >
                    {showPw ? <EyeOffIcon /> : <EyeIcon />}
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

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-3 text-xs leading-6 app-muted">
                Can’t sign in? Ask Admin to reset your password or confirm your
                assigned role and branch access.
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
