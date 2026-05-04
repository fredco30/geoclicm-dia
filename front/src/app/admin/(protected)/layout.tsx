import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Plus, Home } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-server";
import { getRoleLabel } from "@/lib/roles";
import { LogoutButton } from "@/components/admin/logout-button";

export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }
  if (!user.can_publish) {
    redirect("/admin/login?error=forbidden");
  }

  return (
    <div className="mx-auto flex max-w-screen-xl">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 border-r border-slate-200 bg-white p-4 sm:flex sm:flex-col">
        <Link
          href="/admin"
          className="mb-6 flex items-center gap-2 text-[#1a4d6e]"
        >
          <span className="inline-block h-7 w-7 rounded-full bg-[#1a4d6e]" />
          <span className="font-semibold">geoclicMédia</span>
        </Link>
        <nav className="flex flex-col gap-1 text-sm">
          <Link
            href="/admin"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
          >
            <FileText className="h-4 w-4" /> Articles
          </Link>
          <Link
            href="/admin/articles/new"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
          >
            <Plus className="h-4 w-4" /> Nouvel article
          </Link>
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
          >
            <Home className="h-4 w-4" /> Voir le site
          </Link>
        </nav>
        <div className="mt-auto pt-6">
          <div className="mb-2 text-xs text-slate-500">
            <div className="font-semibold text-slate-700">{user.full_name}</div>
            <div className="text-slate-400">{getRoleLabel(user)}</div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}
