import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { kimiChat, extractJson, KimiError } from "@/lib/kimi";
import { ENTRY_TYPES } from "@/lib/types";

const bodySchema = z.object({ text: z.string().min(1).max(2000) });

const resultSchema = z.object({
  type: z.enum(ENTRY_TYPES),
  title: z.string().min(1).max(200),
  tags: z.array(z.string().min(1).max(50)).max(5),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "text 必填" }, { status: 400 });
  }

  try {
    const raw = await kimiChat([
      {
        role: "system",
        content:
          "你是个人记录整理助手。用户会给你一段随手记下的文字，你把它整理成一条结构化记录。" +
          "只返回 JSON，不要任何其他文字：" +
          '{"type":"requirement|note|todo","title":"不超过30字的精炼标题","tags":["1到3个简短标签"]}。' +
          "type 判断规则：todo=需要去做的事；requirement=对产品/工作的需求或功能想法；note=其他一切（灵感、备忘、见闻）。",
      },
      { role: "user", content: parsed.data.text },
    ]);
    const json = extractJson(raw);
    const result = resultSchema.safeParse(json);
    if (!result.success) {
      // 模型输出不合格时兜底：原文作为笔记
      return NextResponse.json({
        type: "note",
        title: parsed.data.text.slice(0, 30),
        tags: [],
      });
    }
    return NextResponse.json(result.data);
  } catch (e) {
    if (e instanceof KimiError && e.code === "NO_KEY") {
      return NextResponse.json({ error: "服务端未配置 MOONSHOT_API_KEY" }, { status: 503 });
    }
    return NextResponse.json({ error: "AI 整理失败，请稍后再试" }, { status: 502 });
  }
}
