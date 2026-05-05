/**
 * Workflow : Démarrer son espace annonceur.
 * Public visé : les commerçants pilotes qui s'inscrivent en self-service.
 */
import {
  CheckCircle2,
  LayoutDashboard,
  PencilLine,
  Sparkles,
  Store,
} from "lucide-react";

import {
  Done,
  FieldList,
  KeyTip,
  Path,
  SubSteps,
  Tip,
  UI,
  Warning,
} from "../primitives";
import type { Workflow } from "../workflow-types";

export const ADVERTISER_ONBOARDING: Workflow = {
  id: "advertiser-onboarding",
  audience: "Annonceur",
  title: "Démarrer votre espace annonceur",
  description:
    "Première connexion, création de votre fiche commerce, et mise en avant gratuite — la marche à suivre les premiers jours.",
  steps: [
    {
      id: "dashboard",
      title: "Bienvenue dans votre espace",
      icon: LayoutDashboard,
      body: (
        <>
          <p>
            Cet espace est <strong>votre back-office personnel</strong> sur
            geoclicMédia. Il vous permet de :
          </p>
          <SubSteps
            items={[
              <>
                Tenir à jour <strong>votre ou vos fiches commerce</strong> dans
                l&apos;annuaire du média (horaires, photos, description…).
              </>,
              <>
                Créer et suivre <strong>vos campagnes publicitaires</strong>{" "}
                (hors phase pilote — la régie ouvre commercialement à Pâques
                2027).
              </>,
              <>
                Souscrire et gérer <strong>votre abonnement</strong> Basic ou
                Premium dès l&apos;ouverture commerciale.
              </>,
            ]}
          />

          <KeyTip>
            <strong>Phase pilote 2026 — c&apos;est gratuit.</strong> Toute
            l&apos;année 2026, votre fiche est mise en avant sans frais le
            temps que la communauté de lecteurs et d&apos;annonceurs se
            constitue. Vous ne paierez que si vous décidez de continuer
            après Pâques 2027.
          </KeyTip>

          <p>
            Le menu à gauche regroupe : <UI>Tableau de bord</UI>,{" "}
            <UI>Mes fiches</UI>, <UI>Mes campagnes</UI>, <UI>Abonnement</UI>.
            Commencez par créer votre fiche dans <UI>Mes fiches</UI>.
          </p>
        </>
      ),
    },
    {
      id: "fiches",
      title: "Liste de vos fiches",
      icon: Store,
      body: (
        <>
          <p>
            Sur <Path>/advertiser/fiches</Path>, vous voyez toutes les fiches
            que vous gérez. Au début, la liste est vide — c&apos;est ici que
            vous allez créer votre première fiche.
          </p>
          <SubSteps
            items={[
              <>
                Cliquez sur <UI>+ Nouvelle fiche</UI> en haut à droite.
              </>,
              <>
                Si vous représentez plusieurs établissements (plusieurs
                restaurants, plusieurs boutiques d&apos;une même enseigne),
                vous pouvez créer une fiche par établissement.
              </>,
            ]}
          />

          <Tip>
            <strong>Une fiche déjà créée par notre équipe ?</strong> Si l&apos;équipe
            geoclicMédia a déjà saisi votre fiche dans l&apos;annuaire, elle
            apparaîtra ici une fois que nous l&apos;aurons « réclamée » à votre
            compte. Écrivez à{" "}
            <a
              href="mailto:contact@geoclic.fr"
              className="text-[#1a4d6e] underline"
            >
              contact@geoclic.fr
            </a>{" "}
            avec votre nom de commerce et nous ferons la liaison.
          </Tip>
        </>
      ),
    },
    {
      id: "create-fiche",
      title: "Créer votre fiche commerce",
      icon: PencilLine,
      body: (
        <>
          <p>
            Le formulaire est long — c&apos;est volontaire, plus la fiche est
            riche plus elle convertit. Mais{" "}
            <strong>seuls quelques champs sont obligatoires</strong> pour la
            sauvegarder en brouillon. Vous pouvez compléter par étapes.
          </p>

          <h4 className="mt-4 mb-1 font-semibold text-slate-800">
            Champs essentiels (minimum vital)
          </h4>
          <FieldList
            items={[
              {
                label: "Nom commercial",
                required: true,
                description:
                  "Le nom sous lequel les clients vous connaissent (pas la raison sociale).",
              },
              {
                label: "Catégorie principale",
                required: true,
                description:
                  "Restauration, Hébergement, Artisanat… Détermine où votre fiche apparaît dans l'annuaire et la couleur d'icône.",
              },
              {
                label: "Description courte",
                required: true,
                description:
                  "Une ligne (200 caractères max) qui résume votre activité — affichée dans les listings.",
              },
              {
                label: "Description longue",
                required: true,
                description:
                  "L'histoire de votre commerce, vos spécificités. Markdown accepté (gras, italique, listes).",
              },
              {
                label: "Adresse + Commune",
                required: true,
                description:
                  "L'adresse postale complète. Le code postal et la commune servent au géocodage automatique pour la carte MapLibre.",
              },
            ]}
          />

          <h4 className="mt-4 mb-1 font-semibold text-slate-800">
            Champs qui font la différence
          </h4>
          <FieldList
            items={[
              {
                label: "Logo + photo de couverture",
                description:
                  "Le logo apparaît dans les listings, la couverture en grand sur votre fiche détaillée. Format recommandé : logo carré, couverture paysage 16/9.",
              },
              {
                label: "Galerie photos",
                description:
                  "Jusqu'à 12 photos. Idéal : ambiance intérieure, plats/produits, équipe au travail.",
              },
              {
                label: "Horaires d'ouverture",
                description:
                  "Éditeur visuel : pour chaque jour, ajoutez les créneaux (par exemple 9h-12h puis 14h-19h). Affiché en temps réel sur votre fiche (ouvert maintenant / fermé).",
              },
              {
                label: "Fermetures saisonnières",
                description:
                  "Vacances, jours fériés, fermeture annuelle. Mieux vaut prévenir que décevoir un client qui se déplace pour rien.",
              },
              {
                label: "Téléphone + Site web + Réseaux sociaux",
                description:
                  "Plus vous donnez de moyens de vous joindre, mieux les clients vous trouvent.",
              },
              {
                label: "Zones desservies (services à domicile)",
                description:
                  "Si vous intervenez sur plusieurs communes (artisan, traiteur, plombier…), cochez-les. Votre fiche apparaîtra dans la liste de chaque commune cochée.",
              },
            ]}
          />

          <Warning>
            <strong>SIRET</strong> demandé pour les commerçants — c&apos;est ce
            qui nous permet de générer une facture conforme et de vous
            identifier unequement. Aucune information sensible n&apos;est
            exposée publiquement.
          </Warning>

          <Tip>
            <strong>Géocodage</strong> : dès que vous remplissez l&apos;adresse,
            cliquez sur <UI>Géocoder</UI> pour récupérer automatiquement la
            position GPS et placer un marqueur sur la carte. Vous pouvez ajuster
            manuellement si nécessaire.
          </Tip>
        </>
      ),
    },
    {
      id: "edit-fiche",
      title: "Réviser et publier",
      icon: Sparkles,
      body: (
        <>
          <p>
            Une fois sauvegardée, votre fiche est en{" "}
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
              Brouillon
            </span>{" "}
            — elle n&apos;est pas encore visible publiquement.
          </p>
          <SubSteps
            items={[
              <>
                Ouvrez à nouveau la fiche, complétez les sections manquantes
                (photos, horaires, etc.) et cliquez sur{" "}
                <UI>Demander la publication</UI>.
              </>,
              <>
                L&apos;équipe geoclicMédia <strong>vérifie en 24-48 h</strong>{" "}
                : on s&apos;assure qu&apos;il n&apos;y a pas de contenu
                inapproprié, que les images sont correctement créditées, et que
                votre commerce existe bien (pas de fiche fantôme).
              </>,
              <>
                Vous recevez un email dès que la fiche est en ligne. Elle
                apparaît immédiatement dans <Path>/commerces</Path>, sur la
                fiche de votre commune, et sur la carte.
              </>,
            ]}
          />

          <Tip>
            Vous pouvez modifier votre fiche autant de fois que vous voulez
            après publication — pas de revalidation pour les modifications
            mineures (horaires, photos, description). Seuls les changements de
            nom ou catégorie déclenchent une nouvelle vérification.
          </Tip>

          <Done>
            <strong>Bravo, votre fiche est en ligne !</strong> Partagez le lien
            sur vos réseaux, ajoutez-le à votre signature email, mettez le QR
            code sur votre comptoir. Plus on parle de vous, mieux la fiche
            performe dans Google.
          </Done>
        </>
      ),
    },
    {
      id: "next",
      title: "Et après ?",
      icon: CheckCircle2,
      body: (
        <>
          <p>
            Une fois votre fiche en ligne, vous pouvez aller plus loin :
          </p>
          <SubSteps
            items={[
              <>
                <strong>Lancer une campagne pub</strong> dans{" "}
                <UI>Mes campagnes</UI> — bandeaux ciblés sur la home, les
                articles, l&apos;annuaire ou la météo. (Diffusion gratuite en
                phase pilote.)
              </>,
              <>
                <strong>Sponsoriser un article</strong> de geoclicMédia dont le
                sujet vous parle — votre logo et un lien apparaissent en haut
                de l&apos;article. Contactez{" "}
                <a
                  href="mailto:contact@geoclic.fr"
                  className="text-[#1a4d6e] underline"
                >
                  contact@geoclic.fr
                </a>
                .
              </>,
              <>
                À l&apos;ouverture commerciale (Pâques 2027), souscrire un
                abonnement <UI>Basic</UI> (79 €/an) ou <UI>Premium</UI>{" "}
                (149 €/an) pour figurer en tête de listing, avoir une fiche
                premium, et bénéficier de campagnes pub incluses.
              </>,
            ]}
          />
          <KeyTip>
            Question, idée, problème ? L&apos;équipe répond à{" "}
            <a
              href="mailto:contact@geoclic.fr"
              className="text-[#1a4d6e] underline"
            >
              contact@geoclic.fr
            </a>{" "}
            sous 24 h ouvrées.
          </KeyTip>
        </>
      ),
    },
  ],
};
