"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

export default function HostOnboardingForm({ initialName, initialPhoto }: { initialName: string; initialPhoto: string }) {
  const router = useRouter();
  const { update } = useSession();
  const [working, setWorking] = useState(false);
  const [languages, setLanguages] = useState("English, Kannada");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setWorking(true);
    try {
      const response = await fetch("/api/host/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.get("displayName"),
          bio: form.get("bio"),
          phone: form.get("phone"),
          city: form.get("city"),
          photoUrl: form.get("photoUrl"),
          languages: languages.split(",").map((language) => language.trim()).filter(Boolean),
        }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save your host profile.");
      await update();
      toast.success("Welcome to the host community.");
      router.push("/host");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your host profile.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <form className="host-onboarding-form" onSubmit={(event) => void submit(event)}>
      <label>Display name<input name="displayName" required minLength={2} maxLength={80} defaultValue={initialName} autoComplete="name" /></label>
      <label>Your story<textarea name="bio" required minLength={30} maxLength={3000} rows={5} placeholder="What makes your home and your corner of Karnataka special?" /></label>
      <div className="host-form-grid">
        <label>Phone<input name="phone" required type="tel" minLength={8} maxLength={20} autoComplete="tel" placeholder="+91 98765 43210" /></label>
        <label>Home city<input name="city" required minLength={2} maxLength={100} placeholder="Madikeri" /></label>
      </div>
      <label>Profile photo URL<input name="photoUrl" type="url" defaultValue={initialPhoto} placeholder="https://…" /></label>
      <label>Languages spoken<input value={languages} onChange={(event) => setLanguages(event.target.value)} required placeholder="English, Kannada, Hindi" /><small>Separate languages with commas.</small></label>
      <button className="button button-dark" type="submit" disabled={working}>{working ? <><LoaderCircle className="spin" size={16} /> Saving profile</> : <>Complete host profile <ArrowRight size={16} /></>}</button>
    </form>
  );
}
