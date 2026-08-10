"use client";

import Link from "next/link";
import { EntryDto } from "@/lib/api-types";
import { TypeSeal } from "./type-seal";

function formatTimeOnly(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EntryCard({
  entry,
  onToggleDone,
  index = 0,
}: {
  entry: EntryDto;
  onToggleDone?: (id: string, done: boolean) => void;
  index?: number;
}) {
  const faded = entry.done;
  return (
    <article
      className="group py-3.5 flex gap-4 items-start animate-rise"
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      {entry.type === "todo" && onToggleDone && (
        <input
          type="checkbox"
          checked={entry.done}
          onChange={(e) => onToggleDone(entry.id, e.target.checked)}
          className="ink-checkbox mt-0.5"
          aria-label="完成"
        />
      )}
      <Link href={`/entries/${entry.id}`} className="flex-1 min-w-0 block">
        <div className="flex items-center gap-2.5">
          <TypeSeal type={entry.type} faded={faded} />
          <h3
            className={`font-bold text-[17px] leading-snug truncate transition-colors ${
              faded ? "text-ink-faint line-through" : "text-ink"
            }`}
          >
            {entry.title}
          </h3>
          <span className="row-arrow text-ink ml-auto shrink-0 select-none">→</span>
        </div>
        {entry.content && (
          <p className="text-sm text-ink-soft mt-1 line-clamp-1 leading-relaxed">{entry.content}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5 text-xs text-ink-faint">
          <span className="font-mono-cn">{formatTimeOnly(entry.createdAt)}</span>
          {entry.userEmail && <span className="font-mono-cn">{entry.userEmail}</span>}
          {entry.tags.map((t) => (
            <span key={t} className="font-mono-cn">#{t}</span>
          ))}
        </div>
      </Link>
    </article>
  );
}
