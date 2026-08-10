import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: { entry: { findMany: vi.fn(), create: vi.fn() } },
}));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: vi.fn() }));

import { GET, POST } from "@/app/api/entries/route";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

const me = { id: "u1", email: "a@b.com", role: "USER" as const };
const admin = { id: "u9", email: "boss@x.com", role: "ADMIN" as const };
const user = vi.mocked(getCurrentUser);
const findMany = vi.mocked(prisma.entry.findMany);
const create = vi.mocked(prisma.entry.create);

const sample = {
  id: "e1", userId: "u1", type: "NOTE", title: "t", content: "c",
  tags: ["x"], done: false,
  createdAt: new Date("2026-08-10T00:00:00Z"), updatedAt: new Date("2026-08-10T00:00:00Z"),
};

function getReq(query = "") {
  return new Request(`http://localhost/api/entries${query}`);
}
function postReq(body: unknown) {
  return new Request("http://localhost/api/entries", {
    method: "POST", body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/entries", () => {
  it("未登录 401", async () => {
    user.mockResolvedValue(null);
    const res = await GET(getReq());
    expect(res.status).toBe(401);
  });

  it("默认只查自己的记录", async () => {
    user.mockResolvedValue(me);
    findMany.mockResolvedValue([sample] as never);
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1" } })
    );
    const body = await res.json();
    expect(body.entries[0].type).toBe("note");
    expect(body.entries[0].userEmail).toBeUndefined();
  });

  it("普通用户 scope=all 返回 403", async () => {
    user.mockResolvedValue(me);
    const res = await GET(getReq("?scope=all"));
    expect(res.status).toBe(403);
  });

  it("管理员 scope=all 不过滤 userId 且带 userEmail", async () => {
    user.mockResolvedValue(admin);
    findMany.mockResolvedValue([{ ...sample, user: { email: "a@b.com" } }] as never);
    const res = await GET(getReq("?scope=all"));
    expect(res.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
    const body = await res.json();
    expect(body.entries[0].userEmail).toBe("a@b.com");
  });

  it("type/tag/q/done 组合筛选拼入 where", async () => {
    user.mockResolvedValue(me);
    findMany.mockResolvedValue([] as never);
    await GET(getReq("?type=todo&tag=work&q=%E9%9C%80%E6%B1%82&done=false"));
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "u1",
          type: "TODO",
          tags: { has: "work" },
          done: false,
          OR: [
            { title: { contains: "需求", mode: "insensitive" } },
            { content: { contains: "需求", mode: "insensitive" } },
          ],
        },
      })
    );
  });

  it("非法 type 返回 400", async () => {
    user.mockResolvedValue(me);
    const res = await GET(getReq("?type=idea"));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/entries", () => {
  it("创建成功返回 201 且小写 type", async () => {
    user.mockResolvedValue(me);
    create.mockResolvedValue(sample as never);
    const res = await POST(postReq({ type: "note", title: "t", content: "c", tags: ["x"] }));
    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith({
      data: { userId: "u1", type: "NOTE", title: "t", content: "c", tags: ["x"] },
    });
    const body = await res.json();
    expect(body.entry.type).toBe("note");
  });

  it("缺 title 返回 400", async () => {
    user.mockResolvedValue(me);
    const res = await POST(postReq({ type: "note" }));
    expect(res.status).toBe(400);
  });

  it("未登录 401", async () => {
    user.mockResolvedValue(null);
    const res = await POST(postReq({ type: "note", title: "t" }));
    expect(res.status).toBe(401);
  });
});
