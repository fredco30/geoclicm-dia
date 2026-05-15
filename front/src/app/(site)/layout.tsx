import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FooterFixed } from "@/components/layout/footer-fixed";
import { AssistantProvider } from "@/components/assistant/assistant-context";
import { AssistantDrawer } from "@/components/assistant/assistant-drawer";
import { AssistantFloatingButton } from "@/components/assistant/floating-button";
import { InstallPrompt } from "@/components/pwa/install-prompt";

export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AssistantProvider>
      <div className="flex min-h-screen flex-col">
        {/* Skip link (accessibilité clavier) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[#1a4d6e] focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
        >
          Aller au contenu
        </a>
        <Header />
        {/* pb-16 mobile pour ne pas masquer le contenu derrière le FooterFixed */}
        <main id="main-content" className="flex-1 pb-16 md:pb-0">
          {children}
        </main>
        <Footer />
        <FooterFixed />
        <AssistantFloatingButton />
        <AssistantDrawer />
        <InstallPrompt />
      </div>
    </AssistantProvider>
  );
}
