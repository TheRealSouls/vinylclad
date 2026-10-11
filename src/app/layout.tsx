import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: { default: "Vinylclad", template: "%s · Vinylclad" },
  description: "Vinyl deals, collection value and wishlist tracking.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${archivo.variable} ${plexMono.variable}`}>
      <body className="min-h-screen flex flex-col">
        <header className="border-b-2 border-ink">
          <div className="mx-auto max-w-6xl px-4 flex flex-wrap items-end gap-x-8 gap-y-2 pt-4">
            <Link href="/" className="flex items-center gap-2 pb-3 no-underline">
              <Mark />
              <span className="text-2xl font-bold uppercase tracking-tight [font-stretch:70%]">Vinylclad</span>
            </Link>
            <Nav />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 flex-1">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-5 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-faint">
            <span>Prices from Discogs and your own entries. Values are estimates.</span>
            <Link href="/terms" className="underline hover:text-ink">Terms and data</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}

/** A record seen from above: disc, grooves, label, spindle hole. */
function Mark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <circle cx="13" cy="13" r="12.5" fill="var(--color-ink)" />
      <circle cx="13" cy="13" r="9.5" fill="none" stroke="var(--color-muted)" strokeWidth="0.6" />
      <circle cx="13" cy="13" r="7.5" fill="none" stroke="var(--color-muted)" strokeWidth="0.6" />
      <circle cx="13" cy="13" r="4.6" fill="var(--color-accent)" />
      <circle cx="13" cy="13" r="1" fill="var(--color-bg)" />
    </svg>
  );
}
