export async function apiUpload(files) {
  const fd = new FormData();
  for (const f of files) fd.append("files", f);

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/uploads`, {
    method: "POST",
    body: fd,
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Upload failed");
  return data;
}
