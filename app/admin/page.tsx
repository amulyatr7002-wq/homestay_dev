import { ArrowRight, BadgeCheck, CalendarCheck, CircleDollarSign, Home, Users } from "lucide-react";
import Link from "next/link";
import { requirePageRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import DashboardTitle from "@/components/dashboard-title";
import EarningsChart from "@/components/earnings-chart";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requirePageRole("ADMIN");
  const monthStart = new Date();
  monthStart.setMonth(monthStart.getMonth() - 5, 1);
  monthStart.setHours(0, 0, 0, 0);
  const [users, hosts, published, reviewQueue, bookings, paidPayments, monthlyPayments, recentAudit] = await Promise.all([
    prisma.user.count({ where: { suspendedAt: null } }),
    prisma.user.count({ where: { role: "HOST", suspendedAt: null } }),
    prisma.listing.count({ where: { status: "PUBLISHED" } }),
    prisma.listing.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.booking.count(),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amountPaise: true } }),
    prisma.payment.findMany({ where: { status: "PAID", createdAt: { gte: monthStart } }, select: { amountPaise: true, createdAt: true } }),
    prisma.auditLog.findMany({ include: { admin: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);
  const chart = Array.from({ length: 6 }, (_, index) => {
    const month = new Date(monthStart.getFullYear(), monthStart.getMonth() + index, 1);
    return {
      month: month.toLocaleDateString("en-IN", { month: "short" }),
      total: Math.round(monthlyPayments.filter((payment) => payment.createdAt.getFullYear() === month.getFullYear() && payment.createdAt.getMonth() === month.getMonth()).reduce((sum, payment) => sum + payment.amountPaise, 0) / 100),
    };
  });
  return <div className="workspace-page">
    <DashboardTitle eyebrow="THE WHOLE Namma STAY, AT A GLANCE" title="Admin overview" />
    <div className="metric-grid">
      <article className="metric-card"><span><Users size={16} /> Active members</span><strong>{users.toLocaleString("en-IN")}</strong><small>{hosts} verified host profiles</small></article>
      <article className="metric-card"><span><Home size={16} /> Published stays</span><strong>{published.toLocaleString("en-IN")}</strong><small>{reviewQueue} awaiting moderation</small></article>
      <article className="metric-card"><span><CalendarCheck size={16} /> Bookings</span><strong>{bookings.toLocaleString("en-IN")}</strong><small>Across every destination</small></article>
      <article className="metric-card"><span><CircleDollarSign size={16} /> Gross payments</span><strong>₹{Math.round((paidPayments._sum.amountPaise ?? 0) / 100).toLocaleString("en-IN")}</strong><small>Captured payments to date</small></article>
    </div>
    <div className="workspace-content-grid admin-dashboard-grid">
      <EarningsChart data={chart} />
      <section className="workspace-card">
        <div className="workspace-card-heading"><div><p className="workspace-eyebrow">KEEP IT ACCOUNTABLE</p><h2>Recent admin actions</h2></div><Link href="/admin/audit">Full log <ArrowRight size={14} /></Link></div>
        {recentAudit.length ? <div className="arrival-list">{recentAudit.map((entry) => <article key={entry.id}><span className="audit-icon"><BadgeCheck size={15} /></span><div><strong>{entry.action.replaceAll(".", " ")}</strong><small>{entry.admin.name || entry.admin.email} · {entry.createdAt.toLocaleDateString("en-IN")}</small></div></article>)}</div> : <div className="workspace-empty compact-empty"><span>✳</span><strong>No admin activity yet</strong><p>Moderation and operations actions are recorded here.</p></div>}
      </section>
    </div>
  </div>;
}
