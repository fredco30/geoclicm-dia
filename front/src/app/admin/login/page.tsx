import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { LoginForm } from "@/components/admin/login-form";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user?.can_publish) {
    redirect(sp.next || "/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 inline-block h-12 w-12 rounded-full bg-[#1a4d6e]" />
          <h1 className="text-2xl font-bold text-slate-900">
            geoclicMédia — Administration
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Connecte-toi pour gérer les articles.
          </p>
        </div>

        {sp.error === "forbidden" ? (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
            Ton compte n&apos;a pas le rôle requis pour publier.
            Contacte un administrateur.
          </div>
        ) : null}

        <LoginForm />
      </div>
    </div>
  );
}
