"use client";

import { useMemo, useState } from "react";

import Link from "next/link";
import NotificationsBell from "./NotificationsBell";
import ThemeToggle from "./ThemeToggle";
import { apiFetch } from "../lib/api";
import { useRouter } from "next/navigation";

function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function locationLabel(user) {
  if (!user) return "";
  const loc = user?.location || null;

  const name =
    (loc?.name != null ? toStr(loc.name) : "") ||
    (user?.locationName != null ? toStr(user.locationName) : "") ||
    "";

  const code =
    (loc?.code != null ? toStr(loc.code) : "") ||
    (user?.locationCode != null ? toStr(user.locationCode) : "") ||
    "";

  if (name && code) return `${name} (${code})`;
  if (name) return name;
  if (code) return code;
  return "";
}

export default function RoleBar({
  title = "Business Control System",
  subtitle,
  user = null,
  links,
  showAuthNav,
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const navVisible = typeof showAuthNav === "boolean" ? showAuthNav : !!user;

  const defaultLinks = useMemo(
    () => [
      { href: "/comms", label: "Comms" },
      { href: "/customers", label: "Customers" },
    ],
    [],
  );

  const navLinks = Array.isArray(links) && links.length ? links : defaultLinks;

  const userLine = useMemo(() => {
    if (!user) return "";

    const email = toStr(user.email);
    const role = toStr(user.role);
    const loc = locationLabel(user);

    const left =
      email || role ? `${email || "User"}${role ? ` • ${role}` : ""}` : "";

    if (!left && !loc) return "";
    if (left && loc) return `${left} • ${loc}`;
    return left || loc;
  }, [user]);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      router.replace("/login");
      router.refresh();
      setLoggingOut(false);
    }
  }

  return (
    <div className="sticky top-0 z-40 overflow-x-hidden border-b border-[var(--border-strong)] bg-[color:color-mix(in_oklab,var(--card)_96%,white_4%)] shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur dark:bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)]">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--app-fg)] text-xs font-extrabold text-[var(--app-bg)] shadow-sm">
                BCS
              </div>

              <div className="min-w-0">
                <div className="truncate text-base font-bold text-[var(--app-fg)] sm:text-lg">
                  {title}
                </div>

                {subtitle ? (
                  <div className="mt-0.5 break-words text-xs app-muted">
                    {subtitle}
                  </div>
                ) : userLine ? (
                  <div className="mt-0.5 break-words text-xs app-muted">
                    {userLine}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {navVisible ? (
            <div className="flex flex-wrap items-center gap-2 justify-start lg:justify-end">
              <ThemeToggle size="sm" />
              <NotificationsBell enabled={!!user} />

              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cx(
                    "app-focus whitespace-nowrap rounded-2xl border border-[var(--border-strong)] bg-[var(--card)] px-3 py-2 text-sm font-semibold text-[var(--app-fg)] shadow-sm transition",
                    "hover:bg-[var(--hover)]",
                  )}
                >
                  {l.label}
                </Link>
              ))}

              <button
                type="button"
                onClick={logout}
                disabled={loggingOut}
                className={cx(
                  "app-focus whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm transition",
                  "bg-[var(--app-fg)] text-[var(--app-bg)] hover:opacity-90",
                  "disabled:opacity-60",
                )}
              >
                {loggingOut ? "Logging out…" : "Logout"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
