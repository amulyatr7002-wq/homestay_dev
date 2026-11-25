import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const flagSchema = z.object({
  entityType: z.enum(["Listing", "Review"]),
  entityId: z.string().cuid(),
  action: z.enum(["flag", "clear", "remove"]),
  reason: z.string().trim().max(2000).optional(),
}).refine((value) => value.action !== "flag" || Boolean(value.reason && value.reason.length >= 5), {
  message: "Add a reason when flagging content.",
  path: ["reason"],
});

export async function GET() {
  const admin = await requireApiRole(["ADMIN"]);
  if (!admin) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  const [listings, reviews] = await Promise.all([
    prisma.listing.findMany({ select: { id: true, title: true, slug: true, flagReason: true, isFlagged: true, status: true, host: { select: { name: true, email: true } } }, orderBy: [{ isFlagged: "desc" }, { updatedAt: "desc" }], take: 100 }),
    prisma.review.findMany({ select: { id: true, rating: true, comment: true, flagReason: true, isFlagged: true, user: { select: { name: true } }, listing: { select: { title: true, hostId: true } } }, orderBy: [{ isFlagged: "desc" }, { updatedAt: "desc" }], take: 100 }),
  ]);
  return NextResponse.json({ listings, reviews });
}

export async function PATCH(request: Request) {
  const admin = await requireApiRole(["ADMIN"]);
  if (!admin) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid flag action." }, { status: 400 }); }
  const parsed = flagSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the flag action." }, { status: 400 });
  if (parsed.data.entityType === "Listing") {
    const listing = await prisma.listing.findUnique({ where: { id: parsed.data.entityId }, select: { id: true } });
    if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    if (parsed.data.action === "remove") {
      await prisma.$transaction([
        prisma.listing.update({ where: { id: listing.id }, data: { status: "PAUSED", isFlagged: false, flagReason: parsed.data.reason ?? "Removed by admin." } }),
        prisma.auditLog.create({ data: { adminId: admin.id, action: "listing.flag_removed", entityType: "Listing", entityId: listing.id, details: { reason: parsed.data.reason ?? null } } }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.listing.update({ where: { id: listing.id }, data: { isFlagged: parsed.data.action === "flag", flagReason: parsed.data.action === "flag" ? parsed.data.reason ?? "Flagged for review." : null } }),
        prisma.auditLog.create({ data: { adminId: admin.id, action: `listing.flag_${parsed.data.action}`, entityType: "Listing", entityId: listing.id } }),
      ]);
    }
  } else {
    const review = await prisma.review.findUnique({ where: { id: parsed.data.entityId }, select: { id: true } });
    if (!review) return NextResponse.json({ error: "Review not found." }, { status: 404 });
    if (parsed.data.action === "remove") {
      const current = await prisma.review.findUniqueOrThrow({ where: { id: review.id }, select: { listingId: true } });
      const remaining = await prisma.review.aggregate({ where: { listingId: current.listingId, id: { not: review.id } }, _avg: { rating: true }, _count: true });
      await prisma.$transaction([
        prisma.review.delete({ where: { id: review.id } }),
        prisma.listing.update({ where: { id: current.listingId }, data: { reviewCount: remaining._count, rating: remaining._avg.rating ?? 0 } }),
        prisma.auditLog.create({ data: { adminId: admin.id, action: "review.removed", entityType: "Review", entityId: review.id, details: { reason: parsed.data.reason ?? null } } }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.review.update({ where: { id: review.id }, data: { isFlagged: parsed.data.action === "flag", flagReason: parsed.data.action === "flag" ? parsed.data.reason ?? "Flagged for review." : null } }),
        prisma.auditLog.create({ data: { adminId: admin.id, action: `review.flag_${parsed.data.action}`, entityType: "Review", entityId: review.id } }),
      ]);
    }
  }
  return NextResponse.json({ updated: true });
}
