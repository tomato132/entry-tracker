import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { AppSidebar } from "@/components/app-sidebar";
import { DateWeather } from "@/components/date-weather";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const email = session.user.email ?? "";
  const role = session.user.role;
  return (
    <div className="min-h-screen">
      {/* 移动端顶部导航 */}
      <div className="lg:hidden">
        <Navbar email={email} role={role} />
      </div>
      {/* 桌面端左侧边栏 */}
      <AppSidebar email={email} role={role} />
      <main className="max-w-2xl mx-auto px-5 py-8 lg:max-w-none lg:pl-72 lg:pr-8 lg:py-10">
        {/* 右上角：当天日期 + 天气 */}
        <div className="flex justify-end pb-5">
          <DateWeather />
        </div>
        {children}
      </main>
    </div>
  );
}
