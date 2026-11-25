"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, Pencil, Pause, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import DataTable, { type TableColumn } from "@/components/data-table";

type ListingRow = { id: string; title: string; city: string; status: string; views: number; bookings: number; image: string | null; slug: string; rejectedReason: string | null };

function Status({ status }: { status: string }) {
  return <span className={`status-pill status-pill-${status.toLowerCase()}`}>{status.replaceAll("_", " ")}</span>;
}

export default function HostListingsTable({ listings }: { listings: ListingRow[] }) {
  const router = useRouter();
  const [workingId, setWorkingId] = useState("");

  async function action(id: string, value: "pause" | "resume" | "delete") {
    if (value === "delete" && !window.confirm("Delete this listing? Listings with booking history must be paused instead.")) return;
    setWorkingId(id);
    try {
      const response = await fetch(`/api/host/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: value }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update listing.");
      toast.success(value === "delete" ? "Listing deleted." : value === "pause" ? "Listing paused." : "Listing resubmitted for review.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update listing.");
    } finally {
      setWorkingId("");
    }
  }

  const columns: TableColumn<ListingRow>[] = [
    { key: "title", label: "Stay", render: (_, listing) => <div className="table-listing"><Link href={`/host/listings/${listing.id}/edit`} className="table-listing-image">{listing.image && <Image src={listing.image} alt="" fill sizes="64px" />}</Link><span><Link href={`/host/listings/${listing.id}/edit`}>{listing.title}</Link><small>{listing.city || "Draft"}</small>{listing.rejectedReason && <small className="rejection-note">Feedback: {listing.rejectedReason}</small>}</span></div> },
    { key: "status", label: "Status", render: (value) => <Status status={String(value)} /> },
    { key: "views", label: "Views" },
    { key: "bookings", label: "Bookings" },
    { key: "id", label: "Quick actions", sortable: false, render: (_, listing) => <div className="table-actions">
      {listing.status === "PUBLISHED" && <button type="button" disabled={workingId === listing.id} onClick={() => void action(listing.id, "pause")} aria-label="Pause listing"><Pause size={14} /></button>}
      {listing.status === "PAUSED" && <button type="button" disabled={workingId === listing.id} onClick={() => void action(listing.id, "resume")} aria-label="Resume listing"><Play size={14} /></button>}
      <Link href={`/host/listings/${listing.id}/edit`} aria-label="Edit listing"><Pencil size={14} /></Link>
      {listing.bookings === 0 && <button type="button" disabled={workingId === listing.id} onClick={() => void action(listing.id, "delete")} aria-label="Delete listing"><Trash2 size={14} /></button>}
      <Link href={`/listings/${listing.slug}`} aria-label="View listing"><Eye size={14} /></Link>
    </div> },
  ];
  return <DataTable rows={listings} columns={columns} emptyTitle="Your first stay starts here" emptyDescription="Add a few thoughtful details and share your home with travelers." />;
}
