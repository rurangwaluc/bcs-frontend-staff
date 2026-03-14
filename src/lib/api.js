"use client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:4000";

export async function apiFetch(path, options = {}) {
  if (typeof path !== "string" || !path.trim()) {
    throw new Error("apiFetch(path): path is required and must be a string");
  }

  const normalizedPath = path.trim();
  const url = normalizedPath.startsWith("http")
    ? normalizedPath
    : `${API_BASE.replace(/\/$/, "")}${
        normalizedPath.startsWith("/") ? "" : "/"
      }${normalizedPath}`;

  const opts = { ...options };
  opts.headers = { ...(opts.headers || {}) };

  const hasBody = opts.body !== undefined && opts.body !== null;

  if (hasBody) {
    if (typeof opts.body === "object" && !(opts.body instanceof FormData)) {
      opts.body = JSON.stringify(opts.body);
    }

    if (!(opts.body instanceof FormData)) {
      opts.headers["Content-Type"] = "application/json";
    }
  } else if (opts.headers["Content-Type"] === "application/json") {
    delete opts.headers["Content-Type"];
  }

  const res = await fetch(url, {
    ...opts,
    credentials: "include",
  });

  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const err = new Error((data && data.error) || "Request failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}
