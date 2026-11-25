import type { Metadata } from "next";
import PageTransitions from "@/components/page-transitions";
import AppProviders from "@/components/app-providers";
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || "http://localhost:3000"),
  title: "Namma Stay — Stay a little closer",
  description:
    "Find locally loved homestays and slow travel experiences across Karnataka, from misty Coorg estates to the quiet coast.",
  applicationName: "Namma Stay",
  keywords: ["Karnataka homestays", "Coorg", "slow travel", "local experiences"],
  openGraph: {
    title: "Namma Stay — Stay a little closer",
    description: "Come for the view. Stay for the stories.",
    type: "website",
    siteName: "Namma Stay",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Namma Stay — Stay a little closer",
    description: "Find locally loved homestays across Karnataka.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><AppProviders><PageTransitions>{children}</PageTransitions></AppProviders></body>
    </html>
  );
}
