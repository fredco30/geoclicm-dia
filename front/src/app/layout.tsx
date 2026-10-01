import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces/full.css";
import "./globals.css";
import { getSiteSettings } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  const name = site.site_name;
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001"),
    title: {
      default: site.tagline ? `${name} — ${site.tagline}` : name,
      template: `%s | ${name}`,
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
      siteName: name,
      // Image par défaut des partages (les pages avec photo la remplacent).
      images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: name }],
    },
    twitter: { card: "summary_large_image" },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
        { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
      ],
      apple: [
        { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: name,
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const site = await getSiteSettings();
  return {
    themeColor: site.primary_color,
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const site = await getSiteSettings();
  // Couleurs de marque choisies dans le back-office (validées #RRGGBB).
  const brandStyle = {
    "--brand-primary": site.primary_color,
    "--brand-accent": site.accent_color,
  } as React.CSSProperties;
  return (
    <html lang="fr" className="h-full antialiased" style={brandStyle}>
      <body className="min-h-full bg-salt text-slate-900">{children}</body>
    </html>
  );
}
