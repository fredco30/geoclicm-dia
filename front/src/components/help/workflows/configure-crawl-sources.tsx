/**
 * Workflow : Configurer les sources à crawler pour l'assistant IA.
 * Public visé : administrateurs (Fred + futurs co-admins) qui ajoutent
 * des sites web à indexer pour enrichir les réponses de l'assistant IA.
 */
import {
  AlertTriangle,
  Globe,
  Layers,
  Play,
  Sparkles,
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

export const CONFIGURE_CRAWL_SOURCES: Workflow = {
  id: "configure-crawl-sources",
  audience: "Administration",
  title: "Configurer les sources de l'assistant IA",
  description:
    "L'assistant IA apprend en indexant des sites web (mairies, offices de tourisme...). Ce tutoriel explique comment ajouter et superviser ces sources de manière efficace et conviviale.",
  steps: [
    {
      id: "concept",
      title: "À quoi servent les sources",
      icon: Sparkles,
      body: (
        <>
          <p>
            L&apos;assistant IA répond aux visiteurs en s&apos;appuyant sur du
            contenu réel — pas d&apos;invention. Plus le contenu indexé est
            riche, plus les réponses sont utiles.
          </p>
          <p>
            Les sources <strong>déjà indexées automatiquement</strong> sont :
          </p>
          <SubSteps
            items={[
              <>Vos fiches commerçants (chaque modification est ré-indexée immédiatement)</>,
              <>Vos articles publiés (idem, en quelques secondes)</>,
              <>Wikipedia (1 page par commune, mise à jour hebdomadaire)</>,
              <>OpenStreetMap (POI : restaurants, hôtels, plages, parkings, mairies, ports… mis à jour hebdomadaire)</>,
            ]}
          />
          <KeyTip>
            Sur cette page <Path>/admin/assistant/sources</Path>, vous ajoutez
            les sources <strong>complémentaires</strong> : sites des mairies,
            offices de tourisme, et tout autre site officiel qui apportera du
            contenu local utile aux visiteurs.
          </KeyTip>
        </>
      ),
    },
    {
      id: "add",
      title: "Ajouter un site mairie ou OT",
      icon: Globe,
      body: (
        <>
          <p>
            Cliquez sur <UI>+ Nouvelle source</UI> et remplissez les 3 sections :
          </p>

          <h4 className="mt-3 mb-1 font-semibold text-slate-800">Identification</h4>
          <SubSteps
            items={[
              <>
                <UI>Type</UI> : <em>Site mairie</em>, <em>Office de tourisme</em>,
                etc. Le placeholder de l&apos;URL s&apos;adapte automatiquement
                pour vous suggérer un format type.
              </>,
              <>
                <UI>Commune attachée</UI> : si la source concerne UNE commune
                précise (mairie d&apos;une ville), choisissez-la. L&apos;IA
                rattachera tous les contenus indexés à cette commune et
                structurera mieux ses réponses (« Au Grau-du-Roi : … »).
              </>,
              <>
                <UI>Libellé</UI> : nom lisible (ex: « Mairie Le Grau-du-Roi »).
                Le bouton <UI>Auto</UI> à côté génère ce libellé pour vous à
                partir du type et de la commune.
              </>,
            ]}
          />

          <h4 className="mt-4 mb-1 font-semibold text-slate-800">Configuration</h4>
          <SubSteps
            items={[
              <>
                <UI>URL de départ</UI> : l&apos;URL racine du site (ex:{" "}
                <code>https://www.legrauduroi.fr/</code>). Le crawler suivra
                automatiquement les liens internes (même domaine).
              </>,
              <>
                <UI>Profondeur max</UI> :{" "}
                <strong>2 par défaut</strong> est le bon réglage pour une
                mairie ou un OT. Augmenter à 3-4 explose le temps de crawl
                pour un gain marginal — déconseillé.
              </>,
              <>
                <UI>Active</UI> : laissez coché pour que la source soit
                crawlée. Décochez pour suspendre temporairement (les chunks
                déjà indexés restent disponibles).
              </>,
            ]}
          />

          <Tip>
            <strong>Astuce trouver l&apos;URL officielle</strong> : tapez le
            nom de la commune + « site officiel » sur Google. Préférez les
            domaines en .fr / .com des mairies (pas wikipédia, ni les sites
            d&apos;agence immobilière qui se présentent comme « guide de la
            ville »).
          </Tip>
        </>
      ),
    },
    {
      id: "monitor",
      title: "Suivre l'état des crawls",
      icon: Layers,
      body: (
        <>
          <p>
            La liste des sources affiche pour chacune :
          </p>
          <SubSteps
            items={[
              <>
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                  OK
                </span>{" "}
                : dernier crawl réussi, contenu indexé et disponible pour
                l&apos;IA.
              </>,
              <>
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                  Partiel
                </span>{" "}
                : crawl partiellement réussi (quelques pages indexées sur le
                site). Acceptable pour un gros site.
              </>,
              <>
                <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-800">
                  Erreur
                </span>{" "}
                : aucune page récupérée. Causes typiques : robots.txt qui
                interdit le crawl, site indisponible, URL incorrecte.
                Détail visible dans la page d&apos;édition de la source.
              </>,
              <>
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                  Jamais lancé
                </span>{" "}
                : la source vient d&apos;être créée et le prochain crawl
                automatique tournera dimanche soir, ou utilisez le bouton{" "}
                <UI>Crawler maintenant</UI> pour ne pas attendre.
              </>,
            ]}
          />
          <Tip>
            La colonne <UI>Chunks</UI> indique le nombre de fragments de
            texte indexés depuis cette source. Plus de chunks = plus de
            contenu disponible pour l&apos;IA.
          </Tip>
        </>
      ),
    },
    {
      id: "force-run",
      title: "Forcer un crawl manuel",
      icon: Play,
      body: (
        <>
          <p>
            Sur la page d&apos;édition d&apos;une source, le bouton{" "}
            <UI>Crawler maintenant</UI> dans la section <em>Statut</em>{" "}
            déclenche un crawl immédiat en arrière-plan.
          </p>
          <SubSteps
            items={[
              <>Le bouton renvoie immédiatement (le crawl tourne en arrière-plan via Celery).</>,
              <>
                Le statut se met à jour automatiquement dans 1-2 minutes
                (selon la taille du site). Rafraîchissez la page pour voir.
              </>,
              <>
                Si vous obtenez une erreur 503 « Celery indisponible », c&apos;est
                que le service Celery n&apos;est pas en route côté VPS. Le
                crawl partira au prochain hebdo automatique sans intervention.
              </>,
            ]}
          />

          <Warning>
            <strong>Politesse de crawl</strong> : le système respecte
            automatiquement <code>robots.txt</code> et limite à 1 requête par
            seconde par domaine. Inutile de relancer plusieurs fois manuellement
            — vous risquez juste de vous faire bloquer par le site.
          </Warning>

          <Done>
            Une fois le crawl terminé avec succès, l&apos;assistant IA pourra
            citer ce site dans ses réponses, avec un lien direct vers les
            pages indexées. Vérifiez en posant une question test depuis le
            site public !
          </Done>
        </>
      ),
    },
    {
      id: "troubleshoot",
      title: "Diagnostic rapide en cas de souci",
      icon: AlertTriangle,
      body: (
        <>
          <p>Si une source reste en erreur après plusieurs essais :</p>
          <SubSteps
            items={[
              <>
                <strong>Tester l&apos;URL</strong> en cliquant sur le lien
                « Tester l&apos;URL » sous le champ — vérifiez que la page
                s&apos;ouvre correctement dans un navigateur.
              </>,
              <>
                <strong>Vérifier robots.txt</strong> : ouvrez{" "}
                <code>https://exemple.fr/robots.txt</code>. Si le bot{" "}
                <code>geoclicmedia-assistant-bot</code> est explicitement
                interdit, c&apos;est mort — contactez le webmaster du site.
                La plupart des mairies acceptent les bots respectueux comme
                le nôtre.
              </>,
              <>
                <strong>Diminuer la profondeur</strong> : passez{" "}
                <UI>max_depth</UI> à 1 pour ne crawler que la page
                d&apos;accueil + ses liens directs. Si ça marche, le souci
                vient peut-être d&apos;une page profonde mal formée.
              </>,
              <>
                <strong>Lire le détail de l&apos;erreur</strong> : sur la
                page édition, encart rouge sous le statut. Souvent
                explicite : « robots.txt interdit », « 404 sur la home »,
                etc.
              </>,
            ]}
          />
          <KeyTip>
            En cas de blocage persistant, basculez la source en{" "}
            <UI>inactive</UI> en attendant un fix. Les chunks déjà indexés
            précédemment restent disponibles dans la base et continuent
            d&apos;alimenter l&apos;IA.
          </KeyTip>
        </>
      ),
    },
  ],
};
