"use client";

import { SlidersHorizontal } from "lucide-react";
import type { ListingSearchFilters } from "@/lib/listing-search";

const propertyTypes = [
  ["HOMESTAY", "Homestay"],
  ["COTTAGE", "Cottage"],
  ["CABIN", "Cabin"],
  ["FARM_STAY", "Farm stay"],
  ["VILLA", "Villa"],
  ["HERITAGE_HOME", "Heritage home"],
];
const vibes = [
  ["MOUNTAINS", "Mountains"],
  ["BEACH", "Beach"],
  ["HERITAGE", "Heritage"],
  ["FARM", "Farm"],
  ["FOREST", "Forest"],
];
const amenities = [
  ["breakfast-included", "Breakfast included"],
  ["coffee-plantation-walk", "Coffee plantation walk"],
  ["private-balcony", "Private balcony"],
  ["bonfire", "Bonfire"],
  ["pet-friendly", "Pet friendly"],
  ["wi-fi", "Wi-Fi"],
  ["home-cooked-meals", "Home-cooked meals"],
  ["river-view", "River view"],
  ["beach-access", "Beach access"],
  ["garden", "Garden"],
  ["guided-nature-walk", "Guided nature walk"],
  ["heritage-architecture", "Heritage architecture"],
  ["farm-experience", "Farm experience"],
  ["mountain-view", "Mountain view"],
  ["free-parking", "Free parking"],
];

export default function ExploreFilters({ filters }: { filters: ListingSearchFilters }) {
  return (
    <form className="explore-filters" action="/explore" method="get">
      <input type="hidden" name="destination" value={filters.destination ?? ""} />
      <input type="hidden" name="checkOut" value={filters.checkOut ?? ""} />
      <input type="hidden" name="keyword" value={filters.keyword ?? ""} />
      <div className="filter-heading"><SlidersHorizontal size={15} /><span>Find your fit</span></div>
      <div className="filter-row">
        <label className="filter-control">
          <span>Check-in</span>
          <input type="date" name="checkIn" defaultValue={filters.checkIn} />
        </label>
        <label className="filter-control">
          <span>Guests</span>
          <select name="guests" defaultValue={filters.guests ?? ""}>
            <option value="">Any number</option>
            {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((guest) => <option key={guest} value={guest}>{guest} guests</option>)}
          </select>
        </label>
        <label className="filter-control">
          <span>Home type</span>
          <select name="propertyType" defaultValue={filters.propertyType ?? ""}>
            <option value="">All stays</option>
            {propertyTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="filter-control">
          <span>Vibe</span>
          <select name="vibe" defaultValue={filters.vibe ?? ""}>
            <option value="">All moods</option>
            {vibes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="filter-control price-input">
          <span>Min ₹ / night</span>
          <input type="number" min="0" max="100000" name="minPrice" placeholder="Any" defaultValue={filters.minPrice ?? ""} />
        </label>
        <label className="filter-control price-input">
          <span>Max ₹ / night</span>
          <input type="number" min="0" max="100000" name="maxPrice" placeholder="Any" defaultValue={filters.maxPrice ?? ""} />
        </label>
        <label className="filter-control">
          <span>Guest rating</span>
          <select name="rating" defaultValue={filters.rating ?? ""}>
            <option value="">Any rating</option>
            <option value="4">4.0+</option>
            <option value="4.5">4.5+</option>
            <option value="4.8">4.8+</option>
          </select>
        </label>
        <details className="amenity-filter">
          <summary>Amenities{filters.amenities?.length ? ` · ${filters.amenities.length}` : ""}</summary>
          <div className="amenity-options">
            {amenities.map(([slug, name]) => (
              <label key={slug}>
                <input type="checkbox" name="amenities" value={slug} defaultChecked={filters.amenities?.includes(slug)} />
                <span>{name}</span>
              </label>
            ))}
          </div>
        </details>
        <button className="filter-apply" type="submit">Show stays</button>
        <a className="filter-reset" href="/explore">Clear filters</a>
      </div>
    </form>
  );
}
