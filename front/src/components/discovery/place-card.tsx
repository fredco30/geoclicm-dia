import Link from "next/link";
import { Clock, Compass, MapPin } from "lucide-react";
import type { PlaceListItem } from "@/types/api";

export function PlaceCard({ place }: { place: PlaceListItem }) {
  return <Link href={`/decouvrir/${place.slug}`} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">{place.cover_image?.medium ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={place.cover_image.medium} alt="" className="aspect-[16/10] w-full object-cover" />
  ) : <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-[#1a4d6e]/10 to-green-100"><Compass className="h-10 w-10 text-[#1a4d6e]/50" /></div>}<div className="p-4"><span className="rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: place.category.color }}>{place.category.name}</span><h2 className="mt-2 font-serif text-xl font-semibold text-slate-900 group-hover:text-[#1a4d6e]">{place.title}</h2><p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" /> {place.commune_name}{place.duration ? <><Clock className="ml-2 h-3.5 w-3.5" /> {place.duration}</> : null}</p><p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{place.short_description}</p></div></Link>;
}
