import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveUser } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

type Day = { day: number; title: string; activities: string[] };

export const dynamic = "force-dynamic";

export default async function SavedTripsPage() {
  const user = await getActiveUser();
  if (!user) redirect("/login?callbackUrl=%2Ftrips");
  const trips = await prisma.savedTrip.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } });
  return <main className="saved-trips-page">
    <header><Link href="/" className="explore-brand"><span>n</span> namma<em>stay</em></Link><Link href="/bookings">Your bookings</Link></header>
    <p className="detail-section-kicker">YOUR SAVED PLANS</p><h1>My trips</h1><p className="saved-trips-intro">Itineraries you’ve built with your AI trip concierge.</p>
    {!trips.length ? <div className="workspace-empty"><h2>No saved itineraries yet</h2><p>Open the trip concierge and choose “Build my itinerary”.</p><Link className="button button-dark" href="/">Plan a trip</Link></div> : <div className="saved-trips-grid">
      {trips.map((trip) => {
        const itinerary = trip.itinerary as { days?: Day[] };
        return <article className="saved-trip-card" key={trip.id}><p className="detail-section-kicker">AI-GENERATED · {trip.createdAt.toLocaleDateString("en-IN")}</p><h2>{trip.title}</h2>{itinerary.days?.map((day) => <section key={day.day}><strong>Day {day.day}: {day.title}</strong><ul>{day.activities.map((activity) => <li key={activity}>{activity}</li>)}</ul></section>)}</article>;
      })}
    </div>}
  </main>;
}
