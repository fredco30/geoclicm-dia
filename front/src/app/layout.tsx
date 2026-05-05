import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { SwCleanup } from "@/components/sw-cleanup";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

// Fraunces : serif moderne avec italiques expressives, ancrage éditorial.
// Utilisée pour les titres d'articles et accents typographiques (lettrines, citations).
const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001"),
  title: {
    default: "geoclicMédia — le littoral camarguais",
    template: "%s | geoclicMédia",
  },
  description:
    "Le média local indépendant du littoral camarguais : Le Grau-du-Roi, Aigues-Mortes, La Grande-Motte, Lunel, Vauvert, Camargue gardoise. Actualités, patrimoine, mémoire vivante, portraits.",
  keywords: [
    "Camargue", "Le Grau-du-Roi", "Aigues-Mortes", "La Grande-Motte",
    "Lunel", "Vauvert", "littoral", "Petite Camargue", "média local",
  ],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "geoclicMédia",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#1a4d6e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#fbf9f5] text-slate-900">
        <SwCleanup />
        {children}
      </body>
    </html>
  );
}
