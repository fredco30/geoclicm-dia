/**
 * Workflow : Comprendre les Comptes vs les Commerçants.
 * Public visé : administrateurs (Fred + futurs co-admins) qui gèrent les
 * deux listes en parallèle et ont besoin de comprendre comment elles
 * s'articulent.
 */
import {
  KeyRound,
  Layers,
  Link2,
  Store,
  Users,
} from "lucide-react";

import {
  Done,
  KeyTip,
  Path,
  SubSteps,
  Tip,
  UI,
  Warning,
} from "../primitives";
import type { Workflow } from "../workflow-types";

export const ACCOUNTS_VS_BUSINESSES: Workflow = {
  id: "accounts-vs-businesses",
  audience: "Administration",
  title: "Comptes & Commerçants — comment ça s'articule",
  description:
    "geoclicMédia distingue les comptes de connexion (Comptes & droits) des fiches commerce (Commerçants). Voici comment les deux entités cohabitent et se lient.",
  steps: [
    {
      id: "concept",
      title: "Le concept de base : deux choses distinctes",
      icon: Layers,
      body: (
        <>
          <p>
            Vous gérez ici deux entités qui se ressemblent mais qui sont{" "}
            <strong>séparées</strong> par design :
          </p>
          <SubSteps
            items={[
              <>
                <strong>Un Compte</strong> (<UI>Comptes &amp; droits</UI>) =
                une <strong>identité de connexion</strong> sur le site. Email,
                mot de passe, rôle. Un humain qui peut se logger.
              </>,
              <>
                <strong>Une fiche Commerçant</strong> (<UI>Commerçants</UI>) =
                un <strong>contenu public</strong> dans l&apos;annuaire. Nom,
                photos, horaires, géoloc, catégorie. Aucune connexion
                possible : c&apos;est juste de l&apos;affichage.
              </>,
            ]}
          />
          <Tip>
            <strong>Analogie Airbnb</strong> : il y a les <em>annonces</em>{" "}
            (Commerçants) et les <em>comptes hôtes</em> (Comptes). Une annonce
            peut exister sans compte rattaché (gérée par la plateforme), un
            compte peut avoir 0, 1 ou plusieurs annonces. Pareil ici.
          </Tip>
          <p>
            Les deux entités sont reliées par un champ optionnel{" "}
            <UI>owner</UI> sur la fiche commerçant. Quand il est rempli, on
            dit que la fiche est <strong>« réclamée »</strong> par ce compte.
          </p>
        </>
      ),
    },
    {
      id: "roles",
      title: "Les 4 rôles de comptes",
      icon: Users,
      body: (
        <>
          <p>
            Chaque compte a exactement <strong>un rôle</strong>, qui détermine
            ce qu&apos;il peut faire :
          </p>
          <SubSteps
            items={[
              <>
                <strong>Lecteur</strong> — par défaut à l&apos;inscription.
                Peut commenter, sauvegarder ses articles favoris (futur). Pas
                d&apos;accès aux back-offices.
              </>,
              <>
                <strong>Annonceur</strong> — un commerçant qui s&apos;est
                inscrit pour gérer sa fiche en self-service. Accès à{" "}
                <Path>/advertiser/*</Path> uniquement (sa fiche, ses campagnes
                pub, son abonnement). Pas d&apos;accès à <Path>/admin/*</Path>.
              </>,
              <>
                <strong>Rédacteur</strong> — votre partenaire éditoriale.
                Accès à <Path>/admin/articles/*</Path> + lecture des autres
                modules admin. Ne peut pas gérer les comptes utilisateurs.
              </>,
              <>
                <strong>Administrateur</strong> — vous (et tous les futurs
                co-admins). Accès complet, y compris gestion des comptes,
                régie publicitaire, paramètres.
              </>,
            ]}
          />
          <Warning>
            <strong>Promotion de rôle</strong> : seul un Administrateur peut
            modifier le rôle d&apos;un autre compte. Un annonceur ne peut pas
            se promouvoir lui-même en éditeur en éditant son profil. Pensez à
            vérifier régulièrement la liste des comptes pour repérer les
            promotions cohérentes (ex: un commerçant qui démarre Annonceur,
            qu&apos;on garde Annonceur).
          </Warning>
        </>
      ),
    },
    {
      id: "businesses",
      title: "Les fiches Commerçants — ce qu'elles contiennent",
      icon: Store,
      body: (
        <>
          <p>
            Chaque fiche dans <UI>Commerçants</UI> est{" "}
            <strong>indépendante</strong> du système de comptes. Elle contient :
          </p>
          <SubSteps
            items={[
              <>
                Les informations publiques : nom, description, photos,
                horaires, géoloc, contact (téléphone, email, site web,
                réseaux sociaux).
              </>,
              <>
                Une catégorie principale (Restauration, Hébergement,
                Artisanat…) qui détermine où elle apparaît dans l&apos;annuaire.
              </>,
              <>
                Une <strong>commune-siège</strong> et optionnellement des{" "}
                <strong>zones desservies</strong> (plombier qui couvre 5
                communes par exemple).
              </>,
              <>
                Un <strong>plan</strong> (Gratuit / Basic 79 € / Premium
                149 €) qui détermine sa visibilité (mise en avant home, badge
                premium, ordre de tri).
              </>,
              <>
                Un <strong>owner</strong> optionnel — le compte qui la gère
                (cf étape suivante).
              </>,
            ]}
          />
          <KeyTip>
            <strong>Sponsoring d&apos;article</strong> : quand vous
            sélectionnez un sponsor sur un article (champ <UI>Sponsor</UI>),
            vous choisissez une fiche <strong>Commerçant</strong>, pas un
            compte. C&apos;est pour ça qu&apos;une fiche peut sponsoriser un
            article même sans compte rattaché — pratique en phase pilote.
          </KeyTip>
        </>
      ),
    },
    {
      id: "claim",
      title: "Réclamer une fiche pour un compte",
      icon: Link2,
      body: (
        <>
          <p>
            La <strong>liaison</strong> Compte ↔ Fiche se fait via le champ{" "}
            <UI>owner</UI> de la fiche. C&apos;est ce qui permet à un
            commerçant de gérer sa fiche en self-service depuis son espace{" "}
            <Path>/advertiser/*</Path>.
          </p>

          <h4 className="mt-4 mb-1 font-semibold text-slate-800">
            Trois scénarios possibles
          </h4>
          <SubSteps
            items={[
              <>
                <strong>Cas A — Phase pilote</strong> : vous saisissez les
                fiches dans <Path>/admin/directory/businesses/new</Path> sans
                owner. Elles apparaissent en{" "}
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                  Non réclamée
                </span>
                . Le commerçant n&apos;a pas (encore) de compte.
              </>,
              <>
                <strong>Cas B — Self-service</strong> : un commerçant
                s&apos;inscrit via <Path>/advertiser/register</Path>. Il
                obtient un compte Annonceur. Il créera lui-même sa fiche
                depuis <Path>/advertiser/fiches/new</Path>, qui sera
                automatiquement <UI>owner = lui</UI>.
              </>,
              <>
                <strong>Cas C — Réclamation</strong> : un commerçant pour qui
                vous avez déjà saisi une fiche (cas A) s&apos;inscrit
                ensuite. Il faut <strong>rattacher</strong> son compte à la
                fiche existante. Aujourd&apos;hui, ça se fait dans Django
                Admin (<Path>/django-admin/directory/business/</Path> →
                ouvrir la fiche → champ Owner → sélectionner l&apos;utilisateur
                → cocher <UI>is_claimed</UI>).
              </>,
            ]}
          />

          <Warning>
            Le bouton <strong>« Réclamer pour un utilisateur »</strong> en un
            clic depuis la fiche commerce est prévu en évolution future, mais
            n&apos;est pas encore implémenté dans le back-office custom (
            <UI>Comptes &amp; droits</UI> et <UI>Commerçants</UI>). En
            attendant, Django Admin reste l&apos;outil pour ce cas C.
          </Warning>
        </>
      ),
    },
    {
      id: "verify",
      title: "Vérifier la cohérence",
      icon: KeyRound,
      body: (
        <>
          <p>
            Deux indices visuels sont là pour vous aider à repérer
            rapidement les incohérences ou les points d&apos;attention :
          </p>
          <SubSteps
            items={[
              <>
                Sur la liste <UI>Comptes &amp; droits</UI>, la colonne{" "}
                <UI>Fiches</UI> indique combien de fiches chaque compte gère.
                Un Annonceur avec « — aucune » est un signal :{" "}
                <em>il s&apos;est inscrit mais ne gère encore rien</em>{" "}
                (peut-être qu&apos;une fiche existante doit lui être
                réclamée).
              </>,
              <>
                Sur la liste <UI>Commerçants</UI>, la colonne{" "}
                <UI>Propriétaire</UI> affiche soit le compte rattaché (lien
                cliquable), soit{" "}
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                  Non réclamée
                </span>
                . Le filtre <UI>Non réclamées</UI> en haut permet de voir
                d&apos;un coup d&apos;œil le stock de fiches en attente.
              </>,
              <>
                Cas exotique :{" "}
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                  Sans propriétaire
                </span>{" "}
                (badge ambre) signale une fiche marquée réclamée mais dont le
                propriétaire a été supprimé ensuite. À corriger au cas par cas
                (rattacher à un nouveau compte ou décocher{" "}
                <UI>is_claimed</UI>).
              </>,
            ]}
          />

          <Done>
            En navigant entre les deux listes via les liens cliquables (le
            lien <UI>@username</UI> sur la liste commerçants vers la fiche
            compte, et le lien <UI>n fiches</UI> sur la liste comptes vers
            les fiches), vous gardez en permanence une vue claire des
            connexions entre vos deux référentiels.
          </Done>
        </>
      ),
    },
  ],
};
