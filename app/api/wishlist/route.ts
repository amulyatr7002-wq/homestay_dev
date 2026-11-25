import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientAddress, rateLimit } from "@/lib/rate-limit";

const wishlistSchema = z.object({ listingSlug: z.string().min(1).max(120) });

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const items = await prisma.wishlist.findMany({
    where: { userId: session.user.id },
    include: { listing: { include: { images: { orderBy: { position: "asc" }, take: 1 }, amenities: true, destination: { select: { name: true, slug: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ listings: items.map((item) => item.listing) }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: Request) {
  return updateWishlist(request, "save");
}

export async function DELETE(request: Request) {
  return updateWishlist(request, "remove");
}

async function updateWishlist(request: Request, action: "save" | "remove") {
  const rate = await rateLimit(`wishlist:${clientAddress(request.headers)}`, 40, 60 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many wishlist updates. Try again shortly." }, { status: 429 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in to save stays." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid stay." }, { status: 400 });
  }
  const parsed = wishlistSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid stay." }, { status: 400 });

  const listing = await prisma.listing.findUnique({ where: { slug: parsed.data.listingSlug }, select: { id: true } });
  if (!listing) return NextResponse.json({ error: "Stay not found." }, { status: 404 });

  if (action === "save") {
    await prisma.wishlist.upsert({
      where: { userId_listingId: { userId: session.user.id, listingId: listing.id } },
      create: { userId: session.user.id, listingId: listing.id },
      update: {},
    });
  } else {
    await prisma.wishlist.deleteMany({ where: { userId: session.user.id, listingId: listing.id } });
  }
  return NextResponse.json({ saved: action === "save" });
}
