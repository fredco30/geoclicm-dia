import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth-server";
import { UsefulContactForm } from "@/components/admin/useful-contact-form";
import type { Commune, UsefulContactKind } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

async function fetchCommunes(): Promise<Commune[]> {
  const res = await fetch(`${API_URL}/api/communes/`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as Commune[];
}

type Props = {
  searchParams: Promise<{ kind?: string }>;
};

export default async function NewUtilityPage({ searchParams }: Props) {
  const me = await getCurrentUser();
  if (!me?.can_publish) redirect("/admin");

  const sp = await searchParams;
  const defaultKind: UsefulContactKind =
    sp.kind === "procedure" ? "procedure" : "useful_number";

  const communes = await fetchCommunes();

  return <UsefulContactForm defaultKind={defaultKind} communes={communes} />;
}
