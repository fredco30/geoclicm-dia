/**
 * Client API typé pour l'API Django.
 *
 * - `apiGet` : utilisable côté server components et client components.
 * - ISR via le 2e param `{ revalidate: 3600 }` (Next 16 — fetch n'est plus cached par défaut).
 * - `apiFetch` (auth) : pour POST/PATCH/DELETE depuis le back-office (cookie session).
 */
import type {
  ArticleDetail,
  ArticleListItem,
  AssistantAskRequest,
  AssistantAskResponse,
  BusinessCategory,
  BusinessDetail,
  BusinessListItem,
  Category,
  Commune,
  CurrentUser,
  Paginated,
  SearchResponse,
  Tag,
  Tile,
  WeatherResponse,
} from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public payload: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type GetOptions = {
  /** ISR : nb de secondes avant revalidation. Default = pas de cache (dynamique). */
  revalidate?: number | false;
  /** Tags pour invalidation manuelle via revalidateTag(). */
  tags?: string[];
};

export async function apiGet<T>(path: string, options: GetOptions = {}): Promise<T> {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: {
      revalidate: options.revalidate ?? false,
      tags: options.tags,
    },
  });

  if (!res.ok) {
    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      /* not json */
    }
    throw new ApiError(`API ${res.status} on ${path}`, res.status, payload);
  }
  return res.json() as Promise<T>;
}

/** Variante pour appels authentifiés (back-office) — envoie les cookies. */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = `${API_URL}${path}`;
  return fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...init.headers,
    },
  });
}

// ============================================================================
// Endpoints publics (lecture)
// ============================================================================

export const api = {
  // Articles
  articles: {
    list: (params: Record<string, string | number | boolean | undefined> = {}) => {
      const qs = buildQuery(params);
      return apiGet<Paginated<ArticleListItem>>(`/api/articles/${qs}`, {
        revalidate: 60,
        tags: ["articles"],
      });
    },
    detail: (slug: string) =>
      apiGet<ArticleDetail>(`/api/articles/${slug}/`, {
        revalidate: 3600,
        tags: ["articles", `article:${slug}`],
      }),
  },

  // Listes courtes (pas de pagination)
  categories: () =>
    apiGet<Category[]>("/api/categories/", {
      revalidate: 3600,
      tags: ["categories"],
    }),
  category: (slug: string) =>
    apiGet<Category>(`/api/categories/${slug}/`, {
      revalidate: 3600,
      tags: ["categories"],
    }),

  communes: () =>
    apiGet<Commune[]>("/api/communes/", {
      revalidate: 3600,
      tags: ["communes"],
    }),
  commune: (slug: string) =>
    apiGet<Commune>(`/api/communes/${slug}/`, {
      revalidate: 3600,
      tags: ["communes"],
    }),

  tags: () =>
    apiGet<Tag[]>("/api/tags/", { revalidate: 3600, tags: ["tags"] }),

  // Commerçants
  businesses: {
    list: (params: Record<string, string | number | boolean | undefined> = {}) => {
      const qs = buildQuery(params);
      return apiGet<Paginated<BusinessListItem>>(`/api/businesses/${qs}`, {
        revalidate: 600,
        tags: ["businesses"],
      });
    },
    detail: (slug: string) =>
      apiGet<BusinessDetail>(`/api/businesses/${slug}/`, {
        revalidate: 3600,
        tags: ["businesses", `business:${slug}`],
      }),
  },

  businessCategories: () =>
    apiGet<BusinessCategory[]>("/api/business-categories/", {
      revalidate: 3600,
      tags: ["business-categories"],
    }),

  // Recherche
  search: (q: string) =>
    apiGet<SearchResponse>(`/api/search/?q=${encodeURIComponent(q)}`, {
      revalidate: 60,
    }),

  // Météo (proxy Open-Meteo, cache Redis 15 min côté Django)
  weather: (slug: string) =>
    apiGet<WeatherResponse>(`/api/weather/${slug}/`, {
      revalidate: 600,
      tags: ["weather", `weather:${slug}`],
    }),

  // Tuiles d'accueil (configurables côté admin)
  tiles: {
    list: (params: { onHome?: boolean; commune?: string } = {}) => {
      const sp: Record<string, string | boolean | undefined> = {};
      if (params.onHome) sp.on_home = "true";
      if (params.commune) sp.commune = params.commune;
      const qs = buildQuery(sp);
      return apiGet<Tile[]>(`/api/tiles/${qs}`, {
        revalidate: 300,
        tags: ["tiles"],
      });
    },
    detail: (id: number) =>
      apiGet<Tile>(`/api/tiles/${id}/`, {
        revalidate: 300,
        tags: ["tiles", `tile:${id}`],
      }),
  },

  // Assistant IA — Mistral + RAG
  assistant: {
    ask: async (body: AssistantAskRequest): Promise<AssistantAskResponse> => {
      const res = await fetch(`${API_URL}/api/assistant/ask/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
        credentials: "omit",
      });
      if (!res.ok) {
        let payload: unknown = null;
        try { payload = await res.json(); } catch { /* not json */ }
        throw new ApiError(`Assistant ${res.status}`, res.status, payload);
      }
      return res.json() as Promise<AssistantAskResponse>;
    },
  },
};

// ============================================================================
// Auth back-office (côté client uniquement)
// ============================================================================

export const auth = {
  csrf: () => apiFetch("/api/auth/csrf/"),
  me: () => apiFetch("/api/auth/me/"),
  login: async (username: string, password: string) => {
    // 1) Récupérer le csrftoken
    await apiFetch("/api/auth/csrf/");
    const csrf = readCookie("csrftoken");
    // 2) Login avec le token en header
    return apiFetch("/api/auth/login/", {
      method: "POST",
      headers: csrf ? { "X-CSRFToken": csrf } : {},
      body: JSON.stringify({ username, password }),
    });
  },
  logout: async () => {
    const csrf = readCookie("csrftoken");
    return apiFetch("/api/auth/logout/", {
      method: "POST",
      headers: csrf ? { "X-CSRFToken": csrf } : {},
    });
  },
  registerAdvertiser: async (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
  }) => {
    await apiFetch("/api/auth/csrf/");
    const csrf = readCookie("csrftoken");
    return apiFetch("/api/auth/register-advertiser/", {
      method: "POST",
      headers: csrf ? { "X-CSRFToken": csrf } : {},
      body: JSON.stringify(data),
    });
  },
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
  if (entries.length === 0) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of entries) sp.set(k, String(v));
  return `?${sp.toString()}`;
}

export type { CurrentUser };
export { ApiError };
