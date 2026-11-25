import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const rangeSchema = z.object({
  listingId: z.string().cuid(),
  from: z.string().date(),
  to: z.string().date(),
});
const querySchema = rangeSchema.refine((value) => value.from <= value.to, "End date must be on or after start date.");
const updateSchema = rangeSchema.extend({
  action: z.enum(["block", "unblock", "price"]),
  pricePerNight: z.number().int().min(500).max(1000000).optional(),
}).refine((value) => value.from <= value.to, "End date must be on or after start date.")
  .refine((value) => value.action !== "price" || value.pricePerNight !== undefined, "Enter a custom nightly price.");

export async function GET(request: Request) {
  const user = await requireApiRole(["HOST"]);
  if (!user) return NextResponse.json({ error: "Host access is required." }, { status: 403 });
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Provide a valid listing and calendar range." }, { status: 400 });
  const listing = await prisma.listing.findFirst({ where: { id: parsed.data.listingId, hostId: user.id }, select: { id: true } });
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  const from = new Date(`${parsed.data.from}T00:00:00.000Z`);
  const to = new Date(`${parsed.data.to}T00:00:00.000Z`);
  const [bookings, overrides] = await Promise.all([
    prisma.booking.findMany({
      where: {
        listingId: listing.id,
        checkIn: { lte: to },
        checkOut: { gte: from },
        OR: [{ status: "CONFIRMED" }, { status: "PENDING", expiresAt: { gt: new Date() } }],
      },
      select: { reference: true, checkIn: true, checkOut: true, status: true },
    }),
    prisma.listingCalendarDate.findMany({ where: { listingId: listing.id, date: { gte: from, lte: to } }, orderBy: { date: "asc" } }),
  ]);
  return NextResponse.json({ bookings, overrides });
}

export async function POST(request: Request) {
  const user = await requireApiRole(["HOST"]);
  if (!user) return NextResponse.json({ error: "Host access is required." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid calendar update." }, { status: 400 }); }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the selected dates." }, { status: 400 });
  const from = new Date(`${parsed.data.from}T00:00:00.000Z`);
  const to = new Date(`${parsed.data.to}T00:00:00.000Z`);
  if ((to.getTime() - from.getTime()) / 86400000 > 365) return NextResponse.json({ error: "Choose a range no longer than one year." }, { status: 400 });
  const listing = await prisma.listing.findFirst({ where: { id: parsed.data.listingId, hostId: user.id }, select: { id: true } });
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  if (parsed.data.action === "block") {
    const booked = await prisma.booking.findFirst({
      where: {
        listingId: listing.id,
        checkIn: { lte: to },
        checkOut: { gt: from },
        OR: [{ status: "CONFIRMED" }, { status: "PENDING", expiresAt: { gt: new Date() } }],
      },
      select: { id: true },
    });
    if (booked) return NextResponse.json({ error: "Those dates include an active booking and cannot be blocked." }, { status: 409 });
  }
  const dates: Date[] = [];
  for (const date = new Date(from); date <= to; date.setUTCDate(date.getUTCDate() + 1)) dates.push(new Date(date));
  if (parsed.data.action === "unblock") {
    await prisma.listingCalendarDate.deleteMany({ where: { listingId: listing.id, date: { gte: from, lte: to }, isBlocked: true } });
  } else {
    await prisma.$transaction(dates.map((date) => prisma.listingCalendarDate.upsert({
      where: { listingId_date: { listingId: listing.id, date } },
      create: {
        listingId: listing.id,
        date,
        isBlocked: parsed.data.action === "block",
        pricePerNight: parsed.data.action === "price" ? parsed.data.pricePerNight : null,
      },
      update: parsed.data.action === "block"
        ? { isBlocked: true }
        : { pricePerNight: parsed.data.pricePerNight },
    })));
  }
  return NextResponse.json({ updated: true });
}
