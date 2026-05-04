import { notFound, redirect } from "next/navigation";
import { getCookieHeader, getCurrentUser } from "@/lib/auth-server";
import { UserForm } from "@/components/admin/user-form";
import type { AdminUser } from "@/types/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

type Props = { params: Promise<{ id: string }> };

async function fetchUser(id: string): Promise<AdminUser | null> {
  const cookieHeader = await getCookieHeader();
  const res = await fetch(`${API_URL}/api/users/${id}/`, {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as AdminUser;
}

export default async function EditUserPage({ params }: Props) {
  const me = await getCurrentUser();
  if (!me?.is_superuser && me?.role !== "admin") {
    redirect("/admin");
  }
  const { id } = await params;
  const user = await fetchUser(id);
  if (!user) notFound();

  return <UserForm user={user} currentUserId={me.id} />;
}
