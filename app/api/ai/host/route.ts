import { NextResponse } from "next/server";
import { z } from "zod";
import { checkAiRateLimit, generateAiText } from "@/lib/ai";
import { requireApiRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const descriptionSchema = z.object({
  action: z.literal("description"),
  title: z.string().trim().min(5).max(120),
  city: z.string().trim().min(2).max(100),
  propertyType: z.string().max(40),
  vibe: z.string().max(40),
  maxGuests: z.number().int().min(1).max(20),
  bedrooms: z.number().int().min(1).max(30),
  beds: z.number().int().min(1).max(50),
  bathrooms: z.number().int().min(1).max(30),
  amenities: z.array(z.string().max(80)).max(50),
  houseRules: z.string().max(1000).default(""),
});
const pricingSchema = z.object({
  action: z.literal("pricing"),
  city: z.string().trim().min(2).max(100),
  propertyType: z.string().max(40),
  maxGuests: z.number().int().min(1).max(20),
  amenities: z.array(z.string().max(80)).max(50),
});

export async function POST(request: Request) {
  const { rate } = await checkAiRateLimit(request, "host-tools", 15);
  if (!rate.allowed) return NextResponse.json({ error: "You’ve reached the host AI tools limit. Please try later." }, { status: 429 });
  const host = await requireApiRole(["HOST"]);
  if (!host) return NextResponse.json({ error: "Host access is required." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const action = z.object({ action: z.enum(["description", "pricing"]) }).safeParse(body);
  if (!action.success) return NextResponse.json({ error: "Choose a host AI tool." }, { status: 400 });
  const parsed = (action.data.action === "description" ? descriptionSchema : pricingSchema).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Complete the required listing details first." }, { status: 400 });
  try {
    let prompt: string;
    let system: string;
    let maxTokens = 500;
    if (parsed.data.action === "description") {
      const { action: _action, ...details } = parsed.data;
      prompt = JSON.stringify(details);
      system = "Write a warm, accurate homestay description using only facts in the delimited host data. Never invent amenities, views, activities, distances, facilities, or services. Return only the editable description.";
    } else {
      const { action: _action, ...details } = parsed.data;
      const comparableListings = await prisma.listing.findMany({
        where: { status: "PUBLISHED", city: { contains: details.city, mode: "insensitive" } },
        select: { pricePerNight: true },
        take: 30,
        orderBy: { pricePerNight: "asc" },
      });
      const prices = comparableListings.map((item) => item.pricePerNight);
      const evidence = prices.length ? { comparableCount: prices.length, min: prices[0], median: prices[Math.floor(prices.length / 2)], max: prices[prices.length - 1] } : null;
      prompt = JSON.stringify({ listing: details, publishedCityPriceRange: evidence });
      system = "Suggest an Indian rupee nightly range for this homestay. If published comparable city prices are present, center the range near their median and do not claim more than the provided evidence. If no comparable prices are present, clearly say there is not enough local data and provide only a rough, non-market estimate based on listing size. This is a suggestion, not a guarantee. Return JSON: {\"min\": integer, \"max\": integer, \"explanation\": string}. Both values must be between 500 and 1000000.";
      maxTokens = 200;
    }
    const response = await generateAiText({
      feature: "host-tools",
      userId: host.id,
      maxTokens,
      system,
      userText: prompt,
    });
    if (response.rateLimited) return NextResponse.json({ error: response.text }, { status: 429 });
    if (response.fallback) return NextResponse.json({ error: response.text }, { status: 503 });
    const text = response.text;
    if (parsed.data.action === "description") return NextResponse.json({ value: text });
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Pricing suggestion was not valid JSON.");
    const suggestion = z.object({ min: z.number().int().min(500).max(1000000), max: z.number().int().min(500).max(1000000), explanation: z.string().max(300) }).refine((value) => value.min <= value.max).parse(JSON.parse(match[0]));
    return NextResponse.json({ suggestion, label: "AI-generated suggestion — review and choose your own price." });
  } catch (error) {
    console.error("Host AI tool failed:", error);
    return NextResponse.json({ error: "We couldn’t create that suggestion. Please try again or continue without it." }, { status: 503 });
  }
}
