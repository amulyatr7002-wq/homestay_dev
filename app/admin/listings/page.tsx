import { requirePageRole } from "@/lib/authorization";
import DashboardTitle from "@/components/dashboard-title";
import AdminListings from "@/components/admin-listings";

export const dynamic = "force-dynamic";

export default async function AdminListingsPage() {
  await requirePageRole("ADMIN");
  return <div className="workspace-page"><DashboardTitle eyebrow="QUALITY BEFORE QUANTITY" title="Listing moderation" /><AdminListings /></div>;
}
