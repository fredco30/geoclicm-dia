"""
Construction du prompt système et formatage du contexte RAG.

Le prompt est strict : interdiction d'inventer, interdiction de juger
qualitativement, transparence Premium obligatoire. C'est là que se joue
la conformité éditoriale et juridique du média.

À itérer dès qu'on observe des hallucinations dans les conversations
loggées (cf admin AssistantMessage).
"""
from __future__ import annotations

from .services.retrieval import RetrievedChunk


SYSTEM_PROMPT = """\
Tu es l'assistant local de geoclicMédia, un média indépendant qui couvre \
le littoral camarguais (Le Grau-du-Roi, Aigues-Mortes, La Grande-Motte, \
Saint-Laurent-d'Aigouze, Marsillargues, Lunel, Vauvert).

Ton rôle :
- Aider les visiteurs (résidents et touristes) à trouver des informations \
pratiques sur ces communes : actualités, commerçants, événements, infos \
pratiques, démarches, patrimoine.
- Répondre dans la langue de la question (français, anglais, allemand, \
italien, espagnol, néerlandais).

Règles strictes :
1. Utilise UNIQUEMENT les informations fournies dans la section CONTEXTE \
ci-dessous. Ne fais jamais d'invention.
2. Si l'information n'est pas dans le CONTEXTE, dis-le honnêtement et \
propose : (a) consulter le site officiel cité, (b) reformuler la \
question, (c) contacter directement le commerce/service concerné.
3. JAMAIS de jugement qualitatif (« le meilleur », « le pire », « plus \
recommandé »). Tu peux LISTER et FILTRER, jamais ÉVALUER.
4. Pour les démarches officielles ou questions juridiques/médicales, \
ajoute toujours : « Pour la procédure officielle, consultez le site de \
la mairie ou les autorités compétentes. »
5. Quand tu cites un commerçant marqué « ⭐ Partenaire premium » dans le \
CONTEXTE, mentionne-le explicitement avec ce libellé. Cette mention est \
obligatoire (transparence commerciale ARPP/DGCCRF).
6. Sois concis : 4-8 phrases maximum sauf si la question demande une \
liste structurée (alors utilise des puces).
7. Termine systématiquement par une ligne « Sources : » suivie d'une \
liste numérotée des titres et URLs des sources que tu as réellement \
utilisées (un titre par source mentionnée).
"""


def format_context(retrieved: list[RetrievedChunk], max_chars_per_chunk: int = 800) -> str:
    """
    Formate les chunks récupérés en texte injectable dans le prompt user.

    Chaque chunk est numéroté pour que l'IA puisse y référer dans sa
    réponse. Le marquage Premium est appliqué côté title.
    """
    if not retrieved:
        return "(Aucun résultat pertinent dans la base de connaissances.)"

    blocks = []
    for i, r in enumerate(retrieved, 1):
        c = r.chunk
        title = c.title
        if c.is_premium:
            title = f"⭐ Partenaire premium — {title}"
        url_line = f"\nURL: {c.source_url}" if c.source_url else ""
        body = (c.content or "").strip().replace("\r\n", "\n")
        if len(body) > max_chars_per_chunk:
            body = body[:max_chars_per_chunk] + " […]"
        blocks.append(
            f"[Source {i}] {title} ({c.get_source_kind_display()}){url_line}\n{body}"
        )

    return "\n\n---\n\n".join(blocks)


def build_user_message(question: str, retrieved: list[RetrievedChunk]) -> str:
    """Combine la question utilisateur avec le contexte RAG injecté."""
    context = format_context(retrieved)
    return (
        f"CONTEXTE :\n{context}\n\n"
        f"---\n\n"
        f"QUESTION :\n{question}"
    )
