"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import ListingCard from "@/components/listing-card";
import UserMenu from "@/components/user-menu";
import ExploreFilters from "@/components/explore-filters";
import type { ListingSearchFilters } from "@/lib/listing-search";
import type { ListingWithDetails } from "@/types/listing";
import NaturalSearch from "@/components/natural-search";

const ExploreMap = dynamic(() => import("@/components/explore-map"), {
  ssr: false,
  loading: () => <div className="map-loading">Preparing the map…</div>,
});

type Props = {
  listings: ListingWithDetails[];
  filters: ListingSearchFilters;
  invalidQuery: boolean;
  unavailable: boolean;
  savedSlugs: string[];
  aiQuery: string | null;
  aiInterpreted: boolean;
};

export default function ExplorePage({ listings, filters, invalidQuery, unavailable, savedSlugs, aiQuery, aiInterpreted }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const router = useRouter();
  const selectFromMap = useCallback((slug: string) => {
    setActiveId(slug);
    document.getElementById(`listing-${slug}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const destinationLabel = filters.destination ? ` near ${filters.destination}` : " across Karnataka";
  return (
    <main className="explore-page">
      <header className="explore-header">
        <Link className="explore-brand" href="/"><span>n</span> namma<em>stay</em></Link>
        <div className="explore-breadcrumb"><MapPin size={14} /> A little closer to local</div>
        <div className="explore-header-actions"><UserMenu /><Link className="explore-back" href="/"><ArrowLeft size={15} /> Back home</Link></div>
      </header>
      <section className="explore-titlebar">
        <div>
          <p className="eyebrow dark-eyebrow"><span className="eyebrow-line" /> A place that feels like yours</p>
          <h1>Find your <em>somewhere.</em></h1>
          <p className="explore-subtitle">{unavailable ? "Stays are taking a short breather. Check your database setup." : `${listings.length} locally loved ${listings.length === 1 ? "stay" : "stays"}${destinationLabel}${filters.checkIn ? ` · check-in ${filters.checkIn}` : ""}`}</p>
        </div>
        <div className="explore-region-stamp"><span>KARNATAKA</span><small>INDIA · 12°58′N</small></div>
      </section>
      <div className="explore-ai-search"><NaturalSearch className="explore-natural-search" placeholder="Describe the stay you’re dreaming of…" /></div>
      {aiInterpreted && <section className="ai-filter-chips" aria-label="AI-interpreted search filters">
        <p>AI-generated filters{aiQuery ? <> for “{aiQuery}”</> : ""}</p>
        {[
          ["destination", filters.destination ? `Location: ${filters.destination}` : null],
          ["checkIn", filters.checkIn ? `Check-in: ${filters.checkIn}` : null],
          ["checkOut", filters.checkOut ? `Check-out: ${filters.checkOut}` : null],
          ["guests", filters.guests ? `${filters.guests} guests` : null],
          ["minPrice", filters.minPrice !== undefined ? `From ₹${filters.minPrice}` : null],
          ["maxPrice", filters.maxPrice !== undefined ? `Up to ₹${filters.maxPrice}` : null],
          ["vibe", filters.vibe ? `Vibe: ${filters.vibe.toLowerCase()}` : null],
          ["amenities", filters.amenities?.length ? `Amenities: ${filters.amenities.join(", ")}` : null],
          ["keyword", filters.keyword ? `Keywords: ${filters.keyword}` : null],
        ].filter((entry): entry is [string, string] => Boolean(entry[1])).map(([key, label]) => <button type="button" key={key} onClick={() => {
          const params = new URLSearchParams(window.location.search);
          params.delete(key);
          router.push(`/explore${params.size ? `?${params.toString()}` : ""}`);
        }}>{label}<span aria-hidden="true"> ×</span></button>)}
      </section>}
      <ExploreFilters filters={filters} />
      {invalidQuery && <p className="query-warning" role="status">Some filter values were invalid. Showing all stays instead.</p>}
      {unavailable && <p className="database-warning" role="alert">Could not load stays from PostgreSQL. Set DATABASE_URL, run the migration, then seed the sample listings.</p>}
      <section className="explore-layout" aria-label="Homestay search results and map">
        <div className="explore-results" aria-label="Homestay listings">
          {listings.length ? listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} active={activeId === listing.slug} onHover={setActiveId} saved={savedSlugs.includes(listing.slug)} />
          )) : (
            <div className="no-results">
              <span>Nothing just yet</span>
              <h2>This little corner is still a secret.</h2>
              <p>Try easing one of your filters, or explore all the stays we have.</p>
              <Link href="/explore">Show all stays <ArrowLeft size={15} /></Link>
            </div>
          )}
        </div>
        <aside className="explore-map-panel" aria-label="Map of homestays">
          <ExploreMap listings={listings} activeId={activeId} onSelect={selectFromMap} />
        </aside>
      </section>
    </main>
  );
}
