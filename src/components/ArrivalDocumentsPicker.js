"use client";

import { useMemo, useRef, useState } from "react";

import { apiFetch } from "../lib/api";

export default function ArrivalDocumentsPicker({
  onChange,
  maxFiles = 6,
  accept = "image/*,.pdf",
}) {
  const inputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");

  // each item: { url, name, type, previewUrl }
  const [docs, setDocs] = useState([]);

  const isImage = (t, url) => {
    const type = String(t || "").toLowerCase();
    if (type.startsWith("image/")) return true;
    const u = String(url || "").toLowerCase();
    return (
      u.endsWith(".png") ||
      u.endsWith(".jpg") ||
      u.endsWith(".jpeg") ||
      u.endsWith(".webp") ||
      u.endsWith(".gif")
    );
  };

  const isPdf = (t, url) => {
    const type = String(t || "").toLowerCase();
    if (type.includes("pdf")) return true;
    const u = String(url || "").toLowerCase();
    return u.endsWith(".pdf");
  };

  const canAddMore = docs.length < maxFiles;

  const publicList = useMemo(() => docs.map((d) => d.url), [docs]);

  // push urls to parent whenever docs changes
  function sync(next) {
    setDocs(next);
    if (typeof onChange === "function") onChange(next.map((d) => d.url));
  }

  async function uploadOne(file) {
    // Your backend already accepts /uploads and returns something.
    // We must handle different response shapes safely.
    const form = new FormData();
    form.append("file", file);

    const res = await apiFetch("/uploads", {
      method: "POST",
      body: form,
      isFormData: true, // if your apiFetch supports this flag; if not, see note below
    });

    // Support common response shapes:
    // { ok:true, url:"..." }
    // { url:"..." }
    // { fileUrl:"..." }
    // { files:[{url}] }
    // { upload:{url} }
    const url =
      res?.url ||
      res?.fileUrl ||
      res?.upload?.url ||
      res?.upload?.fileUrl ||
      res?.files?.[0]?.url ||
      res?.files?.[0]?.fileUrl;

    if (!url) {
      const err = new Error("Upload did not return a file URL");
      err.data = res;
      throw err;
    }

    const next = {
      url,
      name: file.name,
      type: file.type,
      previewUrl: isImage(file.type, url) ? URL.createObjectURL(file) : null,
    };

    return next;
  }

  async function onPickFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (!canAddMore) {
      setMsg(`You can upload up to ${maxFiles} file(s).`);
      e.target.value = "";
      return;
    }

    const slice = files.slice(0, maxFiles - docs.length);

    setUploading(true);
    setMsg("");

    try {
      const uploaded = [];

      for (const f of slice) {
        const item = await uploadOne(f);
        uploaded.push(item);
      }

      const next = [...docs, ...uploaded];
      sync(next);
      setMsg("✅ Uploaded");
    } catch (err) {
      setMsg(err?.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removeAt(idx) {
    const next = docs.slice();
    const removed = next.splice(idx, 1)[0];
    // cleanup preview object url
    if (removed?.previewUrl) {
      try {
        URL.revokeObjectURL(removed.previewUrl);
      } catch {}
    }
    sync(next);
  }

  function clearAll() {
    for (const d of docs) {
      if (d?.previewUrl) {
        try {
          URL.revokeObjectURL(d.previewUrl);
        } catch {}
      }
    }
    sync([]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || !canAddMore}
        >
          {uploading ? "Uploading..." : "Upload documents"}
        </button>

        <button
          type="button"
          className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50 disabled:opacity-60"
          onClick={clearAll}
          disabled={uploading || docs.length === 0}
        >
          Clear
        </button>

        <div className="text-xs text-gray-500">
          {docs.length}/{maxFiles} attached
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={onPickFiles}
        />
      </div>

      {msg ? (
        <div className="text-sm">
          {msg.startsWith("✅") ? (
            <div className="p-3 rounded-lg bg-green-50 text-green-800">
              {msg}
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-red-50 text-red-700">{msg}</div>
          )}
        </div>
      ) : null}

      {docs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {docs.map((d, idx) => (
            <div
              key={`${d.url}-${idx}`}
              className="border rounded-xl overflow-hidden bg-white"
            >
              <div className="p-3 border-b flex items-center justify-between gap-2">
                <div className="text-sm font-medium truncate">
                  {d.name || "Document"}
                </div>
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  className="px-2 py-1 rounded-lg border text-xs hover:bg-gray-50"
                  disabled={uploading}
                >
                  Remove
                </button>
              </div>

              <div className="p-3">
                {d.previewUrl ? (
                  <img
                    src={d.previewUrl}
                    alt={d.name || "preview"}
                    className="w-full h-40 object-cover rounded-lg border"
                  />
                ) : isPdf(d.type, d.url) ? (
                  <div className="h-40 flex items-center justify-center rounded-lg border bg-gray-50 text-gray-700 text-sm">
                    PDF document
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center rounded-lg border bg-gray-50 text-gray-700 text-sm">
                    File uploaded
                  </div>
                )}

                <div className="mt-2 text-xs">
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    Open uploaded file
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-600">
          No documents attached yet. Upload delivery note / invoice / photos.
        </div>
      )}

      {/* helpful for parent */}
      <input type="hidden" value={JSON.stringify(publicList)} readOnly />
    </div>
  );
}
