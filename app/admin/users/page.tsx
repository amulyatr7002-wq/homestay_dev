import { requirePageRole } from "@/lib/authorization";
import DashboardTitle from "@/components/dashboard-title";
import AdminUsers from "@/components/admin-users";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requirePageRole("ADMIN");
  return <div className="workspace-page"><DashboardTitle eyebrow="PEOPLE MAKE THIS PLACE" title="User management" /><AdminUsers /></div>;
}
