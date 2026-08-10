const BASE = () => process.env.MOONSHOT_BASE_URL ?? "https://api.moonshot.cn/v1";
const MODEL = () => process.env.MOONSHOT_MODEL ?? "kimi-k2-0905-preview";

export class KimiError extends Error {
  code: "NO_KEY" | "API_ERROR";
  constructor(code: "NO_KEY" | "API_ERROR", message: string) {
    super(message);
    this.code = code;
  }
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/** 调 Kimi（Moonshot）chat completions，返回文本内容。temperature 不传则不发送（部分模型如 kimi-for-coding 只允许默认值） */
export async function kimiChat(messages: ChatMessage[], temperature?: number): Promise<string> {
  const key = process.env.MOONSHOT_API_KEY;
  if (!key) throw new KimiError("NO_KEY", "未配置 MOONSHOT_API_KEY");

  const res = await fetch(`${BASE()}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL(),
      messages,
      ...(temperature === undefined ? {} : { temperature }),
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new KimiError("API_ERROR", `Kimi API ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/** 从模型输出中提取首个 JSON 对象（容忍 ```json 包裹） */
export function extractJson(text: string): unknown | null {
  const cleaned = text.replace(/```(?:json)?/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}
