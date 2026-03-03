"use client";

import React from "react";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function baseClasses(size) {
  const s = size === "sm" ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm";
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold",
    "transition select-none",
    "disabled:opacity-60 disabled:cursor-not-allowed",
    s,
  );
}

function variantClasses(variant) {
  if (variant === "secondary") {
    return "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50";
  }
  if (variant === "danger") {
    return "bg-rose-600 text-white hover:bg-rose-700";
  }
  // primary
  return "bg-slate-900 text-white hover:bg-slate-800";
}

function DotSpinner() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70 animate-bounce" />
      <span
        className="h-1.5 w-1.5 rounded-full bg-current opacity-70 animate-bounce"
        style={{ animationDelay: "120ms" }}
      />
      <span
        className="h-1.5 w-1.5 rounded-full bg-current opacity-70 animate-bounce"
        style={{ animationDelay: "240ms" }}
      />
    </span>
  );
}

/**
 * state: "idle" | "loading" | "success"
 */
export default function AsyncButton({
  type = "button",
  variant = "primary",
  size = "md",
  state = "idle",
  text = "Create",
  loadingText = "Creating…",
  successText = "Created",
  onClick,
  disabled,
  className = "",
}) {
  const isLoading = state === "loading";
  const isSuccess = state === "success";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cx(baseClasses(size), variantClasses(variant), className)}
    >
      {isLoading ? <DotSpinner /> : null}
      <span>{isSuccess ? successText : isLoading ? loadingText : text}</span>
    </button>
  );
}
