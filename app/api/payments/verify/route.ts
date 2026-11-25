import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { emailBookingConfirmation } from "@/lib/booking-email";
import { verifyCheckoutSignature } from "@/lib/payment-signature";
import { prisma } from "@/lib/prisma";
import { clientAddress, rateLimit } from "@/lib/rate-limit";

const verifySchema = z.object({
  bookingId: z.string().cuid(),
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i),
});

export async function POST(request: Request) {
  const rate = await rateLimit(`payment-verify:${clientAddress(request.headers)}`, 8, 10 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many payment verification attempts." }, {
      status: 429,
      headers: { "Retry-After": String(rate.retryAfterSeconds) },
    });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payment response." }, { status: 400 });
  }
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payment response." }, { status: 400 });
  const input = parsed.data;
  if (!verifyCheckoutSignature(input.razorpay_order_id, input.razorpay_payment_id, input.razorpay_signature)) {
    return NextResponse.json({ error: "Payment signature could not be verified." }, { status: 400 });
  }

  try {
    const record = await prisma.payment.findUnique({
      where: { orderId: input.razorpay_order_id },
      include: { booking: { select: { id: true, userId: true, status: true, expiresAt: true, reference: true } } },
    });
    if (!record || record.bookingId !== input.bookingId || record.booking.userId !== session.user.id) {
      return NextResponse.json({ error: "This payment does not match your booking." }, { status: 404 });
    }
    if (record.status === "PAID") {
      return NextResponse.json({ bookingReference: record.booking.reference });
    }
    if (record.status !== "CREATED") {
      return NextResponse.json({ error: "This payment attempt is no longer active." }, { status: 409 });
    }
    if (record.booking.status !== "PENDING" || !record.booking.expiresAt || record.booking.expiresAt <= new Date()) {
      return NextResponse.json({ error: "Your date hold expired before the payment could be confirmed. Contact support with your payment reference." }, { status: 409 });
    }

    const confirmedNow = await prisma.$transaction(async (transaction) => {
      const paymentUpdate = await transaction.payment.updateMany({
        where: { id: record.id, status: "CREATED" },
        data: { status: "PAID", razorpayPaymentId: input.razorpay_payment_id, signature: input.razorpay_signature },
      });
      if (paymentUpdate.count === 0) return false;
      const bookingUpdate = await transaction.booking.updateMany({
        where: { id: record.bookingId, status: "PENDING", expiresAt: { gt: new Date() } },
        data: { status: "CONFIRMED", confirmedAt: new Date(), expiresAt: null },
      });
      if (bookingUpdate.count !== 1) throw new Error("Booking hold expired before payment confirmation.");
      return true;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (confirmedNow) await emailBookingConfirmation(record.bookingId);
    return NextResponse.json({ bookingReference: record.booking.reference });
  } catch (error) {
    console.error("Payment verification could not complete:", error);
    return NextResponse.json({ error: "Payment was received but confirmation is still pending. Please refresh your bookings shortly." }, { status: 503 });
  }
}
