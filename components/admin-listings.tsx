"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Check, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import DataTable, { type TableColumn } from "@/components/data-table";

type Listing = { id: string; title: string; slug: string; city: string; address: string; description: string; pricePerNight: number; status: string; host: { name: string | null; email: string | null; hostProfile: { displayName: string; phone: string } | null } | null; images: Array<{ url: string; alt: string }>; amenities: Array<{ name: string }> };

export default function AdminListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");

  async function load() {
    const response = await fetch("/api/admin/moderation", { cache: "no-store" });
    const result: { listings?: Listing[]; error?: string } = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load moderation queue.");
    setListings(result.listings ?? []);
    setLoading(false);
  }
  useEffect(() => { void load().catch((error: unknown) => { toast.error(error instanceof Error ? error.message : "Could not load moderation queue."); setLoading(false); }); }, []);

  async function moderate(listingId: string, action: "approve" | "reject") {
    const reason = reasons[listingId]?.trim();
    if (action === "reject" && (!reason || reason.length < 5)) { toast.error("Add a reason before rejecting a listing."); return; }
    setWorking(listingId);
    try {
      const response = await fetch("/api/admin/moderation", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId, action, reason }) });
      const result: { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not moderate listing.");
      toast.success(action === "approve" ? "Listing approved and published." : "Listing rejected with feedback.");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not moderate listing."); }
    finally { setWorking(""); }
  }

  const columns: TableColumn<Listing>[] = [
    { key: "title", label: "Stay", render: (_, listing) => <div className="table-listing">{listing.images[0] && <span className="table-listing-image"><Image src={listing.images[0].url} alt={listing.images[0].alt} fill sizes="64px" /></span>}<span><strong>{listing.title}</strong><small>{listing.city} · ₹{listing.pricePerNight.toLocaleString("en-IN")}/night</small></span></div> },
    { key: "host", label: "Host", render: (_, listing) => <span>{listing.host?.hostProfile?.displayName || listing.host?.name || "—"}<small className="table-subline">{listing.host?.email}</small></span> },
    { key: "address", label: "Location" },
    { key: "status", label: "Decision", sortable: false, render: (_, listing) => <div className="moderation-cell"><input value={reasons[listing.id] ?? ""} onChange={(event) => setReasons((current) => ({ ...current, [listing.id]: event.target.value }))} placeholder="Feedback / rejection reason" maxLength={2000} /><div><button type="button" disabled={working === listing.id} onClick={() => void moderate(listing.id, "approve")}><Check size={14} /> Approve</button><button type="button" disabled={working === listing.id} onClick={() => void moderate(listing.id, "reject")}><X size={14} /> Reject</button><a href={`/listings/${listing.slug}`} target="_blank" rel="noreferrer" aria-label="Preview listing"><ExternalLink size={14} /></a></div></div> },
  ];
  return <DataTable rows={listings} columns={columns} loading={loading} emptyTitle="The queue is clear" emptyDescription="New host submissions will arrive here for review." />;
}
