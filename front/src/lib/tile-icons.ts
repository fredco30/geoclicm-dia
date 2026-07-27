/**
 * Icônes Lucide curées disponibles pour les tuiles d'accueil.
 *
 * On importe statiquement chaque icône utilisée pour bénéficier du
 * tree-shaking — un `import * from "lucide-react"` casserait l'optimisation
 * et inclurait les ~1500 icônes dans le bundle final.
 *
 * Pour ajouter une icône : importer ici et l'ajouter au mapping. Le composant
 * TileIconPicker (admin) et TileItem (public) utilisent tous deux ce
 * mapping.
 *
 * Si un admin renseigne un nom non listé ici dans le champ icon, la tuile
 * affiche un fallback (?).
 */
import { createElement, type ReactElement } from "react";
import type { LucideIcon, LucideProps } from "lucide-react";
import {
  AlertTriangle,
  Anchor,
  BookOpen,
  Building,
  Calendar,
  CalendarDays,
  Camera,
  Clock,
  Cloud,
  CloudSun,
  Coffee,
  Compass,
  FileText,
  HelpCircle,
  Hotel,
  Info,
  Landmark,
  Map,
  MapPin,
  Mail,
  MessageSquare,
  Mountain,
  Music,
  Newspaper,
  Pencil,
  Phone,
  Search,
  Settings,
  ShoppingBag,
  ShoppingBasket,
  Stethoscope,
  Store,
  Sun,
  Tag,
  Tent,
  TreePine,
  Users,
  UtensilsCrossed,
  Vote,
  Waves,
  Wrench,
} from "lucide-react";

export const TILE_ICONS: Record<string, LucideIcon> = {
  AlertTriangle,
  Anchor,
  BookOpen,
  Building,
  Calendar,
  CalendarDays,
  Camera,
  Clock,
  Cloud,
  CloudSun,
  Coffee,
  Compass,
  FileText,
  HelpCircle,
  Hotel,
  Info,
  Landmark,
  Map,
  MapPin,
  Mail,
  MessageSquare,
  Mountain,
  Music,
  Newspaper,
  Pencil,
  Phone,
  Search,
  Settings,
  ShoppingBag,
  ShoppingBasket,
  Stethoscope,
  Store,
  Sun,
  Tag,
  Tent,
  TreePine,
  Users,
  UtensilsCrossed,
  Vote,
  Waves,
  Wrench,
};

/** Liste des noms disponibles, dans l'ordre d'affichage du sélecteur admin. */
export const CURATED_ICON_NAMES = Object.keys(TILE_ICONS);

export function getTileIcon(name: string): LucideIcon | null {
  return TILE_ICONS[name] ?? null;
}

export function renderTileIcon(
  name: string,
  props: LucideProps,
): ReactElement | null {
  const icon = getTileIcon(name);
  return icon ? createElement(icon, props) : null;
}
