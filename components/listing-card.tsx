"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, MapPin, Star } from "lucide-react";
import type { ListingWithDetails } from "@/types/listing";
import WishlistButton from "@/components/wishlist-button";

type Props = {
  listing: ListingWithDetails;
  active: boolean;
  onHover: (slug: string) => void;
  saved?: boolean;
};

export default function ListingCard({ listing, active, onHover, saved = false }: Props) {
  const image = listing.images[0];
  return (
    <motion.article
      id={`listing-${listing.slug}`}
      className={`explore-card${active ? " is-active" : ""}`}
      onMouseEnter={() => onHover(listing.slug)}
      onFocus={() => onHover(listing.slug)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
    >
      <Link href={`/listings/${listing.slug}`} className="explore-card-link" aria-label={`View ${listing.title}`}>
        <motion.div className="explore-card-image" layoutId={`listing-image-${listing.slug}`}>
          {image ? (
            <Image src={image.url} alt={image.alt} fill sizes="(max-width: 760px) 90vw, 40vw" />
          ) : (
            <div className="image-placeholder" aria-hidden="true" />
          )}
          <span className="image-location"><MapPin size={12} /> {listing.city}</span>
          <span className="image-arrow"><ArrowUpRight size={17} /></span>
        </motion.div>
        <div className="explore-card-copy">
          <div className="explore-card-kicker">{listing.destination.name} <span>·</span> {listing.propertyType.replaceAll("_", " ").toLowerCase()}</div>
          <div className="explore-card-title-line">
            <motion.h2 layoutId={`listing-title-${listing.slug}`}>{listing.title}</motion.h2>
            <span className="card-rating"><Star size={13} fill="currentColor" /> {listing.rating.toFixed(2)}</span>
          </div>
          <p className="explore-card-description">{listing.description}</p>
          <div className="explore-card-foot">
            <span>{listing.amenities.slice(0, 2).map((amenity) => amenity.name).join(" · ")}</span>
            <span className="card-price"><strong>₹{listing.pricePerNight.toLocaleString("en-IN")}</strong> / night</span>
          </div>
        </div>
      </Link>
      <WishlistButton listingSlug={listing.slug} initialSaved={saved} className="explore-card-heart" />
    </motion.article>
  );
}
