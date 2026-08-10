"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { AttachmentDto } from "@/lib/api-types";

export function AttachmentPanel({
  entryId,
  attachments,
  readOnly,
  onChanged,
  onInsertImage,
}: {
  entryId: string;
  attachments: AttachmentDto[];
  readOnly: boolean;
  onChanged: () => void;
  onInsertImage: (a: AttachmentDto) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onUpload(file: File) {
    setBusy(true);
    setError("");
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });
      const res = await fetch(`/api/entries/${entryId}/attachments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          url: blob.url,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "登记附件失败");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "上传失败");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onDelete(id: string) {
    if (!confirm("确定删除这个附件？")) return;
    const res = await fetch(`/api/attachments/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("删除失败");
      return;
    }
    onChanged();
  }

  return (
    <section className="mt-8 pt-6 border-t border-ink/60">
      <div className="flex items-center justify-between mb-4">
        <h2 className="micro-label text-ink-soft">
          Attachments · 附件 {attachments.length > 0 && <span className="font-mono-cn font-normal">({attachments.length})</span>}
        </h2>
        {!readOnly && (
          <>
            <input
              ref={fileRef} type="file" className="hidden"
              onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
            />
            <button
              onClick={() => fileRef.current?.click()} disabled={busy}
              className="text-xs ink-link text-ink-soft disabled:opacity-40"
            >
              {busy ? "上传中…" : "+ 上传附件"}
            </button>
          </>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {attachments.length === 0 ? (
        <p className="text-xs text-ink-faint">暂无附件</p>
      ) : (
        <ul className="divide-dotted">
          {attachments.map((a) => (
            <li key={a.id} className="py-2.5 flex items-center gap-3 group">
              {a.mimeType.startsWith("image/") ? (
                <a href={a.url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.url} alt={a.filename}
                    className="h-11 w-11 object-cover rounded-[5px] border border-line"
                  />
                </a>
              ) : (
                <span className="h-11 w-11 flex items-center justify-center border border-line rounded-[5px] bg-acid/40 font-mono-cn text-xs text-ink">
                  FILE
                </span>
              )}
              <a
                href={a.url} target="_blank" rel="noreferrer"
                className="flex-1 text-sm truncate ink-link text-ink-soft"
              >
                {a.filename}
              </a>
              <span className="font-mono-cn text-xs text-ink-faint">{Math.ceil(a.size / 1024)} KB</span>
              {!readOnly && a.mimeType.startsWith("image/") && (
                <button
                  onClick={() => onInsertImage(a)}
                  className="text-xs text-ink opacity-0 group-hover:opacity-100 transition-opacity underline decoration-acid-deep decoration-2 underline-offset-2"
                >
                  插入正文
                </button>
              )}
              {!readOnly && (
                <button
                  onClick={() => onDelete(a.id)}
                  className="text-xs text-ink-faint hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  删除
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
