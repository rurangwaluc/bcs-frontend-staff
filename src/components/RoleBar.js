"use client";

import { useMemo, useState } from "react";

import Link from "next/link";
import NotificationsBell from "./NotificationsBell";
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

  // Real-world UI: do not show raw ids.
  return "";
}

/**
 * RoleBar (presentational + optional auth actions)
 *
 * Props:
 * - title: string
 * - subtitle: string
 * - user: { email?: string, role?: string, locationId?: number|string, location?: {name?:string, code?:string, id?:any} } | null
 * - links: Array<{ href: string, label: string }>
 * - showAuthNav: boolean (default: !!user)
 */
export default function RoleBar({
  title = "BCS",
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
      // ignore: still redirect
    } finally {
      router.replace("/login");
      router.refresh();
      setLoggingOut(false);
    }
  }

  return (
    <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur overflow-x-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 py-3 sm:py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Left */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-9 w-9 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                BCS
              </div>

              <div className="min-w-0">
                <div className="text-base sm:text-lg font-semibold text-slate-900 truncate">
                  {title}
                </div>

                {subtitle ? (
                  <div className="text-xs text-slate-600 mt-0.5 break-words">
                    {subtitle}
                  </div>
                ) : userLine ? (
                  <div className="text-xs text-slate-600 mt-0.5 break-words">
                    {userLine}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Right */}
          {navVisible ? (
            <div className="flex flex-wrap items-center gap-2 justify-start lg:justify-end">
              {/* 🔔 Notifications live everywhere */}
              <NotificationsBell enabled={!!user} />

              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cx(
                    "text-sm font-semibold",
                    "px-3 py-2 rounded-xl border border-slate-200 bg-white",
                    "hover:bg-slate-50 hover:border-slate-300 transition",
                    "whitespace-nowrap",
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
                  "text-sm font-semibold",
                  "px-4 py-2 rounded-xl",
                  "bg-slate-900 text-white",
                  "hover:bg-slate-800 transition",
                  "disabled:opacity-60",
                  "whitespace-nowrap",
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
