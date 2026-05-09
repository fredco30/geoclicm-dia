import type { Metadata } from "next";
import Link from "next/link";

import { api } from "@/lib/api";
import { UsefulContactList } from "@/components/utility/useful-contact-list";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Numéros utiles",
  description:
    "Numéros d'urgence et contacts pratiques du littoral camarguais : "
    + "pompiers, gendarmerie, mairies, médecins de garde, capitainerie.",
};

export default async function UsefulNumbersPage() {
  const items = await api.utility
    .list({ kind: "useful_number" })
    .catch(() => []);

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:py-10">
      <header className="mb-8 border-b border-slate-200 pb-6">
        <Link href="/" className="text-sm text-slate-600 hover:text-[#1a4d6e]">
          ← Accueil
        </Link>
        <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Numéros utiles
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Les contacts d&apos;urgence et services pratiques du littoral
          camarguais. Tape le numéro depuis ton mobile pour appeler
          directement.
        </p>
      </header>

      <UsefulContactList
        items={items}
        emptyMessage="Aucun numéro utile renseigné pour l'instant."
      />
    </div>
  );
}
