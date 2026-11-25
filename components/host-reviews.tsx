"use client";

import { useState } from "react";
import { Star, Send } from "lucide-react";
import { toast } from "sonner";

type ReviewItem = { id: string; rating: number; comment: string; hostReply: string | null; createdAt: string; guestName: string; listingTitle: string };

export default function HostReviews({ reviews }: { reviews: ReviewItem[] }) {
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");

  async function reply(reviewId: string) {
    const text = replies[reviewId]?.trim();
    if (!text || text.length < 5) { toast.error("Write at least 5 characters for your reply."); return; }
    setBusy(reviewId);
    try {
      const response = await fetch("/api/host/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewId, reply: text }) });
      const result: { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not publish reply.");
      setSaved((current) => ({ ...current, [reviewId]: text }));
      toast.success("Your public reply is live.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not publish reply.");
    } finally { setBusy(""); }
  }

  if (!reviews.length) return <div className="workspace-empty"><span>✳</span><strong>Your first review is on its way</strong><p>Guest notes and public host replies will live here.</p></div>;
  return <div className="host-review-list">{reviews.map((review) => {
    const currentReply = saved[review.id] ?? review.hostReply;
    return <article className="host-review-card" key={review.id}>
      <div className="host-review-top"><div><p className="workspace-eyebrow">{review.listingTitle}</p><h2>{review.guestName}</h2></div><span className="review-rating"><Star size={15} fill="currentColor" /> {review.rating}</span></div>
      <p className="host-review-date">{new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
      <p className="host-review-comment">{review.comment}</p>
      {currentReply && <div className="host-public-reply"><strong>Your public reply</strong><p>{currentReply}</p></div>}
      <label className="host-reply-label">{currentReply ? "Update reply" : "Write a public reply"}
        <textarea maxLength={2000} minLength={5} value={replies[review.id] ?? (currentReply || "")} onChange={(event) => setReplies((current) => ({ ...current, [review.id]: event.target.value }))} placeholder="Thank your guest or add a little context." />
      </label>
      <button className="button button-dark" type="button" disabled={busy === review.id} onClick={() => void reply(review.id)}><Send size={14} /> {busy === review.id ? "Publishing…" : "Publish reply"}</button>
    </article>;
  })}</div>;
}
