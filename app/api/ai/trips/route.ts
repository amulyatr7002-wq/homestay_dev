import { NextResponse } from "next/server";
import { z } from "zod";
import { checkAiRateLimit } from "@/lib/ai";
import { prisma } from "@/lib/prisma";

const itinerarySchema = z.object({
  title: z.string().trim().min(1).max(100),
  days: z.array(z.object({
    day: z.number().int().min(1).max(14),
    title: z.string().trim().min(1).max(100),
    activities: z.array(z.string().trim().min(1).max(220)).max(8),
  })).min(1).max(14),
});

export async function POST(request: Request) {
  const { user, rate } = await checkAiRateLimit(request, "save-trip", 10);
  if (!rate.allowed) return NextResponse.json({ error: "Please wait before saving another trip." }, { status: 429 });
  if (!user) return NextResponse.json({ error: "Sign in to save this trip." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid itinerary." }, { status: 400 }); }
  const parsed = itinerarySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "This itinerary could not be saved." }, { status: 400 });
  const trip = await prisma.savedTrip.create({ data: { userId: user.id, title: parsed.data.title, itinerary: parsed.data } });
  return NextResponse.json({ tripId: trip.id }, { status: 201 });
}

export async function GET(request: Request) {
  const { user, rate } = await checkAiRateLimit(request, "saved-trips", 30);
  if (!rate.allowed) return NextResponse.json({ error: "Please wait before refreshing your saved trips." }, { status: 429 });
  if (!user) return NextResponse.json({ error: "Sign in to view your saved trips." }, { status: 401 });
  const trips = await prisma.savedTrip.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ trips });
}
