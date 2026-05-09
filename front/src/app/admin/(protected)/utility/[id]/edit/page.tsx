import { notFound, redirect } from "next/navigation";

import { getCookieHeader, getCurrentUser } from "@/lib/auth-server";
import { UsefulContactForm } from "@/components/admin/useful-contact-form";
import type { AdminUsefulContact } from "@/types/admin";
import type { Commune } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

async function fetchContact(id: number): Promise<AdminUsefulContact | null> {
  const cookieHeader = await getCookieHeader();
  const res = await fetch(`${API_URL}/api/admin/utility/contacts/${id}/`, {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return (await res.json()) as AdminUsefulContact;
}

async function fetchCommunes(): Promise<Commune[]> {
  const res = await fetch(`${API_URL}/api/communes/`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as Commune[];
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditUtilityPage({ params }: Props) {
  const me = await getCurrentUser();
  if (!me?.can_publish) redirect("/admin");

  const { id } = await params;
  const contactId = Number(id);
  if (!Number.isFinite(contactId)) notFound();

  const [contact, communes] = await Promise.all([
    fetchContact(contactId),
    fetchCommunes(),
  ]);

  if (!contact) notFound();

  return <UsefulContactForm contact={contact} communes={communes} />;
}
