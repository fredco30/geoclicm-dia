import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { getRoleLabel } from "@/lib/roles";
import { getSiteSettings } from "@/lib/site-settings";
import { LoginForm } from "@/components/admin/login-form";
import { LoginForbiddenBanner } from "@/components/admin/login-forbidden-banner";

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

  // Reader ou advertiser connecté : on l'aide à comprendre + se déconnecter.
  const isForbiddenUser = user !== null && !user.can_publish;
  const site = await getSiteSettings();

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          {site.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.logo_url} alt="" className="mx-auto mb-3 h-12 w-auto" />
          ) : (
            <div className="mx-auto mb-3 inline-block h-12 w-12 rounded-full bg-camargue" />
          )}
          <h1 className="text-2xl font-bold text-slate-900">
            {site.site_name} — Administration
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Connecte-toi pour gérer les articles.
          </p>
        </div>

        {isForbiddenUser ? (
          <LoginForbiddenBanner
            email={user.email}
            currentRoleLabel={getRoleLabel(user)}
          />
        ) : null}

        <LoginForm />
      </div>
    </div>
  );
}
