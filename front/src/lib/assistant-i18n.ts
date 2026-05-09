/**
 * i18n des libellés UI et phrases d'accueil de l'assistant IA.
 *
 * Stratégie : la PHRASE D'ACCUEIL est traduite dans les 6 langues supportées
 * (c'est ce qui est demandé : « phrase de démarrage dans la langue du
 * téléphone »). Les libellés d'interface (boutons, placeholders) sont aussi
 * traduits pour cohérence.
 *
 * À itérer si on veut un wording plus chaleureux par langue. Les
 * traductions ont été produites en visant la même tonalité chaleureuse
 * que la version FR.
 */
import type { AssistantLanguage } from "@/types/api";

export type AssistantI18n = {
  /** Titre du drawer (header). */
  title: string;
  /** Sous-titre court sous le titre. */
  subtitle: string;
  /** Phrase d'accueil affichée avant la première question. */
  welcome: string;
  /** Étiquette section suggestions. */
  suggestionsLabel: string;
  /** Suggestions cliquables (3-4 idées de questions). */
  suggestions: string[];
  /** Placeholder de l'input. */
  inputPlaceholder: string;
  /** Bouton envoyer (aria + tooltip). */
  sendLabel: string;
  /** Texte sous l'input. */
  hint: string;
  /** Étiquette « Sources » qui précède la liste des citations. */
  sourcesLabel: string;
  /** Indicateur loading. */
  thinkingLabel: string;
  /** Message d'erreur générique. */
  errorGeneric: string;
  /** Erreur rate limit (HTTP 429). */
  errorRateLimit: string;
  /** Bouton fermer. */
  closeLabel: string;
  /** Bouton effacer la conversation. */
  resetLabel: string;
  /** Tooltip sur le sélecteur de langue. */
  languageLabel: string;
};

