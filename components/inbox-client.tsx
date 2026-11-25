"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Languages, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";

type Message = { id: string; senderId: string; body: string; createdAt: string; sender: { id: string; name: string | null } };
type Thread = {
  id: string;
  listingId: string;
  listing: { id: string; title: string; slug: string; images: Array<{ url: string }> };
  guest: { id: string; name: string | null; image: string | null };
  host: { id: string; name: string | null; image: string | null };
  messages: Message[];
  _count: { messages: number };
};

export default function InboxClient({ currentUserId, role, newListingId }: { currentUserId: string; role: "GUEST" | "HOST"; newListingId?: string }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [translationTarget, setTranslationTarget] = useState<"English" | "Hindi" | "Kannada">("English");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  const translatedIds = useRef(new Set<string>());
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (threadId?: string) => {
    const url = threadId ? `/api/inbox?conversationId=${encodeURIComponent(threadId)}` : "/api/inbox";
    const response = await fetch(url, { cache: "no-store" });
    const result: { conversations?: Thread[]; error?: string } = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load messages.");
    setThreads(result.conversations ?? []);
    if (threadId) {
      const thread = result.conversations?.find((item) => item.id === threadId);
      setMessages(thread?.messages ?? []);
    } else if (!selectedId && result.conversations?.[0]) {
      setSelectedId(result.conversations[0].id);
    }
    setLoading(false);
  }, [selectedId]);

  useEffect(() => {
    void load().catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not load messages."));
    const timer = window.setInterval(() => {
      void load(selectedId || undefined).catch((error: unknown) => console.error("Inbox polling failed:", error));
    }, 5000);
    return () => window.clearInterval(timer);
  }, [load, selectedId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    const incoming = messages.filter((message) => message.senderId !== currentUserId && !translatedIds.current.has(message.id)).slice(-20);
    for (const message of incoming) {
      translatedIds.current.add(message.id);
      void fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: message.id, target: translationTarget }),
      }).then(async (response) => {
        const result = await response.json() as { translation?: string; error?: string };
        if (!response.ok || !result.translation) throw new Error(result.error || "Could not translate message.");
        setTranslations((current) => ({ ...current, [message.id]: result.translation! }));
      }).catch((error: unknown) => console.error("Inbox auto-translation failed:", error));
    }
  }, [messages, currentUserId, translationTarget]);
  useEffect(() => {
    if (selectedId) void load(selectedId).catch((error: unknown) => console.error("Could not load conversation:", error));
  }, [selectedId, load]);

  const selected = threads.find((thread) => thread.id === selectedId);
  const other = selected ? role === "HOST" ? selected.guest : selected.host : null;

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      const response = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(selectedId ? { conversationId: selectedId } : { listingId: newListingId }), body }),
      });
      const result: { message?: Message; error?: string } = await response.json();
      if (!response.ok || !result.message) throw new Error(result.error || "Could not send message.");
      setText("");
      if (!selectedId && newListingId) {
        await load();
        const refreshed = await fetch("/api/inbox", { cache: "no-store" }).then((response) => response.json()) as { conversations?: Thread[] };
        const thread = refreshed.conversations?.[0];
        if (thread) { setThreads(refreshed.conversations ?? []); setSelectedId(thread.id); }
      } else {
        await load(selectedId);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send message.");
    } finally { setSending(false); }
  }

  return <div className="inbox-layout">
    <aside className="inbox-threads">
      <div className="inbox-threads-title"><p className="workspace-eyebrow">A GOOD CONVERSATION</p><h2>Messages</h2></div>
      {threads.map((thread) => {
        const contact = role === "HOST" ? thread.guest : thread.host;
        const lastMessage = thread.messages[0];
        return <button className={`inbox-thread${thread.id === selectedId ? " active" : ""}`} type="button" key={thread.id} onClick={() => setSelectedId(thread.id)}>
          <span className="inbox-avatar">{contact.image ? <Image src={contact.image} alt="" fill sizes="42px" /> : (contact.name || "G").slice(0, 1)}</span>
          <span><strong>{contact.name || (role === "HOST" ? "Guest" : "Host")}</strong><small>{thread.listing.title}</small><small>{lastMessage?.body || "Start a conversation"}</small></span>
          {thread._count.messages > 0 && <i aria-label={`${thread._count.messages} unread messages`}>{thread._count.messages}</i>}
        </button>;
      })}
      {!threads.length && !newListingId && !loading && <div className="inbox-empty-small">Confirmed guest stays can message their host here.</div>}
      {loading && <div className="inbox-thread-skeleton" />}
    </aside>
    <section className="inbox-conversation">
      {selected ? <>
        <header className="inbox-conversation-head"><div><p className="workspace-eyebrow">{selected.listing.title}</p><h2>{other?.name || (role === "HOST" ? "Guest" : "Host")}</h2></div><label className="inbox-translation"><Languages size={14} /><select aria-label="Translate messages to" value={translationTarget} onChange={(event) => {
          translatedIds.current.clear();
          setTranslations({});
          setTranslationTarget(event.target.value as "English" | "Hindi" | "Kannada");
        }}><option>English</option><option>Hindi</option><option>Kannada</option></select></label></header>
        <div className="inbox-message-list">{messages.map((message) => {
          const translated = translations[message.id];
          const original = showOriginal[message.id];
          return <article key={message.id} className={`inbox-message${message.senderId === currentUserId ? " mine" : ""}`}><p>{translated && !original ? translated : message.body}</p>{translated && <button className="inbox-show-original" type="button" onClick={() => setShowOriginal((current) => ({ ...current, [message.id]: !current[message.id] }))}>{original ? "Show translation" : "Show original"}</button>}<small>{new Date(message.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}{translated && !original ? ` · AI-translated to ${translationTarget}` : ""}</small></article>;
        })}<div ref={bottomRef} /></div>
        <form className="inbox-compose" onSubmit={(event) => void send(event)}><input value={text} onChange={(event) => setText(event.target.value)} maxLength={3000} placeholder="Write a thoughtful message…" aria-label="Message" /><button type="submit" disabled={sending || !text.trim()} aria-label="Send message"><Send size={17} /></button></form>
      </> : newListingId && role === "GUEST" ? <>
        <header className="inbox-conversation-head"><div><p className="workspace-eyebrow">A QUESTION FOR YOUR HOST?</p><h2>Start a conversation</h2></div></header>
        <div className="inbox-message-list"><div className="workspace-empty compact-empty"><MessageCircle size={25} /><strong>Your host is one message away</strong><p>Send a note about your confirmed stay.</p></div></div>
        <form className="inbox-compose" onSubmit={(event) => void send(event)}><input value={text} onChange={(event) => setText(event.target.value)} maxLength={3000} placeholder="Write a thoughtful message…" aria-label="Message" /><button type="submit" disabled={sending || !text.trim()} aria-label="Send message"><Send size={17} /></button></form>
      </> : <div className="inbox-no-selection"><MessageCircle size={32} /><h2>Your inbox, a little quieter</h2><p>Select a conversation to read the latest notes.</p></div>}
    </section>
  </div>;
}
