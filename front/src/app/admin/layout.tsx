import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  return {
    title: { default: "Admin", template: `%s | Admin ${site.site_name}` },
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-slate-50">{children}</div>;
}
