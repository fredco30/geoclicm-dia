import "server-only";

import { api } from "@/lib/api";
import type { ArticleListItem, BusinessListItem, EventListItem, Paginated } from "@/types/api";

async function collectAll<T>(loader: (page: number) => Promise<Paginated<T>>): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 1; page <= 100; page += 1) {
    const payload = await loader(page);
    rows.push(...payload.results);
    if (!payload.next || rows.length >= payload.count) break;
  }
  return rows;
}

export async function getDiscoveryRelationOptions(): Promise<{
  articles: ArticleListItem[];
  businesses: BusinessListItem[];
  events: EventListItem[];
}> {
  const [articles, businesses, events] = await Promise.all([
    collectAll((page) => api.articles.list({ page, ordering: "-published_at" })),
    collectAll((page) => api.businesses.list({ page, ordering: "name" })),
    collectAll((page) => api.events.list({ page })),
  ]);
  return { articles, businesses, events };
}
