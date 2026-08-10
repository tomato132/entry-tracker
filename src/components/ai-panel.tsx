"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export const AI_ASK_EVENT = "entry-tracker:ai-ask";

export function AiPanel() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 新消息自动滚到底部
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || busy) return;
      setError("");
      setBusy(true);
      setMessages((m) => [...m, { role: "user", content: question }]);
      try {
        const history = messages.slice(-6).reduce<{ question: string; answer: string }[]>((acc, cur, i, arr) => {
          if (cur.role === "user" && arr[i + 1]?.role === "assistant") {
            acc.push({ question: cur.content, answer: arr[i + 1].content });
          }
          return acc;
        }, []);
        const res = await fetch("/api/ai/ask", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ question, history }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "失败");
        setMessages((m) => [...m, { role: "assistant", content: data.answer }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "AI 回答失败");
      } finally {
        setBusy(false);
      }
    },
    [busy, messages]
  );

  // 今日小结：作为一条预设对话
  async function makeSummary() {
    if (busy) return;
    setError("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", content: "✦ 生成今日小结" }]);
    try {
      const res = await fetch("/api/ai/summary", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "失败");
      setMessages((m) => [...m, { role: "assistant", content: data.summary }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI 小结失败");
    } finally {
      setBusy(false);
    }
  }

  // 超级输入框「问 AI」派发的问题
  useEffect(() => {
    function onAsk(e: Event) {
      const q = (e as CustomEvent<string>).detail;
      if (typeof q === "string" && q.trim()) send(q);
      inputRef.current?.focus();
    }
    window.addEventListener(AI_ASK_EVENT, onAsk);
    return () => window.removeEventListener(AI_ASK_EVENT, onAsk);
  }, [send]);

  return (
    <section className="bg-ink-deep text-paper rounded-[16px] card-soft overflow-hidden flex flex-col">
      {/* 头部 */}
      <div className="px-5 pt-5 pb-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <p className="font-bold tracking-tight text-base">✦ Kimi 助手</p>
          <p className="micro-label text-paper/40 mt-1">基于你的记录 + 全网知识</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={makeSummary}
            disabled={busy}
            className="bg-acid-deep text-white rounded-full px-4 py-1.5 text-xs font-semibold transition-transform hover:scale-[1.03] disabled:opacity-40"
          >
            今日小结
          </button>
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setError(""); }}
              disabled={busy}
              className="text-paper/50 hover:text-paper text-xs transition-colors disabled:opacity-40"
              title="清空全部消息与对话上下文"
            >
              清空
            </button>
          )}
        </div>
      </div>

      {/* 对话区 */}
      <div ref={scrollRef} className="px-4 py-4 space-y-3 min-h-48 max-h-[55vh] lg:max-h-[62vh] overflow-y-auto">
        {messages.length === 0 && !busy && (
          <p className="text-xs text-paper/40 leading-relaxed px-1">
            问我任何关于你记录的问题，或者随便聊聊。<br />
            试试：「我这周记了什么」「帮我把第二条需求扩写成方案」
          </p>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] bg-acid text-ink text-xs leading-relaxed rounded-xl rounded-br-sm px-3.5 py-2.5">
                {m.content}
              </p>
            </div>
          ) : (
            <div key={i} className="flex justify-start">
              <p className="max-w-[90%] bg-white/8 text-paper/90 text-xs leading-relaxed rounded-xl rounded-bl-sm px-3.5 py-2.5 border-l-2 border-acid-deep">
                {m.content}
              </p>
            </div>
          )
        )}
        {busy && (
          <div className="flex justify-start">
            <p className="bg-white/8 text-paper/50 text-xs rounded-xl px-3.5 py-2.5 animate-pulse">
              思考中…
            </p>
          </div>
        )}
      </div>

      {/* 输入区 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
          setInput("");
        }}
        className="border-t border-white/10 p-3 flex gap-2"
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="问记录、问知识、问什么都行…"
          className="flex-1 bg-white/10 text-paper text-xs rounded-full px-4 py-2.5 outline-none placeholder:text-white/40 focus:bg-white/15 transition-colors"
          maxLength={500}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="bg-acid-deep text-white text-xs font-semibold rounded-full px-4 transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
        >
          发送
        </button>
      </form>
      {error && <p className="text-xs text-red-300 px-4 pb-3">{error}</p>}
    </section>
  );
}
