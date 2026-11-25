"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { useEffect } from "react";
import AiConcierge from "@/components/ai-concierge";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const updateVisibility = () => document.documentElement.classList.toggle("page-hidden", document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  return (
    <SessionProvider>
      {children}
      <AiConcierge />
      <Toaster position="top-center" richColors />
    </SessionProvider>
  );
}
