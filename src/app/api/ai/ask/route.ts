import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { kimiChat, KimiError } from "@/lib/kimi";

const bodySchema = z.object({
  question: z.string().min(1).max(500),
  history: z
    .array(z.object({ question: z.string().max(500), answer: z.string().max(4000) }))
    .max(6)
    .optional(),
});

const TYPE_CN: Record<string, string> = {
  REQUIREMENT: "需求", NOTE: "笔记", TODO: "待办",
};

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "question 必填" }, { status: 400 });
  }

  const entries = await prisma.entry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const context = entries.length
    ? entries
        .map((e) => {
          const d = e.createdAt.toISOString().slice(0, 10);
          return `- ${d} [${TYPE_CN[e.type]}] ${e.title}${e.done ? "（已完成）" : ""}${e.tags.length ? " #" + e.tags.join(" #") : ""}`;
        })
        .join("\n")
    : "（用户还没有任何记录）";

  try {
    const historyMessages = (parsed.data.history ?? []).flatMap((h) => [
      { role: "user" as const, content: h.question },
      { role: "assistant" as const, content: h.answer },
    ]);
    const answer = await kimiChat([
      {
        role: "system",
        content:
          "你是用户的私人助手，既可以回答关于用户记录的问题，也能回答一般性问题。" +
          "规则：问题与记录相关时，优先基于下面的记录清单回答，并指明依据了哪条记录；" +
          "问题与记录无关时（知识、建议、写作、翻译等），直接用你的知识正常回答，不要拒绝。" +
          "回答用中文，简洁直接。以下时间都是用户本地日期。\n\n用户的记录清单：\n" +
          context,
      },
      ...historyMessages,
      { role: "user", content: parsed.data.question },
    ]);
    return NextResponse.json({ answer });
  } catch (e) {
    if (e instanceof KimiError && e.code === "NO_KEY") {
      return NextResponse.json({ error: "服务端未配置 MOONSHOT_API_KEY" }, { status: 503 });
    }
    return NextResponse.json({ error: "AI 回答失败，请稍后再试" }, { status: 502 });
  }
}
