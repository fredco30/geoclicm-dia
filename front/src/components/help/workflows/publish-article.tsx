/**
 * Workflow : Publier un article.
 * Public visé : la rédactrice qui rédige et publie le contenu éditorial.
 *
 * Ne décrire QUE ce que l'écran fait réellement (registre docs/21) : pas de
 * publication programmée, pas de diffusion Facebook, pas de galerie tant que
 * ces fonctions ne sont pas livrées.
 */
import {
  CheckCircle2,
  FilePlus,
  ImagePlus,
  LayoutDashboard,
  PencilLine,
  Send,
} from "lucide-react";

import {
  Done,
  FieldList,
  Kbd,
  KeyTip,
  Path,
  SubSteps,
  Tip,
  UI,
  Warning,
} from "../primitives";
import type { Workflow } from "../workflow-types";

export const PUBLISH_ARTICLE: Workflow = {
  id: "publish-article",
  audience: "Rédaction",
  title: "Publier un article",
  description:
    "De la connexion au back-office jusqu'à la mise en ligne — le parcours complet pour publier un reportage, un portrait ou une brève sur geoclicMédia.",
  steps: [
    {
      id: "dashboard",
      title: "Tableau de bord — vue d'ensemble",
      icon: LayoutDashboard,
      body: (
        <>
          <p>
            Dès que vous êtes connectée, vous arrivez sur la liste de tous les
            articles. C&apos;est votre tableau de bord éditorial. En haut, les
            compteurs <UI>À valider</UI> signalent les contenus importés qui
            attendent une relecture.
          </p>
          <SubSteps
            items={[
              <>
                La case <UI>Rechercher un article</UI> filtre la liste
                instantanément : un mot du titre, une rubrique, une commune, ou
                un statut (« brouillon », « publié »).
              </>,
              <>
                Le badge{" "}
                <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-xs text-slate-700">
                  Brouillon
                </span>{" "}
                signale qu&apos;un article n&apos;est pas encore visible côté
                lecteurs.
              </>,
              <>
                Le crayon d&apos;une ligne reprend son édition ;{" "}
                <UI>+ Nouvel article</UI> en démarre un.
              </>,
            ]}
          />
          <KeyTip>
            Vous pouvez enregistrer le brouillon autant de fois que vous voulez —
            rien n&apos;est public tant que vous n&apos;avez pas cliqué sur{" "}
            <UI>Publier</UI>.
          </KeyTip>
        </>
      ),
    },
    {
      id: "create",
      title: "Créer un nouvel article",
      icon: FilePlus,
      body: (
        <>
          <p>
            Sur <Path>/admin/articles/new</Path>, vous remplissez les
            informations qui structurent l&apos;article. Seuls le titre et la
            catégorie sont obligatoires pour enregistrer un brouillon.
          </p>

          <h4 className="mt-4 mb-1 font-semibold text-slate-800">
            Champs essentiels
          </h4>
          <FieldList
            items={[
              {
                label: "Titre",
                required: true,
                description:
                  "Court et accrocheur, 60-80 caractères pour bien apparaître sur Google. L'adresse web de l'article est créée à partir du titre.",
              },
              {
                label: "Catégorie",
                required: true,
                description:
                  "Mémoire, Patrimoine, Reportages, Portraits… Détermine où l'article apparaît dans la navigation.",
              },
              {
                label: "Chapeau",
                description:
                  "Le résumé de 1-2 phrases qui apparaît sous le titre et donne envie de lire (300 caractères maximum). Évitez de répéter le titre.",
              },
              {
                label: "Commune",
                description:
                  "Optionnel mais recommandé : l'article apparaît alors sur la page de la commune concernée.",
              },
              {
                label: "Type",
                description: "Reportage, Portrait, Brève, Tribune libre ou Dossier.",
              },
            ]}
          />

          <Tip>
            Vous n&apos;êtes pas obligée de tout remplir maintenant. Un titre et
            une catégorie suffisent pour cliquer sur{" "}
            <UI>Enregistrer le brouillon</UI> et continuer plus tard.
          </Tip>
        </>
      ),
    },
    {
      id: "edit",
      title: "Rédiger le corps + ajouter l'image",
      icon: PencilLine,
      body: (
        <>
          <p>
            Écrivez le texte dans la zone <UI>Corps de l&apos;article</UI>.
            Pour la mise en forme, sélectionnez un passage puis utilisez les
            boutons au-dessus de la zone :
          </p>
          <SubSteps
            items={[
              <>
                <UI>Titre</UI> et <UI>Sous-titre</UI> pour découper
                l&apos;article en parties.
              </>,
              <>
                <UI>Gras</UI> et <UI>Italique</UI> pour souligner un mot.
              </>,
              <>
                <UI>Citation</UI> pour mettre en avant les paroles d&apos;un
                témoin, <UI>Liste à puces</UI> ou <UI>Liste numérotée</UI> pour
                une énumération.
              </>,
              <>
                <UI>Lien</UI> pour renvoyer vers un autre site. L&apos;onglet{" "}
                <UI>Aperçu</UI> montre le rendu final.
              </>,
            ]}
          />

          <h4 className="mt-4 mb-1 font-semibold text-slate-800">
            <ImagePlus className="mr-1.5 inline-block h-4 w-4 align-text-bottom text-camargue" />
            Image de couverture
          </h4>
          <p>
            Ajoutez une <UI>image de couverture</UI> dans la colonne de droite :
            c&apos;est elle qui apparaît sur l&apos;accueil, dans les listes et
            lors d&apos;un partage sur les réseaux sociaux.
          </p>
          <FieldList
            items={[
              {
                label: "Image de couverture",
                description:
                  "Format paysage (16/9 idéal), JPEG, PNG ou WebP. Le système la redimensionne automatiquement pour chaque écran.",
              },
            ]}
          />

          <Warning>
            <strong>Droits</strong> : n&apos;utilisez que des photos dont vous
            avez l&apos;autorisation, et mentionnez l&apos;auteur ou la source
            dans le texte de l&apos;article.
          </Warning>

          <h4 className="mt-4 mb-1 font-semibold text-slate-800">
            <Send className="mr-1.5 inline-block h-4 w-4 align-text-bottom text-camargue" />
            Publier
          </h4>
          <SubSteps
            items={[
              <>
                <UI>Enregistrer le brouillon</UI> sauvegarde sans publier — vous
                pouvez fermer l&apos;onglet et revenir plus tard. Le message{" "}
                <em>« Enregistré »</em> confirme la sauvegarde.
              </>,
              <>
                <UI>Publier</UI> met l&apos;article en ligne immédiatement : il
                apparaît sur l&apos;accueil, dans les Actualités, dans sa
                rubrique et sur la page de sa commune. Le corps de
                l&apos;article doit être rempli.
              </>,
              <>
                Si une information manque, un encadré rouge indique quel champ
                corriger (ex. <em>« Catégorie : Ce champ est obligatoire. »</em>).
              </>,
            ]}
          />

          <Tip>
            <strong>Sponsoring</strong> : si l&apos;article est sponsorisé par
            un commerçant, sélectionnez-le dans le champ{" "}
            <UI>Commerçant sponsor</UI>. Une mention de partenariat apparaît
            alors automatiquement en haut et en fin d&apos;article.
          </Tip>

          <Done>
            Article publié ! Vérifiez le rendu côté lecteur avec le bouton{" "}
            <UI>Voir</UI> qui apparaît une fois l&apos;article en ligne. En cas
            de coquille, corrigez puis cliquez sur <UI>Mettre à jour</UI> : le
            site est actualisé aussitôt.
          </Done>
        </>
      ),
    },
    {
      id: "after",
      title: "Après publication",
      icon: CheckCircle2,
      body: (
        <>
          <p>Quelques bonnes pratiques pour le suivi :</p>
          <SubSteps
            items={[
              <>
                Modifier reste possible à tout moment — pas besoin de tout
                refaire si vous repérez une coquille 3 jours après.
              </>,
              <>
                <UI>Archivé</UI> (champ <UI>Statut</UI>, puis{" "}
                <UI>Mettre à jour</UI>) retire l&apos;article de l&apos;accueil,
                des listes et de sa rubrique, mais son adresse reste
                consultable avec une mention « Article archivé » : les liens
                déjà partagés continuent de fonctionner.
              </>,
              <>
                <UI>Brouillon</UI> le retire complètement du site, pour le
                retravailler.
              </>,
              <>
                <UI>Supprimer</UI> est définitif : l&apos;article et son adresse
                web disparaissent. Préférez l&apos;archivage en cas de doute.
              </>,
            ]}
          />
          <KeyTip>
            <strong>Raccourci :</strong> <Kbd>Ctrl</Kbd> + <Kbd>S</Kbd> (ou{" "}
            <Kbd>Cmd</Kbd> + <Kbd>S</Kbd> sur Mac) enregistre sans cliquer —
            un brouillon reste un brouillon. Si vous fermez l&apos;onglet avec
            des modifications non enregistrées, le navigateur vous demande
            confirmation.
          </KeyTip>
        </>
      ),
    },
  ],
};
