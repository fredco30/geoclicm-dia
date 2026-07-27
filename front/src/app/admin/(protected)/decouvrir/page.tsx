import Link from "next/link";
import { Edit, Eye, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCookieHeader } from "@/lib/auth-server";
import type { PlaceDetail } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

async function fetchPlaces(): Promise<PlaceDetail[]> {
  const cookie = await getCookieHeader();
  const response = await fetch(`${API_URL}/api/admin/places/`, { headers: { Cookie: cookie, Accept: "application/json" }, cache: "no-store" });
  return response.ok ? response.json() as Promise<PlaceDetail[]> : [];
}

export default async function DiscoveryAdminPage() {
  const places = await fetchPlaces();
  return <div><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-bold">Découvrir</h1><p className="text-sm text-slate-500">Lieux, balades, patrimoine et savoir-faire géolocalisés.</p></div><div className="flex gap-2"><Link href="/admin/decouvrir/categories"><Button variant="secondary" size="sm">Catégories</Button></Link><Link href="/admin/decouvrir/new"><Button size="sm"><Plus className="h-4 w-4" /> Nouveau lieu</Button></Link></div></div>{places.length === 0 ? <p className="rounded-xl border border-dashed bg-white p-10 text-center text-slate-500">Aucune fiche Découvrir.</p> : <div className="overflow-hidden rounded-xl border bg-white"><table className="w-full text-sm"><thead className="border-b bg-slate-50 text-left text-xs uppercase text-slate-600"><tr><th className="px-3 py-2">Titre</th><th className="px-3 py-2">Catégorie</th><th className="px-3 py-2">Commune</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2 text-right">Actions</th></tr></thead><tbody className="divide-y">{places.map((place) => <tr key={place.id} className="hover:bg-slate-50"><td className="px-3 py-2 font-medium">{place.title}</td><td className="px-3 py-2"><span className="rounded-full px-2 py-0.5 text-xs text-white" style={{ backgroundColor: place.category.color }}>{place.category.name}</span></td><td className="px-3 py-2 text-slate-600"><span className="inline-flex gap-1"><MapPin className="h-4 w-4" />{place.commune_name}</span></td><td className="px-3 py-2"><span className={place.status === "published" ? "text-green-700" : "text-slate-500"}>{place.status === "published" ? "Publié" : place.status === "archived" ? "Archivé" : "Brouillon"}</span></td><td className="px-3 py-2 text-right">{place.status === "published" ? <Link href={`/decouvrir/${place.slug}`} target="_blank" className="inline-block p-2"><Eye className="h-4 w-4" /></Link> : null}<Link href={`/admin/decouvrir/${place.slug}/edit`} className="inline-block p-2"><Edit className="h-4 w-4" /></Link></td></tr>)}</tbody></table></div>}</div>;
}
