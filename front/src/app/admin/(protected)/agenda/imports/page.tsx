import { EventImportsAdmin } from "@/components/admin/event-imports-admin";
import { getCookieHeader } from "@/lib/auth-server";
import type { Commune, EventCategory, EventImportCandidate } from "@/types/api";
const API_URL=process.env.NEXT_PUBLIC_API_URL??"http://localhost:8002";
async function get<T>(path:string):Promise<T>{const cookie=await getCookieHeader();const response=await fetch(`${API_URL}${path}`,{headers:{Cookie:cookie,Accept:"application/json"},cache:"no-store"});if(!response.ok)throw new Error(`API ${response.status}: ${path}`);return response.json() as Promise<T>;}
export default async function EventImportsPage(){const [candidates,communes,categories]=await Promise.all([get<EventImportCandidate[]>("/api/admin/event-imports/?status=pending"),get<Commune[]>("/api/communes/"),get<EventCategory[]>("/api/event-categories/")]);return <EventImportsAdmin initialCandidates={candidates} communes={communes} categories={categories}/>;}