const TEXTS: Record<AssistantLanguage, AssistantI18n> = {
  fr: {
    title: "Assistant geoclicMédia",
    subtitle: "Posez vos questions sur le littoral camarguais",
    welcome:
      "Bonjour ! Je peux vous aider à trouver des informations locales sur Le Grau-du-Roi, Aigues-Mortes, La Grande-Motte et le territoire camarguais.",
    suggestionsLabel: "Suggestions",
    suggestions: [
      "Que faire ce week-end ?",
      "Restaurants de fruits de mer",
      "Plages les plus accessibles",
      "Démarches mairie",
    ],
    inputPlaceholder: "Posez votre question…",
    sendLabel: "Envoyer",
    hint: "Réponses basées sur des sources locales (mairies, Wikipedia, OSM, fiches commerçants).",
    sourcesLabel: "Sources",
    thinkingLabel: "Recherche en cours…",
    errorGeneric: "Une erreur est survenue, réessayez dans quelques instants.",
    errorRateLimit: "Trop de questions ces dernières minutes. Réessayez dans 1 heure.",
    closeLabel: "Fermer",
    resetLabel: "Effacer la conversation",
    languageLabel: "Langue",
  },
  en: {
    title: "geoclicMédia Assistant",
    subtitle: "Ask anything about the Camargue coast",
    welcome:
      "Hi there! I can help you find local information about Le Grau-du-Roi, Aigues-Mortes, La Grande-Motte and the surrounding Camargue area.",
    suggestionsLabel: "Suggestions",
    suggestions: [
      "What to do this weekend?",
      "Best seafood restaurants",
      "Most accessible beaches",
      "Town hall procedures",
    ],
    inputPlaceholder: "Ask your question…",
    sendLabel: "Send",
    hint: "Answers based on local sources (town halls, Wikipedia, OSM, business listings).",
    sourcesLabel: "Sources",
    thinkingLabel: "Searching…",
    errorGeneric: "Something went wrong, please try again shortly.",
    errorRateLimit: "Too many questions in the last hour. Please try again later.",
    closeLabel: "Close",
    resetLabel: "Clear conversation",
    languageLabel: "Language",
  },
  de: {
    title: "geoclicMédia-Assistent",
    subtitle: "Fragen zur Camargue-Küste",
    welcome:
      "Hallo! Ich helfe Ihnen, lokale Informationen über Le Grau-du-Roi, Aigues-Mortes, La Grande-Motte und die Camargue-Region zu finden.",
    suggestionsLabel: "Vorschläge",
    suggestions: [
      "Was kann ich am Wochenende unternehmen?",
      "Fischrestaurants",
      "Zugängliche Strände",
      "Behördengänge im Rathaus",
    ],
    inputPlaceholder: "Stellen Sie Ihre Frage…",
    sendLabel: "Senden",
    hint: "Antworten basieren auf lokalen Quellen (Rathäuser, Wikipedia, OSM, Geschäftsverzeichnis).",
    sourcesLabel: "Quellen",
    thinkingLabel: "Suche läuft…",
    errorGeneric: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
    errorRateLimit: "Zu viele Fragen in der letzten Stunde. Bitte später erneut versuchen.",
    closeLabel: "Schließen",
    resetLabel: "Unterhaltung löschen",
    languageLabel: "Sprache",
  },
  it: {
    title: "Assistente geoclicMédia",
    subtitle: "Fate domande sulla Camargue",
    welcome:
      "Ciao! Posso aiutarvi a trovare informazioni locali su Le Grau-du-Roi, Aigues-Mortes, La Grande-Motte e la regione della Camargue.",
    suggestionsLabel: "Suggerimenti",
    suggestions: [
      "Cosa fare nel weekend?",
      "Ristoranti di pesce",
      "Spiagge più accessibili",
      "Pratiche al municipio",
    ],
    inputPlaceholder: "Fate la vostra domanda…",
    sendLabel: "Invia",
    hint: "Risposte basate su fonti locali (municipi, Wikipedia, OSM, elenco attività).",
    sourcesLabel: "Fonti",
    thinkingLabel: "Ricerca in corso…",
    errorGeneric: "Si è verificato un errore. Riprovate tra poco.",
    errorRateLimit: "Troppe domande nell'ultima ora. Riprovate più tardi.",
    closeLabel: "Chiudi",
    resetLabel: "Cancella conversazione",
    languageLabel: "Lingua",
  },
  es: {
    title: "Asistente geoclicMédia",
    subtitle: "Pregunte sobre la Camarga",
    welcome:
      "¡Hola! Puedo ayudarle a encontrar información local sobre Le Grau-du-Roi, Aigues-Mortes, La Grande-Motte y el territorio camargués.",
    suggestionsLabel: "Sugerencias",
    suggestions: [
      "¿Qué hacer este fin de semana?",
      "Restaurantes de marisco",
      "Playas más accesibles",
      "Trámites en el ayuntamiento",
    ],
    inputPlaceholder: "Haga su pregunta…",
    sendLabel: "Enviar",
    hint: "Respuestas basadas en fuentes locales (ayuntamientos, Wikipedia, OSM, fichas de comercios).",
    sourcesLabel: "Fuentes",
    thinkingLabel: "Buscando…",
    errorGeneric: "Ha ocurrido un error. Inténtelo de nuevo en unos instantes.",
    errorRateLimit: "Demasiadas preguntas en la última hora. Inténtelo más tarde.",
    closeLabel: "Cerrar",
    resetLabel: "Borrar conversación",
    languageLabel: "Idioma",
  },
  nl: {
    title: "geoclicMédia-assistent",
    subtitle: "Vragen over de Camargue-kust",
    welcome:
      "Hallo! Ik help u graag aan lokale informatie over Le Grau-du-Roi, Aigues-Mortes, La Grande-Motte en de Camargue.",
    suggestionsLabel: "Suggesties",
    suggestions: [
      "Wat te doen dit weekend?",
      "Visrestaurants",
      "Best toegankelijke stranden",
      "Procedures bij het gemeentehuis",
    ],
    inputPlaceholder: "Stel uw vraag…",
    sendLabel: "Verzenden",
    hint: "Antwoorden gebaseerd op lokale bronnen (gemeentehuizen, Wikipedia, OSM, bedrijvenlijst).",
    sourcesLabel: "Bronnen",
    thinkingLabel: "Zoeken…",
    errorGeneric: "Er is iets misgegaan. Probeer het later opnieuw.",
    errorRateLimit: "Te veel vragen in het afgelopen uur. Probeer het later opnieuw.",
    closeLabel: "Sluiten",
    resetLabel: "Gesprek wissen",
    languageLabel: "Taal",
  },
};

export function getAssistantI18n(language: AssistantLanguage): AssistantI18n {
  return TEXTS[language] ?? TEXTS.fr;
}

export const SUPPORTED_LANGUAGES: { code: AssistantLanguage; label: string; flag: string }[] = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
];
