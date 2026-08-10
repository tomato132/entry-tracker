import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

function dayStart(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayKey(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const today = dayStart(new Date());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);

  // 个人量级数据，一次性取出在内存统计
  const entries = await prisma.entry.findMany({
    where: { userId: user.id },
    select: { type: true, done: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const todayCount = entries.filter((e) => e.createdAt >= today).length;
  const todos = entries.filter((e) => e.type === "TODO");
  const todoDone = todos.filter((e) => e.done).length;

  // 近 7 天趋势（含今天）
  const week: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    week.push({ date: dayKey(d), count: 0 });
  }
  for (const e of entries) {
    if (e.createdAt < weekAgo) break; // 已按时间倒序
    const k = dayKey(e.createdAt);
    const slot = week.find((w) => w.date === k);
    if (slot) slot.count++;
  }

  // 连续记录天数：今天有记录则从今天算起，否则从昨天算起
  const daysWithEntries = new Set(entries.map((e) => dayKey(e.createdAt)));
  let streak = 0;
  const cursor = new Date(today);
  if (!daysWithEntries.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (daysWithEntries.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return NextResponse.json({
    todayCount,
    todoTotal: todos.length,
    todoDone,
    streak,
    week,
  });
}
