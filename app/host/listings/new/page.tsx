import { requirePageRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import DashboardTitle from "@/components/dashboard-title";
import HostListingWizard from "@/components/host-listing-wizard";

export const dynamic = "force-dynamic";

export default async function NewHostListingPage() {
  await requirePageRole("HOST");
  const amenities = await prisma.amenity.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return <div className="workspace-page"><DashboardTitle eyebrow="GIVE YOUR STAY A STAGE" title="Create a listing" /><HostListingWizard amenities={amenities} /></div>;
}
