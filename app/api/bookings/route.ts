import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { BookingStatus, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { calculateBookingPriceFromSubtotal, nightsBetween } from "@/lib/booking-pricing";
import { hasDateConflict } from "@/lib/booking-policy";
import { bookingSchema } from "@/lib/booking-validation";
import { prisma } from "@/lib/prisma";
import { clientAddress, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rate = await rateLimit(`booking:${clientAddress(request.headers)}`, 8, 60 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many booking attempts. Please wait before trying again." }, {
      status: 429,
      headers: { "Retry-After": String(rate.retryAfterSeconds) },
    });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in to reserve a stay." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please send valid booking details." }, { status: 400 });
  }
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your booking dates and guests." }, { status: 400 });
  }

  const checkIn = new Date(`${parsed.data.checkIn}T00:00:00.000Z`);
  const checkOut = new Date(`${parsed.data.checkOut}T00:00:00.000Z`);
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const nights = nightsBetween(checkIn, checkOut);
  if (checkIn < today || nights < 1 || nights > 30) {
    return NextResponse.json({ error: "Choose a future stay of 1 to 30 nights." }, { status: 400 });
  }

  try {
    const outcome = await prisma.$transaction(async (transaction) => {
      const listing = await transaction.listing.findUnique({
        where: { slug: parsed.data.listingSlug },
        select: { id: true, title: true, status: true, hostId: true, pricePerNight: true, weekendPrice: true, cleaningFee: true, maxGuests: true },
      });
      if (!listing) return { error: "Stay not found.", status: 404 as const };
      if (listing.status !== "PUBLISHED") return { error: "This stay is not currently accepting bookings.", status: 409 as const };
      if (parsed.data.guests > listing.maxGuests) {
        return { error: `This stay welcomes up to ${listing.maxGuests} guests.`, status: 400 as const };
      }

      await transaction.booking.updateMany({
        where: { listingId: listing.id, status: BookingStatus.PENDING, expiresAt: { lte: now } },
        data: { status: BookingStatus.CANCELLED },
      });

      const activeBookings = await transaction.booking.findMany({
        where: {
          listingId: listing.id,
          checkIn: { lt: checkOut },
          checkOut: { gt: checkIn },
          OR: [
            { status: BookingStatus.CONFIRMED },
            { status: BookingStatus.PENDING, expiresAt: { gt: now } },
          ],
        },
          take: 1,
        select: { checkIn: true, checkOut: true },
      });
      if (hasDateConflict({ checkIn, checkOut }, activeBookings)) {
        return { error: "Those dates were just booked. Please choose another range.", status: 409 as const };
      }

      const overrides = await transaction.listingCalendarDate.findMany({
        where: { listingId: listing.id, date: { gte: checkIn, lt: checkOut } },
        select: { date: true, isBlocked: true, pricePerNight: true },
      });
      if (overrides.some((date) => date.isBlocked)) {
        return { error: "Some of those dates are blocked by the host. Please choose another range.", status: 409 as const };
      }
      const overridesByDate = new Map(overrides.map((date) => [date.date.toISOString().slice(0, 10), date]));
      let subtotal = 0;
      for (const date = new Date(checkIn); date < checkOut; date.setUTCDate(date.getUTCDate() + 1)) {
        const key = date.toISOString().slice(0, 10);
        const override = overridesByDate.get(key);
        const weekendRate = [5, 6].includes(date.getUTCDay()) ? listing.weekendPrice : null;
        subtotal += override?.pricePerNight ?? weekendRate ?? listing.pricePerNight;
      }
      const cleaningFee = listing.hostId ? listing.cleaningFee : 800;
      const price = calculateBookingPriceFromSubtotal(subtotal, cleaningFee);
      const booking = await transaction.booking.create({
        data: {
          reference: randomBytes(5).toString("hex").toUpperCase(),
          userId: session.user.id,
          listingId: listing.id,
          checkIn,
          checkOut,
          guests: parsed.data.guests,
          nights,
          pricePerNight: Math.round(subtotal / nights),
          nightlySubtotal: subtotal,
          cleaningFee: price.cleaningFee,
          serviceFee: price.serviceFee,
          taxes: price.taxes,
          totalPrice: price.totalPrice,
          expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
        },
        select: { id: true, reference: true, totalPrice: true, expiresAt: true },
      });
      return { booking, listingTitle: listing.title };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if ("error" in outcome) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    }
    return NextResponse.json({ booking: outcome.booking, listingTitle: outcome.listingTitle }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "Another guest is reserving those dates. Please choose again." }, { status: 409 });
    }
    console.error("Could not create the booking:", error);
    return NextResponse.json({ error: "Your stay could not be reserved right now. Please try again." }, { status: 500 });
  }
}
