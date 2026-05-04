import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Skip link (accessibilité clavier) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[#1a4d6e] focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
      >
        Aller au contenu
      </a>
      <Header />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
