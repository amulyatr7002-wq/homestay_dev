"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { CalendarDays, Heart, LogIn, LogOut, MessageCircle, UserRound } from "lucide-react";

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (session?.user?.role !== "HOST") { setUnread(0); return; }
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/inbox/unread", { cache: "no-store" });
        if (!response.ok) return;
        const result: { unread?: number } = await response.json();
        if (active) setUnread(result.unread ?? 0);
      } catch (error) {
        console.error("Could not refresh the unread message badge:", error);
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [session?.user?.role]);

  if (status === "loading") return <span className="user-menu-loading" aria-label="Loading account" />;
  if (!session?.user) {
    return <Link className="user-login-link" href="/login"><LogIn size={15} /> <span>Sign in</span></Link>;
  }

  const name = session.user.name || session.user.email || "Guest";
  const initials = name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (
    <div className="user-menu">
      <button className="user-menu-trigger" type="button" aria-expanded={open} aria-label="Open account menu" onClick={() => setOpen((value) => !value)}>
        {session.user.image
          ? <span className="user-avatar user-avatar-photo" style={{ backgroundImage: `url("${session.user.image}")` }} />
          : <span className="user-avatar">{initials}</span>}
        <span className="user-menu-name">{session.user.name?.split(" ")[0] || "Account"}</span>
      </button>
      {open && (
        <div className="user-menu-dropdown">
          <div className="user-menu-identity"><strong>{name}</strong><span>{session.user.email}</span></div>
          <Link href="/bookings" onClick={() => setOpen(false)}><CalendarDays size={15} /> Your stays</Link>
          <Link href="/wishlist" onClick={() => setOpen(false)}><Heart size={15} /> Wishlist</Link>
          {session.user.role === "HOST" || session.user.role === "ADMIN" ? (
            <Link href={session.user.role === "ADMIN" ? "/admin" : "/host"} onClick={() => setOpen(false)}>
              <UserRound size={15} /> {session.user.role === "ADMIN" ? "Admin panel" : "Host dashboard"}
            </Link>
          ) : (
            <Link href="/become-a-host" onClick={() => setOpen(false)}><UserRound size={15} /> Become a host</Link>
          )}
          {session.user.role === "HOST" && (
            <Link href="/host/inbox" onClick={() => setOpen(false)} className="user-inbox-link"><MessageCircle size={15} /> Guest inbox {unread > 0 && <span className="user-unread-badge">{unread > 99 ? "99+" : unread}</span>}</Link>
          )}
          {session.user.role === "GUEST" && (
            <Link href="/inbox" onClick={() => setOpen(false)}><MessageCircle size={15} /> Messages</Link>
          )}
          <button type="button" onClick={() => void signOut({ callbackUrl: "/" })}><LogOut size={15} /> Sign out</button>
        </div>
      )}
    </div>
  );
}
