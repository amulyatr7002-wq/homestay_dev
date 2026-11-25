import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1) });
const actionSchema = z.object({ paymentId: z.string().cuid(), action: z.literal("mark-refund-processed") });

export async function GET(request: Request) {
  const admin = await requireApiRole(["ADMIN"]);
  if (!admin) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid booking page." }, { status: 400 });
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      include: {
        user: { select: { name: true, email: true } },
        listing: { select: { title: true, slug: true, host: { select: { name: true, email: true } } } },
        payments: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
      skip: (parsed.data.page - 1) * 25,
      take: 25,
    }),
    prisma.booking.count(),
  ]);
  return NextResponse.json({ bookings, total, page: parsed.data.page, pageSize: 25 });
}

export async function PATCH(request: Request) {
  const admin = await requireApiRole(["ADMIN"]);
  if (!admin) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid payment action." }, { status: 400 }); }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid payment to update." }, { status: 400 });
  const payment = await prisma.payment.findUnique({ where: { id: parsed.data.paymentId }, select: { id: true, status: true, bookingId: true, refundAmountPaise: true } });
  if (!payment || payment.status !== "REFUND_PENDING") return NextResponse.json({ error: "Only pending refunds can be marked processed." }, { status: 409 });
  await prisma.$transaction([
    prisma.payment.updateMany({ where: { id: payment.id, status: "REFUND_PENDING" }, data: { status: "REFUNDED" } }),
    prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "payment.refund_marked_processed",
        entityType: "Payment",
        entityId: payment.id,
        details: { bookingId: payment.bookingId, refundAmountPaise: payment.refundAmountPaise },
      },
    }),
  ]);
  return NextResponse.json({ updated: true });
}
