import { requirePageRole } from "@/lib/authorization";
import DashboardTitle from "@/components/dashboard-title";
import AdminAudit from "@/components/admin-audit";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  await requirePageRole("ADMIN");
  return <div className="workspace-page"><DashboardTitle eyebrow="A RECORD OF STEWARDSHIP" title="Admin audit log" /><AdminAudit /></div>;
}
