import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { registerAttachmentSchema } from "@/lib/validation";
import { serializeAttachment } from "@/lib/serialize";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;
  const entry = await prisma.entry.findUnique({ where: { id } });
  if (!entry || entry.userId !== user.id) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  const parsed = registerAttachmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const attachment = await prisma.attachment.create({
    data: { entryId: id, userId: user.id, ...parsed.data },
  });
  return NextResponse.json({ attachment: serializeAttachment(attachment) }, { status: 201 });
}
