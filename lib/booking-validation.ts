import { z } from "zod";

export const bookingSchema = z.object({
  listingSlug: z.string().min(1).max(120),
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  guests: z.number().int().min(1).max(12),
}).refine((value) => value.checkIn < value.checkOut, {
  message: "Check-out must be after check-in.",
  path: ["checkOut"],
});

export const cancelBookingSchema = z.object({ bookingId: z.string().cuid() });
