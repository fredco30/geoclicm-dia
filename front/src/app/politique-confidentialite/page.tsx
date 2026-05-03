import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité de geoclicMédia : quelles données sont collectées, à quelles fins, et comment exercer vos droits.",
};

export default function Page() {
  return (
    <LegalPage title="Politique de confidentialité" lastUpdate="3 mai 2026">
      <p>
        Cette politique explique quelles données personnelles nous collectons,
        à quelles fins, et comment exercer vos droits conformément au RGPD.
      </p>

      <h2>Responsable de traitement</h2>
      <p>
        geoclicMédia, contact :{" "}
        <a href="mailto:contact@geoclic.fr">contact@geoclic.fr</a>.
      </p>

      <h2>Données collectées</h2>
      <ul>
        <li>
          <strong>Données de navigation</strong> : statistiques anonymes (Plausible Analytics, sans cookie tiers).
        </li>
        <li>
          <strong>Compte utilisateur</strong> (rédacteurs, annonceurs) : nom, email,
          téléphone, mot de passe haché.
        </li>
        <li>
          <strong>Commentaires / contributions</strong> : email + contenu déposé.
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>
        Nous utilisons un cookie technique de session (authentification) et le
        cookie CSRF Django. Aucun cookie publicitaire ou de traçage tiers.
      </p>

      <h2>Réseaux sociaux</h2>
      <p>
        Nous diffusons certains articles automatiquement sur la page Facebook
        de geoclicMédia via l&apos;API Meta. Les contenus partagés sur Facebook
        sont soumis à la politique de Meta. Aucune donnée personnelle de nos
        lecteurs n&apos;est transmise à Meta sans leur consentement explicite.
      </p>

      <h2>Durée de conservation</h2>
      <ul>
        <li>Comptes utilisateurs : tant que le compte est actif, + 1 an après désactivation.</li>
        <li>Logs serveur : 12 mois.</li>
        <li>Statistiques anonymes : illimité.</li>
      </ul>

      <h2>Vos droits</h2>
      <p>
        Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement,
        de portabilité et d&apos;opposition. Pour exercer ces droits, contactez-nous
        à <a href="mailto:contact@geoclic.fr">contact@geoclic.fr</a>.
      </p>
      <p>
        Vous pouvez également déposer une réclamation auprès de la{" "}
        <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
          CNIL
        </a>.
      </p>

      <h2>Suppression de données</h2>
      <p>
        Pour demander la suppression de vos données personnelles, voir la page{" "}
        <a href="/suppression-donnees">Suppression de données</a>.
      </p>
    </LegalPage>
  );
}
