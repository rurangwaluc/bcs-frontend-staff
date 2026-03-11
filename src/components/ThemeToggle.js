"use client";

import { useEffect, useState } from "react";

function getStoredTheme() {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem("bcs-theme");
  if (saved === "light" || saved === "dark") return saved;

  const prefersDark =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  return prefersDark ? "dark" : "light";
}

function applyTheme(theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

function SunIcon() {
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
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2" />
      <path d="M12 19.3v2.2" />
      <path d="M4.9 4.9l1.6 1.6" />
      <path d="M17.5 17.5l1.6 1.6" />
      <path d="M2.5 12h2.2" />
      <path d="M19.3 12h2.2" />
      <path d="M4.9 19.1l1.6-1.6" />
      <path d="M17.5 6.5l1.6-1.6" />
    </svg>
  );
}

function MoonIcon() {
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
      <path d="M20 14.2A8.5 8.5 0 1 1 9.8 4a7 7 0 0 0 10.2 10.2Z" />
    </svg>
  );
}

export default function ThemeToggle({
  className = "",
  showLabel = true,
  size = "md",
}) {
  const [theme, setTheme] = useState("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const next = getStoredTheme();
    setTheme(next);
    applyTheme(next);
    setReady(true);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("bcs-theme", next);
    }
  }

  const isDark = theme === "dark";

  const sizing = size === "sm" ? "h-10 px-3 text-sm" : "h-11 px-4 text-sm";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={[
        "inline-flex items-center gap-2 rounded-2xl border transition",
        "border-[var(--border)] bg-[var(--card)] text-[var(--app-fg)]",
        "hover:bg-[var(--hover)] app-focus",
        sizing,
        className,
      ].join(" ")}
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card-2)]">
        {ready && isDark ? <SunIcon /> : <MoonIcon />}
      </span>
      {showLabel ? (
        <span className="font-semibold">{isDark ? "Light" : "Dark"}</span>
      ) : null}
    </button>
  );
}
