"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { AttachmentDto, EntryDto, ApiEntryType, TYPE_LABELS } from "@/lib/api-types";
import { AttachmentPanel } from "./attachment-panel";
import { TypeSeal } from "./type-seal";

function formatTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EntryDetail({ id }: { id: string; currentUserId: string }) {
  const router = useRouter();
  const [entry, setEntry] = useState<EntryDto | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ApiEntryType>("note");
  const [tagsText, setTagsText] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(`/api/entries/${id}`);
    if (res.status === 404) { setNotFound(true); return; }
    if (!res.ok) { setError("加载失败"); return; }
    const data = await res.json();
    setEntry(data.entry);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // 后端仅在管理员查看他人记录时返回 userEmail，此时为只读场景
  const readOnly = !!entry?.userEmail;

  function startEdit() {
    if (!entry) return;
    setTitle(entry.title);
    setType(entry.type);
    setTagsText(entry.tags.join(", "));
    setContent(entry.content);
    setEditing(true);
  }

  async function save() {
    const res = await fetch(`/api/entries/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title, type, content,
        tags: tagsText.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "保存失败");
      return;
    }
    setEditing(false);
    await load();
  }

  async function remove() {
    if (!confirm("确定删除这条记录？附件也会一并删除，不可恢复。")) return;
    const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
    if (!res.ok) { setError("删除失败"); return; }
    router.push("/");
    router.refresh();
  }

  async function insertImage(a: AttachmentDto) {
    const next = `${content}\n\n![${a.filename}](${a.url})\n`;
    setContent(next);
    const res = await fetch(`/api/entries/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: next }),
    });
    if (res.ok) await load();
  }

  if (notFound) {
    return (
      <div className="py-16 text-center">
        <p className="text-xl font-extrabold tracking-tight text-ink-faint">记录不存在或无权访问</p>
      </div>
    );
  }
  if (!entry) return <p className="text-sm text-ink-faint py-8 font-mono-cn">载入中…</p>;

  return (
    <div>
      {error && <p className="text-sm text-red-500 pb-2">{error}</p>}

      {editing ? (
        <div className="space-y-5 bg-panel border border-ink/10 rounded-[16px] p-6 animate-rise card-soft">
          <div className="flex gap-1.5 text-xs">
            {(Object.keys(TYPE_LABELS) as ApiEntryType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-3 py-1.5 rounded-full transition-all ${
                  type === t ? "bg-ink text-acid font-semibold" : "text-ink/50 hover:text-ink border border-ink/20"
                }`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <input
            value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200}
            className="ink-input w-full text-2xl py-2 font-extrabold tracking-tight" placeholder="标题"
          />
          <input
            value={tagsText} onChange={(e) => setTagsText(e.target.value)}
            className="ink-input w-full py-2 text-sm" placeholder="标签，用逗号分隔"
          />
          <div className="flex gap-4 text-xs border-b border-line pb-2">
            <button onClick={() => setPreview(false)} className={!preview ? "text-ink font-semibold" : "text-ink-faint"}>编辑</button>
            <button onClick={() => setPreview(true)} className={preview ? "text-ink font-semibold" : "text-ink-faint"}>预览</button>
          </div>
          {preview ? (
            <div className="prose prose-sm max-w-none prose-ink min-h-40">
              <ReactMarkdown>{content || "（空）"}</ReactMarkdown>
            </div>
          ) : (
            <textarea
              value={content} onChange={(e) => setContent(e.target.value)} rows={14}
              className="w-full border border-line rounded-[10px] bg-black/[0.02] px-4 py-3 text-sm font-mono-cn outline-none focus:border-ink transition-colors leading-relaxed"
              placeholder="支持 Markdown"
            />
          )}
          <div className="flex gap-3 items-center">
            <button onClick={save} className="ink-btn-primary rounded-full px-6 py-2.5 text-sm tracking-[0.2em] font-semibold">保存</button>
            <button onClick={() => setEditing(false)} className="text-sm text-ink-soft ink-link">取消</button>
          </div>
        </div>
      ) : (
        <div>
          {/* 刊头 */}
          <header className="pb-6 animate-rise">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="pt-2"><TypeSeal type={entry.type} /></div>
                <div>
                  <h1 className="text-4xl font-extrabold tracking-tighter leading-tight">{entry.title}</h1>
                  <p className="font-mono-cn text-xs text-ink-faint mt-2">
                    {formatTime(entry.createdAt)}
                    {entry.userEmail ? ` · ${entry.userEmail}（只读）` : ""}
                  </p>
                  {entry.tags.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {entry.tags.map((t) => (
                        <span key={t} className="text-xs bg-black/[0.04] rounded-md px-1.5 py-px text-ink-soft">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {!readOnly && (
                <div className="flex gap-4 shrink-0 text-xs pt-2">
                  <button onClick={startEdit} className="ink-link text-ink-soft">编辑</button>
                  <button onClick={remove} className="ink-link text-red-500">删除</button>
                </div>
              )}
            </div>
          </header>

          <article className="bg-panel border border-ink/10 rounded-[16px] p-7 prose prose-sm max-w-none prose-ink animate-rise card-soft" style={{ animationDelay: "60ms" }}>
            <ReactMarkdown>{entry.content || "（无正文）"}</ReactMarkdown>
          </article>
        </div>
      )}

      <AttachmentPanel
        entryId={entry.id}
        attachments={entry.attachments ?? []}
        readOnly={readOnly}
        onChanged={load}
        onInsertImage={insertImage}
      />
    </div>
  );
}
