"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, CircleDollarSign } from "lucide-react";
import { toast } from "sonner";

type ListingOption = { id: string; title: string; status: string };
type Booking = { reference: string; checkIn: string; checkOut: string; status: string };
type Override = { date: string; isBlocked: boolean; pricePerNight: number | null };
function keyFor(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }

export default function HostCalendar({ listings }: { listings: ListingOption[] }) {
  const [listingId, setListingId] = useState(listings[0]?.id ?? "");
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: count }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1))] as Array<Date | null>;
  }, [month]);

  const load = useCallback(async () => {
    if (!listingId) return;
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const response = await fetch(`/api/host/calendar?listingId=${listingId}&from=${keyFor(start)}&to=${keyFor(end)}`, { cache: "no-store" });
    const result: { bookings?: Booking[]; overrides?: Override[]; error?: string } = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load calendar.");
    setBookings(result.bookings ?? []);
    setOverrides((result.overrides ?? []).map((item) => ({ ...item, date: item.date.slice(0, 10) })));
  }, [listingId, month]);
  useEffect(() => { void load().catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not load calendar.")); }, [load]);

  async function updateCalendar(action: "block" | "unblock" | "price") {
    if (!listingId || !from || !to) { toast.error("Choose a stay and a date range first."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/host/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, from, to, action, ...(action === "price" ? { pricePerNight: Number(price) } : {}) }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update calendar.");
      toast.success(action === "block" ? "Dates blocked." : action === "unblock" ? "Blocked dates reopened." : "Custom prices saved.");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update calendar."); }
    finally { setBusy(false); }
  }

  function dateClass(date: Date | null) {
    if (!date) return "host-calendar-empty";
    const key = keyFor(date);
    const booking = bookings.find((item) => item.checkIn.slice(0, 10) <= key && item.checkOut.slice(0, 10) > key);
    const override = overrides.find((item) => item.date === key);
    return `host-calendar-day${booking ? " is-booked" : ""}${override?.isBlocked ? " is-blocked" : ""}${override?.pricePerNight ? " has-custom-price" : ""}`;
  }
  if (!listings.length) return <div className="workspace-empty"><CalendarDays size={28} /><strong>Create a listing to open its calendar</strong><p>Availability tools appear when you have a home in your studio.</p></div>;

  return <div className="calendar-workspace">
    <div className="calendar-toolbar"><label>Choose a stay<select value={listingId} onChange={(event) => setListingId(event.target.value)}>{listings.map((listing) => <option value={listing.id} key={listing.id}>{listing.title} · {listing.status.replaceAll("_", " ")}</option>)}</select></label>
      <div className="calendar-month-nav"><button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ArrowLeft size={16} /></button><strong>{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</strong><button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ArrowRight size={16} /></button></div>
    </div>
    <section className="calendar-board"><div className="host-calendar-grid host-calendar-weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div><div className="host-calendar-grid">{days.map((date, index) => date ? <div className={dateClass(date)} key={keyFor(date)}><strong>{date.getDate()}</strong>{bookings.some((item) => item.checkIn.slice(0, 10) <= keyFor(date) && item.checkOut.slice(0, 10) > keyFor(date)) && <small>Booked</small>}{overrides.find((item) => item.date === keyFor(date))?.isBlocked && <small>Blocked</small>}{overrides.find((item) => item.date === keyFor(date))?.pricePerNight && <small>₹{overrides.find((item) => item.date === keyFor(date))?.pricePerNight?.toLocaleString("en-IN")}</small>}</div> : <span className="host-calendar-empty" key={`empty-${index}`} />)}</div>
      <div className="calendar-legend"><span className="legend-booked" /> Booked <span className="legend-blocked" /> Blocked <span className="legend-price" /> Custom rate</div>
    </section>
    <section className="calendar-edit-card"><div><p className="workspace-eyebrow">SHAPE YOUR AVAILABILITY</p><h2>Dates & nightly prices</h2><p>Choose an inclusive date range. Booked nights can’t be blocked.</p></div>
      <div className="host-form-grid"><label>From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>Through<input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} /></label></div>
      <label className="calendar-price-input"><CircleDollarSign size={16} /><span>Custom nightly price (₹)</span><input type="number" min={500} max={1000000} value={price} onChange={(event) => setPrice(event.target.value)} placeholder="e.g. 6500" /></label>
      <div className="calendar-actions"><button type="button" className="quiet-button" disabled={busy} onClick={() => void updateCalendar("block")}>Block dates</button><button type="button" className="quiet-button" disabled={busy} onClick={() => void updateCalendar("unblock")}>Reopen dates</button><button type="button" className="button button-dark" disabled={busy || !price} onClick={() => void updateCalendar("price")}>Save custom price</button></div>
    </section>
  </div>;
}
