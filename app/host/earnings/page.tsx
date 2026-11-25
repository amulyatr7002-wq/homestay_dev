import { Download } from "lucide-react";
import Link from "next/link";
import { requirePageRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import DashboardTitle from "@/components/dashboard-title";
import DataTable, { type TableColumn } from "@/components/data-table";

export const dynamic = "force-dynamic";
type EarningRow = { id: string; reference: string; listing: string; amount: number; platformFee: number; status: string; createdAt: string };

export default async function HostEarningsPage() {
  const host = await requirePageRole("HOST");
  const payments = await prisma.payment.findMany({
    where: { booking: { listing: { hostId: host.id } } },
    include: { booking: { select: { reference: true, totalPrice: true, serviceFee: true, listing: { select: { title: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const rows: EarningRow[] = payments.map((payment) => ({
    id: payment.id,
    reference: payment.booking.reference,
    listing: payment.booking.listing.title,
    amount: Math.max(0, payment.booking.totalPrice - payment.booking.serviceFee),
    platformFee: payment.booking.serviceFee,
    status: payment.status,
    createdAt: payment.createdAt.toISOString(),
  }));
  const columns: TableColumn<EarningRow>[] = [
    { key: "reference", label: "Booking reference" },
    { key: "listing", label: "Stay" },
    { key: "amount", label: "Your amount", render: (value) => `₹${Number(value).toLocaleString("en-IN")}` },
    { key: "platformFee", label: "Platform fee", render: (value) => `₹${Number(value).toLocaleString("en-IN")}` },
    { key: "status", label: "Status", render: (value) => <span className={`status-pill status-pill-${String(value).toLowerCase()}`}>{String(value).replaceAll("_", " ")}</span> },
    { key: "createdAt", label: "Payment date", render: (value) => new Date(String(value)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
  ];
  const earnings = rows.filter((row) => row.status === "PAID").reduce((sum, row) => sum + row.amount, 0);
  return <div className="workspace-page">
    <DashboardTitle eyebrow="A CLEAR VIEW OF YOUR SHARE" title="Earnings" />
    <div className="earnings-summary"><div><p className="workspace-eyebrow">PAID OUT BOOKINGS</p><strong>₹{earnings.toLocaleString("en-IN")}</strong><span>Host amount after platform fees</span></div><Link href="/api/host/earnings/export" className="button button-dark"><Download size={15} /> Export CSV</Link></div>
    <DataTable rows={rows} columns={columns} emptyTitle="No payouts yet" emptyDescription="Payment activity for your stays will appear here." />
  </div>;
}
