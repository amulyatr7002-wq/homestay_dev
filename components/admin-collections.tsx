"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import DataTable, { type TableColumn } from "@/components/data-table";

type ListingOption = { id: string; title: string; city: string };
type Collection = { id: string; name: string; slug: string; description: string; imageUrl: string | null; isPublished: boolean; listings: Array<{ listing: { id: string; title: string; status: string } }> };
type Form = { id?: string; name: string; slug: string; description: string; imageUrl: string; isPublished: boolean; listingIds: string[] };
const blank: Form = { name: "", slug: "", description: "", imageUrl: "", isPublished: false, listingIds: [] };

export default function AdminCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [listings, setListings] = useState<ListingOption[]>([]);
  const [form, setForm] = useState<Form>(blank);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/collections", { cache: "no-store" });
    const result: { collections?: Collection[]; listings?: ListingOption[]; error?: string } = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load collections.");
    setCollections(result.collections ?? []);
    setListings(result.listings ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { void load().catch((error: unknown) => { toast.error(error instanceof Error ? error.message : "Could not load collections."); setLoading(false); }); }, [load]);

  function edit(collection: Collection) {
    setForm({ id: collection.id, name: collection.name, slug: collection.slug, description: collection.description, imageUrl: collection.imageUrl ?? "", isPublished: collection.isPublished, listingIds: collection.listings.map((item) => item.listing.id) });
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/admin/collections", { method: form.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result: { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save collection.");
      toast.success("Featured collection saved.");
      setForm(blank);
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save collection."); }
    finally { setBusy(false); }
  }
  function change<K extends keyof Form>(key: K, value: Form[K]) { setForm((current) => ({ ...current, [key]: value })); }

  const columns: TableColumn<Collection>[] = [
    { key: "name", label: "Collection", render: (_, collection) => <div className="table-listing">{collection.imageUrl && <span className="table-listing-image"><Image src={collection.imageUrl} alt="" fill sizes="64px" /></span>}<span><strong>{collection.name}</strong><small>/{collection.slug}</small></span></div> },
    { key: "listings", label: "Stays", render: (value) => `${(value as Collection["listings"]).length} selected` },
    { key: "isPublished", label: "Visibility", render: (value) => <span className={`status-pill ${value ? "status-pill-published" : "status-pill-draft"}`}>{value ? "Published" : "Draft"}</span> },
    { key: "id", label: "Edit", sortable: false, render: (_, collection) => <button className="table-action-button" type="button" onClick={() => edit(collection)}><Pencil size={14} /> Edit</button> },
  ];

  return <div className="collections-workspace">
    <form className="collection-editor" onSubmit={(event) => void save(event)}>
      <div className="workspace-card-heading"><div><p className="workspace-eyebrow">LANDING PAGE STORY</p><h2>{form.id ? "Edit collection" : "Create a collection"}</h2></div>{form.id && <button className="quiet-button" type="button" onClick={() => setForm(blank)}>New</button>}</div>
      <div className="host-form-grid"><label>Name<input value={form.name} required minLength={3} maxLength={100} onChange={(event) => change("name", event.target.value)} /></label><label>URL slug<input value={form.slug} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={120} onChange={(event) => change("slug", event.target.value)} placeholder="slow-coffee-mornings" /></label></div>
      <label>Description<textarea value={form.description} required minLength={10} maxLength={2000} rows={3} onChange={(event) => change("description", event.target.value)} /></label>
      <label>Cover image URL<input type="url" value={form.imageUrl} maxLength={500} onChange={(event) => change("imageUrl", event.target.value)} placeholder="https://…" /></label>
      <label>Include published stays<select multiple value={form.listingIds} onChange={(event) => change("listingIds", Array.from(event.target.selectedOptions, (option) => option.value))}>{listings.map((listing) => <option value={listing.id} key={listing.id}>{listing.title} · {listing.city}</option>)}</select><small>Hold Ctrl/Cmd to select more than one.</small></label>
      <label className="toggle-label"><input type="checkbox" checked={form.isPublished} onChange={(event) => change("isPublished", event.target.checked)} /> Publish this collection on the landing page</label>
      <button className="button button-dark" disabled={busy} type="submit">{busy ? "Saving…" : form.id ? <><Save size={14} /> Update collection</> : <><Plus size={14} /> Create collection</>}</button>
    </form>
    <DataTable rows={collections} columns={columns} loading={loading} emptyTitle="No collections curated" emptyDescription="Create a set of stays to feature on the landing page." />
  </div>;
}
