import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;
  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment || attachment.userId !== user.id) {
    return NextResponse.json({ error: "附件不存在" }, { status: 404 });
  }
  try {
    await del(attachment.url);
  } catch {
    // Blob 清理失败不阻塞删除
  }
  await prisma.attachment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
