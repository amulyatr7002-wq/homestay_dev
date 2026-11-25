import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import BookingConfirmation from "@/components/booking-confirmation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function BookingConfirmationPage({ params }: { params: { reference: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fbookings");
  const booking = await prisma.booking.findFirst({
    where: { reference: params.reference, userId: session.user.id },
    include: { listing: { select: { title: true, city: true } } },
  });
  if (!booking) notFound();

  return <BookingConfirmation
    reference={booking.reference}
    status={booking.status}
    listing={booking.listing.title}
    city={booking.listing.city}
    checkIn={booking.checkIn.toISOString().slice(0, 10)}
    checkOut={booking.checkOut.toISOString().slice(0, 10)}
    guests={booking.guests}
    total={booking.totalPrice}
  />;
}
