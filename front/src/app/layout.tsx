import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces/full.css";
import "./globals.css";

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
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "geoclicMédia",
  },
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
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full bg-[#fbf9f5] text-slate-900">{children}</body>
    </html>
  );
}
