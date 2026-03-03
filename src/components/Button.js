import React from "react";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Button({
  variant = "primary", // primary | secondary | ghost | danger
  size = "md", // sm | md
  loading = false,
  disabled = false,
  className = "",
  children,
  ...props
}) {
  const isDisabled = disabled || loading;

  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition " +
    "focus:outline-none focus:ring-2 focus:ring-slate-300 " +
    "disabled:opacity-60 disabled:cursor-not-allowed";

  const sizes = {
    sm: "px-3 py-2 text-xs",
    md: "px-4 py-2.5 text-sm",
  };

  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
    danger: "bg-rose-600 text-white hover:bg-rose-500",
  };

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={cx(base, sizes[size], variants[variant], className)}
    >
      {loading ? (
        <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
      ) : null}
      <span className="min-w-0 truncate">{children}</span>
    </button>
  );
}