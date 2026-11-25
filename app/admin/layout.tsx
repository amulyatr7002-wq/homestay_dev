import Link from "next/link";
import { BarChart3, ClipboardList, Flag, LayoutDashboard, ListChecks, ScrollText, Users, WalletCards } from "lucide-react";
import { requirePageRole } from "@/lib/authorization";

const links = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/listings", label: "Listing review", icon: ListChecks },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/bookings", label: "Bookings & payments", icon: WalletCards },
  { href: "/admin/collections", label: "Featured collections", icon: BarChart3 },
  { href: "/admin/flags", label: "Flagged content", icon: Flag },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
];

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole("ADMIN");
  return (
    <div className="workspace-shell admin-workspace-shell">
      <aside className="workspace-sidebar admin-sidebar">
        <Link className="workspace-brand" href="/"><span>n</span> namma<em>stay</em></Link>
        <p className="workspace-label">ADMIN CONTROL</p>
        <nav aria-label="Admin panel">
          {links.map(({ href, label, icon: Icon }) => <Link href={href} key={href}><Icon size={17} />{label}</Link>)}
        </nav>
        <Link className="workspace-back-link" href="/">← View the platform</Link>
      </aside>
      <main className="workspace-main">{children}</main>
    </div>
  );
}
