"use client";

import { useMemo, useState } from "react";

import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import { usePathname } from "next/navigation";

const DEFAULT_ITEMS = [
  { href: "/", label: "Dashboard", key: "home" },
  { href: "/staff", label: "Staff", key: "staff" },
  { href: "/sales", label: "Sales", key: "sales" },
  { href: "/credits", label: "Credits", key: "credits" },
  { href: "/cash", label: "Cash", key: "cash" },
  { href: "/audit", label: "Audit", key: "audit" },
  { href: "/customers", label: "Customers", key: "customers" },
  { href: "/inventory", label: "Inventory", key: "inventory" },
];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function initialsFromTitle(title) {
  return String(title || "BCS")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}

export default function Nav({
  title = "BCS Staff",
  subtitle = "Branch workspace",
  active = "",
  right = null,
  items = DEFAULT_ITEMS,
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const resolvedItems = useMemo(() => {
    return Array.isArray(items) && items.length > 0 ? items : DEFAULT_ITEMS;
  }, [items]);

  function isItemActive(item) {
    if (active && item.key) return active === item.key;
    if (!pathname) return false;
    if (item.href === "/") return pathname === "/";
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-5">
        <div className="flex min-h-[72px] items-center gap-3">
          <Link
            href="/"
            className="app-focus inline-flex min-w-0 items-center gap-3 rounded-2xl"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] text-sm font-black shadow-sm">
              {initialsFromTitle(title)}
            </div>

            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-[var(--app-fg)]">
                {title}
              </div>
              <div className="truncate text-xs text-[var(--muted)]">
                {subtitle}
              </div>
            </div>
          </Link>

          <nav className="ml-3 hidden min-w-0 flex-1 items-center gap-2 overflow-x-auto thin-scrollbar lg:flex">
            {resolvedItems.map((item) => {
              const activeNow = isItemActive(item);

              return (
                <Link
                  key={item.key || item.href}
                  href={item.href}
                  className={cx(
                    "app-focus inline-flex shrink-0 items-center rounded-2xl border px-3 py-2 text-sm font-semibold transition",
                    activeNow
                      ? "border-transparent bg-[var(--accent)] text-[var(--accent-fg)]"
                      : "border-[var(--border)] bg-[var(--card)] text-[var(--app-fg)] hover:bg-[var(--hover)]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto hidden items-center gap-2 lg:flex">
            <ThemeToggle />
            {right}
          </div>

          <div className="ml-auto flex items-center gap-2 lg:hidden">
            <ThemeToggle className="h-10 px-3" />

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="app-focus inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
              aria-label="Toggle navigation"
              aria-expanded={mobileOpen}
            >
              <span aria-hidden="true">{mobileOpen ? "✕" : "☰"}</span>
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="border-t border-[var(--border)] py-3 lg:hidden">
            <nav className="grid gap-2">
              {resolvedItems.map((item) => {
                const activeNow = isItemActive(item);

                return (
                  <Link
                    key={item.key || item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cx(
                      "app-focus inline-flex items-center rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                      activeNow
                        ? "border-transparent bg-[var(--accent)] text-[var(--accent-fg)]"
                        : "border-[var(--border)] bg-[var(--card)] text-[var(--app-fg)] hover:bg-[var(--hover)]",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {right ? <div className="mt-3">{right}</div> : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
