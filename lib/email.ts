import { Resend } from "resend";

type BookingEmail = {
  email: string;
  name: string;
  reference: string;
  title: string;
  checkIn: string;
  checkOut: string;
  total: number;
};

export async function sendBookingConfirmation(details: BookingEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info("Booking confirmation email (Resend not configured):", details);
    return;
  }

  const from = process.env.EMAIL_FROM;
  if (!from) {
    console.error("Booking email was not sent: EMAIL_FROM is not configured.");
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: details.email,
      subject: `Your stay is confirmed — ${details.reference}`,
      text: `Hello ${details.name},\n\nYour stay at ${details.title} is confirmed.\n\nBooking reference: ${details.reference}\nCheck-in: ${details.checkIn}\nCheck-out: ${details.checkOut}\nTotal paid: ₹${details.total.toLocaleString("en-IN")}\n\nWe look forward to welcoming you.`,
    });
    if (error) console.error("Resend could not deliver the booking confirmation:", error);
  } catch (error) {
    console.error("Resend request failed for booking confirmation:", error);
  }
}
