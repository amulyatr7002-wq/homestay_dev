import { describe, expect, it } from "vitest";
import { calculateBookingPrice, calculateBookingPriceFromSubtotal, nightsBetween } from "../../lib/booking-pricing";

describe("booking pricing", () => {
  it("calculates a complete fee breakdown from the subtotal", () => {
    expect(calculateBookingPriceFromSubtotal(10_000, 800)).toEqual({
      subtotal: 10_000,
      cleaningFee: 800,
      serviceFee: 800,
      taxes: 580,
      totalPrice: 12_180,
    });
  });

  it("supports the standard per-night calculation", () => {
    expect(calculateBookingPrice(2500, 3).subtotal).toBe(7500);
  });

  it("calculates UTC night counts across month boundaries", () => {
    expect(nightsBetween(new Date("2026-03-31T00:00:00Z"), new Date("2026-04-02T00:00:00Z"))).toBe(2);
  });
});
