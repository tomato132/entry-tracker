import { auth } from "@/auth";
import { EntryDetail } from "@/components/entry-detail";

export default async function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  return <EntryDetail id={id} currentUserId={session?.user.id ?? ""} />;
}
