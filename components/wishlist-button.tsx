"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";

type Props = { listingSlug: string; initialSaved?: boolean; className?: string };

export default function WishlistButton({ listingSlug, initialSaved = false, className = "" }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);

  async function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (pending) return;
    const previous = saved;
    setSaved(!previous);
    setPending(true);
    try {
      const response = await fetch("/api/wishlist", {
        method: previous ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingSlug }),
      });
      const result: { saved?: boolean; error?: string } = await response.json();
      if (response.status === 401) {
        setSaved(previous);
        router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      if (!response.ok) throw new Error(result.error || "Could not update your wishlist.");
      toast.success(previous ? "Removed from your wishlist." : "Saved for later.");
    } catch (error) {
      console.error("Wishlist update failed:", error);
      setSaved(previous);
      toast.error(error instanceof Error ? error.message : "Could not update your wishlist.");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      className={`wishlist-heart ${saved ? "saved" : ""} ${className}`}
      onClick={toggle}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      aria-pressed={saved}
      disabled={pending}
    ><Heart size={18} fill={saved ? "currentColor" : "none"} /></button>
  );
}
