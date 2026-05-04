import type { Category } from "@/types/api";
import { cn } from "@/lib/utils";

type Props = {
  category: Pick<Category, "name" | "slug" | "color">;
  className?: string;
};

/**
 * Badge catégorie style "tampon discret".
 * Bordure 1.5px + texte couleur + fond off-white (au lieu d'un fond plein saturé).
 * Cohérent avec la direction artistique magazine.
 */
export function CategoryBadge({ category, className }: Props) {
  const color = category.color || "#1a4d6e";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border-[1.5px] bg-[#fbf9f5] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]",
        className,
      )}
      style={{
        color,
        borderColor: color,
      }}
    >
      {category.name}
    </span>
  );
}
