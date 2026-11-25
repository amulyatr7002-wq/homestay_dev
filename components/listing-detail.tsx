"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { ArrowLeft, ArrowUpRight, BadgeCheck, LoaderCircle, MapPin, ShieldCheck, Star } from "lucide-react";
import BookingWidget from "@/components/booking-widget";
import ListingGallery from "@/components/listing-gallery";
import UserMenu from "@/components/user-menu";
import WishlistButton from "@/components/wishlist-button";
import type { ListingWithDetails } from "@/types/listing";

const noMapSelection = () => undefined;
const ExploreMap = dynamic(() => import("@/components/explore-map"), {
  ssr: false,
  loading: () => <div className="map-loading">Preparing the map…</div>,
});

export default function ListingDetail({ listing, saved }: { listing: ListingWithDetails; saved: boolean }) {
  const [reviewSummary, setReviewSummary] = useState<{ pros: string[]; cons: string[]; bestFor: string[] } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  useEffect(() => {
    if (listing.reviewCount < 3) return;
    let active = true;
    setSummaryLoading(true);
    void fetch("/api/ai/review-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: listing.id }),
    }).then(async (response) => {
      const result = await response.json() as { summary?: { pros: string[]; cons: string[]; bestFor: string[] } | null; error?: string };
      if (!response.ok) throw new Error(result.error || "Review summary is unavailable.");
      if (active) setReviewSummary(result.summary ?? null);
    }).catch((error: unknown) => {
      if (active) setSummaryError(error instanceof Error ? error.message : "Review summary is unavailable.");
    }).finally(() => { if (active) setSummaryLoading(false); });
    return () => { active = false; };
  }, [listing.id, listing.reviewCount]);

  return (
    <motion.main className="listing-detail-page" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
      <header className="detail-header">
        <Link className="explore-brand" href="/"><span>n</span> namma<em>stay</em></Link>
        <div className="explore-header-actions"><UserMenu /><Link className="detail-back" href="/explore"><ArrowLeft size={15} /> Back to stays</Link></div>
      </header>
      <div className="detail-container">
        <div className="detail-breadcrumb"><Link href="/explore">Explore</Link><span>/</span><Link href={`/explore?destination=${encodeURIComponent(listing.destination.name)}`}>{listing.destination.name}</Link><span>/</span><span>{listing.city}</span></div>
        <div className="detail-title">
          <div>
            <p className="detail-kicker">{listing.destination.name} <span>·</span> {listing.propertyType.replaceAll("_", " ").toLowerCase()}</p>
            <motion.h1 layoutId={`listing-title-${listing.slug}`}>{listing.title}</motion.h1>
            <p className="detail-location"><MapPin size={14} /> {listing.address}, {listing.city}</p>
          </div>
          <div className="detail-title-actions">
            <div className="detail-rating"><Star size={15} fill="currentColor" /><strong>{listing.rating.toFixed(2)}</strong><span>· {listing.reviewCount} thoughtful reviews</span></div>
            <WishlistButton listingSlug={listing.slug} initialSaved={saved} className="detail-wishlist" />
          </div>
        </div>
        <ListingGallery slug={listing.slug} images={listing.images} />
        {listing.reviewCount >= 3 && <section className="ai-review-summary">
          <div className="ai-review-summary-heading"><span className="detail-section-kicker">AI-GENERATED REVIEW SUMMARY</span><strong>From {listing.reviewCount} guest reviews</strong></div>
          {summaryLoading && <p className="ai-summary-loading"><LoaderCircle size={15} className="spin" /> Gathering the themes…</p>}
          {summaryError && <p className="ai-summary-error" role="status">{summaryError}</p>}
          {reviewSummary && <div className="ai-review-summary-grid">
            {reviewSummary.pros.length > 0 && <div><h3>Guests appreciate</h3><ul>{reviewSummary.pros.map((item) => <li key={item}>{item}</li>)}</ul></div>}
            {reviewSummary.cons.length > 0 && <div><h3>Worth knowing</h3><ul>{reviewSummary.cons.map((item) => <li key={item}>{item}</li>)}</ul></div>}
            {reviewSummary.bestFor.length > 0 && <div><h3>Best for</h3><p>{reviewSummary.bestFor.map((item) => <span key={item}>{item}</span>)}</p></div>}
          </div>}
        </section>}

        <div className="detail-body">
          <article className="detail-story">
            <section className="stay-intro">
              <div><h2>A stay hosted by {listing.hostName}</h2><p>Up to {listing.maxGuests} guests <span>·</span> {listing.propertyType.replaceAll("_", " ").toLowerCase()}</p></div>
              <span className="host-avatar">{listing.hostName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
            </section>
            <div className="story-divider" />
            <p className="listing-description">{listing.description}</p>
            <section className="host-story">
              <div className="host-story-icon"><BadgeCheck size={19} /></div>
              <div><h3>Meet your host, {listing.hostName}</h3><p>{listing.hostBio}</p><span className="host-trust"><ShieldCheck size={13} /> Local host · Here to help</span></div>
            </section>
            <div className="story-divider" />
            <section className="amenities-section">
              <p className="detail-section-kicker">The thoughtful details</p>
              <h2>What makes it feel like home</h2>
              <div className="amenity-list">
                {listing.amenities.map((amenity, index) => <span className="amenity-detail" key={amenity.id}><span>{["✳", "⌂", "◌", "↟"][index % 4]}</span>{amenity.name}</span>)}
              </div>
            </section>
            <div className="story-divider" />
            <section className="location-section">
              <p className="detail-section-kicker">A little sense of place</p>
              <h2>Find us in {listing.city}</h2>
              <p className="location-address"><MapPin size={14} /> {listing.address}, Karnataka</p>
              <div className="detail-map">
                <ExploreMap listings={[listing]} activeId={listing.slug} onSelect={noMapSelection} />
              </div>
              <p className="location-note">The exact address is shared with confirmed guests.</p>
            </section>
          </article>
          <div className="booking-column">
            <BookingWidget listingSlug={listing.slug} price={listing.pricePerNight} weekendPrice={listing.weekendPrice} cleaningFee={listing.hostId ? listing.cleaningFee : 800} maxGuests={listing.maxGuests} />
            <div className="booking-trust"><ShieldCheck size={15} /><span>Thoughtful stays, hosted locally.<br /><Link href="/explore">Explore more places <ArrowUpRight size={12} /></Link></span></div>
          </div>
        </div>
        <div className="detail-bottom-cta">
          {listing.images[0] ? <Image src={listing.images[0].url} alt="" width={60} height={48} /> : <span className="detail-cta-placeholder" />}
          <span>Somewhere lovely is waiting.</span><Link href="/explore">Find another stay <ArrowLeft size={14} /></Link>
        </div>
      </div>
    </motion.main>
  );
}
