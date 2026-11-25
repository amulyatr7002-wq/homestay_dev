import { requirePageRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import DashboardTitle from "@/components/dashboard-title";
import HostCalendar from "@/components/host-calendar";

export const dynamic = "force-dynamic";

export default async function HostCalendarPage() {
  const host = await requirePageRole("HOST");
  const listings = await prisma.listing.findMany({ where: { hostId: host.id }, orderBy: { title: "asc" }, select: { id: true, title: true, status: true } });
  return <div className="workspace-page"><DashboardTitle eyebrow="MAKE ROOM FOR THE RIGHT DATES" title="Availability calendar" /><HostCalendar listings={listings} /></div>;
}
