"use client";

import { useMemo } from "react";
import { EntryDto } from "@/lib/api-types";

export function TagCloud({
  entries,
  activeTag,
  onSelect,
}: {
  entries: EntryDto[];
  activeTag: string;
  onSelect: (tag: string) => void;
}) {
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) for (const t of e.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [entries]);

  if (tags.length === 0) return null;

  return (
    <section className="bg-panel border border-line rounded-[10px] p-5">
      <p className="micro-label text-ink-faint mb-3">Tags · 热标签</p>
      <div className="flex flex-wrap gap-2">
        {tags.map(([tag, count]) => (
          <button
            key={tag}
            onClick={() => onSelect(activeTag === tag ? "" : tag)}
            className={`text-xs font-mono-cn rounded-full px-2.5 py-1 transition-all ${
              activeTag === tag
                ? "bg-ink text-acid"
                : "bg-black/5 text-ink-soft hover:bg-acid hover:text-ink"
            }`}
          >
            #{tag} <span className="opacity-60">{count}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
