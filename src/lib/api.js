<<<<<<< HEAD
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    credentials: "include"
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

  if (!res.ok) {
    const err = new Error(data?.error || "Request failed");
=======
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

export async function apiFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const opts = { ...options };

  // Only set JSON headers if we actually have a JSON body
  const hasBody = opts.body !== undefined && opts.body !== null;

  // Ensure headers object exists
  opts.headers = { ...(opts.headers || {}) };

  if (hasBody) {
    // If body is a plain object, JSON.stringify it
    if (typeof opts.body === "object" && !(opts.body instanceof FormData)) {
      opts.body = JSON.stringify(opts.body);
    }
    // Set content type if not already set
    if (!opts.headers["Content-Type"]) {
      opts.headers["Content-Type"] = "application/json";
    }
  }

  // Always include cookies (sessions)
  opts.credentials = "include";

  const res = await fetch(url, opts);

  let data = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await res.text();
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const err = new Error((data && data.error) || "Request failed");
>>>>>>> 340607d (Update project - 16/01/2026)
    err.status = res.status;
    err.data = data;
    throw err;
  }
<<<<<<< HEAD
=======

>>>>>>> 340607d (Update project - 16/01/2026)
  return data;
}
