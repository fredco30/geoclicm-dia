import Link from "next/link";

export const metadata = { title: "Page introuvable" };

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-[#a8533a]">Erreur 404</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold text-slate-900 sm:text-4xl">
        Cette page n&apos;existe pas (ou plus)
      </h1>
      <p className="mt-3 text-slate-600">
        Le lien est peut-être ancien, ou le contenu a été retiré.
      </p>
      <nav className="mt-8 flex flex-wrap justify-center gap-3 text-sm" aria-label="Pages utiles">
        <Link href="/" className="rounded-md bg-[#1a4d6e] px-4 py-2 font-medium text-white hover:bg-[#13384f]">
          Accueil
        </Link>
        <Link href="/agenda" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50">
          Agenda
        </Link>
        <Link href="/commerces" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50">
          Commerces
        </Link>
        <Link href="/articles" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50">
          Articles
        </Link>
      </nav>
    </main>
  );
}
