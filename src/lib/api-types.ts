export type ApiEntryType = "requirement" | "note" | "todo";

export type AttachmentDto = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
};

export type EntryDto = {
  id: string;
  type: ApiEntryType;
  title: string;
  content: string;
  tags: string[];
  done: boolean;
  createdAt: string;
  updatedAt: string;
  userEmail?: string;
  attachments?: AttachmentDto[];
};

export const TYPE_LABELS: Record<ApiEntryType, string> = {
  requirement: "需求",
  note: "笔记",
  todo: "待办",
};
