import { listingMetadata, makeListingListPage } from "@/components/listings/listing-list-page";

export const revalidate = 300;
export const metadata = listingMetadata(
  "Offres d'emploi",
  "Offres d'emploi du territoire camarguais, collectées depuis les sites officiels et vérifiées avant publication.",
);

export default makeListingListPage({
  categorySlug: "offres-d-emploi",
  basePath: "/emploi",
  title: "Offres d'emploi",
  description:
    "Les offres d'emploi du territoire, repérées sur les sites officiels et validées par la rédaction avant publication.",
  emptyLabel: "Aucune offre d'emploi publiée pour le moment.",
});
