"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CalendarDays, Check, ChevronDown, ChevronUp, Clock3, MapPin, Star, X } from "lucide-react";
import { toast } from "sonner";
import UserMenu from "@/components/user-menu";

export type BookingCardData = {
  id: string;
  reference: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  totalPrice: number;
  listing: { id: string; slug: string; title: string; city: string; image: string | null; hostId: string | null };
  review: { rating: number; comment: string } | null;
  refundAmountPaise: number | null;
};

function BookingCard({ booking }: { booking: BookingCardData }) {
  const [cancelled, setCancelled] = useState(booking.status === "CANCELLED");
  const [refundAmount, setRefundAmount] = useState(booking.refundAmountPaise ? booking.refundAmountPaise / 100 : null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [working, setWorking] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(Boolean(booking.review));

  async function cancelBooking() {
    if (!window.confirm("Cancel this stay? The refund amount follows the displayed cancellation policy.")) return;
    setWorking(true);
    try {
      const response = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const result: { error?: string; refundPercent?: number; refundAmount?: number; refundPending?: boolean } = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not cancel this stay.");
      setCancelled(true);
      setRefundAmount(result.refundAmount ?? 0);
      toast.success(result.refundPending
        ? `Stay cancelled. Refund of ₹${result.refundAmount?.toLocaleString("en-IN")} is pending.`
        : result.refundAmount
          ? `Stay cancelled. Your ${result.refundPercent}% refund is being processed.`
          : "Stay cancelled.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel this stay.");
    } finally {
      setWorking(false);
    }
  }

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, rating, comment }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save your review.");
      setReviewSubmitted(true);
      setReviewOpen(false);
      toast.success("Thank you for sharing your stay.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your review.");
    } finally {
      setWorking(false);
    }
  }

  const dateRange = `${new Date(`${booking.checkIn}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} — ${new Date(`${booking.checkOut}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
  const canCancel = !cancelled && (booking.status === "CONFIRMED" || booking.status === "PENDING") && new Date(`${booking.checkIn}T00:00:00`) > new Date();
  const canReview = booking.status === "COMPLETED";

  return (
    <article className={`booking-card ${cancelled ? "booking-card-cancelled" : ""}`}>
      <Link href={`/listings/${booking.listing.slug}`} className="booking-card-image">
        {booking.listing.image ? <Image src={booking.listing.image} alt="" fill sizes="(max-width: 700px) 90vw, 35vw" /> : <span />}
      </Link>
      <div className="booking-card-content">
        <div className="booking-card-head">
          <div><span className="booking-card-city"><MapPin size={12} /> {booking.listing.city}, Karnataka</span><h2><Link href={`/listings/${booking.listing.slug}`}>{booking.listing.title}</Link></h2></div>
          <span className={`booking-status status-${cancelled ? "CANCELLED" : booking.status}`}>{cancelled ? "CANCELLED" : booking.status}</span>
        </div>
        <p className="booking-card-dates"><CalendarDays size={14} /> {dateRange} <span>·</span> {booking.nights} {booking.nights === 1 ? "night" : "nights"} <span>·</span> {booking.guests} guests</p>
        <p className="booking-reference">Booking reference <strong>{booking.reference}</strong></p>
        <div className="booking-card-footer">
          <strong className="booking-card-total">₹{booking.totalPrice.toLocaleString("en-IN")} <small>total</small></strong>
          {cancelled && refundAmount !== null && refundAmount > 0 && <span className="booking-refund">Refund due: ₹{refundAmount.toLocaleString("en-IN")}</span>}
          {canCancel && <button className="booking-cancel-button" type="button" disabled={working} onClick={() => void cancelBooking()}><X size={13} /> Cancel stay</button>}
          {booking.status === "PENDING" && !cancelled && <Link className="booking-resume-link" href={`/checkout?bookingId=${encodeURIComponent(booking.id)}`}><Clock3 size={13} /> Continue payment</Link>}
          {booking.listing.hostId && (booking.status === "CONFIRMED" || booking.status === "COMPLETED") && <Link className="booking-resume-link" href={`/inbox?listingId=${encodeURIComponent(booking.listing.id)}`}>Message host</Link>}
          {canReview && !reviewSubmitted && <button className="booking-review-toggle" type="button" onClick={() => setReviewOpen((open) => !open)}>Leave a review {reviewOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>}
        </div>
        {canCancel && <p className="booking-cancellation-policy">Full refund more than 7 days before check-in; 50% otherwise.</p>}
        {booking.review && <p className="existing-review"><span>{Array.from({ length: booking.review.rating }, () => "★").join("")}</span> {booking.review.comment}</p>}
        {reviewOpen && canReview && !reviewSubmitted && (
          <form className="review-form" onSubmit={(event) => void submitReview(event)}>
            <label>Your rating <span className="review-stars">
              {Array.from({ length: 5 }, (_, index) => (
                <button type="button" aria-label={`${index + 1} stars`} key={index} onClick={() => setRating(index + 1)}><Star size={19} fill={index < rating ? "currentColor" : "none"} /></button>
              ))}
            </span></label>
            <textarea required minLength={10} maxLength={2000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="What made this stay special?" />
            <button type="submit" disabled={working}><Check size={14} /> Share your review</button>
          </form>
        )}
      </div>
    </article>
  );
}

export default function BookingDashboard({ bookings }: { bookings: BookingCardData[] }) {
  const now = new Date();
  const upcoming = bookings.filter((booking) => !["CANCELLED", "COMPLETED"].includes(booking.status) && new Date(`${booking.checkOut}T00:00:00`) >= now);
  const past = bookings.filter((booking) => booking.status === "COMPLETED");
  const cancelled = bookings.filter((booking) => booking.status === "CANCELLED");
  const [tab, setTab] = useState<"upcoming" | "past" | "cancelled">("upcoming");
  const selected = tab === "upcoming" ? upcoming : tab === "past" ? past : cancelled;

  return (
    <main className="guest-dashboard">
      <header className="guest-dashboard-header"><Link className="explore-brand" href="/"><span>n</span> namma<em>stay</em></Link><UserMenu /></header>
      <section className="guest-dashboard-content">
        <p className="detail-section-kicker">Your journey, kept close</p>
        <h1>Your <em>stays.</em></h1>
        <p className="dashboard-intro">Every place, every story, right where you left it.</p>
        <div className="booking-tabs" role="tablist">
          {(["upcoming", "past", "cancelled"] as const).map((value) => (
            <button type="button" role="tab" aria-selected={tab === value} className={tab === value ? "active" : ""} key={value} onClick={() => setTab(value)}>
              {value === "upcoming" ? "Upcoming" : value === "past" ? "Past stays" : "Cancelled"} <span>{value === "upcoming" ? upcoming.length : value === "past" ? past.length : cancelled.length}</span>
            </button>
          ))}
        </div>
        {selected.length ? <div className="booking-card-list">{selected.map((booking) => <BookingCard booking={booking} key={booking.id} />)}</div> : (
          <div className="dashboard-empty"><span>✳</span><h2>{tab === "upcoming" ? "A little space for your next story." : tab === "past" ? "Your travel stories will live here." : "No cancelled stays."}</h2><p>{tab === "upcoming" ? "When you find a stay you love, it’ll show up here." : "The good memories are still yours."}</p><Link href="/explore">Explore stays <ArrowRight size={14} /></Link></div>
        )}
      </section>
    </main>
  );
}
