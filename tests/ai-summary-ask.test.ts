import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/current-user", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: { entry: { findMany: vi.fn() } },
}));

import { POST as summaryPOST } from "@/app/api/ai/summary/route";
import { POST as askPOST } from "@/app/api/ai/ask/route";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

const me = { id: "u1", email: "a@b.com", role: "USER" as const };
const user = vi.mocked(getCurrentUser);
const findMany = vi.mocked(prisma.entry.findMany);

const entry = {
  id: "e1", userId: "u1", type: "TODO", title: "写周报", content: "",
  tags: ["工作"], done: false,
  createdAt: new Date(), updatedAt: new Date(),
};

function mockKimi(content: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 })
    )
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  process.env.MOONSHOT_API_KEY = "test-key";
});

describe("POST /api/ai/summary", () => {
  it("未登录 401", async () => {
    user.mockResolvedValue(null);
    const res = await summaryPOST();
    expect(res.status).toBe(401);
  });

  it("今天无记录时返回引导文案且不调 Kimi", async () => {
    user.mockResolvedValue(me);
    findMany.mockResolvedValue([] as never);
    const res = await summaryPOST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary).toContain("还没有记录");
    expect(vi.mocked(fetch).mock?.calls?.length ?? 0).toBe(0);
  });

  it("有记录时返回 AI 小结", async () => {
    user.mockResolvedValue(me);
    findMany.mockResolvedValue([entry] as never);
    mockKimi("今天主要在处理工作事务，周报还没写完。");
    const res = await summaryPOST();
    expect(res.status).toBe(200);
    expect((await res.json()).summary).toContain("周报");
  });
});

describe("POST /api/ai/ask", () => {
  it("未登录 401", async () => {
    user.mockResolvedValue(null);
    const res = await askPOST(new Request("http://x", { method: "POST", body: "{}" }));
    expect(res.status).toBe(401);
  });

  it("缺 question 返回 400", async () => {
    user.mockResolvedValue(me);
    const res = await askPOST(new Request("http://x", { method: "POST", body: "{}" }));
    expect(res.status).toBe(400);
  });

  it("正常回答并附带记录上下文", async () => {
    user.mockResolvedValue(me);
    findMany.mockResolvedValue([entry] as never);
    mockKimi("你这周记了 1 条待办：写周报。");
    const res = await askPOST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ question: "我这周记了什么？" }) })
    );
    expect(res.status).toBe(200);
    expect((await res.json()).answer).toContain("写周报");
    // 验证上下文确实发给了模型（在 system 消息中）
    const call = vi.mocked(fetch).mock.calls[0];
    const payload = JSON.parse(call[1]?.body as string);
    expect(payload.messages[0].content).toContain("写周报");
    expect(payload.messages.at(-1).content).toBe("我这周记了什么？");
  });

  it("携带历史对话时按序拼入 messages", async () => {
    user.mockResolvedValue(me);
    findMany.mockResolvedValue([entry] as never);
    mockKimi("继续回答");
    const res = await askPOST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({
          question: "那明天呢？",
          history: [{ question: "今天有什么安排？", answer: "写周报。" }],
        }),
      })
    );
    expect(res.status).toBe(200);
    const call = vi.mocked(fetch).mock.calls[0];
    const payload = JSON.parse(call[1]?.body as string);
    const roles = payload.messages.map((m: { role: string }) => m.role);
    expect(roles).toEqual(["system", "user", "assistant", "user"]);
    expect(payload.messages[2].content).toBe("写周报。");
  });
});
