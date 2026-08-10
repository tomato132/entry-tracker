import { auth } from "@/auth";

export type CurrentUser = { id: string; email: string; role: "USER" | "ADMIN" };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    role: session.user.role,
  };
}
