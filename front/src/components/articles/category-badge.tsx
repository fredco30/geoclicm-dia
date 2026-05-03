import type { Category } from "@/types/api";
import { cn } from "@/lib/utils";

type Props = {
  category: Pick<Category, "name" | "slug" | "color">;
  className?: string;
};

export function CategoryBadge({ category, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-white",
        className,
      )}
      style={{ backgroundColor: category.color || "#1a4d6e" }}
    >
      {category.name}
    </span>
  );
}
