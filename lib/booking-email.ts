import { prisma } from "@/lib/prisma";
import { sendBookingConfirmation } from "@/lib/email";

export async function emailBookingConfirmation(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: { select: { name: true, email: true } }, listing: { select: { title: true } } },
  });
  if (!booking?.user.email) {
    console.info(`Booking ${bookingId} is confirmed; no guest email address is available.`);
    return;
  }
  await sendBookingConfirmation({
    email: booking.user.email,
    name: booking.user.name || "traveller",
    reference: booking.reference,
    title: booking.listing.title,
    checkIn: booking.checkIn.toISOString().slice(0, 10),
    checkOut: booking.checkOut.toISOString().slice(0, 10),
    total: booking.totalPrice,
  });
}
