import { requirePageRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import DashboardTitle from "@/components/dashboard-title";
import HostReviews from "@/components/host-reviews";

export const dynamic = "force-dynamic";

export default async function HostReviewsPage() {
  const host = await requirePageRole("HOST");
  const reviews = await prisma.review.findMany({
    where: { listing: { hostId: host.id } },
    include: { user: { select: { name: true, image: true } }, listing: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
  });
  return <div className="workspace-page"><DashboardTitle eyebrow="WORDS FROM YOUR GUESTS" title="Reviews" /><HostReviews reviews={reviews.map((review) => ({ id: review.id, rating: review.rating, comment: review.comment, hostReply: review.hostReply, createdAt: review.createdAt.toISOString(), guestName: review.user.name || "Guest", listingTitle: review.listing.title }))} /></div>;
}
