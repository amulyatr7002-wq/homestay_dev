import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const propertyTypes = ["HOMESTAY", "COTTAGE", "CABIN", "FARM_STAY", "VILLA", "HERITAGE_HOME"] as const;
const vibes = ["MOUNTAINS", "BEACH", "HERITAGE", "FARM", "FOREST"] as const;

export const listingSearchSchema = z.object({
  destination: z.string().trim().max(80).optional(),
  keyword: z.string().trim().max(100).optional(),
  checkIn: z.string().date().optional(),
  checkOut: z.string().date().optional(),
  guests: z.coerce.number().int().min(1).max(12).optional(),
  minPrice: z.coerce.number().int().min(0).max(100000).optional(),
  maxPrice: z.coerce.number().int().min(0).max(100000).optional(),
  propertyType: z.enum(propertyTypes).optional(),
  amenities: z.preprocess(
    (value) => typeof value === "string" ? value.split(",").filter(Boolean) : value,
    z.array(z.string().min(1).max(40)).max(15).optional(),
  ),
  rating: z.coerce.number().min(3).max(5).optional(),
  vibe: z.enum(vibes).optional(),
})
  .refine(
    (filters) => filters.minPrice === undefined || filters.maxPrice === undefined || filters.minPrice <= filters.maxPrice,
    { message: "Minimum price must not exceed maximum price.", path: ["minPrice"] },
  )
  .refine(
    (filters) => filters.checkIn === undefined || filters.checkOut === undefined || filters.checkIn < filters.checkOut,
    { message: "Check-out must be after check-in.", path: ["checkOut"] },
  );

export type ListingSearchFilters = z.infer<typeof listingSearchSchema>;

export function parseListingSearchParams(params: Record<string, string | string[] | undefined>) {
  const singleValues = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      (Array.isArray(value) ? key === "amenities" ? value.join(",") : value[0] : value) || undefined,
    ]),
  );
  const parsed = listingSearchSchema.safeParse(singleValues);
  return parsed.success
    ? { filters: parsed.data, invalid: false }
    : { filters: listingSearchSchema.parse({}), invalid: true };
}

export async function searchListings(filters: ListingSearchFilters) {
  const clauses: Prisma.ListingWhereInput[] = [];

  if (filters.destination) {
    clauses.push({
      OR: [
        { city: { contains: filters.destination, mode: "insensitive" } },
        { destination: { name: { contains: filters.destination, mode: "insensitive" } } },
      ],
    });
  }
  if (filters.keyword) {
    const ignored = new Set(["the", "a", "an", "for", "under", "with", "and", "near", "in", "of", "by", "stay", "stays", "somewhere"]);
    const terms = filters.keyword.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2 && !ignored.has(term)).slice(0, 10);
    if (terms.length) {
      clauses.push({
        OR: terms.map((term) => ({
          OR: [
            { title: { contains: term, mode: "insensitive" as const } },
            { description: { contains: term, mode: "insensitive" as const } },
            { city: { contains: term, mode: "insensitive" as const } },
            { destination: { name: { contains: term, mode: "insensitive" as const } } },
          ],
        })),
      });
    }
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    clauses.push({
      pricePerNight: {
        ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
        ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
      },
    });
  }
  if (filters.guests !== undefined) clauses.push({ maxGuests: { gte: filters.guests } });
  if (filters.propertyType) clauses.push({ propertyType: filters.propertyType });
  if (filters.vibe) clauses.push({ vibe: filters.vibe });
  if (filters.rating !== undefined) clauses.push({ rating: { gte: filters.rating } });
  for (const slug of filters.amenities ?? []) {
    clauses.push({ amenities: { some: { slug } } });
  }

  if (filters.checkIn && filters.checkOut && filters.checkIn < filters.checkOut) {
    const from = new Date(`${filters.checkIn}T00:00:00.000Z`);
    const to = new Date(`${filters.checkOut}T00:00:00.000Z`);
    clauses.push(
      { bookings: { none: { checkIn: { lt: to }, checkOut: { gt: from }, OR: [{ status: "CONFIRMED" }, { status: "PENDING", expiresAt: { gt: new Date() } }] } } },
      { calendarDates: { none: { date: { gte: from, lt: to }, isBlocked: true } } },
    );
  }

  return prisma.listing.findMany({
    where: { status: "PUBLISHED", ...(clauses.length ? { AND: clauses } : {}) },
    include: {
      images: { orderBy: { position: "asc" }, take: 1 },
      amenities: { orderBy: { name: "asc" } },
      destination: { select: { name: true, slug: true } },
    },
    orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
  });
}
