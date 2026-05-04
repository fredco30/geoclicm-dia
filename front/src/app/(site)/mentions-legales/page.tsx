import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales du site geoclicMédia.",
};

export default function Page() {
  return (
    <LegalPage title="Mentions légales" lastUpdate="3 mai 2026">
      <h2>Éditeur du site</h2>
      <p>
        Le site geoclicMédia est édité par <strong>Frédéric [Nom à compléter]</strong>,
        contact : <a href="mailto:contact@geoclic.fr">contact@geoclic.fr</a>.
      </p>

      <h2>Hébergement</h2>
      <p>
        Site hébergé par <strong>OVH SAS</strong>, 2 rue Kellermann, 59100 Roubaix, France.
        Téléphone : 09 72 10 10 07.
      </p>

      <h2>Directrice de la publication</h2>
      <p>[À compléter]</p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des contenus (textes, photographies, illustrations) publiés
        sur geoclicMédia sont protégés par le droit d&apos;auteur. Toute reproduction
        ou rediffusion sans autorisation préalable est interdite.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question concernant le site, son contenu ou un signalement :{" "}
        <a href="mailto:contact@geoclic.fr">contact@geoclic.fr</a>.
      </p>
    </LegalPage>
  );
}
