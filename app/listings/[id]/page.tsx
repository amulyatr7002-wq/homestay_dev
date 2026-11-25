import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import ListingDetail from "@/components/listing-detail";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteProps = { params: { id: string } };

const listingInclude = {
  images: { orderBy: { position: "asc" as const } },
  amenities: { orderBy: { name: "asc" as const } },
  destination: { select: { name: true, slug: true } },
};

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  try {
    const listing = await prisma.listing.findFirst({
      where: { status: "PUBLISHED", OR: [{ id: params.id }, { slug: params.id }] },
      select: { title: true, description: true, city: true, images: { orderBy: { position: "asc" }, take: 1, select: { url: true } } },
    });
    if (!listing) return { title: "Stay not found | Namma Stay" };
    const description = listing.description.slice(0, 155);
    return {
      title: `${listing.title} in ${listing.city} | Namma Stay`,
      description,
      alternates: { canonical: `/listings/${encodeURIComponent(params.id)}` },
      openGraph: {
        title: listing.title,
        description,
        type: "website",
        images: listing.images[0] ? [{ url: listing.images[0].url, alt: listing.title }] : undefined,
      },
    };
  } catch (error) {
    console.error("Listing metadata could not be loaded:", error);
    return { title: "Locally hosted stays | Namma Stay" };
  }
}

export default async function ListingRoute({ params }: RouteProps) {
  let listing;
  try {
    listing = await prisma.listing.findFirst({
      where: { status: "PUBLISHED", OR: [{ id: params.id }, { slug: params.id }] },
      include: listingInclude,
    });
  } catch (error) {
    console.error("Listing detail could not be loaded from PostgreSQL:", error);
    return (
      <main className="database-page-error">
        <span className="detail-section-kicker">A little hiccup</span>
        <h1>This stay is taking a moment.</h1>
        <p>Make sure PostgreSQL is running, then apply the migration and seed the sample stays.</p>
        <a href="/explore">Back to explore</a>
      </main>
    );
  }
  if (!listing) notFound();
  await prisma.listing.update({ where: { id: listing.id }, data: { views: { increment: 1 } } });
  let saved = false;
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      saved = Boolean(await prisma.wishlist.findUnique({
        where: { userId_listingId: { userId: session.user.id, listingId: listing.id } },
        select: { id: true },
      }));
    }
  } catch (error) {
    console.error("Could not load the guest wishlist state:", error);
  }
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: listing.title,
    description: listing.description,
    url: new URL(`/listings/${encodeURIComponent(listing.slug)}`, process.env.NEXTAUTH_URL || "http://localhost:3000").toString(),
    image: listing.images.map((image) => image.url),
    address: {
      "@type": "PostalAddress",
      streetAddress: listing.address,
      addressLocality: listing.city,
      addressRegion: "Karnataka",
      addressCountry: "IN",
    },
    geo: { "@type": "GeoCoordinates", latitude: listing.latitude, longitude: listing.longitude },
    priceRange: `₹${listing.pricePerNight} per night`,
    ...(listing.reviewCount > 0 ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: listing.rating,
        reviewCount: listing.reviewCount,
      },
    } : {}),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <ListingDetail listing={listing} saved={saved} />
    </>
  );
}
