import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getRazorpay } from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";
import { clientAddress, rateLimit } from "@/lib/rate-limit";

const orderSchema = z.object({ bookingId: z.string().cuid() });

export async function POST(request: Request) {
  const rate = await rateLimit(`payment-order:${clientAddress(request.headers)}`, 6, 10 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many payment attempts. Please wait a few minutes." }, {
      status: 429,
      headers: { "Retry-After": String(rate.retryAfterSeconds) },
    });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in again to continue." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please send a valid booking reference." }, { status: 400 });
  }
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "That booking reference is invalid." }, { status: 400 });

  try {
    const booking = await prisma.booking.findFirst({
      where: { id: parsed.data.bookingId, userId: session.user.id },
      include: { payments: { where: { status: "CREATED" }, orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    if (booking.status !== "PENDING" || !booking.expiresAt || booking.expiresAt <= new Date()) {
      return NextResponse.json({ error: "This reservation hold has expired. Please choose your dates again." }, { status: 409 });
    }

    const existing = booking.payments[0];
    if (existing) {
      return NextResponse.json({
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: existing.orderId,
        amount: existing.amountPaise,
        currency: existing.currency,
        reference: booking.reference,
      });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    if (!keyId) throw new Error("RAZORPAY_KEY_ID is not configured.");
    const order = await getRazorpay().orders.create({
      amount: booking.totalPrice * 100,
      currency: "INR",
      receipt: booking.reference,
      notes: { bookingId: booking.id, bookingReference: booking.reference },
    });
    const amountPaise = Number(order.amount);
    if (!Number.isSafeInteger(amountPaise) || amountPaise !== booking.totalPrice * 100 || order.currency !== "INR") {
      throw new Error("Razorpay returned an invalid order amount or currency.");
    }
    const payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        orderId: order.id,
        amountPaise,
        currency: order.currency,
      },
    });
    return NextResponse.json({
      keyId,
      orderId: payment.orderId,
      amount: payment.amountPaise,
      currency: payment.currency,
      reference: booking.reference,
    });
  } catch (error) {
    console.error("Could not create the Razorpay order:", error);
    let holdReleased = false;
    try {
      const released = await prisma.booking.updateMany({
        where: { id: parsed.data.bookingId, userId: session.user.id, status: "PENDING" },
        data: { status: "CANCELLED", expiresAt: null },
      });
      holdReleased = released.count > 0;
    } catch (releaseError) {
      console.error("Could not immediately release the failed checkout hold:", releaseError);
    }
    return NextResponse.json({
      error: holdReleased
        ? "We couldn’t start secure checkout, so your date hold has been released."
        : "We couldn’t start checkout. Your date hold will expire automatically.",
    }, { status: 502 });
  }
}
