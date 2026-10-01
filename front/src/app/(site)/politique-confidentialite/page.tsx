import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité de geoclicMédia : quelles données sont collectées, à quelles fins, et comment exercer vos droits.",
};

export default function Page() {
  return (
    <LegalPage title="Politique de confidentialité" lastUpdate="30 septembre 2026">
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
          <strong>Compte utilisateur</strong> (rédaction, annonceurs) : nom,
          email, téléphone, mot de passe chiffré (haché).
        </li>
        <li>
          <strong>Assistant IA</strong> : les questions posées et les réponses
          fournies sont conservées, rattachées à un identifiant de conversation
          aléatoire (aucun nom ni email). Ne saisissez pas de données
          personnelles dans vos questions.
        </li>
        <li>
          <strong>Mesure d&apos;audience interne</strong> : un compteur de
          lectures par article. Votre adresse IP n&apos;est jamais stockée en
          clair : elle est transformée en empreinte non réversible, conservée
          au plus 1 heure, pour limiter les abus (quota de questions à
          l&apos;assistant, tentatives de connexion) et ne compter
          qu&apos;une lecture par visiteur.
        </li>
        <li>
          <strong>Abonnements commerçants</strong> : les paiements sont traités
          par Stripe ; nous ne voyons ni ne stockons vos coordonnées bancaires.
          Nous conservons les factures émises.
        </li>
      </ul>

      <h2>Sous-traitants</h2>
      <ul>
        <li>
          <strong>Mistral AI</strong> (France) : génère les réponses de
          l&apos;assistant à partir de votre question et des contenus publiés
          sur le site.
        </li>
        <li>
          <strong>Stripe</strong> : paiement des abonnements commerçants.
        </li>
        <li>
          <strong>OVHcloud</strong> (France) : hébergement du site et des
          données.
        </li>
      </ul>

      <h2>Cookies et stockage local</h2>
      <p>
        Nous utilisons uniquement un cookie technique de session (connexion
        à l&apos;espace rédaction ou annonceur) et le cookie de sécurité
        CSRF. Le navigateur conserve aussi localement l&apos;identifiant de
        votre conversation avec l&apos;assistant et, si vous l&apos;avez
        masquée, la date de fermeture de l&apos;invitation à installer
        l&apos;application. Aucun cookie publicitaire ni de traçage tiers.
      </p>

      <h2>Réseaux sociaux</h2>
      <p>
        Certains articles peuvent être partagés sur la page Facebook de
        geoclicMédia. Les boutons de partage ouvrent le réseau choisi
        uniquement quand vous cliquez dessus. Aucune donnée personnelle de nos
        lecteurs n&apos;est transmise à Meta.
      </p>

      <h2>Durée de conservation</h2>
      <ul>
        <li>Comptes utilisateurs : tant que le compte est actif, + 1 an après désactivation.</li>
        <li>Conversations avec l&apos;assistant : 12 mois, puis suppression automatique.</li>
        <li>Empreintes d&apos;adresse IP (anti-abus) : 1 heure au plus.</li>
        <li>Factures : 10 ans (obligation légale).</li>
        <li>Journaux techniques du serveur : 12 mois.</li>
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
