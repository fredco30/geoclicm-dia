/**
 * Données structurées schema.org (JSON-LD).
 *
 * `<` est échappé : un texte contenant « </script> » (titre, description
 * issue d'un import) ne peut pas refermer la balise et injecter du HTML.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

/** Retire les clés vides pour garder un JSON-LD propre. */
export function compact<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== null && v !== undefined && v !== ""),
  ) as T;
}
