import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { requestSchema, saveListing } from "@/app/api/host/listings/route";

const actionSchema = z.object({ action: z.enum(["pause", "resume", "delete"]) });

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await requireApiRole(["HOST"]);
  if (!user) return NextResponse.json({ error: "Host access is required." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid listing action." }, { status: 400 }); }

  const action = actionSchema.safeParse(body);
  if (action.success) {
    const listing = await prisma.listing.findFirst({ where: { id: params.id, hostId: user.id }, select: { id: true, status: true } });
    if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    if (action.data.action === "pause") {
      if (listing.status !== "PUBLISHED") return NextResponse.json({ error: "Only published listings can be paused." }, { status: 409 });
      await prisma.listing.update({ where: { id: listing.id }, data: { status: "PAUSED" } });
    } else if (action.data.action === "resume") {
      if (listing.status !== "PAUSED") return NextResponse.json({ error: "This listing is not paused." }, { status: 409 });
      await prisma.listing.update({ where: { id: listing.id }, data: { status: "PENDING_REVIEW" } });
    } else {
      const { _count } = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id }, select: { _count: { select: { bookings: true } } } });
      if (_count.bookings > 0) return NextResponse.json({ error: "A listing with booking history cannot be deleted. Pause it instead." }, { status: 409 });
      await prisma.listing.delete({ where: { id: listing.id } });
      return NextResponse.json({ deleted: true });
    }
    return NextResponse.json({ updated: true });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your listing details." }, { status: 400 });
  const profile = await prisma.hostProfile.findUnique({ where: { userId: user.id }, select: { displayName: true, bio: true } });
  if (!profile) return NextResponse.json({ error: "Complete your host profile before editing listings." }, { status: 409 });
  const result = await saveListing(user.id, profile, parsed.data.draft, parsed.data.mode, params.id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ listing: result.listing }, { status: result.status });
}
