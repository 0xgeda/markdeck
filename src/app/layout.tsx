import type { Metadata } from "next";
import "./globals.css";
import { Geist, Cormorant_Garamond } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Markdeck — Markdown to Proposal Slides",
  description: "Turn Markdown into beautiful proposal slides with AI layout selection.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable, cormorant.variable)}>
      <body className="bg-zinc-950 text-white min-h-screen antialiased">{children}</body>
    </html>
  );
}
