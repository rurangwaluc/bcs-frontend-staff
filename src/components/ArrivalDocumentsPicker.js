"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../lib/api";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Badge({ kind = "gray", children }) {
  const cls =
    kind === "green"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : kind === "red"
        ? "bg-rose-50 text-rose-800 border-rose-200"
        : kind === "amber"
          ? "bg-amber-50 text-amber-800 border-amber-200"
          : "bg-slate-50 text-slate-700 border-slate-200";

  return <span className={cx("inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-semibold", cls)}>{children}</span>;
}

function isImage(t, url) {
  const type = String(t || "").toLowerCase();
  if (type.startsWith("image/")) return true;
  const u = String(url || "").toLowerCase();
  return u.endsWith(".png") || u.endsWith(".jpg") || u.endsWith(".jpeg") || u.endsWith(".webp") || u.endsWith(".gif");
}

function isPdf(t, url) {
  const type = String(t || "").toLowerCase();
  if (type.includes("pdf")) return true;
  const u = String(url || "").toLowerCase();
  return u.endsWith(".pdf");
}

export default function ArrivalDocumentsPicker({ onChange, maxFiles = 6, accept = "image/*,.pdf" }) {
  const inputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info");

  // each item: { url, name, type, previewUrl }
  const [docs, setDocs] = useState([]);

  const canAddMore = docs.length < maxFiles;

  const publicList = useMemo(() => docs.map((d) => d.url), [docs]);

  function toast(kind, text) {
    setMsgKind(kind);
    setMsg(text || "");
  }

  function sync(next) {
    setDocs(next);
    if (typeof onChange === "function") onChange(next.map((d) => d.url));
  }

  async function uploadOne(file) {
    const form = new FormData();
    form.append("file", file);

    const res = await apiFetch("/uploads", {
      method: "POST",
      body: form,
      // if apiFetch ignores this, it is still fine (it will just use body as-is)
      isFormData: true,
    });

    const url =
      res?.url ||
      res?.fileUrl ||
      res?.upload?.url ||
      res?.upload?.fileUrl ||
      res?.files?.[0]?.url ||
      res?.files?.[0]?.fileUrl;

    if (!url) {
      const err = new Error("Upload worked, but no file URL came back.");
      err.data = res;
      throw err;
    }

    return {
      url,
      name: file.name,
      type: file.type,
      previewUrl: isImage(file.type, url) ? URL.createObjectURL(file) : null,
    };
  }

  async function onPickFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (!canAddMore) {
      toast("warn", `You can upload up to ${maxFiles} file(s).`);
      e.target.value = "";
      return;
    }

    const slice = files.slice(0, maxFiles - docs.length);

    setUploading(true);
    toast("info", "");

    try {
      const uploaded = [];
      for (const f of slice) {
        const item = await uploadOne(f);
        uploaded.push(item);
      }
      const next = [...docs, ...uploaded];
      sync(next);
      toast("success", "Uploaded.");
    } catch (err) {
      toast("danger", err?.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removeAt(idx) {
    const next = docs.slice();
    const removed = next.splice(idx, 1)[0];
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
    toast("info", "");
  }

  // cleanup previews on unmount
  useEffect(() => {
    return () => {
      for (const d of docs) {
        if (d?.previewUrl) {
          try {
            URL.revokeObjectURL(d.previewUrl);
          } catch {}
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bannerStyle =
    msgKind === "success"
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : msgKind === "warn"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : msgKind === "danger"
          ? "bg-rose-50 text-rose-900 border-rose-200"
          : "bg-slate-50 text-slate-800 border-slate-200";

  return (
    <div className="grid gap-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-semibold text-slate-900">Documents</div>
            <div className="text-xs text-slate-600 mt-1">
              Upload invoice, delivery note, or photos.
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge kind={docs.length > 0 ? "green" : "gray"}>
              {docs.length}/{maxFiles} attached
            </Badge>

            <button
              type="button"
              className="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
              onClick={() => inputRef.current?.click()}
              disabled={uploading || !canAddMore}
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>

            <button
              type="button"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
              onClick={clearAll}
              disabled={uploading || docs.length === 0}
            >
              Clear
            </button>

            <input
              ref={inputRef}
              type="file"
              accept={accept}
              multiple
              className="hidden"
              onChange={onPickFiles}
            />
          </div>
        </div>

        {msg ? (
          <div className={cx("mt-3 rounded-2xl border px-4 py-3 text-sm", bannerStyle)}>{msg}</div>
        ) : null}
      </div>

      {docs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {docs.map((d, idx) => (
            <div key={`${d.url}-${idx}`} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="p-3 border-b border-slate-200 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{d.name || "Document"}</div>
                  <div className="text-xs text-slate-600 mt-1">
                    {isPdf(d.type, d.url) ? "PDF" : isImage(d.type, d.url) ? "Image" : "File"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-60"
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
                    className="w-full h-40 object-cover rounded-xl border border-slate-200"
                  />
                ) : isPdf(d.type, d.url) ? (
                  <div className="h-40 flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm">
                    PDF file
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm">
                    File
                  </div>
                )}

                <div className="mt-3">
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                  >
                    Open file
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          No documents yet.
        </div>
      )}

      {/* helpful for parent */}
      <input type="hidden" value={JSON.stringify(publicList)} readOnly />
    </div>
  );
}