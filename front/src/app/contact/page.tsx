import type { Metadata } from "next";
import { Mail, MapPin } from "lucide-react";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contacter la rédaction de geoclicMédia : suggestion d'article, signalement, partenariat, régie publicitaire.",
};

export default function Page() {
  return (
    <LegalPage title="Contact">
      <p>
        Une suggestion d&apos;article, un signalement, une demande de partenariat,
        de la publicité commerçant ? Écrivez-nous.
      </p>

      <h2>Email</h2>
      <p>
        <a
          href="mailto:contact@geoclic.fr"
          className="inline-flex items-center gap-2"
        >
          <Mail className="h-4 w-4" /> contact@geoclic.fr
        </a>
      </p>

      <h2>Régie publicitaire commerçants</h2>
      <p>
        Vous tenez un commerce, une activité, un hébergement sur le littoral
        camarguais ? Nous proposons des formules adaptées (Basic 79€/an, Premium 149€/an)
        pour mettre en avant votre activité auprès de nos lecteurs.
      </p>
      <p>
        Contact dédié :{" "}
        <a href="mailto:annonceurs@geoclic.fr">annonceurs@geoclic.fr</a>.
      </p>

      <h2>Couverture géographique</h2>
      <p className="inline-flex items-center gap-2">
        <MapPin className="h-4 w-4" /> Le Grau-du-Roi · Aigues-Mortes · La Grande-Motte ·
        Saint-Laurent-d&apos;Aigouze · Marsillargues · Lunel · Vauvert ·
        Camargue gardoise.
      </p>
    </LegalPage>
  );
}
