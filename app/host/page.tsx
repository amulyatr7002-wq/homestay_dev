import Link from "next/link";
import { ArrowRight, CalendarCheck, IndianRupee, Star, TrendingUp } from "lucide-react";
import { requirePageRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import DashboardTitle from "@/components/dashboard-title";
import EarningsChart from "@/components/earnings-chart";

export const dynamic = "force-dynamic";

const money = (amount: number) => `₹${Math.round(amount).toLocaleString("en-IN")}`;

export default async function HostOverviewPage() {
  const host = await requirePageRole("HOST");
  const listings = await prisma.listing.findMany({ where: { hostId: host.id }, select: { id: true, status: true } });
  const listingIds = listings.map((listing) => listing.id);
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const [bookings, payments, rating] = await Promise.all([
    prisma.booking.findMany({
      where: { listingId: { in: listingIds }, status: { in: ["CONFIRMED", "COMPLETED"] }, checkOut: { gt: sixMonthsAgo } },
      select: { checkIn: true, checkOut: true, status: true, reference: true, guests: true, listing: { select: { title: true, city: true } }, user: { select: { name: true, email: true } } },
    }),
    prisma.payment.findMany({ where: { booking: { listing: { hostId: host.id } }, status: "PAID", createdAt: { gte: sixMonthsAgo } }, include: { booking: { select: { totalPrice: true, serviceFee: true } } } }),
    prisma.review.aggregate({ where: { listing: { hostId: host.id }, isFlagged: false }, _avg: { rating: true }, _count: true }),
  ]);
  const upcoming = bookings.filter((booking) => booking.checkIn >= today).sort((a, b) => a.checkIn.getTime() - b.checkIn.getTime()).slice(0, 4);
  const earnings = payments.reduce((sum, payment) => sum + payment.booking.totalPrice - payment.booking.serviceFee, 0);
  const occupiedNights = bookings.reduce((sum, booking) => {
    const start = new Date(Math.max(booking.checkIn.getTime(), sixMonthsAgo.getTime()));
    const end = new Date(Math.min(booking.checkOut.getTime(), now.getTime()));
    return sum + Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  }, 0);
  const occupancy = listings.length ? Math.min(100, Math.round(occupiedNights / (listings.length * 180) * 100)) : 0;
  const chart = Array.from({ length: 6 }, (_, index) => {
    const month = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + index, 1);
    const total = payments.filter((payment) => payment.createdAt.getFullYear() === month.getFullYear() && payment.createdAt.getMonth() === month.getMonth())
      .reduce((sum, payment) => sum + payment.booking.totalPrice - payment.booking.serviceFee, 0);
    return { month: month.toLocaleDateString("en-IN", { month: "short" }), total };
  });

  return (
    <div className="workspace-page">
      <DashboardTitle eyebrow="A GOOD DAY TO HOST" title="Your studio" action={{ href: "/host/listings/new", label: "Create a listing" }} />
      <div className="metric-grid">
        <article className="metric-card"><span><IndianRupee size={16} /> Host earnings</span><strong>{money(earnings)}</strong><small>Paid stays, after platform fees</small></article>
        <article className="metric-card"><span><CalendarCheck size={16} /> Upcoming check-ins</span><strong>{upcoming.length}</strong><small>Next confirmed arrivals</small></article>
        <article className="metric-card"><span><TrendingUp size={16} /> Occupancy</span><strong>{occupancy}%</strong><small>Approx. last 6 months</small></article>
        <article className="metric-card"><span><Star size={16} /> Guest rating</span><strong>{rating._avg.rating?.toFixed(2) ?? "—"}</strong><small>{rating._count} verified reviews</small></article>
      </div>
      <div className="workspace-content-grid">
        <EarningsChart data={chart} />
        <section className="workspace-card">
          <div className="workspace-card-heading"><div><p className="workspace-eyebrow">ON THE HORIZON</p><h2>Next arrivals</h2></div><Link href="/host/bookings">All bookings <ArrowRight size={14} /></Link></div>
          {upcoming.length ? <div className="arrival-list">{upcoming.map((booking) => <article key={booking.reference}><span className="arrival-date">{booking.checkIn.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span><div><strong>{booking.user.name || booking.user.email || "Guest"}</strong><small>{booking.listing.title} · {booking.guests} guests</small></div></article>)}</div> : <div className="workspace-empty compact-empty"><span>✳</span><strong>No arrivals just yet</strong><p>Confirmed guest trips will appear here.</p></div>}
        </section>
      </div>
    </div>
  );
}
