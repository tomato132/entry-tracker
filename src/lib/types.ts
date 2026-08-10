export const ENTRY_TYPES = ["requirement", "note", "todo"] as const;
export type ApiEntryType = (typeof ENTRY_TYPES)[number];
export type DbEntryType = "REQUIREMENT" | "NOTE" | "TODO";

export function toDbType(t: ApiEntryType): DbEntryType {
  return t.toUpperCase() as DbEntryType;
}

export function toApiType(t: DbEntryType): ApiEntryType {
  return t.toLowerCase() as ApiEntryType;
}
