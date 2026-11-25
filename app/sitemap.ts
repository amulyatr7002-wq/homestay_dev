import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const staticPaths = ["", "/explore", "/become-a-host"].map((path) => ({
    url: new URL(path, siteUrl).toString(),
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path ? 0.7 : 1,
  }));
  try {
    const listings = await prisma.listing.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
    return [
      ...staticPaths,
      ...listings.map((listing) => ({
        url: new URL(`/listings/${encodeURIComponent(listing.slug)}`, siteUrl).toString(),
        lastModified: listing.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch (error) {
    console.error("Could not load listing URLs for sitemap:", error);
    return staticPaths;
  }
}
