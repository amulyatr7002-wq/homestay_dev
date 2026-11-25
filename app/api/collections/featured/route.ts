import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const collections = await prisma.featuredCollection.findMany({
      where: { isPublished: true },
      include: {
        listings: {
          where: { listing: { status: "PUBLISHED" } },
          orderBy: { position: "asc" },
          take: 8,
          include: { listing: { select: { id: true, slug: true, title: true, city: true, images: { orderBy: { position: "asc" }, take: 1, select: { url: true } } } } },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    });
    return NextResponse.json({ collections }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (error) {
    console.error("Could not load featured collections:", error);
    return NextResponse.json({ error: "Featured collections are temporarily unavailable." }, { status: 503 });
  }
}
