import { toApiType } from "./types";

export function serializeEntry(e: {
  id: string;
  type: "REQUIREMENT" | "NOTE" | "TODO";
  title: string;
  content: string;
  tags: string[];
  done: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: { email: string };
  attachments?: unknown[];
}) {
  return {
    id: e.id,
    type: toApiType(e.type),
    title: e.title,
    content: e.content,
    tags: e.tags,
    done: e.done,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    ...(e.user ? { userEmail: e.user.email } : {}),
    ...(e.attachments
      ? { attachments: e.attachments.map((a) => serializeAttachment(a as never)) }
      : {}),
  };
}

export function serializeAttachment(a: {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: Date;
}) {
  return {
    id: a.id,
    filename: a.filename,
    mimeType: a.mimeType,
    size: a.size,
    url: a.url,
    createdAt: a.createdAt.toISOString(),
  };
}
