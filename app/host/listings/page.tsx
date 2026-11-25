import { requirePageRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import DashboardTitle from "@/components/dashboard-title";
import HostListingsTable from "@/components/host-listings-table";

export const dynamic = "force-dynamic";

export default async function HostListingsPage() {
  const host = await requirePageRole("HOST");
  const listings = await prisma.listing.findMany({
    where: { hostId: host.id },
    include: { images: { orderBy: { position: "asc" }, take: 1 }, _count: { select: { bookings: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return <div className="workspace-page"><DashboardTitle eyebrow="YOUR HOMES, YOUR WAY" title="Listings" action={{ href: "/host/listings/new", label: "New listing" }} /><HostListingsTable listings={listings.map((listing) => ({ id: listing.id, title: listing.title, city: listing.city, status: listing.status, views: listing.views, bookings: listing._count.bookings, image: listing.images[0]?.url ?? null, slug: listing.slug, rejectedReason: listing.rejectedReason }))} /></div>;
}
