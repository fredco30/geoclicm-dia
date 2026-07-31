import { BusinessImportsAdmin } from "@/components/admin/business-imports-admin";
import { getCookieHeader } from "@/lib/auth-server";
import type { BusinessCategory, BusinessImportCandidate, Commune } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";
const ALLOWED_STATUSES = new Set(["pending", "invalid"]);
const PAGE_SIZE = 50;

async function get<T>(path: string): Promise<T> {
  const cookie = await getCookieHeader();
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Cookie: cookie, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`API ${response.status}: ${path}`);
  return response.json() as Promise<T>;
}

export default async function BusinessImportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const requested = params.status ?? "pending";
  const status = ALLOWED_STATUSES.has(requested) ? requested : "pending";
  const parsedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const offset = (page - 1) * PAGE_SIZE;
  const [candidates, communes, categories] = await Promise.all([
    get<BusinessImportCandidate[]>(
      `/api/admin/business-imports/?status=${status}&limit=${PAGE_SIZE}&offset=${offset}`,
    ),
    get<Commune[]>("/api/communes/"),
    get<BusinessCategory[]>("/api/business-categories/"),
  ]);
  return (
    <BusinessImportsAdmin
      initialCandidates={candidates}
      communes={communes}
      categories={categories}
      filterStatus={status}
      page={page}
      hasNextPage={candidates.length === PAGE_SIZE}
    />
  );
}
