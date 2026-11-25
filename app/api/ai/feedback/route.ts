import { NextResponse } from "next/server";
import { z } from "zod";
import { checkAiRateLimit } from "@/lib/ai";
import { prisma } from "@/lib/prisma";

const schema = z.object({ feature: z.literal("concierge"), helpful: z.boolean(), turnId: z.string().max(100).optional() });

export async function POST(request: Request) {
  const { user, rate } = await checkAiRateLimit(request, "feedback", 30);
  if (!rate.allowed) return NextResponse.json({ error: "Please wait before sending more feedback." }, { status: 429 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid feedback." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid feedback." }, { status: 400 });
  await prisma.aiFeedback.create({ data: { userId: user?.id ?? null, ...parsed.data } });
  return NextResponse.json({ ok: true }, { status: 201 });
}
