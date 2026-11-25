"use client";

import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import UserMenu from "@/components/user-menu";

type Props = {
  booking: {
    id: string;
    reference: string;
    expiresAt: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    nights: number;
    pricePerNight: number;
    cleaningFee: number;
    serviceFee: number;
    taxes: number;
    totalPrice: number;
    listing: { slug: string; title: string; city: string; image: string | null };
    guest: { name: string | null; email: string | null };
  };
};

export default function CheckoutClient({ booking }: Props) {
  const router = useRouter();
  const [scriptReady, setScriptReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const completed = useRef(false);

  async function releaseHold() {
    try {
      await fetch("/api/bookings/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
    } catch (error) {
      console.error("Could not release the dismissed booking hold:", error);
    }
  }

  async function pay() {
    if (!window.Razorpay) {
      toast.error("Secure checkout is still loading. Please try again in a moment.");
      return;
    }
    setProcessing(true);
    try {
      const orderResponse = await fetch("/api/payments/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const order: { keyId?: string; orderId?: string; amount?: number; currency?: string; reference?: string; error?: string } = await orderResponse.json();
      if (!orderResponse.ok || !order.keyId || !order.orderId || !order.amount || !order.currency) {
        throw new Error(order.error || "Secure checkout could not be started.");
      }

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Namma Stay",
        description: `Stay at ${booking.listing.title}`,
        order_id: order.orderId,
        prefill: { name: booking.guest.name || "", email: booking.guest.email || "" },
        notes: { bookingReference: booking.reference },
        theme: { color: "#263d31" },
        handler: async (response) => {
          completed.current = true;
          const verification = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId: booking.id, ...response }),
          });
          const result: { bookingReference?: string; error?: string } = await verification.json();
          if (!verification.ok || !result.bookingReference) {
            toast.error(result.error || "Payment confirmation is pending. Check your bookings shortly.");
            router.push("/bookings");
            return;
          }
          toast.success("Your stay is confirmed.");
          router.push(`/bookings/confirmation/${encodeURIComponent(result.bookingReference)}`);
        },
        modal: {
          ondismiss: () => {
            if (!completed.current) {
              void releaseHold();
              toast.info("Your date hold was released.");
              router.push("/bookings");
            }
          },
        },
      });
      checkout.on("payment.failed", (response) => {
        console.error("Razorpay payment failed:", response.error);
        void releaseHold();
        toast.error("Payment didn’t go through. Your dates have been released.");
        router.push("/bookings");
      });
      checkout.open();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Secure checkout could not be started.";
      toast.error(message);
      setProcessing(false);
    }
  }

  return (
    <main className="checkout-page">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" onLoad={() => setScriptReady(true)} onError={() => toast.error("Razorpay Checkout couldn’t load. Check your connection and try again.")} />
      <header className="detail-header">
        <Link className="explore-brand" href="/"><span>n</span> namma<em>stay</em></Link>
        <div className="checkout-header-right"><UserMenu /><span><LockKeyhole size={13} /> Secure checkout</span></div>
      </header>
      <div className="checkout-container">
        <Link href={`/listings/${encodeURIComponent(booking.listing.slug)}`} className="checkout-back"><ArrowLeft size={14} /> Your reservation</Link>
        <div className="checkout-layout">
          <section className="checkout-main">
            <p className="detail-section-kicker">Just one more step</p>
            <h1>Make it <em>official.</em></h1>
            <p className="checkout-intro">Your dates are held for a little while. Payment is securely processed by Razorpay.</p>
            <div className="checkout-summary-card">
              {booking.listing.image && <Image src={booking.listing.image} alt="" width={100} height={80} />}
              <div><span>{booking.listing.city} · Karnataka</span><strong>{booking.listing.title}</strong><small>Booking reference · {booking.reference}</small></div>
            </div>
            <div className="checkout-trip-dates">
              <div><span>CHECK-IN</span><strong>{new Date(`${booking.checkIn}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</strong></div>
              <ArrowRight size={17} />
              <div><span>CHECK-OUT</span><strong>{new Date(`${booking.checkOut}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</strong></div>
              <small>{booking.nights} {booking.nights === 1 ? "night" : "nights"} · {booking.guests} guests</small>
            </div>
            <div className="checkout-security"><ShieldCheck size={19} /><span><strong>Your payment is protected</strong><small>Card details are handled by Razorpay and never stored on Namma Stay.</small></span></div>
            <button type="button" className="checkout-pay-button" onClick={() => void pay()} disabled={!scriptReady || processing}>
              {processing ? <><LoaderCircle size={16} className="spin" /> Opening secure checkout…</> : <>Pay ₹{booking.totalPrice.toLocaleString("en-IN")} <ArrowRight size={16} /></>}
            </button>
            {!scriptReady && <p className="checkout-script-note">Preparing secure checkout…</p>}
            <p className="checkout-expiry">This reservation hold expires at {new Date(booking.expiresAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}.</p>
          </section>
          <aside className="checkout-price-card">
            <h2>Price breakdown</h2>
            <div><span>₹{booking.pricePerNight.toLocaleString("en-IN")} × {booking.nights} {booking.nights === 1 ? "night" : "nights"}</span><strong>₹{(booking.pricePerNight * booking.nights).toLocaleString("en-IN")}</strong></div>
            <div><span>Cleaning fee</span><strong>₹{booking.cleaningFee.toLocaleString("en-IN")}</strong></div>
            <div><span>Service fee</span><strong>₹{booking.serviceFee.toLocaleString("en-IN")}</strong></div>
            <div><span>Taxes</span><strong>₹{booking.taxes.toLocaleString("en-IN")}</strong></div>
            <div className="checkout-total"><span>Total (INR)</span><strong>₹{booking.totalPrice.toLocaleString("en-IN")}</strong></div>
            <p>Cancellation policy: full refund more than 7 days before check-in; 50% otherwise.</p>
          </aside>
        </div>
      </div>
    </main>
  );
}
