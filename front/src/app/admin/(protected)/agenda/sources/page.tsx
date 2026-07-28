import { EventSourcesAdmin } from "@/components/admin/event-sources-admin";
import { getCookieHeader } from "@/lib/auth-server";
import type { Commune, EventCategory, EventSource } from "@/types/api";
import type { AdminCrawlSource } from "@/types/admin";
const API_URL=process.env.NEXT_PUBLIC_API_URL??"http://localhost:8002";
async function get<T>(path:string):Promise<T>{const cookie=await getCookieHeader();const response=await fetch(`${API_URL}${path}`,{headers:{Cookie:cookie,Accept:"application/json"},cache:"no-store"});if(!response.ok)throw new Error(`API ${response.status}: ${path}`);return response.json() as Promise<T>;}
export default async function EventSourcesPage(){const [sources,communes,categories,crawlSources]=await Promise.all([get<EventSource[]>("/api/admin/event-sources/"),get<Commune[]>("/api/communes/"),get<EventCategory[]>("/api/event-categories/"),get<AdminCrawlSource[]>("/api/admin/crawl-sources/")]);return <EventSourcesAdmin initialSources={sources} communes={communes} categories={categories} crawlSources={crawlSources}/>;}
