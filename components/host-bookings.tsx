"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Mail, Phone } from "lucide-react";

type Booking = { id: string; reference: string; status: string; checkIn: string; checkOut: string; guests: number; totalPrice: number; guestName: string; guestEmail: string; guestPhone: string; listingTitle: string; city: string };
type Tab = "requests" | "upcoming" | "current" | "past";

export default function HostBookings({ bookings }: { bookings: Booking[] }) {
  const [tab, setTab] = useState<Tab>("upcoming");
  const today = new Date().toISOString().slice(0, 10);
  const groups = useMemo(() => ({
    requests: [] as Booking[],
    upcoming: bookings.filter((booking) => booking.status === "CONFIRMED" && booking.checkIn.slice(0, 10) > today),
    current: bookings.filter((booking) => booking.status === "CONFIRMED" && booking.checkIn.slice(0, 10) <= today && booking.checkOut.slice(0, 10) > today),
    past: bookings.filter((booking) => booking.status === "COMPLETED" || booking.status === "CANCELLED" || booking.checkOut.slice(0, 10) <= today),
  }), [bookings, today]);
  const current = groups[tab];
  return <div className="host-bookings-content">
    <div className="booking-tabs">{(["requests", "upcoming", "current", "past"] as const).map((value) => <button type="button" key={value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{value[0].toUpperCase() + value.slice(1)} <span>{groups[value].length}</span></button>)}</div>
    {tab === "requests" && <p className="form-note">Request-to-book is not enabled. Guests confirm by completing checkout, so no host action is needed for pending payment holds.</p>}
    {current.length ? <div className="host-arrival-cards">{current.map((booking) => <article className="host-booking-card" key={booking.id}>
      <div className="host-booking-head"><div><p className="workspace-eyebrow">{booking.listingTitle} · {booking.city}</p><h2>{booking.guestName}</h2></div><span className={`status-pill status-pill-${booking.status.toLowerCase()}`}>{booking.status}</span></div>
      <p><CalendarDays size={15} /> {new Date(booking.checkIn).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} — {new Date(booking.checkOut).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {booking.guests} guests</p>
      <div className="host-booking-contact">{booking.guestEmail && <a href={`mailto:${booking.guestEmail}`}><Mail size={14} /> {booking.guestEmail}</a>}{booking.guestPhone && <a href={`tel:${booking.guestPhone}`}><Phone size={14} /> {booking.guestPhone}</a>}</div>
      <div className="host-booking-total"><span>Booking {booking.reference}</span><strong>₹{booking.totalPrice.toLocaleString("en-IN")}</strong></div>
    </article>)}</div> : tab !== "requests" && <div className="workspace-empty"><span>✳</span><strong>No {tab} stays</strong><p>When a guest confirms a trip, its details appear here.</p></div>}
  </div>;
}
