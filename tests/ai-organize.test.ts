import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/current-user", () => ({ getCurrentUser: vi.fn() }));

import { POST } from "@/app/api/ai/organize/route";
import { getCurrentUser } from "@/lib/current-user";

const me = { id: "u1", email: "a@b.com", role: "USER" as const };
const user = vi.mocked(getCurrentUser);

function req(body: unknown) {
  return new Request("http://localhost/api/ai/organize", {
    method: "POST", body: JSON.stringify(body),
  });
}

function mockKimiResponse(content: string) {
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

describe("POST /api/ai/organize", () => {
  it("未登录 401", async () => {
    user.mockResolvedValue(null);
    const res = await POST(req({ text: "x" }));
    expect(res.status).toBe(401);
  });

  it("缺 text 返回 400", async () => {
    user.mockResolvedValue(me);
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it("正常返回结构化结果", async () => {
    user.mockResolvedValue(me);
    mockKimiResponse('```json\n{"type":"todo","title":"买牛奶","tags":["生活"]}\n```');
    const res = await POST(req({ text: "记得明天买牛奶" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ type: "todo", title: "买牛奶", tags: ["生活"] });
  });

  it("模型输出非 JSON 时兜底为笔记", async () => {
    user.mockResolvedValue(me);
    mockKimiResponse("抱歉我无法理解");
    const res = await POST(req({ text: "一段很长的随手记文字，超过了三十个字的长度限制用来测试截断功能是否正常" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe("note");
    expect(body.title.length).toBeLessThanOrEqual(30);
  });

  it("未配置 API key 返回 503", async () => {
    user.mockResolvedValue(me);
    delete process.env.MOONSHOT_API_KEY;
    const res = await POST(req({ text: "test" }));
    expect(res.status).toBe(503);
  });

  it("Kimi API 报错返回 502", async () => {
    user.mockResolvedValue(me);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("rate limited", { status: 429 })));
    const res = await POST(req({ text: "test" }));
    expect(res.status).toBe(502);
  });
});
