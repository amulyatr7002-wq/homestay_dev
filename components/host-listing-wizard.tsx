"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, CloudUpload, LoaderCircle, MapPin, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
const LocationPicker = dynamic(() => import("@/components/location-picker"), {
  ssr: false,
  loading: () => <div className="location-picker-map" aria-label="Loading location map" />,
});

export type ListingDraft = {
  title: string;
  description: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  propertyType: string;
  vibe: string;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  amenityIds: string[];
  images: Array<{ url: string; publicId: string; alt: string }>;
  pricePerNight: number;
  cleaningFee: number;
  weekendPrice: number | null;
  houseRules: string;
  checkInTime: string;
  checkOutTime: string;
};

type Amenity = { id: string; name: string };
const steps = ["The basics", "Location", "Capacity", "Amenities", "Photos", "Pricing", "House rules", "Preview"];
const types = ["HOMESTAY", "COTTAGE", "CABIN", "FARM_STAY", "VILLA", "HERITAGE_HOME"];
const vibes = ["MOUNTAINS", "BEACH", "HERITAGE", "FARM", "FOREST"];
const initialDraft: ListingDraft = {
  title: "", description: "", city: "", address: "", latitude: 12.9716, longitude: 77.5946,
  propertyType: "HOMESTAY", vibe: "FOREST", maxGuests: 2, bedrooms: 1, beds: 1, bathrooms: 1,
  amenityIds: [], images: [], pricePerNight: 1, cleaningFee: 0, weekendPrice: null,
  houseRules: "", checkInTime: "15:00", checkOutTime: "11:00",
};

