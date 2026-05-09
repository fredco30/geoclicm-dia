/**
 * Client typé pour les endpoints `/api/ai-assist/*`.
 *
 * Tous les appels sont POST authentifiés (cookie session) avec CSRF
 * token. Pas de cache côté Next : ces appels sont déclenchés par
 * l'utilisateur et ne sont jamais ré-exécutés à l'identique.
 */
import { apiFetch } from "./api";
import type {
  AIAdHeadlineRequest,
  AIAdHeadlineResponse,
  AIBusinessDescribeRequest,
  AIBusinessDescribeResponse,
  AITextRewriteRequest,
  AITextRewriteResponse,
} from "@/types/admin";

function readCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Erreur typée pour les appels ai-assist : permet au caller de
 * distinguer les codes métier (`budget_exceeded`, `not_configured`,
 * `mistral_error`, `bad_format`) du simple échec réseau.
 */
export class AIAssistError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string | null,
    public payload: unknown,
  ) {
    super(message);
    this.name = "AIAssistError";
  }
}

async function postAI<T>(path: string, body: unknown): Promise<T> {
  // CSRF : on prime le cookie si nécessaire
  let csrf = readCsrfToken();
  if (!csrf) {
    await apiFetch("/api/auth/csrf/");
    csrf = readCsrfToken();
  }

  const res = await apiFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
    headers: csrf ? { "X-CSRFToken": csrf } : {},
  });

  if (!res.ok) {
    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      // ignore JSON parse error
    }
    const code =
      payload && typeof payload === "object" && "code" in payload
        ? String((payload as { code?: unknown }).code ?? "")
        : null;
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? String((payload as { detail?: unknown }).detail ?? "")
        : "";
    throw new AIAssistError(
      detail || `AI assist HTTP ${res.status}`,
      res.status,
      code,
      payload,
    );
  }

  return (await res.json()) as T;
}

export const aiAssist = {
  business: {
    describe: (input: AIBusinessDescribeRequest) =>
      postAI<AIBusinessDescribeResponse>(
        "/api/ai-assist/business/describe/",
        input,
      ),
  },
  text: {
    rewrite: (input: AITextRewriteRequest) =>
      postAI<AITextRewriteResponse>(
        "/api/ai-assist/text/rewrite/",
        input,
      ),
  },
  ad: {
    headline: (input: AIAdHeadlineRequest) =>
      postAI<AIAdHeadlineResponse>(
        "/api/ai-assist/ad/headline/",
        input,
      ),
  },
};
