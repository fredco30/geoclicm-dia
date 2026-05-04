import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { UserForm } from "@/components/admin/user-form";

export default async function NewUserPage() {
  const me = await getCurrentUser();
  if (!me?.is_superuser && me?.role !== "admin") {
    redirect("/admin");
  }
  return <UserForm currentUserId={me.id} />;
}
