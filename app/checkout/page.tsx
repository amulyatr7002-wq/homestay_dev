import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CheckoutClient from "@/components/checkout-client";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ searchParams }: { searchParams: { bookingId?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fbookings");
  if (!searchParams.bookingId) redirect("/explore");

  const booking = await prisma.booking.findFirst({
    where: { id: searchParams.bookingId, userId: session.user.id, status: "PENDING" },
    include: { listing: { include: { images: { orderBy: { position: "asc" }, take: 1 } } }, user: { select: { name: true, email: true } } },
  });
  if (!booking || !booking.expiresAt || booking.expiresAt <= new Date()) redirect("/bookings");

  return (
    <CheckoutClient booking={{
      id: booking.id,
      reference: booking.reference,
      expiresAt: booking.expiresAt.toISOString(),
      checkIn: booking.checkIn.toISOString().slice(0, 10),
      checkOut: booking.checkOut.toISOString().slice(0, 10),
      guests: booking.guests,
      nights: booking.nights,
      pricePerNight: booking.pricePerNight,
      cleaningFee: booking.cleaningFee,
      serviceFee: booking.serviceFee,
      taxes: booking.taxes,
      totalPrice: booking.totalPrice,
      listing: { slug: booking.listing.slug, title: booking.listing.title, city: booking.listing.city, image: booking.listing.images[0]?.url ?? null },
      guest: { name: booking.user.name, email: booking.user.email },
    }} />
  );
}
