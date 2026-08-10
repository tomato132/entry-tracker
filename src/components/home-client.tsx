"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EntryDto, ApiEntryType, TYPE_LABELS } from "@/lib/api-types";
import { EntryCard } from "./entry-card";
import { StatsPanel } from "./stats-panel";
import { TagCloud } from "./tag-cloud";
import { AiPanel, AI_ASK_EVENT } from "./ai-panel";

const TYPE_TABS: { value: "" | ApiEntryType; label: string; en: string }[] = [
  { value: "", label: "全部", en: "All" },
  { value: "requirement", label: "需求", en: "Req" },
  { value: "note", label: "笔记", en: "Note" },
  { value: "todo", label: "待办", en: "Todo" },
];

function dateKey(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function HomeClient({ role }: { role: string }) {
  const [entries, setEntries] = useState<EntryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 快速输入
  const [title, setTitle] = useState("");
  const [newType, setNewType] = useState<ApiEntryType>("note");
  const [aiTags, setAiTags] = useState<string[]>([]);
  const [aiBusy, setAiBusy] = useState(false);

  // 筛选
  const [typeTab, setTypeTab] = useState<"" | ApiEntryType>("");
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [scopeAll, setScopeAll] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const sp = new URLSearchParams();
    if (typeTab) sp.set("type", typeTab);
    if (q.trim()) sp.set("q", q.trim());
    if (tag.trim()) sp.set("tag", tag.trim());
    if (scopeAll) sp.set("scope", "all");
    try {
      const res = await fetch(`/api/entries?${sp.toString()}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "加载失败");
      const data = await res.json();
      setEntries(data.entries);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [typeTab, q, tag, scopeAll]);

  useEffect(() => {
    const t = setTimeout(load, 250); // 搜索输入防抖
    return () => clearTimeout(t);
  }, [load]);

  // 键盘快捷键：N 记录 / / 搜索 / 1-4 切类型 / Esc 失焦
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
      if (e.key === "Escape" && typing) {
        el.blur();
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        titleRef.current?.focus();
      } else if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (["1", "2", "3", "4"].includes(e.key)) {
        setTypeTab(TYPE_TABS[Number(e.key) - 1].value);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 按日期分组（吸顶日期头）
  const groups = useMemo(() => {
    const map = new Map<string, EntryDto[]>();
    for (const e of entries) {
      const k = dateKey(e.createdAt);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return [...map.entries()];
  }, [entries]);

  async function quickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: newType, title: title.trim(), tags: aiTags }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "保存失败");
      return;
    }
    setTitle("");
    setAiTags([]);
    await load();
  }

  // AI 整理：一句话 → 类型 + 标题 + 标签
  async function aiOrganize() {
    if (!title.trim() || aiBusy) return;
    setAiBusy(true);
    setError("");
    try {
      const res = await fetch("/api/ai/organize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: title.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI 整理失败");
      setNewType(data.type);
      setTitle(data.title);
      setAiTags(data.tags);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 整理失败");
    } finally {
      setAiBusy(false);
    }
  }

  // 问 AI：把输入框内容送到右侧 Kimi 对话面板
  function askAi() {
    const q = title.trim();
    if (!q) return;
    window.dispatchEvent(new CustomEvent(AI_ASK_EVENT, { detail: q }));
    setTitle("");
    setAiTags([]);
  }

  async function toggleDone(id: string, done: boolean) {
    setEntries((list) => list.map((it) => (it.id === id ? { ...it, done } : it)));
    const res = await fetch(`/api/entries/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ done }),
    });
    if (!res.ok) await load(); // 失败回滚
  }

  const feed = (
    <>
      {/* 蜜桃快速输入区 */}
      <form
        onSubmit={quickAdd}
        className="bg-acid rounded-[16px] p-6 animate-rise border border-ink/10 card-soft"
      >
        <div className="flex gap-1.5 pb-4 flex-wrap">
          {(Object.keys(TYPE_LABELS) as ApiEntryType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setNewType(t)}
              className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                newType === t
                  ? "bg-ink text-acid font-semibold"
                  : "text-ink/50 hover:text-ink border border-ink/20"
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-3">
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="想到什么，记下来…（按 N 快速聚焦）"
            className="ink-input ink-input-on-acid flex-1 text-2xl py-2 font-bold"
            maxLength={200}
          />
          <button
            type="button"
            onClick={aiOrganize}
            disabled={aiBusy || !title.trim()}
            className="rounded-full px-4 py-2.5 text-xs font-semibold border-2 border-ink text-ink transition-transform hover:scale-[1.03] disabled:opacity-40 shrink-0"
            title="AI 自动判断类型、提炼标题、补标签"
          >
            {aiBusy ? "整理中…" : "✦ AI 整理"}
          </button>
          <button
            type="button"
            onClick={askAi}
            disabled={!title.trim()}
            className="rounded-full px-4 py-2.5 text-xs font-semibold border-2 border-ink text-ink transition-transform hover:scale-[1.03] disabled:opacity-40 shrink-0"
            title="把这句话发给 Kimi 助手"
          >
            问 AI →
          </button>
          <button
            type="submit"
            className="ink-btn-primary rounded-full px-6 py-2.5 text-sm tracking-[0.25em] font-semibold shrink-0"
          >
            记下
          </button>
        </div>
        {aiTags.length > 0 && (
          <div className="flex gap-2 mt-3">
            {aiTags.map((t) => (
              <span key={t} className="text-xs font-mono-cn bg-ink text-acid rounded-full px-2.5 py-1">
                #{t}
              </span>
            ))}
          </div>
        )}
      </form>

      {/* 筛选行 */}
      <div
        className="flex items-center gap-5 py-5 flex-wrap animate-rise"
        style={{ animationDelay: "60ms" }}
      >
        <div className="flex gap-5">
          {TYPE_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTypeTab(t.value)}
              className="flex flex-col items-start leading-tight"
            >
              <span className={`micro-label ${typeTab === t.value ? "text-ink" : "text-ink-faint"}`}>
                {t.en}
              </span>
              <span className={`text-sm mt-0.5 px-0.5 ${typeTab === t.value ? "hl font-semibold" : "text-ink-soft"}`}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
        <input
          ref={searchRef}
          value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索…（/）"
          className="ink-input py-1 w-32 text-xs"
        />
        <input
          value={tag} onChange={(e) => setTag(e.target.value)} placeholder="标签"
          className="ink-input py-1 w-20 text-xs"
        />
        {role === "ADMIN" && (
          <label className="flex items-center gap-1.5 ml-auto text-ink-soft cursor-pointer text-xs">
            <input
              type="checkbox" className="ink-checkbox !w-4 !h-4"
              checked={scopeAll} onChange={(e) => setScopeAll(e.target.checked)}
            />
            全部数据
          </label>
        )}
      </div>

      {error && <p className="text-sm text-red-600 py-2">{error}</p>}

      {loading ? (
        <p className="text-sm text-ink-faint py-8 font-mono-cn">载入中…</p>
      ) : entries.length === 0 ? (
        <div className="py-20 text-center animate-rise">
          <p className="text-2xl font-extrabold text-ink-faint tracking-tight">还空着</p>
          <p className="micro-label text-ink-faint mt-3">Press N and write the first one</p>
        </div>
      ) : (
        groups.map(([day, list]) => (
          <section key={day}>
            <header className="sticky top-16 lg:top-0 z-10 bg-base/95 backdrop-blur py-2.5 flex items-baseline justify-between border-b border-ink/60">
              <time className="font-mono-cn text-sm font-semibold">{day}</time>
              <span className="micro-label text-ink-faint">{list.length} 条</span>
            </header>
            <div className="divide-dotted">
              {list.map((entry, i) => (
                <EntryCard key={entry.id} entry={entry} onToggleDone={toggleDone} index={i} />
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8 lg:items-start">
      <div>{feed}</div>
      <aside className="mt-8 lg:mt-0 space-y-4 lg:sticky lg:top-10">
        <StatsPanel />
        <TagCloud entries={entries} activeTag={tag} onSelect={setTag} />
        <AiPanel />
      </aside>
    </div>
  );
}
