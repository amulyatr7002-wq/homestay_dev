import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const replySchema = z.object({
  reviewId: z.string().cuid(),
  reply: z.string().trim().min(5).max(2000),
});

export async function GET() {
  const user = await requireApiRole(["HOST"]);
  if (!user) return NextResponse.json({ error: "Host access is required." }, { status: 403 });
  const reviews = await prisma.review.findMany({
    where: { listing: { hostId: user.id } },
    include: { user: { select: { name: true, image: true } }, listing: { select: { id: true, title: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ reviews });
}

export async function POST(request: Request) {
  const user = await requireApiRole(["HOST"]);
  if (!user) return NextResponse.json({ error: "Host access is required." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid reply." }, { status: 400 }); }
  const parsed = replySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your reply." }, { status: 400 });
  const review = await prisma.review.findFirst({ where: { id: parsed.data.reviewId, listing: { hostId: user.id } }, select: { id: true } });
  if (!review) return NextResponse.json({ error: "Review not found." }, { status: 404 });
  await prisma.review.update({ where: { id: review.id }, data: { hostReply: parsed.data.reply, hostRepliedAt: new Date() } });
  return NextResponse.json({ replied: true });
}
