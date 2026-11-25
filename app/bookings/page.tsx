import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BookingDashboard from "@/components/booking-dashboard";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fbookings");
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  await prisma.booking.updateMany({
    where: { userId: session.user.id, status: "PENDING", expiresAt: { lte: now } },
    data: { status: "CANCELLED", expiresAt: null },
  });
  await prisma.booking.updateMany({
    where: { userId: session.user.id, status: "CONFIRMED", checkOut: { lte: today } },
    data: { status: "COMPLETED" },
  });

  const bookings = await prisma.booking.findMany({
    where: { userId: session.user.id },
    include: {
      listing: { include: { images: { orderBy: { position: "asc" }, take: 1 } } },
      review: { select: { rating: true, comment: true } },
      payments: { where: { status: { in: ["REFUND_PENDING", "REFUNDED"] } }, select: { refundAmountPaise: true }, take: 1 },
    },
    orderBy: { checkIn: "desc" },
  });
  return <BookingDashboard bookings={bookings.map((booking) => ({
    id: booking.id,
    reference: booking.reference,
    status: booking.status,
    checkIn: booking.checkIn.toISOString().slice(0, 10),
    checkOut: booking.checkOut.toISOString().slice(0, 10),
    guests: booking.guests,
    nights: booking.nights,
    totalPrice: booking.totalPrice,
    listing: { id: booking.listing.id, slug: booking.listing.slug, title: booking.listing.title, city: booking.listing.city, image: booking.listing.images[0]?.url ?? null, hostId: booking.listing.hostId },
    review: booking.review,
    refundAmountPaise: booking.payments[0]?.refundAmountPaise ?? null,
  }))} />;
}
