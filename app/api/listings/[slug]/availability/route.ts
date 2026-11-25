import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientAddress, rateLimit } from "@/lib/rate-limit";

const querySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
}).refine((value) => value.from < value.to, "End date must be after start date.");

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const rate = await rateLimit(`availability:${clientAddress(request.headers)}`, 120, 60 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many calendar requests. Try again later." }, { status: 429 });
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Provide a valid availability date range." }, { status: 400 });
  }
  const requestedDays = (Date.parse(`${parsed.data.to}T00:00:00Z`) - Date.parse(`${parsed.data.from}T00:00:00Z`)) / 86_400_000;
  if (requestedDays < 1 || requestedDays > 450) {
    return NextResponse.json({ error: "Choose an availability range of up to 450 days." }, { status: 400 });
  }

  try {
    const listing = await prisma.listing.findFirst({
      where: { slug: params.slug, status: "PUBLISHED" },
      select: { id: true, pricePerNight: true, weekendPrice: true },
    });
    if (!listing) return NextResponse.json({ error: "Stay not found." }, { status: 404 });

    const from = new Date(`${parsed.data.from}T00:00:00.000Z`);
    const to = new Date(`${parsed.data.to}T00:00:00.000Z`);
    const [bookings, overrides] = await Promise.all([prisma.booking.findMany({
      where: {
        listingId: listing.id,
        checkIn: { lt: to },
        checkOut: { gt: from },
        OR: [
          { status: "CONFIRMED" },
          { status: "PENDING", expiresAt: { gt: new Date() } },
        ],
      },
      select: { checkIn: true, checkOut: true },
    }), prisma.listingCalendarDate.findMany({
      where: { listingId: listing.id, date: { gte: from, lt: to } },
      select: { date: true, isBlocked: true, pricePerNight: true },
    })]);

    const bookedDates = new Set<string>();
    for (const booking of bookings) {
      const current = new Date(Math.max(booking.checkIn.getTime(), from.getTime()));
      const checkout = new Date(Math.min(booking.checkOut.getTime(), to.getTime()));
      for (; current < checkout; current.setUTCDate(current.getUTCDate() + 1)) {
        bookedDates.add(current.toISOString().slice(0, 10));
      }
    }
    const nightlyPrices: Record<string, number> = {};
    for (const date = new Date(from); date < to; date.setUTCDate(date.getUTCDate() + 1)) {
      const key = date.toISOString().slice(0, 10);
      const override = overrides.find((item) => item.date.toISOString().slice(0, 10) === key);
      if (override?.isBlocked) bookedDates.add(key);
      const weekendRate = [5, 6].includes(date.getUTCDay()) ? listing.weekendPrice : null;
      nightlyPrices[key] = override?.pricePerNight ?? weekendRate ?? listing.pricePerNight;
    }

    return NextResponse.json({ bookedDates: [...bookedDates], nightlyPrices }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Could not retrieve listing availability:", error);
    return NextResponse.json({ error: "Availability is temporarily unavailable." }, { status: 503 });
  }
}
