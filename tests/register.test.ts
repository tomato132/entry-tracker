import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn() },
  },
}));
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed"), compare: vi.fn() },
}));

import { POST } from "@/app/api/register/route";
import { prisma } from "@/lib/db";

const findUnique = vi.mocked(prisma.user.findUnique);
const create = vi.mocked(prisma.user.create);

function req(body: unknown) {
  return new Request("http://localhost/api/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.ADMIN_EMAILS;
});

describe("POST /api/register", () => {
  it("创建普通用户成功返回 201", async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({} as never);
    const res = await POST(req({ email: "a@b.com", password: "12345678" }));
    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith({
      data: { email: "a@b.com", passwordHash: "hashed", role: "USER" },
    });
  });

  it("邮箱已存在返回 409", async () => {
    findUnique.mockResolvedValue({ id: "u1" } as never);
    const res = await POST(req({ email: "a@b.com", password: "12345678" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "该邮箱已注册" });
  });

  it("非法输入返回 400", async () => {
    const res = await POST(req({ email: "bad", password: "123" }));
    expect(res.status).toBe(400);
  });

  it("命中 ADMIN_EMAILS 的用户注册为 ADMIN", async () => {
    process.env.ADMIN_EMAILS = "boss@x.com, other@x.com";
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({} as never);
    const res = await POST(req({ email: "boss@x.com", password: "12345678" }));
    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith({
      data: { email: "boss@x.com", passwordHash: "hashed", role: "ADMIN" },
    });
  });
});
