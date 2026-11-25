import { requirePageRole } from "@/lib/authorization";
import DashboardTitle from "@/components/dashboard-title";
import AdminBookings from "@/components/admin-bookings";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  await requirePageRole("ADMIN");
  return <div className="workspace-page"><DashboardTitle eyebrow="EVERY STAY, EVERY SETTLEMENT" title="Bookings & payments" /><AdminBookings /></div>;
}
