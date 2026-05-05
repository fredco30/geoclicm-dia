/**
 * Workflow : Publier un article.
 * Public visé : la rédactrice (Sandrine) qui rédige et publie le contenu éditorial.
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
            articles. C&apos;est votre tableau de bord éditorial.
          </p>
          <SubSteps
            items={[
              <>
                Filtres par <strong>statut</strong> : <UI>Brouillons</UI>,{" "}
                <UI>Publiés</UI>, <UI>Archivés</UI> — utile pour voir d&apos;un
                coup d&apos;œil ce qui reste à finaliser.
              </>,
              <>
                Le badge{" "}
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                  Brouillon
                </span>{" "}
                signale qu&apos;un article n&apos;est pas encore visible côté
                lecteurs.
              </>,
              <>
                Cliquez sur le titre d&apos;un article pour reprendre son
                édition, ou sur <UI>+ Nouvel article</UI> dans la barre latérale
                pour en démarrer un.
              </>,
            ]}
          />
          <KeyTip>
            Vous pouvez sauvegarder en brouillon autant de fois que vous voulez —
            rien n&apos;est public tant que vous n&apos;avez pas explicitement
            cliqué sur <UI>Publier</UI>.
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
            informations qui structurent l&apos;article. Tous les champs ne sont
            pas obligatoires — concentrez-vous d&apos;abord sur l&apos;essentiel.
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
                  "Court, accrocheur, 60-80 caractères pour bien apparaître sur Google et Facebook.",
              },
              {
                label: "Chapeau",
                required: true,
                description:
                  "Le résumé de 2-3 phrases qui apparaît sous le titre et donne envie de lire. Évitez de répéter le titre.",
              },
              {
                label: "Catégorie",
                required: true,
                description:
                  "Mémoire, Patrimoine, Reportages, Portraits… Détermine où l'article apparaît dans la navigation.",
              },
              {
                label: "Commune",
                description:
                  "Optionnel mais fortement recommandé : permet à l'article d'apparaître sur la page de la commune concernée.",
              },
              {
                label: "Type d'article",
                description:
                  "Reportage / Portrait / Brève / Tribune / Dossier — change l'apparence de la fiche en haut de l'article.",
              },
            ]}
          />

          <Tip>
            Vous n&apos;êtes pas obligée de tout remplir maintenant. Le titre et
            le chapeau suffisent pour cliquer sur <UI>Enregistrer en brouillon</UI>{" "}
            et continuer plus tard.
          </Tip>
        </>
      ),
    },
    {
      id: "edit",
      title: "Rédiger le corps + ajouter les images",
      icon: PencilLine,
      body: (
        <>
          <p>
            Le corps de l&apos;article s&apos;écrit en <strong>Markdown</strong>{" "}
            — un format léger qui devient automatiquement de la mise en page :
          </p>
          <SubSteps
            items={[
              <>
                <code>**gras**</code> → <strong>gras</strong>,{" "}
                <code>*italique*</code> → <em>italique</em>.
              </>,
              <>
                <code>## Titre</code> en début de ligne pour un sous-titre.
              </>,
              <>
                <code>&gt; citation</code> pour une mise en avant (verbatim
                d&apos;un témoin par exemple).
              </>,
              <>
                Liste à puces : une ligne qui commence par <code>- </code>.
              </>,
            ]}
          />

          <h4 className="mt-4 mb-1 font-semibold text-slate-800">
            <ImagePlus className="mr-1.5 inline-block h-4 w-4 align-text-bottom text-[#1a4d6e]" />
            Images
          </h4>
          <p>
            Chaque article doit avoir une <UI>image de couverture</UI> : c&apos;est
            elle qui apparaîtra sur la home, sur Facebook quand vous partagerez
            le lien, et dans Google Discover.
          </p>
          <FieldList
            items={[
              {
                label: "Image de couverture",
                required: true,
                description:
                  "Format paysage (16/9 idéal). Le système redimensionne automatiquement en 3 tailles (400, 800, 1600 px).",
              },
              {
                label: "Galerie",
                description:
                  "Photos additionnelles intégrées au corps. Cliquez sur Ajouter à la galerie puis insérez la balise donnée à l'endroit voulu dans le texte.",
              },
              {
                label: "Crédit photo",
                description:
                  "Toujours créditer (auteur ou source). Obligatoire pour les photos d'archive.",
              },
            ]}
          />

          <Warning>
            <strong>Texte alternatif (alt)</strong> : pour chaque image,
            renseignez l&apos;<UI>alt</UI>. C&apos;est ce que lit le lecteur
            d&apos;écran pour les personnes malvoyantes, et ce que Google indexe.
            Une description simple suffit (« Pêcheur ramendant ses filets sur
            le port du Grau-du-Roi à l&apos;aube »).
          </Warning>

          <h4 className="mt-4 mb-1 font-semibold text-slate-800">
            <Send className="mr-1.5 inline-block h-4 w-4 align-text-bottom text-[#1a4d6e]" />
            Publier
          </h4>
          <SubSteps
            items={[
              <>
                <UI>Enregistrer en brouillon</UI> sauvegarde sans publier — vous
                pouvez fermer l&apos;onglet, revenir plus tard, vos
                modifications sont conservées.
              </>,
              <>
                <UI>Publier maintenant</UI> rend l&apos;article public à
                l&apos;instant T. Il apparaît immédiatement sur le site, sa fiche
                commune, sa catégorie, et passe dans le sitemap.
              </>,
              <>
                <UI>Programmer</UI> définit une date+heure de publication
                automatique. Pratique pour publier le lendemain matin sans avoir
                à se reconnecter.
              </>,
            ]}
          />

          <Tip>
            <strong>Sponsoring</strong> : si l&apos;article est sponsorisé par
            un commerçant, sélectionnez-le dans le champ <UI>Sponsor</UI>. Un
            badge <em>« Article sponsorisé »</em> apparaîtra automatiquement en
            haut de l&apos;article (obligation légale ARPP).
          </Tip>

          <Tip>
            <strong>Publication Facebook</strong> : cocher{" "}
            <UI>Publier automatiquement sur Facebook</UI> publie un post sur la
            page geoclicMédia au moment de la mise en ligne (avec image de
            couverture, titre et chapeau).
          </Tip>

          <Done>
            Article publié ! Vérifiez visuellement le rendu côté lecteur en
            cliquant sur <UI>Voir l&apos;article</UI> qui apparaît une fois
            publié. En cas de coquille, vous pouvez modifier en direct — la mise
            à jour est instantanée.
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
                <UI>Archiver</UI> retire l&apos;article de la home et de la
                catégorie, mais l&apos;URL continue de fonctionner (utile pour
                les vieux articles qu&apos;on veut garder accessibles sans
                exposer en home).
              </>,
              <>
                Le compteur de vues vous indique l&apos;audience approximative.
                Combinez-le avec Plausible (
                <a
                  href="https://plausible.io"
                  target="_blank"
                  rel="noopener"
                  className="text-[#1a4d6e] underline"
                >
                  plausible.io
                </a>
                ) pour des stats détaillées.
              </>,
            ]}
          />
          <KeyTip>
            <strong>Raccourci utile :</strong> <Kbd>Ctrl</Kbd> + <Kbd>S</Kbd>{" "}
            (ou <Kbd>Cmd</Kbd> + <Kbd>S</Kbd> sur Mac) pour enregistrer le
            brouillon sans devoir cliquer sur le bouton.
          </KeyTip>
        </>
      ),
    },
  ],
};
