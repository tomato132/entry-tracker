"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "register") {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "注册失败");
          return;
        }
      }
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError(mode === "login" ? "邮箱或密码错误" : "注册成功但登录失败，请手动登录");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-acid flex flex-col px-5">
      {/* 顶部装饰行 */}
      <div className="max-w-2xl w-full mx-auto pt-6 flex justify-between micro-label text-ink/60">
        <span>Entry Tracker</span>
        <span>Req · Note · Todo</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-10">
        <div className="w-full max-w-sm animate-rise">
          {/* 巨型刊头 */}
          <div className="mb-10">
            <h1
              className="font-extrabold tracking-tighter leading-[0.9] text-ink"
              style={{ fontSize: "clamp(64px, 18vw, 120px)" }}
            >
              记录
            </h1>
            <p className="micro-label text-ink/60 mt-4">Write it down. Right now.</p>
          </div>

          {/* 白色表单卡 */}
          <form
            onSubmit={submit}
            className="bg-panel rounded-[16px] p-7 space-y-6 border border-ink/10 card-soft"
          >
            <div>
              <label className="micro-label text-ink-faint block mb-2">Email · 邮箱</label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="ink-input w-full py-2 text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="micro-label text-ink-faint block mb-2">Password · 密码</label>
              <input
                type="password" required minLength={8} value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="ink-input w-full py-2 text-sm"
                placeholder="至少 8 位"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit" disabled={busy}
              className="ink-btn-primary w-full rounded-full py-3 text-sm tracking-[0.35em] font-semibold"
            >
              {busy ? "请稍候" : mode === "login" ? "登 录" : "注册并登录"}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
                className="ink-link text-xs text-ink-soft"
              >
                {mode === "login" ? "没有账号？注册一个" : "已有账号？去登录"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
