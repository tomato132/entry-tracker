import { auth } from "@/auth";
import { HomeClient } from "@/components/home-client";

export default async function HomePage() {
  const session = await auth();
  return <HomeClient role={session?.user.role ?? "USER"} />;
}
