import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await requireApiRole(["ADMIN"]);
  if (!admin) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  const since = new Date();
  since.setMonth(since.getMonth() - 5, 1);
  since.setHours(0, 0, 0, 0);
  const [users, hosts, listings, pendingListings, bookings, payments, recentPayments] = await Promise.all([
    prisma.user.count({ where: { suspendedAt: null } }),
    prisma.user.count({ where: { role: "HOST", suspendedAt: null } }),
    prisma.listing.count({ where: { status: "PUBLISHED" } }),
    prisma.listing.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.booking.count(),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amountPaise: true } }),
    prisma.payment.findMany({ where: { status: "PAID", createdAt: { gte: since } }, select: { amountPaise: true, createdAt: true } }),
  ]);
  const chart = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(since.getFullYear(), since.getMonth() + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const total = recentPayments
      .filter((payment) => `${payment.createdAt.getFullYear()}-${String(payment.createdAt.getMonth() + 1).padStart(2, "0")}` === key)
      .reduce((sum, payment) => sum + payment.amountPaise, 0);
    return { month: date.toLocaleDateString("en-IN", { month: "short" }), total: Math.round(total / 100) };
  });
  return NextResponse.json({
    totals: { users, hosts, listings, pendingListings, bookings, revenue: Math.round((payments._sum.amountPaise ?? 0) / 100) },
    chart,
  });
}
