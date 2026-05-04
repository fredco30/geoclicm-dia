import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
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
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-white text-slate-900">{children}</body>
    </html>
  );
}
