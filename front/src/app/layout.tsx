import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

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
    title: "geoclicMédia — le littoral camarguais",
    description:
      "L'actualité, l'histoire et le patrimoine du littoral camarguais.",
  },
  twitter: {
    card: "summary_large_image",
    title: "geoclicMédia — le littoral camarguais",
    description:
      "L'actualité, l'histoire et le patrimoine du littoral camarguais.",
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
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-slate-900">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
