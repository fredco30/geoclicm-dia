/**
 * Workflow : Configurer les tuiles d'accueil.
 * Public visé : administrateurs (Fred + futurs co-admins) qui composent la
 * grille de la home et des pages commune.
 */
import { Layers, LayoutGrid, MapPin, Pencil, Settings } from "lucide-react";

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

export const CONFIGURE_TILES: Workflow = {
  id: "configure-tiles",
  audience: "Administration",
  title: "Configurer les tuiles d'accueil",
  description:
    "La grille de tuiles est le cœur de la home et des pages commune. Voici comment l'organiser efficacement sans tout casser.",
  steps: [
    {
      id: "concept",
      title: "Comment fonctionne une tuile",
      icon: LayoutGrid,
      body: (
        <>
          <p>
            Une tuile est un <strong>raccourci visuel</strong> sur la home et
            les pages commune. Au clic, elle peut :
          </p>
          <SubSteps
            items={[
              <>
                <strong>Lien interne</strong> — emmène vers une page du site
                (ex: <code>/agenda</code>, <code>/categories/reportages</code>).
              </>,
              <>
                <strong>Lien externe</strong> — ouvre une URL hors site dans un
                nouvel onglet (ex: site officiel d&apos;une mairie). Une icône
                discrète signale au visiteur qu&apos;il quitte geoclicMédia.
              </>,
              <>
                <strong>Module spécial</strong> — câble la tuile sur un écran
                déjà existant : <em>Actualités</em>, <em>Météo</em>,{" "}
                <em>Commerçants</em>. Pas besoin de remplir une URL, le système
                connaît la cible.
              </>,
            ]}
          />
          <KeyTip>
            Les <strong>tuiles racine</strong> apparaissent directement sur la
            grille. Une tuile peut avoir des <strong>sous-tuiles</strong> qui
            s&apos;affichent au clic sur la racine (1 niveau de profondeur
            maximum, pour rester lisible).
          </KeyTip>
        </>
      ),
    },
    {
      id: "create",
      title: "Créer une tuile racine",
      icon: Pencil,
      body: (
        <>
          <p>
            Sur <Path>/admin/tiles/new</Path>, le formulaire est divisé en
            3 sections :
          </p>

          <h4 className="mt-3 mb-1 font-semibold text-slate-800">Identité</h4>
          <SubSteps
            items={[
              <>
                <UI>Libellé</UI> — texte affiché sur la tuile, court et clair
                (1-3 mots idéal).
              </>,
              <>
                <UI>Tuile parente</UI> — laisser vide pour une tuile racine
                (apparaît sur la home). Choisir une racine pour créer une
                sous-tuile à la place.
              </>,
              <>
                <UI>Icône</UI> — sélecteur d&apos;icône Lucide. La liste curée
                couvre les besoins courants ; tu peux taper le nom Lucide
                manuellement si une icône manque.
              </>,
              <>
                <UI>Couleur de fond</UI> — 7 presets cohérents avec
                l&apos;identité visuelle. Le preset bleu camargue est le défaut.
              </>,
            ]}
          />

          <h4 className="mt-4 mb-1 font-semibold text-slate-800">
            Action au clic
          </h4>
          <p>
            Choisis le <UI>Type</UI>, puis remplis UNIQUEMENT le champ
            correspondant :
          </p>
          <SubSteps
            items={[
              <>
                <strong>Lien interne</strong> → champ <UI>Chemin interne</UI>{" "}
                (ex: <code>/agenda</code>).
              </>,
              <>
                <strong>Lien externe</strong> → champ <UI>URL externe</UI>{" "}
                (ex: <code>https://www.le-grau-du-roi.fr</code>).
              </>,
              <>
                <strong>Module</strong> → champ <UI>Module</UI>{" "}
                (Actualités / Météo / Commerçants).
              </>,
            ]}
          />

          <Tip>
            <strong>Aperçu live</strong> : le bandeau en haut du formulaire
            montre comment la tuile apparaîtra sur le site, mis à jour à chaque
            modification. Pratique pour valider visuellement.
          </Tip>
        </>
      ),
    },
    {
      id: "subtiles",
      title: "Créer des sous-tuiles",
      icon: Layers,
      body: (
        <>
          <p>
            Une tuile racine peut avoir des sous-tuiles qui apparaissent à son
            clic. Exemple typique : tuile racine <UI>Découvrir</UI> qui affiche
            ensuite <UI>Patrimoine</UI>, <UI>Plages</UI>, <UI>Balades</UI>.
          </p>
          <SubSteps
            items={[
              <>
                Crée la <strong>tuile racine</strong> en premier (parent vide).
              </>,
              <>
                Puis crée chaque <strong>sous-tuile</strong> en sélectionnant la
                racine dans <UI>Tuile parente</UI>.
              </>,
              <>
                Les sous-tuiles n&apos;apparaissent jamais directement sur la
                home — toujours sur l&apos;écran intermédiaire qui s&apos;ouvre
                au clic de leur racine.
              </>,
            ]}
          />
          <Warning>
            <strong>Pas de sous-sous-tuiles</strong> : une sous-tuile ne peut
            pas avoir elle-même des enfants. La profondeur est volontairement
            limitée à 1 niveau pour ne pas perdre l&apos;utilisateur. Si tu as
            besoin de plus, repense l&apos;arborescence.
          </Warning>
        </>
      ),
    },
    {
      id: "visibility",
      title: "Visibilité et filtrage par commune",
      icon: MapPin,
      body: (
        <>
          <p>
            geoclicMédia couvre 7 communes. Tu peux choisir de :
          </p>
          <SubSteps
            items={[
              <>
                Afficher une tuile <strong>partout</strong> (laisser
                <UI>Communes</UI> vide). Cas général pour Actualités, Météo,
                Commerçants.
              </>,
              <>
                Afficher une tuile <strong>uniquement sur certaines
                communes</strong> (cocher 1+ communes). Cas typique : tuile
                « Mairie Grau-du-Roi » qui n&apos;a aucun sens sur la page
                Lunel.
              </>,
              <>
                Décocher <UI>Visible sur la home globale</UI> pour qu&apos;une
                tuile n&apos;apparaisse <strong>QUE</strong> sur les pages
                commune sélectionnées (et pas sur la home agrégée).
              </>,
            ]}
          />
          <KeyTip>
            <strong>Stratégie recommandée</strong> : 8-10 tuiles transversales
            sur la home globale (Actualités, Météo, Commerçants, Agenda…) +
            quelques tuiles propres à chaque commune (mairie locale, port,
            plage spécifique).
          </KeyTip>
        </>
      ),
    },
    {
      id: "ordering",
      title: "Ordonner et activer/désactiver",
      icon: Settings,
      body: (
        <>
          <p>
            Le champ <UI>Ordre</UI> contrôle la position dans la grille.
            Convention :
          </p>
          <SubSteps
            items={[
              <>
                Plus petit = affiché en premier (haut/gauche de la grille).
              </>,
              <>
                Laisse des <strong>écarts de 10</strong> (10, 20, 30, 40…) pour
                pouvoir insérer plus tard sans tout renommer.
              </>,
              <>
                Décoche <UI>Active</UI> pour masquer temporairement une tuile
                sans la supprimer (campagne saisonnière, info périmée).
              </>,
              <>
                <UI>Tuile large</UI> double la largeur (occupe 2 colonnes) —
                utile pour mettre en valeur une rubrique vedette.
              </>,
            ]}
          />
          <Done>
            Le seed initial <code>python manage.py seed_tiles</code> crée 10
            tuiles racine de base avec un ordre cohérent. Tu peux ensuite
            adapter, ajouter, retirer.
          </Done>
        </>
      ),
    },
  ],
};
