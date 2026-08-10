"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

function NavItem({ href, en, cn }: { href: string; en: string; cn: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link href={href} className="flex flex-col items-start leading-tight group">
      <span className={`micro-label ${active ? "text-ink" : "text-ink-faint group-hover:text-ink"} transition-colors`}>
        {en}
      </span>
      <span className={`text-sm mt-0.5 px-0.5 ${active ? "hl font-semibold" : "text-ink-soft"}`}>
        {cn}
      </span>
    </Link>
  );
}

export function Navbar({ email, role }: { email: string; role: string }) {
  return (
    <header className="border-b border-line bg-base/90 backdrop-blur sticky top-0 z-20">
      <div className="max-w-2xl mx-auto px-5 h-16 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link href="/" className="text-xl font-extrabold tracking-tight leading-none">
            记录
            <span className="inline-block w-2 h-2 bg-acid-deep rounded-full ml-1.5 mb-0.5" />
          </Link>
          <nav className="flex gap-8">
            <NavItem href="/" en="Feed" cn="全部" />
            <NavItem href="/todos" en="Todo" cn="待办" />
          </nav>
        </div>
        <div className="flex items-center gap-3 text-xs text-ink-faint">
          {role === "ADMIN" && (
            <span className="micro-label bg-acid text-ink rounded-full px-2.5 py-1">Admin</span>
          )}
          <span className="hidden sm:inline font-mono-cn">{email}</span>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="ink-link text-ink-soft">
            退出
          </button>
        </div>
      </div>
    </header>
  );
}
