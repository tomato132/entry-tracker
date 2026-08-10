import { describe, it, expect } from "vitest";
import { toDbType, toApiType, ENTRY_TYPES } from "@/lib/types";
import {
  registerSchema,
  createEntrySchema,
  updateEntrySchema,
  registerAttachmentSchema,
  MAX_FILE_SIZE,
} from "@/lib/validation";

describe("types mapping", () => {
  it("api type -> db type", () => {
    expect(toDbType("requirement")).toBe("REQUIREMENT");
    expect(toDbType("note")).toBe("NOTE");
    expect(toDbType("todo")).toBe("TODO");
  });
  it("db type -> api type", () => {
    expect(toApiType("REQUIREMENT")).toBe("requirement");
    expect(toApiType("NOTE")).toBe("note");
    expect(toApiType("TODO")).toBe("todo");
  });
  it("ENTRY_TYPES is lowercase triple", () => {
    expect(ENTRY_TYPES).toEqual(["requirement", "note", "todo"]);
  });
});

describe("registerSchema", () => {
  it("accepts valid input", () => {
    expect(registerSchema.safeParse({ email: "a@b.com", password: "12345678" }).success).toBe(true);
  });
  it("rejects bad email", () => {
    expect(registerSchema.safeParse({ email: "nope", password: "12345678" }).success).toBe(false);
  });
  it("rejects short password", () => {
    expect(registerSchema.safeParse({ email: "a@b.com", password: "1234567" }).success).toBe(false);
  });
});

describe("createEntrySchema", () => {
  it("accepts minimal input and defaults", () => {
    const r = createEntrySchema.parse({ type: "note", title: "hello" });
    expect(r.content).toBe("");
    expect(r.tags).toEqual([]);
  });
  it("rejects empty title", () => {
    expect(createEntrySchema.safeParse({ type: "note", title: "" }).success).toBe(false);
  });
  it("rejects title > 200 chars", () => {
    expect(createEntrySchema.safeParse({ type: "note", title: "x".repeat(201) }).success).toBe(false);
  });
  it("rejects bad type", () => {
    expect(createEntrySchema.safeParse({ type: "idea", title: "ok" }).success).toBe(false);
  });
});

describe("updateEntrySchema", () => {
  it("accepts partial update", () => {
    expect(updateEntrySchema.safeParse({ done: true }).success).toBe(true);
  });
  it("rejects empty object is fine, bad title not", () => {
    expect(updateEntrySchema.safeParse({}).success).toBe(true);
    expect(updateEntrySchema.safeParse({ title: "" }).success).toBe(false);
  });
});

describe("registerAttachmentSchema", () => {
  const ok = { filename: "a.png", mimeType: "image/png", size: 100, url: "https://x.vercel-storage.com/a.png" };
  it("accepts valid", () => {
    expect(registerAttachmentSchema.safeParse(ok).success).toBe(true);
  });
  it("rejects oversize", () => {
    expect(registerAttachmentSchema.safeParse({ ...ok, size: MAX_FILE_SIZE + 1 }).success).toBe(false);
  });
  it("rejects bad url", () => {
    expect(registerAttachmentSchema.safeParse({ ...ok, url: "not-a-url" }).success).toBe(false);
  });
});
