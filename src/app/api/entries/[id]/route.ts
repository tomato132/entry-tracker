import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { updateEntrySchema } from "@/lib/validation";
import { serializeEntry } from "@/lib/serialize";
import { toDbType } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;
  const entry = await prisma.entry.findUnique({
    where: { id },
    include: { attachments: { orderBy: { createdAt: "asc" } } },
  });
  if (!entry || (entry.userId !== user.id && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }
  return NextResponse.json({ entry: serializeEntry(entry) });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;
  const entry = await prisma.entry.findUnique({ where: { id } });
  // 写操作仅本人，admin 也不例外
  if (!entry || entry.userId !== user.id) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  const parsed = updateEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { type, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (type) data.type = toDbType(type);
  const updated = await prisma.entry.update({ where: { id }, data });
  return NextResponse.json({ entry: serializeEntry(updated) });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;
  const entry = await prisma.entry.findUnique({ where: { id } });
  if (!entry || entry.userId !== user.id) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }
  const attachments = await prisma.attachment.findMany({ where: { entryId: id } });
  for (const a of attachments) {
    try {
      await del(a.url);
    } catch {
      // Blob 清理失败不阻塞删除（例如本地开发无 Blob token）
    }
  }
  await prisma.entry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
