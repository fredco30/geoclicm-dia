import { MapPin, Navigation, Eye } from "lucide-react";

type Props = {
  latitude: number;
  longitude: number;
  /** Nom du commerce — passé à Google Maps comme query pour matcher la fiche existante. */
  name?: string;
};

/**
 * Boutons d'action navigation : Itinéraire (Google Maps), Waze, Street View.
 *
 * URLs publiques deeplinkables — fonctionnent en mobile (ouvrent l'app si installée)
 * comme en desktop (ouvrent l'onglet web). Pas de clé API requise.
 */
export function BusinessNavActions({ latitude, longitude, name }: Props) {
  const coords = `${latitude},${longitude}`;
  const query = name ? `${name} (${coords})` : coords;
  const encQuery = encodeURIComponent(query);

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${encQuery}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md bg-[#1a4d6e] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#163d57]"
      >
        <Navigation className="h-3.5 w-3.5" />
        Itinéraire (Maps)
      </a>
      <a
        href={`https://waze.com/ul?ll=${coords}&navigate=yes`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
      >
        <MapPin className="h-3.5 w-3.5" />
        Waze
      </a>
      <a
        href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${coords}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
        title="Ouvrir Street View — utiliser le sélecteur d'année pour voir l'historique de la rue"
      >
        <Eye className="h-3.5 w-3.5" />
        Street View
      </a>
    </div>
  );
}
