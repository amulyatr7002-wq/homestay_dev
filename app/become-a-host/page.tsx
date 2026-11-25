import { redirect } from "next/navigation";
import HostOnboardingForm from "@/components/host-onboarding-form";
import { getActiveUser } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export default async function BecomeHostPage() {
  const user = await getActiveUser();
  if (!user) redirect("/login?callbackUrl=%2Fbecome-a-host");
  if (user.role === "HOST" || user.role === "ADMIN") redirect("/host");
  return (
    <main className="guest-dashboard">
      <header className="guest-dashboard-header"><a className="explore-brand" href="/"><span>n</span> namma<em>stay</em></a></header>
      <section className="guest-dashboard-content host-onboarding-content">
        <p className="detail-section-kicker">A home for your story</p>
        <h1>Become a <em>host.</em></h1>
        <p className="dashboard-intro">Tell travelers a little about the local welcome waiting for them.</p>
        <HostOnboardingForm initialName={user.name ?? ""} initialPhoto={user.image ?? ""} />
      </section>
    </main>
  );
}
