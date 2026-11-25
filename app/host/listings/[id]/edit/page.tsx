import { notFound } from "next/navigation";
import { requirePageRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import DashboardTitle from "@/components/dashboard-title";
import HostListingWizard from "@/components/host-listing-wizard";
import type { ListingDraft } from "@/components/host-listing-wizard";

export const dynamic = "force-dynamic";

export default async function EditHostListingPage({ params }: { params: { id: string } }) {
  const host = await requirePageRole("HOST");
  const [listing, amenities] = await Promise.all([
    prisma.listing.findFirst({ where: { id: params.id, hostId: host.id }, include: { images: { orderBy: { position: "asc" } }, amenities: { select: { id: true } } } }),
    prisma.amenity.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!listing) notFound();
  const savedDraft = listing.draftData && typeof listing.draftData === "object" && !Array.isArray(listing.draftData)
    ? listing.draftData as Partial<ListingDraft>
    : null;
  const initial: Partial<ListingDraft> = savedDraft ?? {
    title: listing.title,
    description: listing.description,
    city: listing.city,
    address: listing.address,
    latitude: listing.latitude,
    longitude: listing.longitude,
    propertyType: listing.propertyType,
    vibe: listing.vibe,
    maxGuests: listing.maxGuests,
    bedrooms: listing.bedrooms,
    beds: listing.beds,
    bathrooms: listing.bathrooms,
    amenityIds: listing.amenities.map((amenity) => amenity.id),
    images: listing.images.map((image) => ({ url: image.url, publicId: image.publicId ?? "", alt: image.alt })),
    pricePerNight: listing.pricePerNight,
    cleaningFee: listing.cleaningFee,
    weekendPrice: listing.weekendPrice,
    houseRules: listing.houseRules,
    checkInTime: listing.checkInTime,
    checkOutTime: listing.checkOutTime,
  };
  return <div className="workspace-page"><DashboardTitle eyebrow="REFINE YOUR STAY" title="Edit listing" /><HostListingWizard listingId={listing.id} amenities={amenities} initial={initial} /></div>;
}
