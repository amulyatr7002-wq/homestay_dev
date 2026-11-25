import { requirePageRole } from "@/lib/authorization";
import DashboardTitle from "@/components/dashboard-title";
import AdminFlags from "@/components/admin-flags";

export const dynamic = "force-dynamic";

export default async function AdminFlagsPage() {
  await requirePageRole("ADMIN");
  return <div className="workspace-page"><DashboardTitle eyebrow="TRUST IS A SHARED PRACTICE" title="Flagged content" /><AdminFlags /></div>;
}
