import { z } from "zod";
import { ENTRY_TYPES } from "./types";

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const registerSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(8, "密码至少 8 位"),
});

export const createEntrySchema = z.object({
  type: z.enum(ENTRY_TYPES),
  title: z.string().min(1, "标题不能为空").max(200, "标题最多 200 字"),
  content: z.string().max(100_000).optional().default(""),
  tags: z.array(z.string().min(1).max(50)).max(20).optional().default([]),
});

export const updateEntrySchema = z.object({
  type: z.enum(ENTRY_TYPES).optional(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(100_000).optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  done: z.boolean().optional(),
});

export const registerAttachmentSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  size: z.number().int().positive().max(MAX_FILE_SIZE),
  url: z.string().url(),
});
