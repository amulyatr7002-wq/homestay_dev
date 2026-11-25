import { redirect } from "next/navigation";
import DashboardTitle from "@/components/dashboard-title";
import InboxClient from "@/components/inbox-client";
import { getActiveUser } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export default async function GuestInboxPage({ searchParams }: { searchParams: { listingId?: string } }) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  if (user.role === "HOST" || user.role === "ADMIN") redirect("/host/inbox");
  return <main className="workspace-guest-inbox"><DashboardTitle eyebrow="HERE WHEN YOU NEED EACH OTHER" title="Your messages" /><InboxClient currentUserId={user.id} role="GUEST" newListingId={searchParams.listingId} /></main>;
}
