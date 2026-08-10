import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { createEntrySchema } from "@/lib/validation";
import { serializeEntry } from "@/lib/serialize";
import { ENTRY_TYPES, toDbType, type ApiEntryType } from "@/lib/types";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const scope = sp.get("scope") ?? "mine";
  if (scope === "all" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限查看全部数据" }, { status: 403 });
  }

  const where: Record<string, unknown> = {};
  if (scope !== "all") where.userId = user.id;

  const type = sp.get("type");
  if (type) {
    if (!(ENTRY_TYPES as readonly string[]).includes(type)) {
      return NextResponse.json({ error: "非法的 type" }, { status: 400 });
    }
    where.type = toDbType(type as ApiEntryType);
  }
  const tag = sp.get("tag");
  if (tag) where.tags = { has: tag };
  const q = sp.get("q");
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { content: { contains: q, mode: "insensitive" } },
    ];
  }
  const done = sp.get("done");
  if (done === "true" || done === "false") where.done = done === "true";

  const entries = await prisma.entry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    ...(scope === "all" ? { include: { user: { select: { email: true } } } } : {}),
  });
  return NextResponse.json({ entries: entries.map(serializeEntry) });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const d = parsed.data;
  const entry = await prisma.entry.create({
    data: {
      userId: user.id,
      type: toDbType(d.type),
      title: d.title,
      content: d.content,
      tags: d.tags,
    },
  });
  return NextResponse.json({ entry: serializeEntry(entry) }, { status: 201 });
}
