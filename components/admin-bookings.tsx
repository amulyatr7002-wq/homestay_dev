"use client";

import { useCallback, useEffect, useState } from "react";
import DataTable, { type TableColumn } from "@/components/data-table";
import { toast } from "sonner";

type Payment = { id: string; status: string; amountPaise: number; refundAmountPaise: number | null; createdAt: string };
type Booking = { id: string; reference: string; status: string; checkIn: string; checkOut: string; totalPrice: number; user: { name: string | null; email: string | null }; listing: { title: string }; payments: Payment[] };
type Row = { id: string; reference: string; guest: string; stay: string; dates: string; bookingStatus: string; paymentStatus: string; amount: number; refund: number | null };

export default function AdminBookings() {
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/admin/bookings?page=${page}`, { cache: "no-store" });
    const result: { bookings?: Booking[]; total?: number; error?: string } = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load booking records.");
    setRows((result.bookings ?? []).flatMap((booking) => booking.payments.length
      ? booking.payments.map((payment) => ({ id: payment.id, reference: booking.reference, guest: booking.user.name || booking.user.email || "Guest", stay: booking.listing.title, dates: `${booking.checkIn.slice(0, 10)} – ${booking.checkOut.slice(0, 10)}`, bookingStatus: booking.status, paymentStatus: payment.status, amount: payment.amountPaise / 100, refund: payment.refundAmountPaise === null ? null : payment.refundAmountPaise / 100 }))
      : [{ id: booking.id, reference: booking.reference, guest: booking.user.name || booking.user.email || "Guest", stay: booking.listing.title, dates: `${booking.checkIn.slice(0, 10)} – ${booking.checkOut.slice(0, 10)}`, bookingStatus: booking.status, paymentStatus: "NO PAYMENT", amount: booking.totalPrice, refund: null }]));
    setTotal(result.total ?? 0);
    setLoading(false);
  }, [page]);
  useEffect(() => { void load().catch((error: unknown) => { toast.error(error instanceof Error ? error.message : "Could not load booking records."); setLoading(false); }); }, [load]);

  async function markProcessed(row: Row) {
    setBusy(row.id);
    try {
      const response = await fetch("/api/admin/bookings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentId: row.id, action: "mark-refund-processed" }) });
      const result: { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update refund status.");
      toast.success("Refund marked processed. This action was added to the audit log.");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update refund status."); }
    finally { setBusy(""); }
  }

  const columns: TableColumn<Row>[] = [
    { key: "reference", label: "Reference" },
    { key: "guest", label: "Guest" },
    { key: "stay", label: "Stay" },
    { key: "dates", label: "Dates" },
    { key: "bookingStatus", label: "Booking", render: (value) => <span className={`status-pill status-pill-${String(value).toLowerCase()}`}>{String(value)}</span> },
    { key: "amount", label: "Payment (INR)", render: (value) => `₹${Number(value).toLocaleString("en-IN")}` },
    { key: "paymentStatus", label: "Payment status", render: (value) => <span className={`status-pill status-pill-${String(value).toLowerCase()}`}>{String(value).replaceAll("_", " ")}</span> },
    { key: "id", label: "Action", sortable: false, render: (_, row) => row.paymentStatus === "REFUND_PENDING" ? <button className="table-action-button" type="button" disabled={busy === row.id} onClick={() => void markProcessed(row)}>Mark refund processed</button> : row.refund !== null ? `Refund ₹${row.refund.toLocaleString("en-IN")}` : "—" },
  ];
  return <><DataTable rows={rows} columns={columns} loading={loading} emptyTitle="No booking activity" emptyDescription="Guest payments and reservations will appear here." />{total > 25 && <div className="table-pagination"><span>Page {page} of {Math.ceil(total / 25)}</span><div><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>←</button><button type="button" disabled={page * 25 >= total} onClick={() => setPage((value) => value + 1)}>→</button></div></div>}</>;
}
