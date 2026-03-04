// frontend-staff/src/lib/sse.js
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:4000";

function toUrl(path) {
  if (!path) return API_BASE;
  if (path.startsWith("http")) return path;
  return `${API_BASE.replace(/\/$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * Fetch-based SSE (works with credentials/cookies).
 * connectSSE("/notifications/stream", { onHello, onNotification, onError })
 */
export function connectSSE(path, { onHello, onNotification, onError } = {}) {
  const url = toUrl(path);
  const ctrl = new AbortController();

  let stopped = false;
  let retryTimer = null;

  async function run() {
    while (!stopped) {
      try {
        const res = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "text/event-stream" },
          signal: ctrl.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`SSE failed: ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");

        let buf = "";
        let eventName = "message";
        let dataLines = [];

        const flush = () => {
          if (!dataLines.length) return;

          const dataRaw = dataLines.join("\n");
          dataLines = [];

          let payload = null;
          try {
            payload = JSON.parse(dataRaw);
          } catch {
            payload = dataRaw;
          }

          if (eventName === "hello") onHello?.(payload);
          if (eventName === "notification") onNotification?.(payload);
        };

        while (!stopped) {
          const { value, done } = await reader.read();
          if (done) break;

          buf += decoder.decode(value, { stream: true });

          while (true) {
            const idx = buf.indexOf("\n");
            if (idx === -1) break;

            const line = buf.slice(0, idx).replace(/\r$/, "");
            buf = buf.slice(idx + 1);

            if (line.startsWith("event:")) {
              eventName = line.slice("event:".length).trim() || "message";
              continue;
            }

            if (line.startsWith("data:")) {
              dataLines.push(line.slice("data:".length).trimStart());
              continue;
            }

            if (line === "") {
              flush();
              eventName = "message";
            }
          }
        }
      } catch (e) {
        if (stopped) break;
        onError?.(e);
      }

      // retry after 2s
      await new Promise((r) => {
        retryTimer = setTimeout(r, 2000);
      });
    }
  }

  run();

  return {
    close() {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      ctrl.abort();
    },
  };
}
