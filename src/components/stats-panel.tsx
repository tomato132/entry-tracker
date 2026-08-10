"use client";

import { useEffect, useState } from "react";

type Stats = {
  todayCount: number;
  todoTotal: number;
  todoDone: number;
  streak: number;
  week: { date: string; count: number }[];
};

export function StatsPanel() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => null);
  }, []);

  if (!stats) {
    return (
      <section className="bg-panel border border-line rounded-[10px] p-5 animate-pulse">
        <p className="micro-label text-ink-faint">Today</p>
        <div className="h-16" />
      </section>
    );
  }

  const max = Math.max(...stats.week.map((w) => w.count), 1);
  const pct = stats.todoTotal ? Math.round((stats.todoDone / stats.todoTotal) * 100) : 0;

  return (
    <section className="bg-panel border border-line rounded-[10px] p-5 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="micro-label text-ink-faint">Today · 今日</p>
          <p className="text-4xl font-extrabold tracking-tighter mt-1">
            {stats.todayCount}
            <span className="text-sm font-normal text-ink-faint ml-1.5">条</span>
          </p>
        </div>
        <div className="text-right">
          <p className="micro-label text-ink-faint">Streak · 连续</p>
          <p className="text-4xl font-extrabold tracking-tighter mt-1">
            {stats.streak}
            <span className="text-sm font-normal text-ink-faint ml-1.5">天</span>
          </p>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-baseline mb-1.5">
          <p className="micro-label text-ink-faint">Todo · 完成</p>
          <span className="font-mono-cn text-xs text-ink-soft">
            {stats.todoDone}/{stats.todoTotal}
          </span>
        </div>
        <div className="h-2 bg-black/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-acid-deep rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div>
        <p className="micro-label text-ink-faint mb-2">Week · 近 7 天</p>
        <div className="flex items-end gap-1.5 h-14">
          {stats.week.map((w) => (
            <div key={w.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full rounded-[3px] ${w.count ? "bg-ink" : "bg-black/5"}`}
                style={{ height: `${Math.max((w.count / max) * 100, 8)}%` }}
                title={`${w.date}: ${w.count} 条`}
              />
              <span className="font-mono-cn text-[9px] text-ink-faint">{w.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
