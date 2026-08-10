"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

function SideNavItem({ href, en, cn }: { href: string; en: string; cn: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link href={href} className="group flex flex-col items-start leading-tight py-2">
      <span className={`micro-label ${active ? "text-ink" : "text-ink-faint group-hover:text-ink"} transition-colors`}>
        {en}
      </span>
      <span className={`text-lg mt-1 px-1 ${active ? "hl font-bold" : "text-ink-soft"}`}>
        {cn}
      </span>
    </Link>
  );
}

const SHORTCUTS: [string, string][] = [
  ["N", "快速记录"],
  ["/", "搜索"],
  ["1-4", "切换类型"],
  ["Esc", "取消焦点"],
];

export function AppSidebar({ email, role }: { email: string; role: string }) {
  return (
    <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-60 border-r border-line bg-base px-6 py-8 z-20">
      <Link href="/" className="text-2xl font-extrabold tracking-tighter leading-none">
        记录
        <span className="inline-block w-2.5 h-2.5 bg-acid-deep rounded-full ml-1.5 mb-0.5" />
      </Link>
      <p className="micro-label text-ink-faint mt-2">Entry Tracker</p>

      <nav className="mt-12 flex flex-col gap-2">
        <SideNavItem href="/" en="Feed" cn="全部" />
        <SideNavItem href="/todos" en="Todo" cn="待办" />
      </nav>

      <div className="mt-auto space-y-4">
        <div className="border-t border-line pt-4">
          <p className="micro-label text-ink-faint mb-2">Shortcuts</p>
          <ul className="space-y-1.5">
            {SHORTCUTS.map(([key, desc]) => (
              <li key={key} className="flex items-center gap-2 text-xs text-ink-soft">
                <kbd className="font-mono-cn text-[10px] bg-panel border border-line rounded px-1.5 py-0.5">
                  {key}
                </kbd>
                {desc}
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-line pt-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            {role === "ADMIN" && (
              <span className="micro-label bg-acid text-ink rounded-full px-2 py-0.5 inline-block mb-1">
                Admin
              </span>
            )}
            <p className="font-mono-cn text-[11px] text-ink-faint truncate">{email}</p>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="ink-link text-xs text-ink-soft shrink-0">
            退出
          </button>
        </div>
      </div>
    </aside>
  );
}
