"use client";

import { useCallback, useEffect, useState } from "react";
import { EntryDto } from "@/lib/api-types";
import { EntryCard } from "@/components/entry-card";

export default function TodosPage() {
  const [todos, setTodos] = useState<EntryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/entries?type=todo");
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      const list: EntryDto[] = data.entries;
      list.sort((a, b) => Number(a.done) - Number(b.done)); // 未完成在前
      setTodos(list);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleDone(id: string, done: boolean) {
    setTodos((list) =>
      list
        .map((it) => (it.id === id ? { ...it, done } : it))
        .sort((a, b) => Number(a.done) - Number(b.done))
    );
    const res = await fetch(`/api/entries/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ done }),
    });
    if (!res.ok) await load();
  }

  const remaining = todos.filter((t) => !t.done).length;

  return (
    <div>
      <header className="pb-6 flex items-end justify-between animate-rise">
        <div>
          <p className="micro-label text-ink-faint mb-1">Todo</p>
          <h1 className="text-4xl font-extrabold tracking-tighter">
            <span className="hl px-1">待办</span>
          </h1>
        </div>
        {!loading && todos.length > 0 && (
          <span className="font-mono-cn text-xs text-ink-faint">
            {remaining} open / {todos.length} total
          </span>
        )}
      </header>

      {error && <p className="text-sm text-red-600 py-2">{error}</p>}
      {loading ? (
        <p className="text-sm text-ink-faint py-8 font-mono-cn">载入中…</p>
      ) : todos.length === 0 ? (
        <div className="py-20 text-center animate-rise">
          <p className="text-2xl font-extrabold text-ink-faint tracking-tight">暂无待办</p>
          <p className="micro-label text-ink-faint mt-3">Add one from the feed</p>
        </div>
      ) : (
        <div className="divide-dotted border-t border-ink/60">
          {todos.map((t, i) => (
            <EntryCard key={t.id} entry={t} onToggleDone={toggleDone} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
