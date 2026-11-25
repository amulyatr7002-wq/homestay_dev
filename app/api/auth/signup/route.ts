import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientAddress, rateLimit } from "@/lib/rate-limit";

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(8).max(72).refine((password) => Buffer.byteLength(password, "utf8") <= 72),
});

export async function POST(request: Request) {
  const rate = await rateLimit(`signup:${clientAddress(request.headers)}`, 5, 15 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many sign-up attempts. Please try again later." }, {
      status: 429,
      headers: { "Retry-After": String(rate.retryAfterSeconds) },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please send valid sign-up details." }, { status: 400 });
  }
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your details and try again." }, { status: 400 });
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: await hash(parsed.data.password, 12),
      },
      select: { id: true, name: true, email: true },
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "An account with that email already exists. Try signing in instead." }, { status: 409 });
    }
    console.error("Could not create the guest account:", error);
    return NextResponse.json({ error: "We couldn’t create your account right now. Please try again." }, { status: 500 });
  }
}
