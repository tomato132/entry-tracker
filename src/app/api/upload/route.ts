import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/current-user";
import { MAX_FILE_SIZE } from "@/lib/validation";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = (await req.json()) as HandleUploadBody;
  const json = await handleUpload({
    body,
    request: req,
    onBeforeGenerateToken: async () => ({
      maximumSizeInBytes: MAX_FILE_SIZE,
      allowedContentTypes: [
        "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml",
        "application/pdf", "text/plain", "text/markdown",
        "application/zip", "application/octet-stream",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
    }),
    onUploadCompleted: async () => {
      // 登记由前端调 POST /api/entries/[id]/attachments 完成
    },
  });
  return NextResponse.json(json);
}