function titleCase(value: string) {
  return value.toLowerCase().split("_").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

export default function HostListingWizard({
  listingId,
  amenities,
  initial,
}: {
  listingId?: string;
  amenities: Amenity[];
  initial?: Partial<ListingDraft> | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<ListingDraft>({ ...initialDraft, ...initial });
  const [step, setStep] = useState(0);
  const [working, setWorking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiAction, setAiAction] = useState<"description" | "pricing" | null>(null);
  const [pricingSuggestion, setPricingSuggestion] = useState<{ min: number; max: number; explanation: string; label: string } | null>(null);

  function update<K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function requestAi(action: "description" | "pricing") {
    setAiAction(action);
    try {
      const response = await fetch("/api/ai/host", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "description" ? {
          action, title: draft.title, city: draft.city, propertyType: draft.propertyType, vibe: draft.vibe,
          maxGuests: draft.maxGuests, bedrooms: draft.bedrooms, beds: draft.beds, bathrooms: draft.bathrooms,
          amenities: amenities.filter((item) => draft.amenityIds.includes(item.id)).map((item) => item.name),
          houseRules: draft.houseRules,
        } : {
          action, city: draft.city, propertyType: draft.propertyType, maxGuests: draft.maxGuests,
          amenities: amenities.filter((item) => draft.amenityIds.includes(item.id)).map((item) => item.name),
        }),
      });
      const result = await response.json() as { value?: string; suggestion?: { min: number; max: number; explanation: string }; label?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "AI suggestion could not be generated.");
      if (action === "description" && result.value) {
        update("description", result.value);
        toast.success("AI-generated description added. Review and edit it before publishing.");
      } else if (result.suggestion) {
        setPricingSuggestion({ ...result.suggestion, label: result.label || "AI-generated suggestion — review and choose your own price." });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI suggestion could not be generated.");
    } finally { setAiAction(null); }
  }

  function isStepReady() {
    if (step === 0) return draft.title.trim().length >= 5 && draft.description.trim().length >= 50;
    if (step === 1) return draft.city.trim().length >= 2 && draft.address.trim().length >= 5;
    if (step === 4) return draft.images.length >= 5;
    if (step === 5) return draft.pricePerNight >= 500;
    return true;
  }

  async function save(mode: "draft" | "submit") {
    if (mode === "submit" && draft.images.length < 5) {
      toast.error("Add at least five photos before submitting for review.");
      setStep(4);
      return;
    }
    setWorking(true);
    try {
      const response = await fetch(listingId ? `/api/host/listings/${listingId}` : "/api/host/listings", {
        method: listingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, draft }),
      });
      const result: { listing?: { id: string; status: string }; error?: string } = await response.json();
      if (!response.ok || !result.listing) throw new Error(result.error || "Could not save your listing.");
      toast.success(mode === "submit" ? "Listing sent for review." : "Draft saved.");
      router.push("/host/listings");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your listing.");
    } finally {
      setWorking(false);
    }
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    const remaining = 20 - draft.images.length;
    const selected = Array.from(files).slice(0, remaining);
    if (selected.some((file) => !file.type.startsWith("image/") || file.size > 10 * 1024 * 1024)) {
      toast.error("Choose images under 10 MB each.");
      return;
    }
    setUploading(true);
    try {
      const signatureResponse = await fetch("/api/host/upload-signature", { method: "POST" });
      const signatureData = await signatureResponse.json();
      if (!signatureResponse.ok) throw new Error(signatureData.error || "Photo uploads are unavailable.");
      const uploaded: ListingDraft["images"] = [];
      for (const file of selected) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", signatureData.apiKey);
        formData.append("timestamp", String(signatureData.timestamp));
        formData.append("folder", signatureData.folder);
        formData.append("signature", signatureData.signature);
        const response = await fetch(`https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`, { method: "POST", body: formData });
        const result: { secure_url?: string; public_id?: string; error?: { message?: string } } = await response.json();
        if (!response.ok || !result.secure_url || !result.public_id) throw new Error(result.error?.message || "A photo could not be uploaded.");
        uploaded.push({ url: result.secure_url, publicId: result.public_id, alt: file.name.slice(0, 180) });
      }
      update("images", [...draft.images, ...uploaded]);
      toast.success(`${uploaded.length} ${uploaded.length === 1 ? "photo" : "photos"} uploaded.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Photo upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function movePhoto(index: number, offset: number) {
    const target = index + offset;
    if (target < 0 || target >= draft.images.length) return;
    const images = [...draft.images];
    [images[index], images[target]] = [images[target], images[index]];
    update("images", images);
  }

  function removePhoto(index: number) {
    update("images", draft.images.filter((_, position) => position !== index));
  }

  return (
    <div className="listing-wizard">
      <header className="wizard-header">
        <div><p className="workspace-eyebrow">YOUR LISTING · STEP {step + 1} OF {steps.length}</p><h1>{steps[step]}</h1></div>
        <button type="button" className="quiet-button" disabled={working} onClick={() => void save("draft")}>Save as draft</button>
      </header>
      <div className="wizard-progress" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={steps.length}><span style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>

      <section className="wizard-card">
        {step === 0 && <div className="wizard-fields">
          <label>Listing title<input value={draft.title} maxLength={120} onChange={(event) => update("title", event.target.value)} placeholder="A name guests will remember" /></label>
          <label>Property type<select value={draft.propertyType} onChange={(event) => update("propertyType", event.target.value)}>{types.map((type) => <option key={type} value={type}>{titleCase(type)}</option>)}</select></label>
          <label>Describe the stay<textarea value={draft.description} minLength={50} maxLength={6000} rows={7} onChange={(event) => update("description", event.target.value)} placeholder="Tell guests what it feels like to stay here." />
            <button type="button" className="ai-inline-button" onClick={() => void requestAi("description")} disabled={Boolean(aiAction) || draft.title.trim().length < 5 || draft.city.trim().length < 2}><Sparkles size={14} />{aiAction === "description" ? "Writing…" : "Generate description"}</button>
            <small className="ai-note">AI-generated using your listing details and selected amenities only. Review and edit before publishing.</small>
          </label>
          <label>Closest vibe<select value={draft.vibe} onChange={(event) => update("vibe", event.target.value)}>{vibes.map((vibe) => <option key={vibe} value={vibe}>{titleCase(vibe)}</option>)}</select></label>
        </div>}

        {step === 1 && <div className="wizard-fields">
          <div className="host-form-grid"><label>City or town<input value={draft.city} maxLength={100} onChange={(event) => update("city", event.target.value)} placeholder="Madikeri" /></label><label>Full address<input value={draft.address} maxLength={240} onChange={(event) => update("address", event.target.value)} placeholder="Village, road, district" /></label></div>
          <p className="form-note"><MapPin size={14} /> Click the map or drag the pin to set the approximate location.</p>
          <LocationPicker latitude={draft.latitude} longitude={draft.longitude} onChange={(latitude, longitude) => setDraft((current) => ({ ...current, latitude, longitude }))} />
          <div className="host-form-grid"><label>Latitude<input type="number" step="any" min="-90" max="90" value={draft.latitude} onChange={(event) => update("latitude", Number(event.target.value))} /></label><label>Longitude<input type="number" step="any" min="-180" max="180" value={draft.longitude} onChange={(event) => update("longitude", Number(event.target.value))} /></label></div>
        </div>}

        {step === 2 && <div className="wizard-fields wizard-capacity">
          {([
            ["maxGuests", "Guests"],
            ["bedrooms", "Bedrooms"],
            ["beds", "Beds"],
            ["bathrooms", "Bathrooms"],
          ] as const).map(([key, label]) => <label key={key}>{label}<input type="number" min={1} max={key === "maxGuests" ? 20 : 50} value={draft[key]} onChange={(event) => update(key, Number(event.target.value))} /></label>)}
        </div>}

        {step === 3 && <div className="amenity-grid">
          {amenities.map((amenity) => <label key={amenity.id} className={draft.amenityIds.includes(amenity.id) ? "amenity-choice selected" : "amenity-choice"}>
            <input type="checkbox" checked={draft.amenityIds.includes(amenity.id)} onChange={(event) => update("amenityIds", event.target.checked ? [...draft.amenityIds, amenity.id] : draft.amenityIds.filter((id) => id !== amenity.id))} />
            <span>{amenity.name}</span>
          </label>)}
          {!amenities.length && <p className="form-note">Amenities will appear once the catalog is seeded.</p>}
        </div>}

        {step === 4 && <div className="wizard-fields">
          <label className="upload-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void uploadFiles(event.dataTransfer.files); }}>
            <CloudUpload size={30} /><strong>Drop photos here or browse</strong><span>At least 5 photos · maximum 20 · 10 MB each</span>
            <input type="file" accept="image/*" multiple disabled={uploading} onChange={(event) => { void uploadFiles(event.target.files); event.currentTarget.value = ""; }} />
          </label>
          {uploading && <p className="form-note"><LoaderCircle size={14} className="spin" /> Uploading photos securely…</p>}
          <div className="wizard-photo-grid">
            {draft.images.map((image, index) => <div key={image.publicId} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const from = Number(event.dataTransfer.getData("text/plain")); const photos = [...draft.images]; [photos[from], photos[index]] = [photos[index], photos[from]]; update("images", photos); }}>
              <Image src={image.url} alt={image.alt} fill sizes="160px" />
              {index === 0 && <span className="photo-cover-badge">Cover photo</span>}
              <div className="wizard-photo-actions"><button type="button" aria-label="Move photo earlier" onClick={() => movePhoto(index, -1)} disabled={index === 0}>↑</button><button type="button" aria-label="Move photo later" onClick={() => movePhoto(index, 1)} disabled={index === draft.images.length - 1}>↓</button><button type="button" aria-label="Remove photo" onClick={() => removePhoto(index)}><Trash2 size={13} /></button></div>
            </div>)}
          </div>
          <p className="form-note">{draft.images.length} of 5 required photos uploaded. First photo is the cover.</p>
        </div>}

        {step === 5 && <div className="wizard-fields">
          <div className="host-form-grid"><label>Base price per night (₹)<input type="number" min={500} max={1000000} value={draft.pricePerNight} onChange={(event) => update("pricePerNight", Number(event.target.value))} /></label><label>Cleaning fee (₹)<input type="number" min={0} max={500000} value={draft.cleaningFee} onChange={(event) => update("cleaningFee", Number(event.target.value))} /></label></div>
          <label>Weekend price (optional)<input type="number" min={500} max={1000000} value={draft.weekendPrice ?? ""} onChange={(event) => update("weekendPrice", event.target.value ? Number(event.target.value) : null)} placeholder="Leave blank to use base price" /></label>
          <p className="form-note">Guests see nightly rates before service fees and taxes. You can also set date-specific prices in your calendar.</p>
          <button type="button" className="ai-inline-button" onClick={() => void requestAi("pricing")} disabled={Boolean(aiAction) || draft.city.trim().length < 2}><Sparkles size={14} />{aiAction === "pricing" ? "Preparing suggestion…" : "Suggest a nightly price range"}</button>
          {pricingSuggestion && <div className="ai-pricing-suggestion"><strong>AI-generated suggestion · ₹{pricingSuggestion.min.toLocaleString("en-IN")}–₹{pricingSuggestion.max.toLocaleString("en-IN")} / night</strong><p>{pricingSuggestion.explanation}</p><small>{pricingSuggestion.label}</small></div>}
        </div>}

        {step === 6 && <div className="wizard-fields">
          <label>House rules<textarea rows={6} maxLength={3000} value={draft.houseRules} onChange={(event) => update("houseRules", event.target.value)} placeholder="Quiet hours, pets, smoking, and anything guests should know." /></label>
          <div className="host-form-grid"><label>Check-in from<input type="time" value={draft.checkInTime} onChange={(event) => update("checkInTime", event.target.value)} /></label><label>Check-out by<input type="time" value={draft.checkOutTime} onChange={(event) => update("checkOutTime", event.target.value)} /></label></div>
        </div>}

        {step === 7 && <div className="listing-preview">
          <div className="listing-preview-photo">{draft.images[0] && <Image src={draft.images[0].url} alt={draft.images[0].alt} fill sizes="(max-width: 700px) 90vw, 600px" />}</div>
          <p className="workspace-eyebrow">{titleCase(draft.propertyType)} · {draft.city || "Your city"}</p>
          <h2>{draft.title || "Your stay title"}</h2><p>{draft.description || "Your description will appear here."}</p>
          <p>{draft.maxGuests} guests · {draft.bedrooms} bedrooms · {draft.beds} beds · {draft.bathrooms} bathrooms</p>
          <strong>₹{draft.pricePerNight.toLocaleString("en-IN")} <small>/ night</small></strong>
          <p className="form-note">Submitting sends this listing to the Namma Stay team for review. It will not be public until approved.</p>
        </div>}
      </section>

      <footer className="wizard-footer">
        <button className="quiet-button" type="button" disabled={step === 0 || working} onClick={() => setStep((current) => current - 1)}><ArrowLeft size={15} /> Back</button>
        <div>
          {step < steps.length - 1 ? <button className="button button-dark" type="button" disabled={!isStepReady() || working || uploading} onClick={() => setStep((current) => current + 1)}>Next <ArrowRight size={15} /></button> : <button className="button button-dark" type="button" disabled={working} onClick={() => void save("submit")}>{working ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />} Submit for review</button>}
        </div>
      </footer>
    </div>
  );
}
