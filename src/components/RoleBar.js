"use client";

import { useMemo, useState } from "react";

import Link from "next/link";
import { apiFetch } from "../lib/api";
import { useRouter } from "next/navigation";

function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

/**
 * RoleBar (presentational + optional auth actions)
 *
 * Props:
 * - title: string
 * - subtitle: string
 * - user: { email?: string, role?: string, locationId?: number|string } | null
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
    const loc =
      user.locationId !== undefined ? ` • Loc ${user.locationId}` : "";
    const left =
      email || role ? `${email || "User"}${role ? ` • ${role}` : ""}` : "";
    return left ? `${left}${loc}` : "";
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
    <div className="border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Left */}
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-semibold truncate">
              {title}
            </div>

            {subtitle ? (
              <div className="text-xs text-gray-600 mt-0.5 break-words">
                {subtitle}
              </div>
            ) : null}

            {!subtitle && userLine ? (
              <div className="text-xs text-gray-600 mt-0.5 break-words">
                {userLine}
              </div>
            ) : null}
          </div>

          {/* Right */}
          {navVisible ? (
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-start sm:justify-end">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-sm px-3 py-2 rounded-lg border hover:bg-gray-50"
                >
                  {l.label}
                </Link>
              ))}

              <button
                type="button"
                onClick={logout}
                disabled={loggingOut}
                className="text-sm px-4 py-2 rounded-lg bg-black text-white disabled:opacity-60"
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
