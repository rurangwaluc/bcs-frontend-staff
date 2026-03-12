const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:4000";

function toUrl(path) {
  if (!path) return API_BASE;
  if (path.startsWith("http")) return path;
  return `${API_BASE.replace(/\/$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;
}

function isAbortErr(e) {
  if (!e) return false;

  // DOMException AbortError (common message: "signal is aborted without reason")
  if (e.name === "AbortError") return true;

  // some browsers use code 20 for abort
  if (e.code === 20) return true;

  const msg = String(e.message || "").toLowerCase();
  if (msg.includes("aborted")) return true;
  if (msg.includes("aborterror")) return true;

  return false;
}

/**
 * Fetch-based SSE (works with credentials/cookies).
 * connectSSE("/notifications/stream", { onHello, onNotification, onError })
 */
export function connectSSE(url, handlers = {}) {
  const controller = new AbortController();
  let closed = false;

  async function start() {
    try {
      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "text/event-stream",
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        handlers.onError?.(new Error(`SSE failed: ${res.status}`));
        return;
      }

      handlers.onHello?.();

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;

      let buffer = "";

      while (!closed) {
        let result;

        try {
          result = await reader.read();
        } catch (err) {
          if (err?.name === "AbortError") return;
          throw err;
        }

        const { done, value } = result;
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const chunk of parts) {
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;

            const raw = line.slice(5).trim();
            if (!raw) continue;

            try {
              const payload = JSON.parse(raw);
              handlers.onNotification?.(payload);
            } catch {
              handlers.onNotification?.(raw);
            }
          }
        }
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      handlers.onError?.(err);
    }
  }

  start();

  return {
    close() {
      if (closed) return;
      closed = true;

      try {
        controller.abort();
      } catch {}
    },
  };
}
