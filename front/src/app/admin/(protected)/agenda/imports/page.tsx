import { EventImportsAdmin } from "@/components/admin/event-imports-admin";
import { getCookieHeader } from "@/lib/auth-server";
import type { Commune, EventCategory, EventImportCandidate } from "@/types/api";

const API_URL=process.env.NEXT_PUBLIC_API_URL??"http://localhost:8002";
const ALLOWED_STATUSES = new Set(["pending", "invalid", "expired"]);

async function get<T>(path:string):Promise<T>{
  const cookie=await getCookieHeader();
  const response=await fetch(`${API_URL}${path}`,{
    headers:{Cookie:cookie,Accept:"application/json"},
    cache:"no-store",
  });
  if(!response.ok)throw new Error(`API ${response.status}: ${path}`);
  return response.json() as Promise<T>;
}

export default async function EventImportsPage({
  searchParams,
}:{
  searchParams:Promise<{status?:string}>;
}){
  const requested=(await searchParams).status??"pending";
  const status=ALLOWED_STATUSES.has(requested)?requested:"pending";
  const [candidates,communes,categories]=await Promise.all([
    get<EventImportCandidate[]>(`/api/admin/event-imports/?status=${status}`),
    get<Commune[]>("/api/communes/"),
    get<EventCategory[]>("/api/event-categories/"),
  ]);
  return <EventImportsAdmin
    initialCandidates={candidates}
    communes={communes}
    categories={categories}
    filterStatus={status}
  />;
}
