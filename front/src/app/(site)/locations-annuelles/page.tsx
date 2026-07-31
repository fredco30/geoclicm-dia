import { listingMetadata, makeListingListPage } from "@/components/listings/listing-list-page";

export const revalidate = 300;
export const metadata = listingMetadata(
  "Locations annuelles",
  "Offres et demandes de locations à l'année : La Grande-Motte, Le Grau-du-Roi, Aigues-Mortes.",
);

export default makeListingListPage({
  categorySlug: "locations-annuelles",
  basePath: "/locations-annuelles",
  title: "Locations annuelles",
  description:
    "Locations à l'année sur La Grande-Motte, Le Grau-du-Roi et Aigues-Mortes, publiées par la rédaction.",
  emptyLabel: "Aucune annonce de location annuelle publiée pour le moment.",
});
