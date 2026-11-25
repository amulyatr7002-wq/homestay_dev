import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientAddress, rateLimit } from "@/lib/rate-limit";

const reviewSchema = z.object({
  bookingId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(10).max(2000),
});

export async function POST(request: Request) {
  const rate = await rateLimit(`review:${clientAddress(request.headers)}`, 10, 60 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many review attempts." }, { status: 429 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please send a valid review." }, { status: 400 });
  }
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your review." }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const today = new Date();
      const completedBefore = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      await transaction.booking.updateMany({
        where: { id: parsed.data.bookingId, userId: session.user.id, status: "CONFIRMED", checkOut: { lte: completedBefore } },
        data: { status: "COMPLETED" },
      });
      const booking = await transaction.booking.findFirst({
        where: { id: parsed.data.bookingId, userId: session.user.id, status: "COMPLETED", checkOut: { lte: completedBefore } },
        select: { id: true, listingId: true },
      });
      if (!booking) return null;

      const listing = await transaction.listing.findUniqueOrThrow({
        where: { id: booking.listingId },
        select: { rating: true, reviewCount: true },
      });
      const review = await transaction.review.create({
        data: {
          bookingId: booking.id,
          listingId: booking.listingId,
          userId: session.user.id,
          rating: parsed.data.rating,
          comment: parsed.data.comment,
        },
        select: { id: true, rating: true, comment: true },
      });
      const reviewCount = listing.reviewCount + 1;
      await transaction.listing.update({
        where: { id: booking.listingId },
        data: {
          reviewCount,
          rating: (listing.rating * listing.reviewCount + review.rating) / reviewCount,
        },
      });
      return review;
    });
    if (!result) return NextResponse.json({ error: "Only completed stays can be reviewed." }, { status: 403 });
    return NextResponse.json({ review: result }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "You’ve already reviewed this stay." }, { status: 409 });
    }
    console.error("Could not save the verified-stay review:", error);
    return NextResponse.json({ error: "Your review could not be saved right now." }, { status: 500 });
  }
}
