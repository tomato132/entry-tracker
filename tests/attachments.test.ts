import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    entry: { findUnique: vi.fn() },
    attachment: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
  },
}));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@vercel/blob", () => ({ del: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@vercel/blob/client", () => ({ handleUpload: vi.fn() }));

import { POST as uploadPOST } from "@/app/api/upload/route";
import { POST as registerPOST } from "@/app/api/entries/[id]/attachments/route";
import { DELETE as attachmentDELETE } from "@/app/api/attachments/[id]/route";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { handleUpload } from "@vercel/blob/client";
import { del } from "@vercel/blob";

const me = { id: "u1", email: "a@b.com", role: "USER" as const };
const other = { id: "u2", email: "b@b.com", role: "USER" as const };
const user = vi.mocked(getCurrentUser);

const entry = { id: "e1", userId: "u1" };
const attachment = {
  id: "a1", entryId: "e1", userId: "u1",
  filename: "p.png", mimeType: "image/png", size: 100,
  url: "https://blob/p.png", createdAt: new Date("2026-08-10T00:00:00Z"),
};

const jsonReq = (url: string, body: unknown) =>
  new Request(url, { method: "POST", body: JSON.stringify(body) });

beforeEach(() => vi.clearAllMocks());

describe("POST /api/upload", () => {
  it("未登录 401", async () => {
    user.mockResolvedValue(null);
    const res = await uploadPOST(jsonReq("http://localhost/api/upload", {}));
    expect(res.status).toBe(401);
  });
  it("登录用户委托 handleUpload", async () => {
    user.mockResolvedValue(me);
    vi.mocked(handleUpload).mockResolvedValue({ url: "https://blob/x" } as never);
    const res = await uploadPOST(jsonReq("http://localhost/api/upload", { type: "blob.generate-client-token", payload: {} }));
    expect(res.status).toBe(200);
    expect(handleUpload).toHaveBeenCalled();
    const opts = vi.mocked(handleUpload).mock.calls[0][0] as {
      onBeforeGenerateToken: () => Promise<{ maximumSizeInBytes: number }>;
    };
    const tokenOpts = await opts.onBeforeGenerateToken();
    expect(tokenOpts.maximumSizeInBytes).toBe(10 * 1024 * 1024);
  });
});

describe("POST /api/entries/[id]/attachments", () => {
  const ctx = { params: Promise.resolve({ id: "e1" }) };
  const validBody = { filename: "p.png", mimeType: "image/png", size: 100, url: "https://blob/p.png" };

  it("本人登记成功 201", async () => {
    user.mockResolvedValue(me);
    vi.mocked(prisma.entry.findUnique).mockResolvedValue(entry as never);
    vi.mocked(prisma.attachment.create).mockResolvedValue(attachment as never);
    const res = await registerPOST(jsonReq("http://localhost/api/entries/e1/attachments", validBody), ctx);
    expect(res.status).toBe(201);
    expect(prisma.attachment.create).toHaveBeenCalledWith({
      data: { entryId: "e1", userId: "u1", ...validBody },
    });
    const body = await res.json();
    expect(body.attachment.filename).toBe("p.png");
  });

  it("他人记录登记返回 404", async () => {
    user.mockResolvedValue(other);
    vi.mocked(prisma.entry.findUnique).mockResolvedValue(entry as never);
    const res = await registerPOST(jsonReq("http://localhost/api/entries/e1/attachments", validBody), ctx);
    expect(res.status).toBe(404);
  });

  it("超限大小返回 400", async () => {
    user.mockResolvedValue(me);
    vi.mocked(prisma.entry.findUnique).mockResolvedValue(entry as never);
    const res = await registerPOST(
      jsonReq("http://localhost/api/entries/e1/attachments", { ...validBody, size: 10 * 1024 * 1024 + 1 }),
      ctx
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/attachments/[id]", () => {
  const ctx = { params: Promise.resolve({ id: "a1" }) };

  it("本人删除：清 Blob + 删行", async () => {
    user.mockResolvedValue(me);
    vi.mocked(prisma.attachment.findUnique).mockResolvedValue(attachment as never);
    vi.mocked(prisma.attachment.delete).mockResolvedValue(attachment as never);
    const res = await attachmentDELETE(new Request("http://localhost/api/attachments/a1", { method: "DELETE" }), ctx);
    expect(res.status).toBe(200);
    expect(vi.mocked(del)).toHaveBeenCalledWith("https://blob/p.png");
    expect(prisma.attachment.delete).toHaveBeenCalledWith({ where: { id: "a1" } });
  });

  it("他人附件返回 404", async () => {
    user.mockResolvedValue(other);
    vi.mocked(prisma.attachment.findUnique).mockResolvedValue(attachment as never);
    const res = await attachmentDELETE(new Request("http://localhost/api/attachments/a1", { method: "DELETE" }), ctx);
    expect(res.status).toBe(404);
    expect(vi.mocked(del)).not.toHaveBeenCalled();
  });
});
