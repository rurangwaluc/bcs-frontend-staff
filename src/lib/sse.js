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
export function connectSSE(path, { onHello, onNotification, onError } = {}) {
  const url = toUrl(path);
  const ctrl = new AbortController();

  let stopped = false;
  let retryTimer = null;

  // ✅ keep a reference so close() can cancel safely
  let activeReader = null;

  async function runOnce() {
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
    activeReader = reader;

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
      let chunk;
      try {
        chunk = await reader.read();
      } catch (e) {
        // ✅ abort during read is normal
        if (stopped || ctrl.signal.aborted || isAbortErr(e)) return;
        throw e;
      }

      const { value, done } = chunk;
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
  }

  async function runLoop() {
    while (!stopped) {
      try {
        await runOnce();
      } catch (e) {
        // ✅ abort is normal when closing / hot reload / route change
        if (stopped || ctrl.signal.aborted || isAbortErr(e)) break;
        onError?.(e);
      } finally {
        // release reader after each cycle
        activeReader = null;
      }

      if (stopped) break;

      // retry after 2s
      await new Promise((r) => {
        retryTimer = setTimeout(r, 2000);
      });
    }
  }

  // ✅ never let the loop promise become unhandled
  runLoop().catch(() => {});

  return {
    // IMPORTANT: keep this NON-ASYNC so it cannot create "Uncaught (in promise)"
    close() {
      stopped = true;

      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }

      // ✅ cancel reader safely (cancel() returns a Promise that can reject)
      try {
        const p = activeReader?.cancel?.();
        if (p && typeof p.then === "function") {
          p.catch(() => {});
        }
      } catch {
        // ignore
      }

      activeReader = null;

      // ✅ abort fetch/read loop (this triggers AbortError internally, which we swallow above)
      try {
        ctrl.abort();
      } catch {
        // ignore
      }
    },
  };
}
