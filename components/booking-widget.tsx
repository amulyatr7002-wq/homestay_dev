"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, LoaderCircle, UsersRound } from "lucide-react";
import { toast } from "sonner";

type Props = { listingSlug: string; price: number; weekendPrice: number | null; cleaningFee: number; maxGuests: number };

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function displayDate(value: string) {
  if (!value) return "Choose date";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function BookingWidget({ listingSlug, price, weekendPrice, cleaningFee, maxGuests }: Props) {
  const { status } = useSession();
  const router = useRouter();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(Math.min(2, maxGuests));
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());
  const [nightlyPrices, setNightlyPrices] = useState<Record<string, number>>({});
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  useEffect(() => {
    const from = localDateKey(new Date());
    const end = new Date();
    end.setMonth(end.getMonth() + 14);
    const controller = new AbortController();
    fetch(`/api/listings/${encodeURIComponent(listingSlug)}/availability?from=${from}&to=${localDateKey(end)}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load available dates.");
        setBookedDates(new Set(result.bookedDates as string[]));
        setNightlyPrices((result.nightlyPrices ?? {}) as Record<string, number>);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Could not load listing availability:", error);
        setAvailabilityError("Availability could not be loaded. Please try again.");
      })
      .finally(() => setAvailabilityLoading(false));
    return () => controller.abort();
  }, [listingSlug]);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    return Math.max(0, Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86_400_000));
  }, [checkIn, checkOut]);
  const subtotal = useMemo(() => {
    if (!checkIn || !checkOut || !nights) return 0;
    let total = 0;
    for (const date = new Date(`${checkIn}T00:00:00Z`); date < new Date(`${checkOut}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + 1)) {
      const key = date.toISOString().slice(0, 10);
      total += nightlyPrices[key] ?? ([5, 6].includes(date.getUTCDay()) ? weekendPrice : null) ?? price;
    }
    return total;
  }, [checkIn, checkOut, nightlyPrices, nights, price, weekendPrice]);
  const activeCleaningFee = nights ? cleaningFee : 0;
  const serviceFee = nights ? Math.round(subtotal * 0.08) : 0;
  const taxes = nights ? Math.round((subtotal + activeCleaningFee + serviceFee) * 0.05) : 0;
  const total = subtotal + activeCleaningFee + serviceFee + taxes;

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const todayKey = localDateKey(new Date());

  function chooseDate(day: number) {
    const chosen = localDateKey(new Date(month.getFullYear(), month.getMonth(), day));
    if (!checkIn || checkOut || chosen <= checkIn) {
      setCheckIn(chosen);
      setCheckOut("");
      return;
    }

    const start = new Date(`${checkIn}T00:00:00Z`);
    const end = new Date(`${chosen}T00:00:00Z`);
    for (const date = new Date(start); date < end; date.setUTCDate(date.getUTCDate() + 1)) {
      if (bookedDates.has(date.toISOString().slice(0, 10))) {
        toast.error("Those dates include a night that’s already booked.");
        setCheckIn(chosen);
        setCheckOut("");
        return;
      }
    }
    setCheckOut(chosen);
  }

  function canSelect(day: number) {
    const key = localDateKey(new Date(month.getFullYear(), month.getMonth(), day));
    if (key < todayKey || bookedDates.has(key)) return false;
    if (!checkIn || checkOut || key <= checkIn) return true;
    const start = new Date(`${checkIn}T00:00:00Z`);
    const end = new Date(`${key}T00:00:00Z`);
    for (const date = new Date(start); date < end; date.setUTCDate(date.getUTCDate() + 1)) {
      if (bookedDates.has(date.toISOString().slice(0, 10))) return false;
    }
    return true;
  }

  async function beginBooking() {
    if (!checkIn || !checkOut || !nights) {
      toast.error("Choose available check-in and check-out dates first.");
      return;
    }
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/listings/${listingSlug}`)}`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingSlug, checkIn, checkOut, guests }),
      });
      const result: { booking?: { id: string }; error?: string } = await response.json();
      if (!response.ok || !result.booking) {
        toast.error(result.error || "Those dates couldn’t be reserved. Please try again.");
        return;
      }
      router.push(`/checkout?bookingId=${encodeURIComponent(result.booking.id)}`);
    } catch (error) {
      console.error("Booking request failed:", error);
      toast.error("We couldn’t start your booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <aside className="booking-widget">
      <div className="booking-price"><strong>₹{price.toLocaleString("en-IN")}</strong> <span>/ night</span><small>Before fees and taxes</small></div>
      <div className="booking-range-label">
        <CalendarDays size={15} />
        <div><span>Check in</span><strong>{displayDate(checkIn)}</strong></div>
        <ArrowRight size={14} />
        <div><span>Check out</span><strong>{displayDate(checkOut)}</strong></div>
      </div>
      <div className="date-picker">
        <div className="calendar-heading">
          <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} disabled={month.getMonth() === new Date().getMonth() && month.getFullYear() === new Date().getFullYear()}><ArrowLeft size={14} /></button>
          <strong>{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</strong>
          <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ArrowRight size={14} /></button>
        </div>
        <div className="calendar-grid calendar-weekdays">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day}>{day}</span>)}</div>
        {availabilityLoading ? <p className="calendar-status">Checking the calendar…</p> : (
          <div className="calendar-grid">
            {Array.from({ length: firstDay }, (_, index) => <span className="calendar-empty" key={`empty-${index}`} />)}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1;
              const key = localDateKey(new Date(month.getFullYear(), month.getMonth(), day));
              const selected = key === checkIn || key === checkOut;
              const inRange = checkIn && checkOut && key > checkIn && key < checkOut;
              return (
                <button
                  type="button"
                  key={key}
                  disabled={!canSelect(day) || availabilityLoading}
                  className={`${selected ? "selected" : ""}${inRange ? " in-range" : ""}${bookedDates.has(key) ? " booked" : ""}`}
                  aria-label={`${key}${bookedDates.has(key) ? ", unavailable" : ""}`}
                  onClick={() => chooseDate(day)}
                >{day}</button>
              );
            })}
          </div>
        )}
        {availabilityError && <p className="calendar-error" role="alert">{availabilityError}</p>}
      </div>
      <label className="booking-guests"><UsersRound size={15} /><span>Guests</span>
        <select value={guests} onChange={(event) => setGuests(Number(event.target.value))}>
          {Array.from({ length: maxGuests }, (_, index) => index + 1).map((guest) => <option key={guest} value={guest}>{guest} {guest === 1 ? "guest" : "guests"}</option>)}
        </select>
      </label>
      <button className="booking-check-button" type="button" onClick={beginBooking} disabled={submitting || !nights || Boolean(availabilityError)}>
        {submitting ? <><LoaderCircle size={15} className="spin" /> Reserving dates…</> : status === "authenticated" ? "Continue to secure checkout" : "Sign in to book"}
      </button>
      <p className="booking-note">You won&apos;t be charged until checkout.</p>
      {nights > 0 && (
        <div className="booking-breakdown">
          <div><span>Nightly rates · {nights} {nights === 1 ? "night" : "nights"}</span><strong>₹{subtotal.toLocaleString("en-IN")}</strong></div>
          <div><span>Cleaning fee</span><strong>₹{activeCleaningFee.toLocaleString("en-IN")}</strong></div>
          <div><span>Service fee</span><strong>₹{serviceFee.toLocaleString("en-IN")}</strong></div>
          <div><span>Taxes</span><strong>₹{taxes.toLocaleString("en-IN")}</strong></div>
          <div className="booking-total"><span>Total (INR)</span><strong>₹{total.toLocaleString("en-IN")}</strong></div>
        </div>
      )}
    </aside>
  );
}
