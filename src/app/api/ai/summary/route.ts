import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { kimiChat, KimiError } from "@/lib/kimi";

const TYPE_CN: Record<string, string> = {
  REQUIREMENT: "需求", NOTE: "笔记", TODO: "待办",
};

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const entries = await prisma.entry.findMany({
    where: { userId: user.id, createdAt: { gte: todayStart() } },
    orderBy: { createdAt: "asc" },
  });

  if (entries.length === 0) {
    return NextResponse.json({ summary: "今天还没有记录。写下第一条，晚上我来帮你总结。" });
  }

  const lines = entries
    .map((e) => `- [${TYPE_CN[e.type]}] ${e.title}${e.type === "TODO" ? (e.done ? "（已完成）" : "（未完成）") : ""}`)
    .join("\n");

  try {
    const summary = await kimiChat([
      {
        role: "system",
        content:
          "你是用户的私人记录助手。根据用户今天的记录清单，写一段 3-5 句的中文小结：" +
          "概括今天关注了什么、还有哪些待办没完成、语气温暖简洁，像写日志旁白。不要列清单，不要标题。",
      },
      { role: "user", content: lines },
    ]);
    return NextResponse.json({ summary });
  } catch (e) {
    if (e instanceof KimiError && e.code === "NO_KEY") {
      return NextResponse.json({ error: "服务端未配置 MOONSHOT_API_KEY" }, { status: 503 });
    }
    return NextResponse.json({ error: "AI 小结失败，请稍后再试" }, { status: 502 });
  }
}
