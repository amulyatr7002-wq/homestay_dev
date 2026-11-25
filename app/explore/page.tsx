import { Suspense } from "react";
import { getServerSession } from "next-auth";
import ExplorePage from "@/components/explore-page";
import { authOptions } from "@/lib/auth";
import { parseListingSearchParams, searchListings } from "@/lib/listing-search";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ExploreRoute({ searchParams }: { searchParams: SearchParams }) {
  const { filters, invalid } = parseListingSearchParams(searchParams);
  let listings: Awaited<ReturnType<typeof searchListings>> = [];
  let unavailable = false;
  let savedSlugs: string[] = [];
  try {
    listings = await searchListings(filters);
  } catch (error) {
    console.error("Explore listings could not be loaded from PostgreSQL:", error);
    unavailable = true;
  }
  if (listings.length) {
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        const saved = await prisma.wishlist.findMany({
          where: { userId: session.user.id, listingId: { in: listings.map((listing) => listing.id) } },
          select: { listing: { select: { slug: true } } },
        });
        savedSlugs = saved.map((item) => item.listing.slug);
      }
    } catch (error) {
      console.error("Could not load the guest wishlist state:", error);
    }
  }

  return (
    <Suspense fallback={<div className="map-loading">Gathering your stays…</div>}>
      <ExplorePage listings={listings} filters={filters} invalidQuery={invalid} unavailable={unavailable} savedSlugs={savedSlugs}
        aiQuery={typeof searchParams.aiQuery === "string" ? searchParams.aiQuery : null}
        aiInterpreted={searchParams.ai === "1"} />
    </Suspense>
  );
}
