"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "bcs-theme";
const THEME_EVENT = "bcs-theme-change";

function getPreferredTheme() {
  if (typeof window === "undefined") return "light";

  const prefersDark =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  return prefersDark ? "dark" : "light";
}

function getStoredTheme() {
  if (typeof window === "undefined") return "light";

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;

  return getPreferredTheme();
}

function applyTheme(theme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
}

function subscribe(callback) {
  if (typeof window === "undefined") return () => {};

  const handleChange = () => {
    const next = getStoredTheme();
    applyTheme(next);
    callback();
  };

  window.addEventListener("storage", handleChange);
  window.addEventListener(THEME_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(THEME_EVENT, handleChange);
  };
}

function getSnapshot() {
  return getStoredTheme();
}

function getServerSnapshot() {
  return "light";
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
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isDark = theme === "dark";
  const sizing = size === "sm" ? "h-10 px-3 text-sm" : "h-11 px-4 text-sm";

  function toggleTheme() {
    if (typeof window === "undefined") return;

    const next = isDark ? "light" : "dark";
    window.localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  }

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
        {isDark ? <SunIcon /> : <MoonIcon />}
      </span>

      {showLabel ? (
        <span className="font-semibold">{isDark ? "Light" : "Dark"}</span>
      ) : null}
    </button>
  );
}
