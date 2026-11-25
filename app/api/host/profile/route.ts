import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  bio: z.string().trim().min(30).max(3000),
  phone: z.string().trim().regex(/^\+?[0-9\s()-]{8,20}$/),
  city: z.string().trim().min(2).max(100),
  photoUrl: z.string().url().max(500).optional().or(z.literal("")),
  languages: z.array(z.string().trim().min(2).max(40)).min(1).max(10),
});

export async function POST(request: Request) {
  const user = await requireApiRole(["GUEST", "HOST"]);
  if (!user) return NextResponse.json({ error: "Sign in with an active guest account to continue." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please submit valid host profile details." }, { status: 400 });
  }
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your profile details." }, { status: 400 });

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.hostProfile.upsert({
        where: { userId: user.id },
        create: { ...parsed.data, photoUrl: parsed.data.photoUrl || null, userId: user.id },
        update: { ...parsed.data, photoUrl: parsed.data.photoUrl || null },
      });
      await transaction.user.update({
        where: { id: user.id },
        data: { role: "HOST", phone: parsed.data.phone, name: parsed.data.displayName, image: parsed.data.photoUrl || user.image },
      });
    });
    return NextResponse.json({ role: "HOST" }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "That phone number is already connected to another account." }, { status: 409 });
    }
    console.error("Could not save host onboarding:", error);
    return NextResponse.json({ error: "Your host profile could not be saved right now." }, { status: 500 });
  }
}
