"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, LoaderCircle, MessageCircle, Send, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { toast } from "sonner";

type Stay = { slug: string; title: string; city: string; pricePerNight: number; rating: number; images: Array<{ url: string }> };
type Itinerary = { title: string; days: Array<{ day: number; title: string; activities: string[] }> };
type ChatMessage = { id: string; role: "user" | "assistant"; text: string; listings?: Stay[]; itinerary?: Itinerary };
const prompts = ["Plan a 3-day trip to Coorg", "Quiet stay under 3000 for 4 people"];
const storageKey = "namma-ai-concierge-session";

export default function AiConcierge() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"chat" | "itinerary">("chat");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) setMessages(JSON.parse(saved) as ChatMessage[]);
    } catch (error) {
      console.error("Could not restore AI concierge session:", error);
    }
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(messages.slice(-20))); }
    catch (error) { console.error("Could not save AI concierge session:", error); }
  }, [messages]);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function sendMessage(event?: FormEvent<HTMLFormElement>, prompt?: string) {
    event?.preventDefault();
    const message = (prompt ?? text).trim();
    if (!message || loading) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", text: message };
    const reply: ChatMessage = { id: crypto.randomUUID(), role: "assistant", text: "" };
    const next = [...messages, userMessage, reply].slice(-20);
    setMessages(next);
    setText("");
    setLoading(true);
    try {
      const response = await fetch("/api/ai/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages.slice(-10).map(({ role, text }) => ({ role, content: text })), { role: "user", content: message }], mode }),
      });
      if (!response.ok || !response.body) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error || "The concierge is taking a moment.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      let cards: Stay[] = [];
      let itinerary: Itinerary | undefined;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const raw of events) {
          const line = raw.split("\n").find((part) => part.startsWith("data: "));
          if (!line || line === "data: [DONE]") continue;
          const data = JSON.parse(line.slice(6)) as { type: string; text?: string; listings?: Stay[]; itinerary?: Itinerary };
          if (data.type === "text") assistantText += data.text ?? "";
          if (data.type === "listings") cards = data.listings ?? [];
          if (data.type === "itinerary") itinerary = data.itinerary;
          setMessages((current) => current.map((item) => item.id === reply.id ? { ...item, text: assistantText, listings: cards, itinerary } : item));
        }
      }
    } catch (error) {
      const fallback = error instanceof Error ? error.message : "The concierge is taking a moment. Please try again.";
      setMessages((current) => current.map((item) => item.id === reply.id ? { ...item, text: fallback } : item));
      toast.error(fallback);
    } finally { setLoading(false); }
  }

  async function feedback(message: ChatMessage, helpful: boolean) {
    try {
      const response = await fetch("/api/ai/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feature: "concierge", helpful, turnId: message.id }) });
      if (!response.ok) throw new Error("Feedback could not be saved.");
      toast.success("Thanks for helping us improve.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Feedback could not be saved."); }
  }

  async function saveTrip(itinerary: Itinerary) {
    try {
      const response = await fetch("/api/ai/trips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(itinerary) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Sign in to save this trip.");
      toast.success("Your itinerary was saved to My trips.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save itinerary."); }
  }

  return <>
    <button className="ai-chat-launch" type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close trip concierge" : "Open AI trip concierge"} aria-expanded={open}>
      {open ? <X size={20} /> : <MessageCircle size={20} />} <span>Trip concierge</span>
    </button>
    {open && <section className="ai-chat-panel" role="dialog" aria-modal="false" aria-labelledby="ai-chat-title">
      <header className="ai-chat-header"><div><span className="ai-chat-icon"><Bot size={17} /></span><div><h2 id="ai-chat-title">Your trip concierge</h2><small>AI-generated · Karnataka stays</small></div></div><div className="ai-chat-header-actions"><Link href="/trips" onClick={() => setOpen(false)}>My trips</Link><button type="button" aria-label="Close chat" onClick={() => setOpen(false)}><X size={17} /></button></div></header>
      <div className="ai-chat-modes"><button type="button" className={mode === "chat" ? "active" : ""} onClick={() => setMode("chat")}>Ask anything</button><button type="button" className={mode === "itinerary" ? "active" : ""} onClick={() => setMode("itinerary")}>Build my itinerary</button></div>
      <div className="ai-chat-messages" ref={listRef} aria-live="polite">
        {!messages.length && <div className="ai-chat-welcome"><strong>A little help planning?</strong><p>Ask for local ideas, packing tips, or stays from our listings.</p>{prompts.map((prompt) => <button type="button" key={prompt} onClick={() => void sendMessage(undefined, prompt)}>{prompt}</button>)}</div>}
        {messages.map((message) => <article key={message.id} className={`ai-chat-message ${message.role}`}>
          <small>{message.role === "assistant" ? "AI-generated" : "You"}</small><p>{message.text}</p>
          {message.listings?.map((stay) => <Link className="ai-stay-card" href={`/listings/${stay.slug}`} key={stay.slug} onClick={() => setOpen(false)}>
            <span style={stay.images[0] ? { backgroundImage: `url("${stay.images[0].url}")` } : undefined} />
            <span><strong>{stay.title}</strong><small>{stay.city} · ₹{stay.pricePerNight.toLocaleString("en-IN")} / night · {stay.rating.toFixed(1)} ★</small></span>
          </Link>)}
          {message.itinerary && <div className="ai-itinerary"><h3>{message.itinerary.title}</h3>{message.itinerary.days.map((day) => <section key={day.day}><strong>Day {day.day}: {day.title}</strong><ul>{day.activities.map((activity) => <li key={activity}>{activity}</li>)}</ul></section>)}<button type="button" onClick={() => void saveTrip(message.itinerary!)}>Save to my trips</button></div>}
          {message.role === "assistant" && message.text && <div className="ai-feedback"><button type="button" aria-label="Helpful response" onClick={() => void feedback(message, true)}><ThumbsUp size={13} /></button><button type="button" aria-label="Not helpful" onClick={() => void feedback(message, false)}><ThumbsDown size={13} /></button></div>}
        </article>)}
        {loading && <div className="ai-chat-loading" aria-label="Generating response"><i /><i /><i /></div>}
      </div>
      <form className="ai-chat-compose" onSubmit={(event) => void sendMessage(event)}><input value={text} onChange={(event) => setText(event.target.value)} maxLength={1500} placeholder="Ask your trip concierge…" aria-label="Message trip concierge" disabled={loading} /><button type="submit" disabled={loading || !text.trim()} aria-label="Send"><Send size={16} />{loading && <LoaderCircle size={12} className="spin" />}</button></form>
      <p className="ai-chat-safety">For emergencies in India, call 112. This AI guide is not professional advice.</p>
    </section>}
  </>;
}
