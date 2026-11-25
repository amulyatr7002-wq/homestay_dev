import Link from "next/link";
import { LayoutDashboard, CalendarDays, Home, MessageCircle, Star, WalletCards } from "lucide-react";
import { requirePageRole } from "@/lib/authorization";

const links = [
  { href: "/host", label: "Overview", icon: LayoutDashboard },
  { href: "/host/listings", label: "Listings", icon: Home },
  { href: "/host/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/host/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/host/reviews", label: "Reviews", icon: Star },
  { href: "/host/earnings", label: "Earnings", icon: WalletCards },
  { href: "/host/inbox", label: "Inbox", icon: MessageCircle },
];

export const dynamic = "force-dynamic";

export default async function HostLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole("HOST");
  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <Link className="workspace-brand" href="/"><span>n</span> namma<em>stay</em></Link>
        <p className="workspace-label">HOST STUDIO</p>
        <nav aria-label="Host dashboard">
          {links.map(({ href, label, icon: Icon }) => <Link href={href} key={href}><Icon size={17} />{label}</Link>)}
        </nav>
        <Link className="workspace-back-link" href="/explore">← Back to exploring</Link>
      </aside>
      <main className="workspace-main">{children}</main>
    </div>
  );
}
