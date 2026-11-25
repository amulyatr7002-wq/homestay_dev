import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { calculateCancellationRefund } from "@/lib/booking-policy";
import { cancelBookingSchema } from "@/lib/booking-validation";
import { getRazorpay } from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";
import { clientAddress, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rate = await rateLimit(`booking-cancel:${clientAddress(request.headers)}`, 10, 60 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many cancellation attempts." }, { status: 429 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid booking." }, { status: 400 });
  }
  const parsed = cancelBookingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid booking." }, { status: 400 });

  const now = new Date();
  const result = await prisma.$transaction(async (transaction) => {
    const booking = await transaction.booking.findFirst({
      where: { id: parsed.data.bookingId, userId: session.user.id },
      include: { payments: { where: { status: "PAID" }, orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (!booking) return { error: "Booking not found.", status: 404 as const };
    if (booking.status !== "CONFIRMED" && booking.status !== "PENDING") {
      return { error: "This booking can no longer be cancelled.", status: 409 as const };
    }
    if (booking.checkIn <= new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))) {
      return { error: "Trips that have already started can’t be cancelled online.", status: 409 as const };
    }

    const payment = booking.payments[0];
    const refund = calculateCancellationRefund(payment?.amountPaise ?? 0, booking.checkIn, now);
    await transaction.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED", expiresAt: null },
    });
    if (payment && refund.refundAmountPaise > 0) {
      await transaction.payment.update({
        where: { id: payment.id },
        data: { status: "REFUND_PENDING", refundAmountPaise: refund.refundAmountPaise },
      });
    }
    return {
      bookingId: booking.id,
      paymentId: payment?.razorpayPaymentId ?? null,
      paymentRecordId: payment?.id ?? null,
      ...refund,
    };
  });

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  let refundPending = false;
  if (result.refundAmountPaise > 0 && result.paymentId && result.paymentRecordId) {
    try {
      await getRazorpay().payments.refund(result.paymentId, {
        amount: result.refundAmountPaise,
        notes: { bookingId: result.bookingId, policy: `${result.refundPercent}% cancellation refund` },
      });
    } catch (error) {
      refundPending = true;
      console.error("Could not initiate the cancellation refund:", error);
    }
  }
  return NextResponse.json({
    cancelled: true,
    refundPercent: result.refundPercent,
    refundAmount: Math.round(result.refundAmountPaise / 100),
    refundPending,
  });
}
