"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Props = { className?: string; placeholder?: string; ariaLabel?: string };
type Filters = {
  location: string | null; checkIn: string | null; checkOut: string | null; guests: number | null;
  minBudget: number | null; maxBudget: number | null; vibe: string | null; amenities: string[];
};

export default function NaturalSearch({ className = "", placeholder = "A quiet coffee estate for two, somewhere misty...", ariaLabel = "Describe your dream stay" }: Props) {
  const [query, setQuery] = useState("");
  const [working, setWorking] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = query.trim();
    if (!text || working) return;
    setWorking(true);
    try {
      const response = await fetch("/api/ai/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: text }) });
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error || "Search interpretation failed.");
      }
      const result = await response.json() as { filters: Filters; fallback: boolean };
      const params = new URLSearchParams();
      const filters = result.filters;
      if (result.fallback) {
        params.set("keyword", text);
      } else {
        if (filters.location) params.set("destination", filters.location);
        if (filters.checkIn) params.set("checkIn", filters.checkIn);
        if (filters.checkOut) params.set("checkOut", filters.checkOut);
        if (filters.guests) params.set("guests", String(filters.guests));
        if (filters.minBudget !== null) params.set("minPrice", String(filters.minBudget));
        if (filters.maxBudget !== null) params.set("maxPrice", String(filters.maxBudget));
        if (filters.vibe) params.set("vibe", filters.vibe);
        if (filters.amenities.length) params.set("amenities", filters.amenities.join(","));
      }
      params.set("ai", "1");
      params.set("aiQuery", text);
      router.push(`/explore?${params.toString()}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not understand that search.");
      const params = new URLSearchParams({ keyword: text, ai: "1", aiQuery: text });
      router.push(`/explore?${params.toString()}`);
    } finally { setWorking(false); }
  }

  return <form className={`natural-search ${className}`} onSubmit={(event) => void submit(event)} aria-label={ariaLabel}>
    <Sparkles size={18} aria-hidden="true" />
    <input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={500} placeholder={placeholder} aria-label={ariaLabel} disabled={working} />
    <button type="submit" disabled={!query.trim() || working} aria-label="Find stays matching your dream">{working ? <LoaderCircle size={16} className="spin" /> : <ArrowRight size={18} />}</button>
  </form>;
}
