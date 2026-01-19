const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

export async function apiFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const opts = { ...options };

  // Ensure headers object exists
  opts.headers = { ...(opts.headers || {}) };

  // Only set JSON headers if we actually have a body
  const hasBody = opts.body !== undefined && opts.body !== null;

  if (hasBody) {
    // If body is a plain object, stringify it
    if (typeof opts.body === "object" && !(opts.body instanceof FormData)) {
      opts.body = JSON.stringify(opts.body);
    }

    // Set Content-Type only if not already set
    if (!opts.headers["Content-Type"]) {
      opts.headers["Content-Type"] = "application/json";
    }
  }

  // Always include cookies (session auth)
  opts.credentials = "include";

  const res = await fetch(url, opts);

  let data = null;
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
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
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}
