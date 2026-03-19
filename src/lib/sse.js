const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:4000";

function toUrl(path) {
  if (!path) return API_BASE;
  if (typeof path !== "string") return API_BASE;
  if (/^https?:\/\//i.test(path)) return path;

  const base = String(API_BASE || "").replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

function isAbortErr(error) {
  if (!error) return false;
  if (error.name === "AbortError") return true;
  if (error.code === 20) return true;

  const msg = String(error.message || "").toLowerCase();
  return msg.includes("aborted") || msg.includes("aborterror");
}

/**
 * Fetch-based SSE with cookie support.
 * Hardened for React StrictMode mount/unmount cycles.
 */
export function connectSSE(path, { onHello, onNotification, onError } = {}) {
  const url = toUrl(path);
  const ctrl = new AbortController();

  let stopped = false;
  let retryTimer = null;
  let activeReader = null;
  let loopPromise = null;

  function clearRetryTimer() {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  }

  function flushEvent(eventName, dataLines) {
    if (!Array.isArray(dataLines) || dataLines.length === 0) return;

    const dataRaw = dataLines.join("\n");
    let payload = null;

    try {
      payload = JSON.parse(dataRaw);
    } catch {
      payload = dataRaw;
    }

    if (eventName === "hello") onHello?.(payload);
    if (eventName === "notification") onNotification?.(payload);
  }

  async function runOnce() {
    let res;

    try {
      res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "text/event-stream" },
        signal: ctrl.signal,
        cache: "no-store",
      });
    } catch (error) {
      if (stopped || ctrl.signal.aborted || isAbortErr(error)) return;
      throw error;
    }

    if (!res.ok || !res.body) {
      throw new Error(`SSE failed: ${res.status}`);
    }

    const reader = res.body.getReader();
    activeReader = reader;

    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let eventName = "message";
    let dataLines = [];

    while (!stopped) {
      let chunk;

      try {
        chunk = await reader.read();
      } catch (error) {
        if (stopped || ctrl.signal.aborted || isAbortErr(error)) return;
        throw error;
      }

      const { value, done } = chunk;
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const newlineIndex = buffer.indexOf("\n");
        if (newlineIndex === -1) break;

        const line = buffer.slice(0, newlineIndex).replace(/\r$/, "");
        buffer = buffer.slice(newlineIndex + 1);

        if (line.startsWith("event:")) {
          eventName = line.slice("event:".length).trim() || "message";
          continue;
        }

        if (line.startsWith("data:")) {
          dataLines.push(line.slice("data:".length).trimStart());
          continue;
        }

        if (line === "") {
          flushEvent(eventName, dataLines);
          eventName = "message";
          dataLines = [];
        }
      }
    }

    if (dataLines.length > 0) {
      flushEvent(eventName, dataLines);
    }
  }

  async function runLoop() {
    while (!stopped) {
      try {
        await runOnce();
      } catch (error) {
        if (stopped || ctrl.signal.aborted || isAbortErr(error)) break;
        onError?.(error);
      } finally {
        activeReader = null;
      }

      if (stopped) break;

      await new Promise((resolve) => {
        retryTimer = setTimeout(resolve, 2000);
      });
    }
  }

  loopPromise = runLoop().catch(() => {});

  return {
    close() {
      if (stopped) return;
      stopped = true;

      clearRetryTimer();

      const reader = activeReader;
      activeReader = null;

      if (reader?.cancel) {
        Promise.resolve(reader.cancel()).catch(() => {});
      }

      /**
       * Critical fix:
       * aborting Fetch here can surface AbortError in React dev cleanup.
       * reader.cancel() + stopped=true is enough to terminate the stream cleanly.
       * So we do NOT call ctrl.abort() during normal close().
       */
      Promise.resolve(loopPromise).catch(() => {});
    },
  };
}
