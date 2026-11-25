"use client";

import { useCallback, useEffect, useState } from "react";
import DataTable, { type TableColumn } from "@/components/data-table";
import { toast } from "sonner";

type UserRow = { id: string; name: string | null; email: string | null; role: string; suspendedAt: string | null; createdAt: string; _count: { bookings: number; listings: number } };

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (query) params.set("q", query);
    if (role) params.set("role", role);
    const response = await fetch(`/api/admin/users?${params}`, { cache: "no-store" });
    const result: { users?: UserRow[]; total?: number; error?: string } = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load users.");
    setUsers(result.users ?? []);
    setTotal(result.total ?? 0);
    setLoading(false);
  }, [page, query, role]);
  useEffect(() => { void load().catch((error: unknown) => { toast.error(error instanceof Error ? error.message : "Could not load users."); setLoading(false); }); }, [load]);

  async function act(user: UserRow, action: "suspend" | "restore" | "role", nextRole?: string) {
    setBusy(user.id);
    try {
      const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id, action, ...(nextRole ? { role: nextRole } : {}) }) });
      const result: { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update account.");
      toast.success(action === "role" ? "User role updated." : action === "suspend" ? "Account suspended." : "Account restored.");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update account."); }
    finally { setBusy(""); }
  }

  const columns: TableColumn<UserRow>[] = [
    { key: "name", label: "Member", render: (_, user) => <span><strong>{user.name || "Unnamed member"}</strong><small className="table-subline">{user.email || "No email"}</small></span> },
    { key: "role", label: "Role", render: (_, user) => <select aria-label={`Role for ${user.name || user.email}`} value={user.role} disabled={busy === user.id} onChange={(event) => void act(user, "role", event.target.value)}>{["GUEST", "HOST", "ADMIN"].map((item) => <option key={item} value={item}>{item}</option>)}</select> },
    { key: "createdAt", label: "Joined", render: (value) => new Date(String(value)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
    { key: "_count", label: "Activity", render: (_, user) => `${user._count.bookings} bookings · ${user._count.listings} listings` },
    { key: "suspendedAt", label: "Access", render: (_, user) => <div className="table-actions"><span className={`status-pill ${user.suspendedAt ? "status-pill-rejected" : "status-pill-published"}`}>{user.suspendedAt ? "Suspended" : "Active"}</span><button type="button" disabled={busy === user.id} onClick={() => void act(user, user.suspendedAt ? "restore" : "suspend")}>{user.suspendedAt ? "Restore" : "Suspend"}</button></div> },
  ];
  return <div className="admin-users-panel">
    <form className="admin-filter-bar" onSubmit={(event) => { event.preventDefault(); setPage(1); setQuery(q.trim()); }}><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search name or email" /><select value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }}><option value="">All roles</option><option value="GUEST">Guest</option><option value="HOST">Host</option><option value="ADMIN">Admin</option></select><button className="button button-dark" type="submit">Search</button></form>
    <DataTable rows={users} columns={columns} loading={loading} emptyTitle="No members found" emptyDescription="Try a different search or role filter." />
    {total > 20 && <div className="table-pagination"><span>{Math.min((page - 1) * 20 + 1, total)}–{Math.min(page * 20, total)} of {total}</span><div><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>←</button><button type="button" disabled={page * 20 >= total} onClick={() => setPage((value) => value + 1)}>→</button></div></div>}
  </div>;
}
