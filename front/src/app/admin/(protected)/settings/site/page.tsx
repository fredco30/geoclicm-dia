import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from "@/lib/site-settings";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";

export const metadata = { title: "Identité du site" };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

export default async function SiteSettingsPage() {
  const me = await getCurrentUser();
  if (!me?.is_superuser && me?.role !== "admin") redirect("/admin");

  // Lecture sans cache : on édite la valeur réelle, pas la version en cache.
  const res = await fetch(`${API_URL}/api/site-settings/`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  }).catch(() => null);
  const settings: SiteSettings = res?.ok ? await res.json() : DEFAULT_SITE_SETTINGS;

  return <SiteSettingsForm settings={settings} />;
}
