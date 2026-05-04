import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Suppression de données",
  description:
    "Demander la suppression de vos données personnelles sur geoclicMédia.",
};

export default function Page() {
  return (
    <LegalPage title="Suppression de données" lastUpdate="3 mai 2026">
      <p>
        Conformément au RGPD et à la politique de Meta, vous pouvez demander la
        suppression de toutes les données personnelles que nous détenons à votre sujet.
      </p>

      <h2>Comment procéder</h2>
      <p>Envoyez un email à <a href="mailto:contact@geoclic.fr">contact@geoclic.fr</a> en précisant :</p>
      <ul>
        <li>Votre nom complet</li>
        <li>L&apos;adresse email associée à votre compte (si applicable)</li>
        <li>Le ou les types de données à supprimer (compte, commentaires, etc.)</li>
      </ul>

      <h2>Délai de traitement</h2>
      <p>
        Nous traitons votre demande sous <strong>30 jours</strong> maximum.
        Vous recevrez une confirmation par email une fois la suppression effectuée.
      </p>

      <h2>Données conservées malgré la demande</h2>
      <p>
        Certaines données peuvent être conservées dans le cadre de nos obligations
        légales (logs d&apos;accès pendant 12 mois selon la LCEN, données de
        facturation pendant 10 ans selon le Code de commerce).
      </p>

      <h2>Connexion via Facebook / Meta</h2>
      <p>
        Si vous avez interagi avec notre application via Meta, votre demande de
        suppression chez nous entraînera également la révocation des permissions
        accordées à notre application Meta.
      </p>
    </LegalPage>
  );
}
