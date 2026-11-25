import { describe, expect, it } from "vitest";
import { bookingSchema, cancelBookingSchema } from "../../lib/booking-validation";
import { listingSearchSchema } from "../../lib/listing-search";

describe("request validation schemas", () => {
  it("accepts a valid booking and rejects reversed dates and excess guests", () => {
    expect(bookingSchema.safeParse({
      listingSlug: "coorg-cabin",
      checkIn: "2026-07-01",
      checkOut: "2026-07-03",
      guests: 2,
    }).success).toBe(true);
    expect(bookingSchema.safeParse({
      listingSlug: "coorg-cabin",
      checkIn: "2026-07-03",
      checkOut: "2026-07-01",
      guests: 2,
    }).success).toBe(false);
    expect(bookingSchema.safeParse({
      listingSlug: "coorg-cabin",
      checkIn: "2026-07-01",
      checkOut: "2026-07-03",
      guests: 13,
    }).success).toBe(false);
  });

  it("validates cancellation identifiers and search filter bounds", () => {
    expect(cancelBookingSchema.safeParse({ bookingId: "not-a-cuid" }).success).toBe(false);
    expect(listingSearchSchema.safeParse({ checkIn: "2026-07-04", checkOut: "2026-07-03" }).success).toBe(false);
    expect(listingSearchSchema.safeParse({ minPrice: "500", maxPrice: "3000" }).success).toBe(true);
  });
});
