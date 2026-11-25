"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import UserMenu from "@/components/user-menu";
import ListingCard from "@/components/listing-card";
import type { ListingWithDetails } from "@/types/listing";

export default function WishlistPage({ listings }: { listings: ListingWithDetails[] }) {
  return (
    <main className="guest-dashboard">
      <header className="guest-dashboard-header"><Link className="explore-brand" href="/"><span>n</span> namma<em>stay</em></Link><UserMenu /></header>
      <section className="guest-dashboard-content">
        <p className="detail-section-kicker">The places you’re saving for later</p>
        <h1>Your <em>wishlist.</em></h1>
        <p className="dashboard-intro">Keep your little daydreams all in one place.</p>
        {listings.length ? (
          <div className="wishlist-listings">
            {listings.map((listing) => <ListingCard key={listing.id} listing={listing} active={false} onHover={() => undefined} saved />)}
          </div>
        ) : (
          <div className="dashboard-empty"><span>♡</span><h2>A few places to dream about.</h2><p>Tap the heart on a stay you love, and it’ll be waiting here.</p><Link href="/explore">Find a stay <ArrowLeft size={14} /></Link></div>
        )}
      </section>
    </main>
  );
}
