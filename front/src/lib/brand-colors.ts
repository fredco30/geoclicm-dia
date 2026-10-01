/**
 * Couleurs de marque courantes (réglage « Identité du site »), lues sur la
 * page. Pour les API qui exigent une vraie couleur (marqueurs MapLibre) ;
 * en CSS / style inline, préférer var(--brand-primary) / var(--brand-accent).
 */
export function brandColor(kind: "primary" | "accent"): string {
  const fallback = kind === "primary" ? "#1a4d6e" : "#a8533a";
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(`--brand-${kind}`)
    .trim();
  return value || fallback;
}
