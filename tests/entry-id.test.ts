import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    entry: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    attachment: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@vercel/blob", () => ({ del: vi.fn().mockResolvedValue(undefined) }));

import { GET, PATCH, DELETE } from "@/app/api/entries/[id]/route";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { del } from "@vercel/blob";

const me = { id: "u1", email: "a@b.com", role: "USER" as const };
const other = { id: "u2", email: "b@b.com", role: "USER" as const };
const admin = { id: "u9", email: "boss@x.com", role: "ADMIN" as const };

const user = vi.mocked(getCurrentUser);
const findUnique = vi.mocked(prisma.entry.findUnique);
const update = vi.mocked(prisma.entry.update);
const remove = vi.mocked(prisma.entry.delete);
const attFindMany = vi.mocked(prisma.attachment.findMany);

const entry = {
  id: "e1", userId: "u1", type: "TODO", title: "t", content: "c",
  tags: [], done: false,
  createdAt: new Date("2026-08-10T00:00:00Z"), updatedAt: new Date("2026-08-10T00:00:00Z"),
  attachments: [],
};

const params = { params: Promise.resolve({ id: "e1" }) };
const req = (method: string, body?: unknown) =>
  new Request("http://localhost/api/entries/e1", {
    method, body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeEach(() => vi.clearAllMocks());

describe("GET /api/entries/[id]", () => {
  it("本人可读", async () => {
    user.mockResolvedValue(me);
    findUnique.mockResolvedValue(entry as never);
    const res = await GET(req("GET"), params);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entry.id).toBe("e1");
    expect(body.entry.attachments).toEqual([]);
  });

  it("他人记录返回 404", async () => {
    user.mockResolvedValue(other);
    findUnique.mockResolvedValue(entry as never);
    const res = await GET(req("GET"), params);
    expect(res.status).toBe(404);
  });

  it("admin 可读他人记录", async () => {
    user.mockResolvedValue(admin);
    findUnique.mockResolvedValue(entry as never);
    const res = await GET(req("GET"), params);
    expect(res.status).toBe(200);
  });

  it("不存在返回 404", async () => {
    user.mockResolvedValue(me);
    findUnique.mockResolvedValue(null);
    const res = await GET(req("GET"), params);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/entries/[id]", () => {
  it("本人可更新 done", async () => {
    user.mockResolvedValue(me);
    findUnique.mockResolvedValue(entry as never);
    update.mockResolvedValue({ ...entry, done: true } as never);
    const res = await PATCH(req("PATCH", { done: true }), params);
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "e1" }, data: { done: true } })
    );
    const body = await res.json();
    expect(body.entry.done).toBe(true);
  });

  it("admin 也不能改他人记录（404）", async () => {
    user.mockResolvedValue(admin);
    findUnique.mockResolvedValue(entry as never);
    const res = await PATCH(req("PATCH", { done: true }), params);
    expect(res.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });

  it("type 更新会转大写枚举", async () => {
    user.mockResolvedValue(me);
    findUnique.mockResolvedValue(entry as never);
    update.mockResolvedValue({ ...entry, type: "NOTE" } as never);
    await PATCH(req("PATCH", { type: "note" }), params);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { type: "NOTE" } })
    );
  });

  it("非法 body 返回 400", async () => {
    user.mockResolvedValue(me);
    findUnique.mockResolvedValue(entry as never);
    const res = await PATCH(req("PATCH", { title: "" }), params);
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/entries/[id]", () => {
  it("本人删除：先清 Blob 再删记录", async () => {
    user.mockResolvedValue(me);
    findUnique.mockResolvedValue(entry as never);
    attFindMany.mockResolvedValue([
      { id: "a1", url: "https://blob/1.png" },
      { id: "a2", url: "https://blob/2.png" },
    ] as never);
    remove.mockResolvedValue(entry as never);
    const res = await DELETE(req("DELETE"), params);
    expect(res.status).toBe(200);
    expect(vi.mocked(del)).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledWith({ where: { id: "e1" } });
  });

  it("Blob 删除失败不阻塞记录删除", async () => {
    user.mockResolvedValue(me);
    findUnique.mockResolvedValue(entry as never);
    attFindMany.mockResolvedValue([{ id: "a1", url: "https://blob/1.png" }] as never);
    vi.mocked(del).mockRejectedValueOnce(new Error("blob down"));
    remove.mockResolvedValue(entry as never);
    const res = await DELETE(req("DELETE"), params);
    expect(res.status).toBe(200);
  });

  it("他人删除返回 404", async () => {
    user.mockResolvedValue(other);
    findUnique.mockResolvedValue(entry as never);
    const res = await DELETE(req("DELETE"), params);
    expect(res.status).toBe(404);
    expect(remove).not.toHaveBeenCalled();
  });
});
