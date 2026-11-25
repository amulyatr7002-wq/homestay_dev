import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const collectionSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().trim().min(3).max(100),
  slug: z.string().trim().min(3).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(10).max(2000),
  imageUrl: z.string().url().max(500).refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && ["images.unsplash.com", "res.cloudinary.com"].includes(url.hostname);
    } catch { return false; }
  }).optional().or(z.literal("")),
  isPublished: z.boolean(),
  listingIds: z.array(z.string().cuid()).max(40),
});

export async function GET() {
  const admin = await requireApiRole(["ADMIN"]);
  if (!admin) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  const [collections, listings] = await Promise.all([
    prisma.featuredCollection.findMany({
      include: {
        listings: {
          include: { listing: { select: { id: true, title: true, status: true } } },
          orderBy: { position: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.listing.findMany({ where: { status: "PUBLISHED" }, orderBy: { title: "asc" }, select: { id: true, title: true, city: true } }),
  ]);
  return NextResponse.json({ collections, listings });
}

export async function POST(request: Request) {
  return saveCollection(request, false);
}

export async function PATCH(request: Request) {
  return saveCollection(request, true);
}

async function saveCollection(request: Request, update: boolean) {
  const admin = await requireApiRole(["ADMIN"]);
  if (!admin) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid collection." }, { status: 400 }); }
  const parsed = collectionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the collection details." }, { status: 400 });
  if (update && !parsed.data.id) return NextResponse.json({ error: "Collection ID is required." }, { status: 400 });
  const publishedListings = await prisma.listing.findMany({ where: { id: { in: parsed.data.listingIds }, status: "PUBLISHED" }, select: { id: true } });
  if (publishedListings.length !== parsed.data.listingIds.length) return NextResponse.json({ error: "Collections can only feature published listings." }, { status: 400 });
  try {
    const data = {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      imageUrl: parsed.data.imageUrl || null,
      isPublished: parsed.data.isPublished,
    };
    const collection = await prisma.$transaction(async (transaction) => {
      const saved = update
        ? await transaction.featuredCollection.update({ where: { id: parsed.data.id }, data })
        : await transaction.featuredCollection.create({ data });
      if (update) await transaction.featuredListing.deleteMany({ where: { collectionId: saved.id } });
      if (parsed.data.listingIds.length) {
        await transaction.featuredListing.createMany({
          data: parsed.data.listingIds.map((listingId, position) => ({ collectionId: saved.id, listingId, position })),
        });
      }
      await transaction.auditLog.create({
        data: { adminId: admin.id, action: update ? "collection.updated" : "collection.created", entityType: "FeaturedCollection", entityId: saved.id },
      });
      return saved;
    });
    return NextResponse.json({ collection }, { status: update ? 200 : 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "That collection slug is already in use." }, { status: 409 });
    console.error("Could not save featured collection:", error);
    return NextResponse.json({ error: "The collection could not be saved." }, { status: 500 });
  }
}
