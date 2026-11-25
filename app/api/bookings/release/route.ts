import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const releaseSchema = z.object({ bookingId: z.string().cuid() });

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid booking reference." }, { status: 400 });
  }
  const parsed = releaseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid booking reference." }, { status: 400 });

  const booking = await prisma.booking.findFirst({
    where: { id: parsed.data.bookingId, userId: session.user.id },
    select: { id: true, status: true },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  if (booking.status !== "PENDING") return NextResponse.json({ released: false });

  await prisma.$transaction(async (transaction) => {
    await transaction.payment.updateMany({
      where: { bookingId: booking.id, status: "CREATED" },
      data: { status: "FAILED" },
    });
    await transaction.booking.updateMany({
      where: { id: booking.id, status: "PENDING" },
      data: { status: "CANCELLED", expiresAt: null },
    });
  });
  return NextResponse.json({ released: true });
}
