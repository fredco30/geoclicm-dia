import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation",
  description: "Conditions générales d'utilisation du site geoclicMédia.",
};

export default function Page() {
  return (
    <LegalPage title="Conditions générales d'utilisation" lastUpdate="3 mai 2026">
      <p>
        Les présentes CGU régissent l&apos;utilisation du site geoclicMédia
        (ci-après « le Site »).
      </p>

      <h2>1. Objet</h2>
      <p>
        Le Site a pour objet de proposer un média local indépendant couvrant
        l&apos;actualité, le patrimoine et la mémoire vivante du littoral camarguais.
      </p>

      <h2>2. Accès au Site</h2>
      <p>
        L&apos;accès au Site est gratuit. Certaines fonctionnalités (publication
        d&apos;articles, espace annonceur) nécessitent la création d&apos;un compte.
      </p>

      <h2>3. Comportement des utilisateurs</h2>
      <p>L&apos;utilisateur s&apos;engage à ne pas publier de contenu :</p>
      <ul>
        <li>diffamatoire, injurieux, raciste, sexiste, discriminatoire ;</li>
        <li>portant atteinte à la vie privée d&apos;autrui ;</li>
        <li>violant les droits de propriété intellectuelle ;</li>
        <li>à caractère commercial non autorisé.</li>
      </ul>

      <h2>4. Responsabilité</h2>
      <p>
        Les contenus publiés engagent leurs auteurs respectifs. La rédaction
        de geoclicMédia se réserve le droit de modérer ou supprimer tout contenu
        non conforme aux présentes CGU.
      </p>

      <h2>5. Modification des CGU</h2>
      <p>
        Les présentes CGU peuvent être modifiées à tout moment. Les utilisateurs
        seront informés des changements substantiels.
      </p>

      <h2>6. Droit applicable</h2>
      <p>
        Les présentes CGU sont soumises au droit français. Tout litige relève
        des tribunaux compétents du ressort du siège de l&apos;éditeur.
      </p>
    </LegalPage>
  );
}
