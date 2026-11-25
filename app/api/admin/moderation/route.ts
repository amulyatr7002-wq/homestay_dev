import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAdminAction } from "@/lib/audit";
import { requireApiRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const moderationSchema = z.object({
  listingId: z.string().cuid(),
  action: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(2000).optional(),
}).refine((value) => value.action !== "reject" || Boolean(value.reason && value.reason.length >= 5), {
  message: "Include a short reason when rejecting a listing.",
  path: ["reason"],
});

export async function GET() {
  const admin = await requireApiRole(["ADMIN"]);
  if (!admin) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  const listings = await prisma.listing.findMany({
    where: { status: "PENDING_REVIEW" },
    include: { host: { select: { id: true, name: true, email: true, hostProfile: { select: { displayName: true, phone: true } } } }, images: { orderBy: { position: "asc" } }, amenities: true },
    orderBy: { updatedAt: "asc" },
  });
  return NextResponse.json({ listings });
}

export async function PATCH(request: Request) {
  const admin = await requireApiRole(["ADMIN"]);
  if (!admin) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid moderation action." }, { status: 400 }); }
  const parsed = moderationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the moderation details." }, { status: 400 });
  const listing = await prisma.listing.findFirst({ where: { id: parsed.data.listingId, status: "PENDING_REVIEW" }, select: { id: true, status: true } });
  if (!listing) return NextResponse.json({ error: "This listing is no longer awaiting review." }, { status: 404 });
  const status = parsed.data.action === "approve" ? "PUBLISHED" : "REJECTED";
  await prisma.$transaction([
    prisma.listing.update({
      where: { id: listing.id },
      data: { status, rejectedReason: parsed.data.action === "reject" ? parsed.data.reason : null },
    }),
    prisma.auditLog.create({
      data: { adminId: admin.id, action: `listing.${parsed.data.action}`, entityType: "Listing", entityId: listing.id, details: { reason: parsed.data.reason ?? null } },
    }),
  ]);
  return NextResponse.json({ status });
}
