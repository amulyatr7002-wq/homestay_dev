import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

function csvCell(value: string | number) {
  const raw = String(value).replace(/[\r\n]/g, " ");
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET() {
  const host = await requireApiRole(["HOST"]);
  if (!host) return NextResponse.json({ error: "Host access is required." }, { status: 403 });
  const payments = await prisma.payment.findMany({
    where: { booking: { listing: { hostId: host.id } } },
    include: { booking: { select: { reference: true, totalPrice: true, serviceFee: true, listing: { select: { title: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  const rows = [
    ["Booking reference", "Listing", "Gross amount (INR)", "Platform fee (INR)", "Host amount (INR)", "Status", "Payment date"],
    ...payments.map((payment) => [
      payment.booking.reference,
      payment.booking.listing.title,
      String(payment.booking.totalPrice),
      String(payment.booking.serviceFee),
      String(Math.max(0, payment.booking.totalPrice - payment.booking.serviceFee)),
      payment.status,
      payment.createdAt.toISOString(),
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="namma-stay-earnings.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
