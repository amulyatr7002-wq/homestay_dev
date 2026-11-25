import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ListingStatus, Prisma, PropertyType, Vibe } from "@prisma/client";
import { z } from "zod";
import { requireApiRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const photoSchema = z.object({
  url: z.string().url().max(500),
  publicId: z.string().min(1).max(200),
  alt: z.string().max(180).default("Homestay photo"),
});
const draftSchema = z.object({
  title: z.string().max(120).default(""),
  description: z.string().max(6000).default(""),
  city: z.string().max(100).default(""),
  address: z.string().max(240).default(""),
  latitude: z.number().min(-90).max(90).default(12.9716),
  longitude: z.number().min(-180).max(180).default(77.5946),
  propertyType: z.nativeEnum(PropertyType).default("HOMESTAY"),
  vibe: z.nativeEnum(Vibe).default("FOREST"),
  maxGuests: z.number().int().min(1).max(20).default(2),
  bedrooms: z.number().int().min(1).max(30).default(1),
  beds: z.number().int().min(1).max(50).default(1),
  bathrooms: z.number().int().min(1).max(30).default(1),
  amenityIds: z.array(z.string().cuid()).max(50).default([]),
  images: z.array(photoSchema).max(20).default([]),
  pricePerNight: z.number().int().min(1).max(1000000).default(1),
  cleaningFee: z.number().int().min(0).max(500000).default(0),
  weekendPrice: z.number().int().min(0).max(1000000).nullable().default(null),
  houseRules: z.string().max(3000).default(""),
  checkInTime: z.string().regex(/^\d{2}:\d{2}$/).default("15:00"),
  checkOutTime: z.string().regex(/^\d{2}:\d{2}$/).default("11:00"),
});
const requestSchema = z.object({ mode: z.enum(["draft", "submit"]), draft: draftSchema });

function isComplete(data: z.infer<typeof draftSchema>) {
  return data.title.trim().length >= 5
    && data.description.trim().length >= 50
    && data.city.trim().length >= 2
    && data.address.trim().length >= 5
    && data.pricePerNight >= 500
    && data.images.length >= 5;
}

async function saveListing(hostId: string, profile: { displayName: string; bio: string }, data: z.infer<typeof draftSchema>, mode: "draft" | "submit", listingId?: string) {
  const status: ListingStatus = mode === "submit" ? "PENDING_REVIEW" : "DRAFT";
  if (mode === "submit" && !isComplete(data)) {
    return { error: "Complete every required section and add at least five photos before submitting.", status: 400 as const };
  }

  if (mode === "submit") {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (!cloudName || data.images.some((image) => !image.url.startsWith(`https://res.cloudinary.com/${cloudName}/image/upload/`) || !image.publicId.startsWith(`namma-stay/hosts/${hostId}/`))) {
      return { error: "One or more listing photos did not come from your verified Cloudinary upload.", status: 400 as const };
    }
  }

  const normalizedTitle = data.title.trim() || "Untitled stay";
  const slug = `${normalizedTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 72) || "stay"}-${randomUUID().slice(0, 8)}`;
  const destinationSlug = `${data.city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "karnataka"}-${randomUUID().slice(0, 6)}`;
  const listingData = {
    title: normalizedTitle,
    description: data.description.trim(),
    city: data.city.trim(),
    address: data.address.trim(),
    latitude: data.latitude,
    longitude: data.longitude,
    propertyType: data.propertyType,
    vibe: data.vibe,
    maxGuests: data.maxGuests,
    bedrooms: data.bedrooms,
    beds: data.beds,
    bathrooms: data.bathrooms,
    pricePerNight: data.pricePerNight,
    cleaningFee: data.cleaningFee,
    weekendPrice: data.weekendPrice,
    houseRules: data.houseRules,
    checkInTime: data.checkInTime,
    checkOutTime: data.checkOutTime,
    host: { connect: { id: hostId } },
    hostName: profile.displayName,
    hostBio: profile.bio,
    status,
    rejectedReason: null,
    draftData: mode === "draft" ? data as Prisma.InputJsonValue : Prisma.DbNull,
    vibeTags: [],
  };
  if (listingId) {
    const owned = await prisma.listing.findFirst({ where: { id: listingId, hostId }, select: { id: true, status: true } });
    if (!owned) return { error: "Listing not found.", status: 404 as const };
    if (mode === "draft" && (owned.status === "PUBLISHED" || owned.status === "PAUSED")) {
      const listing = await prisma.listing.update({ where: { id: listingId }, data: { draftData: data as Prisma.InputJsonValue } });
      return { listing: { id: listing.id, status: listing.status }, status: 200 as const };
    }
    const listing = await prisma.listing.update({
      where: { id: listingId },
      data: {
        ...listingData,
        status,
        ...(mode === "submit" ? {
          images: {
            deleteMany: {},
            create: data.images.map((image, position) => ({ url: image.url, publicId: image.publicId, alt: image.alt, position, isCover: position === 0 })),
          },
          amenities: { set: data.amenityIds.map((id) => ({ id })) },
        } : {}),
      },
    });
    return { listing: { id: listing.id, status: listing.status }, status: 200 as const };
  }
  const listing = await prisma.listing.create({
    data: {
      ...listingData,
      slug,
      ...(mode === "submit" ? {
        images: {
          create: data.images.map((image, position) => ({ url: image.url, publicId: image.publicId, alt: image.alt, position, isCover: position === 0 })),
        },
        amenities: { connect: data.amenityIds.map((id) => ({ id })) },
      } : {}),
      destination: {
        connectOrCreate: {
          where: { slug: destinationSlug },
          create: {
            name: data.city.trim() || "Karnataka",
            slug: destinationSlug,
            description: `Local stays in ${data.city.trim() || "Karnataka"}.`,
            latitude: data.latitude,
            longitude: data.longitude,
          },
        },
      },
    },
  });
  return { listing: { id: listing.id, status: listing.status }, status: 201 as const };
}

export async function GET() {
  const user = await requireApiRole(["HOST", "ADMIN"]);
  if (!user) return NextResponse.json({ error: "Host access is required." }, { status: 403 });
  const listings = await prisma.listing.findMany({
    where: user.role === "ADMIN" ? {} : { hostId: user.id },
    include: { images: { orderBy: { position: "asc" }, take: 1 }, _count: { select: { bookings: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ listings });
}

export async function POST(request: Request) {
  const user = await requireApiRole(["HOST"]);
  if (!user) return NextResponse.json({ error: "Host access is required." }, { status: 403 });
  const rate = await rateLimit(`host-listing-save:${user.id}`, 30, 60 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many listing changes. Try again later." }, { status: 429 });
  const profile = await prisma.hostProfile.findUnique({ where: { userId: user.id }, select: { displayName: true, bio: true } });
  if (!profile) return NextResponse.json({ error: "Complete your host profile before creating a listing." }, { status: 409 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid listing details." }, { status: 400 }); }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your listing details." }, { status: 400 });
  try {
    const result = await saveListing(user.id, profile, parsed.data.draft, parsed.data.mode);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ listing: result.listing }, { status: result.status });
  } catch (error) {
    console.error("Could not save the host listing:", error);
    return NextResponse.json({ error: "Your listing could not be saved." }, { status: 500 });
  }
}

export { draftSchema, requestSchema, saveListing };
