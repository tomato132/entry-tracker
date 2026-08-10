import { ApiEntryType } from "@/lib/api-types";

const CHIP_LABELS: Record<ApiEntryType, string> = {
  requirement: "需求",
  note: "笔记",
  todo: "待办",
};

/** 类型 pill：蜜桃胶囊，完成后变灰 */
export function TypeSeal({ type, faded }: { type: ApiEntryType; faded?: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs rounded-full ${
        faded ? "bg-black/5 text-ink-faint" : "bg-acid text-ink"
      }`}
    >
      {CHIP_LABELS[type]}
    </span>
  );
}
