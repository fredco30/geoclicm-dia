import type { Metadata } from "next";
import Link from "next/link";

import { api } from "@/lib/api";
import { UsefulContactList } from "@/components/utility/useful-contact-list";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Démarches administratives",
  description:
    "Carte d'identité, état civil, urbanisme, permis : les démarches "
    + "administratives utiles aux habitants et aux visiteurs du littoral.",
};

export default async function ProceduresPage() {
  const items = await api.utility
    .list({ kind: "procedure" })
    .catch(() => []);

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:py-10">
      <header className="mb-8 border-b border-slate-200 pb-6">
        <Link href="/" className="text-sm text-slate-600 hover:text-[#1a4d6e]">
          ← Accueil
        </Link>
        <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Démarches administratives
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Liens directs vers les démarches officielles (service-public.fr,
          mairies, préfecture). Pour les pièces à fournir et délais
          précis, suis le lien correspondant — ils sont mis à jour par
          les organismes compétents.
        </p>
      </header>

      <UsefulContactList
        items={items}
        emptyMessage="Aucune démarche renseignée pour l'instant."
      />
    </div>
  );
}
