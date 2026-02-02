const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:4000";

export async function apiFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const opts = { ...options };

  // Ensure headers object exists
  opts.headers = { ...(opts.headers || {}) };

  // Only set JSON headers if we actually have a body
  const hasBody = "body" in opts;

  if (hasBody) {
    // If body is a plain object, stringify it
    if (typeof opts.body === "object" && !(opts.body instanceof FormData)) {
      opts.body = JSON.stringify(opts.body);
    }

    // Set JSON header unless we are sending FormData
    if (!(opts.body instanceof FormData)) {
      opts.headers["Content-Type"] = "application/json";
    }
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
