import { describe, expect, it } from "vitest";
import { calculateCancellationRefund, hasDateConflict } from "../../lib/booking-policy";

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

describe("booking date conflicts", () => {
  it("detects overlapping date ranges but allows adjacent check-in/check-out", () => {
    const active = [{ checkIn: date("2026-07-10"), checkOut: date("2026-07-12") }];
    expect(hasDateConflict({ checkIn: date("2026-07-11"), checkOut: date("2026-07-13") }, active)).toBe(true);
    expect(hasDateConflict({ checkIn: date("2026-07-12"), checkOut: date("2026-07-14") }, active)).toBe(false);
  });
});

describe("cancellation refunds", () => {
  const now = date("2026-06-01");

  it("returns a full refund when check-in is more than seven days away", () => {
    expect(calculateCancellationRefund(10_001, date("2026-06-09"), now)).toEqual({
      refundPercent: 100,
      refundAmountPaise: 10_001,
    });
  });

  it("returns a rounded half refund at the seven-day boundary", () => {
    expect(calculateCancellationRefund(10_001, date("2026-06-08"), now)).toEqual({
      refundPercent: 50,
      refundAmountPaise: 5_001,
    });
  });
});
