import { Phone, Mail, ExternalLink, MapPin, Info } from "lucide-react";

import type { UsefulContactPublic } from "@/types/api";

type Props = {
  items: UsefulContactPublic[];
  /** Message à afficher si la liste est vide. */
  emptyMessage: string;
};

/**
 * Liste des entrées Pratique (numéros utiles ou démarches), groupées par
 * `category_label`. Les entrées sans catégorie sont rangées sous « Autres ».
 *
 * Le rendu de chaque entrée dépend du `contact_type` :
 * - phone   → <a href="tel:..."> avec icône
 * - url     → <a href="..." target="_blank"> avec icône lien externe
 * - email   → <a href="mailto:..."> avec icône
 * - address → texte brut + icône épingle (pas de lien — copier/coller manuel)
 * - info    → texte brut + icône info
 */
export function UsefulContactList({ items, emptyMessage }: Props) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </p>
    );
  }

  // Groupage par category_label en préservant l'ordre d'apparition.
  const groups = new Map<string, UsefulContactPublic[]>();
  for (const item of items) {
    const key = item.category_label || "Autres";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  return (
    <div className="space-y-8">
      {[...groups.entries()].map(([category, entries]) => (
        <section key={category}>
          <h2 className="mb-3 border-b border-slate-200 pb-2 font-serif text-xl font-semibold text-slate-800">
            {category}
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {entries.map((entry) => (
              <li key={entry.id}>
                <ContactCard entry={entry} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ContactCard({ entry }: { entry: UsefulContactPublic }) {
  const cardBase =
    "flex h-full flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-[#1a4d6e] hover:shadow-sm";

  const Body = (
    <>
      <div className="flex items-start gap-2">
        <ContactIcon type={entry.contact_type} />
        <span className="font-medium text-slate-900">{entry.label}</span>
      </div>
      <ValueLine entry={entry} />
      {entry.description ? (
        <p className="mt-1 text-xs text-slate-500">{entry.description}</p>
      ) : null}
      {entry.commune_name ? (
        <p className="mt-1 text-[11px] uppercase tracking-wider text-slate-400">
          {entry.commune_name}
        </p>
      ) : null}
    </>
  );

  // Pour les types phone/url/email, la carte entière est cliquable —
  // plus pratique sur mobile. Adresse + info → carte non-clickable.
  const href = buildHref(entry);
  if (!href) {
    return <div className={cardBase}>{Body}</div>;
  }
  const isExternal = entry.contact_type === "url";
  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className={cardBase}
    >
      {Body}
    </a>
  );
}

function buildHref(entry: UsefulContactPublic): string | null {
  switch (entry.contact_type) {
    case "phone":
      // Garde uniquement chiffres + (préserve le préfixe pays s'il existe)
      return `tel:${entry.value.replace(/[^\d+]/g, "")}`;
    case "url":
      return entry.value;
    case "email":
      return `mailto:${entry.value}`;
    default:
      return null;
  }
}

function ValueLine({ entry }: { entry: UsefulContactPublic }) {
  const baseClass = "text-sm text-slate-700 break-words";
  if (entry.contact_type === "url") {
    return <span className={`${baseClass} underline decoration-slate-300`}>{entry.value}</span>;
  }
  return <span className={baseClass}>{entry.value}</span>;
}

function ContactIcon({ type }: { type: UsefulContactPublic["contact_type"] }) {
  const cls = "h-4 w-4 shrink-0 text-[#1a4d6e]";
  switch (type) {
    case "phone":
      return <Phone className={cls} aria-hidden />;
    case "email":
      return <Mail className={cls} aria-hidden />;
    case "url":
      return <ExternalLink className={cls} aria-hidden />;
    case "address":
      return <MapPin className={cls} aria-hidden />;
    default:
      return <Info className={cls} aria-hidden />;
  }
}
