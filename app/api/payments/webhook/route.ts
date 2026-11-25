import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { emailBookingConfirmation } from "@/lib/booking-email";
import { getRazorpay } from "@/lib/razorpay";
import { verifyWebhookSignature } from "@/lib/payment-signature";
import { prisma } from "@/lib/prisma";

const webhookSchema = z.object({
  event: z.enum(["payment.captured", "payment.failed", "refund.processed"]),
  payload: z.object({
    payment: z.object({
      entity: z.object({
        id: z.string().min(1),
        order_id: z.string().min(1),
        amount: z.number().int().positive(),
        currency: z.string().length(3),
      }).optional(),
    }).optional(),
    refund: z.object({
      entity: z.object({ id: z.string().min(1), payment_id: z.string().min(1) }).optional(),
    }).optional(),
  }),
});

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Webhook payload is not valid JSON." }, { status: 400 });
  }
  const parsed = webhookSchema.safeParse(decoded);
  if (!parsed.success) {
    return NextResponse.json({ error: "Webhook payload is missing required payment details." }, { status: 400 });
  }

  const event = parsed.data.event;
  if (event === "refund.processed") {
    const refund = parsed.data.payload.refund?.entity;
    if (!refund) return NextResponse.json({ error: "Refund details are missing." }, { status: 400 });
    await prisma.payment.updateMany({
      where: { razorpayPaymentId: refund.payment_id, status: "REFUND_PENDING" },
      data: { status: "REFUNDED" },
    });
    return NextResponse.json({ received: true });
  }

  const paymentEvent = parsed.data.payload.payment?.entity;
  if (!paymentEvent) return NextResponse.json({ error: "Payment details are missing." }, { status: 400 });
  const payment = await prisma.payment.findUnique({
    where: { orderId: paymentEvent.order_id },
    include: { booking: { select: { id: true, status: true, expiresAt: true } } },
  });
  if (!payment) return NextResponse.json({ error: "Payment order was not found." }, { status: 404 });
  if (payment.amountPaise !== paymentEvent.amount || payment.currency !== paymentEvent.currency) {
    return NextResponse.json({ error: "Payment amount does not match the order." }, { status: 400 });
  }

  if (event === "payment.failed") {
    await prisma.$transaction(async (transaction) => {
      await transaction.payment.updateMany({
        where: { id: payment.id, status: "CREATED" },
        data: { status: "FAILED", razorpayPaymentId: paymentEvent.id },
      });
      await transaction.booking.updateMany({
        where: { id: payment.bookingId, status: "PENDING" },
        data: { status: "CANCELLED", expiresAt: null },
      });
    });
    return NextResponse.json({ received: true });
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const current = await transaction.payment.findUnique({
        where: { id: payment.id },
        include: { booking: { select: { status: true, expiresAt: true } } },
      });
      if (!current) throw new Error("Payment record disappeared during webhook handling.");
      if (current.status === "REFUND_PENDING" || current.status === "REFUNDED") return { refund: false, confirmed: false };
      if (current.status === "PAID" && current.booking.status === "CONFIRMED") return { refund: false, confirmed: false };
      if (current.status === "PAID" && current.refundAmountPaise !== null && current.refundAmountPaise !== undefined) {
        return { refund: false, confirmed: false };
      }

      const canConfirm = current.booking.status === "PENDING" && current.booking.expiresAt !== null && current.booking.expiresAt > new Date();
      await transaction.payment.update({
        where: { id: current.id },
        data: { status: "PAID", razorpayPaymentId: paymentEvent.id },
      });
      if (canConfirm) {
        const updated = await transaction.booking.updateMany({
          where: { id: payment.bookingId, status: "PENDING", expiresAt: { gt: new Date() } },
          data: { status: "CONFIRMED", confirmedAt: new Date(), expiresAt: null },
        });
        if (updated.count !== 1) throw new Error("The booking hold changed while payment was confirming.");
        return { refund: false, confirmed: true };
      }
      if (current.booking.status === "CANCELLED") return { refund: true, confirmed: false };
      await transaction.booking.updateMany({
        where: { id: payment.bookingId, status: "PENDING" },
        data: { status: "CANCELLED", expiresAt: null },
      });
      return { refund: true, confirmed: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (result.refund) {
      try {
        await getRazorpay().payments.refund(paymentEvent.id, {
          amount: paymentEvent.amount,
          notes: { reason: "Reservation hold expired before payment confirmation." },
        });
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "REFUND_PENDING", refundAmountPaise: paymentEvent.amount },
        });
      } catch (error) {
        console.error("Could not automatically refund a late booking payment:", error);
        return NextResponse.json({ error: "Payment was captured after its booking hold expired; refund retry is required." }, { status: 500 });
      }
    } else if (result.confirmed) {
      await emailBookingConfirmation(payment.bookingId);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "Concurrent payment update; retry this webhook." }, { status: 409 });
    }
    console.error("Could not process Razorpay payment webhook:", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
