import { requirePageRole } from "@/lib/authorization";
import DashboardTitle from "@/components/dashboard-title";
import InboxClient from "@/components/inbox-client";

export const dynamic = "force-dynamic";

export default async function HostInboxPage() {
  const user = await requirePageRole("HOST");
  return <div className="workspace-page inbox-page"><DashboardTitle eyebrow="HERE WHEN YOU NEED EACH OTHER" title="Guest inbox" /><InboxClient currentUserId={user.id} role="HOST" /></div>;
}
