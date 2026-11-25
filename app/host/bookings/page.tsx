import { requirePageRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import DashboardTitle from "@/components/dashboard-title";
import HostBookings from "@/components/host-bookings";

export const dynamic = "force-dynamic";

export default async function HostBookingsPage() {
  const host = await requirePageRole("HOST");
  const bookings = await prisma.booking.findMany({
    where: { listing: { hostId: host.id } },
    include: { user: { select: { name: true, email: true, phone: true } }, listing: { select: { title: true, city: true } }, payments: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { checkIn: "asc" },
  });
  return <div className="workspace-page"><DashboardTitle eyebrow="THE PEOPLE WHO COME THROUGH YOUR DOOR" title="Bookings" /><HostBookings bookings={bookings.map((booking) => ({ id: booking.id, reference: booking.reference, status: booking.status, checkIn: booking.checkIn.toISOString(), checkOut: booking.checkOut.toISOString(), guests: booking.guests, totalPrice: booking.totalPrice, guestName: booking.user.name || "Guest", guestEmail: booking.user.email || "", guestPhone: booking.user.phone || "", listingTitle: booking.listing.title, city: booking.listing.city }))} /></div>;
}
