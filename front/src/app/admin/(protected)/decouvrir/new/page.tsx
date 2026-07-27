import { PlaceForm } from "@/components/admin/place-form";
import { api } from "@/lib/api";
import { getDiscoveryRelationOptions } from "@/lib/discovery-admin-data";

export default async function NewPlacePage() {
  const [categories, communes, options] = await Promise.all([api.discovery.categories(), api.communes(), getDiscoveryRelationOptions()]);
  return <PlaceForm categories={categories} communes={communes} articles={options.articles} businesses={options.businesses} events={options.events} />;
}
