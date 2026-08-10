import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/current-user", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: { entry: { findMany: vi.fn() } },
}));

import { GET } from "@/app/api/stats/route";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

const me = { id: "u1", email: "a@b.com", role: "USER" as const };
const user = vi.mocked(getCurrentUser);
const findMany = vi.mocked(prisma.entry.findMany);

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

const mk = (createdAt: Date, type = "NOTE", done = false) => ({ type, done, createdAt });

beforeEach(() => vi.clearAllMocks());

describe("GET /api/stats", () => {
  it("未登录 401", async () => {
    user.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("空数据：全零，week 长度 7", async () => {
    user.mockResolvedValue(me);
    findMany.mockResolvedValue([] as never);
    const res = await GET();
    const body = await res.json();
    expect(body.todayCount).toBe(0);
    expect(body.streak).toBe(0);
    expect(body.week).toHaveLength(7);
    expect(body.week[6].count).toBe(0);
  });

  it("统计今日数、待办进度、周趋势", async () => {
    user.mockResolvedValue(me);
    findMany.mockResolvedValue([
      mk(new Date(), "TODO", true),
      mk(new Date(), "NOTE"),
      mk(daysAgo(1), "TODO", false),
      mk(daysAgo(1)),
      mk(daysAgo(2)),
      mk(daysAgo(10)), // 不在 7 天窗口
    ] as never);
    const res = await GET();
    const body = await res.json();
    expect(body.todayCount).toBe(2);
    expect(body.todoTotal).toBe(2);
    expect(body.todoDone).toBe(1);
    expect(body.week[6].count).toBe(2);
    expect(body.week[5].count).toBe(2);
    expect(body.week[4].count).toBe(1);
    expect(body.streak).toBe(3); // 今天、昨天、前天连续
  });

  it("今天没记录时 streak 从昨天算起", async () => {
    user.mockResolvedValue(me);
    findMany.mockResolvedValue([mk(daysAgo(1)), mk(daysAgo(2))] as never);
    const res = await GET();
    const body = await res.json();
    expect(body.todayCount).toBe(0);
    expect(body.streak).toBe(2);
  });

  it("昨天也没记录时 streak 为 0", async () => {
    user.mockResolvedValue(me);
    findMany.mockResolvedValue([mk(daysAgo(3))] as never);
    const res = await GET();
    expect((await res.json()).streak).toBe(0);
  });
});
