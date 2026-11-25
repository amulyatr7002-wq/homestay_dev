"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, Check, MapPin } from "lucide-react";
import UserMenu from "@/components/user-menu";

type Props = {
  reference: string;
  status: string;
  listing: string;
  city: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
};

export default function BookingConfirmation(props: Props) {
  const confirmed = props.status === "CONFIRMED";
  return (
    <main className="confirmation-page">
      <header className="guest-dashboard-header"><Link className="explore-brand" href="/"><span>n</span> namma<em>stay</em></Link><UserMenu /></header>
      <section className="confirmation-card">
        <motion.div className="confirmation-check" initial={{ scale: 0, rotate: -25 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 180, damping: 12, delay: 0.1 }}><Check size={30} /></motion.div>
        <p className="detail-section-kicker">{confirmed ? "A little something to look forward to" : "Payment received"}</p>
        <h1>{confirmed ? "You’re going somewhere." : "We’re confirming your stay."}</h1>
        <p className="confirmation-intro">{confirmed ? "Your host is looking forward to welcoming you. The details are tucked safely away in your trips." : "Your payment is in. We’re waiting for the booking confirmation and will update your trips shortly."}</p>
        <div className="confirmation-reference"><span>BOOKING REFERENCE</span><strong>{props.reference}</strong></div>
        <div className="confirmation-trip">
          <div className="confirmation-trip-title"><strong>{props.listing}</strong><span><MapPin size={13} /> {props.city}, Karnataka</span></div>
          <div className="confirmation-trip-dates"><CalendarDays size={15} /><span>{new Date(`${props.checkIn}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} — {new Date(`${props.checkOut}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span><small>{props.guests} guests</small></div>
          <div className="confirmation-trip-total"><span>{confirmed ? "Total paid" : "Reservation total"}</span><strong>₹{props.total.toLocaleString("en-IN")}</strong></div>
        </div>
        <Link className="confirmation-bookings-link" href="/bookings">See your stays <ArrowRight size={15} /></Link>
        <Link className="confirmation-home-link" href="/">Back to Namma Stay</Link>
      </section>
    </main>
  );
}
