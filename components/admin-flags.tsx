"use client";

import { useCallback, useEffect, useState } from "react";
import { Flag, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Listing = { id: string; title: string; slug: string; flagReason: string | null; isFlagged: boolean; status: string; host: { name: string | null; email: string | null } | null };
type Review = { id: string; rating: number; comment: string; flagReason: string | null; isFlagged: boolean; user: { name: string | null }; listing: { title: string; hostId: string | null } };

export default function AdminFlags() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"listings" | "reviews">("listings");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/flags", { cache: "no-store" });
    const result: { listings?: Listing[]; reviews?: Review[]; error?: string } = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load content.");
    setListings(result.listings ?? []);
    setReviews(result.reviews ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { void load().catch((error: unknown) => { toast.error(error instanceof Error ? error.message : "Could not load content."); setLoading(false); }); }, [load]);

  async function act(entityType: "Listing" | "Review", entityId: string, action: "flag" | "clear" | "remove") {
    const reason = reasons[entityId]?.trim();
    if (action === "flag" && (!reason || reason.length < 5)) { toast.error("Add a short reason before flagging."); return; }
    if (action === "remove" && !window.confirm(`Permanently remove this ${entityType.toLowerCase()}?`)) return;
    setBusy(entityId);
    try {
      const response = await fetch("/api/admin/flags", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entityType, entityId, action, reason }) });
      const result: { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update flagged content.");
      toast.success(action === "flag" ? "Content flagged." : action === "clear" ? "Flag cleared." : "Content removed.");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update flagged content."); }
    finally { setBusy(""); }
  }

  return <div className="admin-flag-workspace">
    <div className="booking-tabs"><button type="button" className={tab === "listings" ? "active" : ""} onClick={() => setTab("listings")}>Listings <span>{listings.filter((item) => item.isFlagged).length} flagged</span></button><button type="button" className={tab === "reviews" ? "active" : ""} onClick={() => setTab("reviews")}>Reviews <span>{reviews.filter((item) => item.isFlagged).length} flagged</span></button></div>
    {loading ? <div className="admin-flag-list">{[1, 2, 3].map((item) => <div className="admin-flag-skeleton" key={item} />)}</div> : tab === "listings" ? <div className="admin-flag-list">{listings.map((item) => <article className={`admin-flag-card${item.isFlagged ? " flagged" : ""}`} key={item.id}>
      <div className="host-review-top"><div><p className="workspace-eyebrow">{item.status.replaceAll("_", " ")} · {item.host?.name || "Host"}</p><h2>{item.title}</h2></div><span className={`status-pill ${item.isFlagged ? "status-pill-rejected" : "status-pill-published"}`}>{item.isFlagged ? "Flagged" : "Clear"}</span></div>
      {item.flagReason && <p className="flag-reason"><Flag size={14} /> {item.flagReason}</p>}
      <label>Reason for flagging<input value={reasons[item.id] ?? ""} onChange={(event) => setReasons((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Describe the concern" maxLength={2000} /></label>
      <div className="table-actions">{item.isFlagged ? <button type="button" disabled={busy === item.id} onClick={() => void act("Listing", item.id, "clear")}><ShieldCheck size={14} /> Clear flag</button> : <button type="button" disabled={busy === item.id} onClick={() => void act("Listing", item.id, "flag")}><Flag size={14} /> Flag</button>}<button type="button" disabled={busy === item.id} onClick={() => void act("Listing", item.id, "remove")}><Trash2 size={14} /> Pause listing</button><a href={`/listings/${item.slug}`} target="_blank" rel="noreferrer">View stay</a></div>
    </article>)}</div> : <div className="admin-flag-list">{reviews.map((item) => <article className={`admin-flag-card${item.isFlagged ? " flagged" : ""}`} key={item.id}>
      <div className="host-review-top"><div><p className="workspace-eyebrow">{item.listing.title} · {item.user.name || "Guest"}</p><h2>{item.rating} star review</h2></div><span className={`status-pill ${item.isFlagged ? "status-pill-rejected" : "status-pill-published"}`}>{item.isFlagged ? "Flagged" : "Clear"}</span></div>
      <p className="host-review-comment">{item.comment}</p>{item.flagReason && <p className="flag-reason"><Flag size={14} /> {item.flagReason}</p>}
      <label>Reason for flagging<input value={reasons[item.id] ?? ""} onChange={(event) => setReasons((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Describe the concern" maxLength={2000} /></label>
      <div className="table-actions">{item.isFlagged ? <button type="button" disabled={busy === item.id} onClick={() => void act("Review", item.id, "clear")}><ShieldCheck size={14} /> Clear flag</button> : <button type="button" disabled={busy === item.id} onClick={() => void act("Review", item.id, "flag")}><Flag size={14} /> Flag</button>}<button type="button" disabled={busy === item.id} onClick={() => void act("Review", item.id, "remove")}><Trash2 size={14} /> Remove review</button></div>
    </article>)}</div>}
    {!loading && !(tab === "listings" ? listings.length : reviews.length) && <div className="workspace-empty"><span>✳</span><strong>Nothing to review</strong><p>Flagged and recent content will appear here.</p></div>}
  </div>;
}
