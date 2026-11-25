import { requirePageRole } from "@/lib/authorization";
import DashboardTitle from "@/components/dashboard-title";
import AdminCollections from "@/components/admin-collections";

export const dynamic = "force-dynamic";

export default async function AdminCollectionsPage() {
  await requirePageRole("ADMIN");
  return <div className="workspace-page"><DashboardTitle eyebrow="EDITORIAL PICKS FOR THE HOME PAGE" title="Featured collections" /><AdminCollections /></div>;
}
