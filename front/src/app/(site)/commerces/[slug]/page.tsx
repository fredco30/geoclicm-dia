import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Phone, Mail, Globe } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { BusinessMiniMap } from "@/components/businesses/business-mini-map";
import { BusinessNavActions } from "@/components/businesses/business-nav-actions";

export const revalidate = 600;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const b = await api.businesses.detail(slug);
    return {
      title: `${b.name} — ${b.commune_name}`,
      description: b.meta_description || b.short_description,
    };
  } catch {
    return { title: "Commerçant introuvable" };
  }
}

const DAYS_FR: Record<string, string> = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
};

export default async function BusinessDetailPage({ params }: Props) {
  const { slug } = await params;

  let business;
  try {
    business = await api.businesses.detail(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const isPremium = business.plan === "premium";
  const fullAddress = [
    business.address,
    business.address_complement,
    `${business.postal_code} ${business.city}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto max-w-screen-lg px-4 py-6 sm:py-10">
      <header className="mb-8">
        <Link
          href="/commerces"
          className="text-sm text-slate-600 hover:text-[#1a4d6e]"
        >
          ← Annuaire des commerces
        </Link>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500">
              {business.category.name}
            </p>
            <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              {business.name}
            </h1>
            <p className="mt-2 text-lg text-slate-600">
              {business.short_description}
            </p>
          </div>
          {business.logo?.medium ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.logo.medium}
              alt={business.name}
              className="h-24 w-24 shrink-0 rounded-lg object-cover ring-1 ring-slate-200 sm:h-32 sm:w-32"
            />
          ) : null}
        </div>
        {isPremium ? (
          <span className="mt-3 inline-block rounded-full bg-[#a8533a] px-3 py-1 text-xs font-medium text-white">
            ★ Partenaire geoclicMédia
          </span>
        ) : null}
      </header>

      {business.cover_image?.large ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={business.cover_image.large}
          alt={`Photo de ${business.name}`}
          className="mb-8 aspect-[16/9] w-full rounded-xl object-cover ring-1 ring-slate-200"
        />
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Description + spécialités + horaires */}
        <div className="space-y-6 lg:col-span-2">
          <section>
            <h2 className="mb-2 font-serif text-xl font-semibold text-slate-900">
              À propos
            </h2>
            <div className="whitespace-pre-line text-slate-700">
              {business.description}
            </div>
          </section>

          {business.specialties.length > 0 ? (
            <section>
              <h2 className="mb-2 font-serif text-xl font-semibold text-slate-900">
                Spécialités
              </h2>
              <ul className="flex flex-wrap gap-2">
                {business.specialties.map((s) => (
                  <li
                    key={s}
                    className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {hasOpeningHours(business.opening_hours) ? (
            <section>
              <h2 className="mb-3 font-serif text-xl font-semibold text-slate-900">
                Horaires
              </h2>
              <dl className="divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
                {Object.entries(DAYS_FR).map(([key, label]) => {
                  const slots = business.opening_hours[key] ?? [];
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between px-4 py-2 text-sm"
                    >
                      <dt className="font-medium text-slate-700">{label}</dt>
                      <dd className="text-slate-600">
                        {slots.length === 0 ? (
                          <span className="text-slate-400">Fermé</span>
                        ) : (
                          slots
                            .map((s) => `${s.open} – ${s.close}`)
                            .join(" / ")
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              {business.seasonal_closures.length > 0 ? (
                <div className="mt-3 rounded-lg bg-amber-50 px-4 py-2 text-sm ring-1 ring-amber-200">
                  <p className="font-medium text-amber-900">
                    Fermetures à venir
                  </p>
                  <ul className="mt-1 space-y-0.5 text-amber-800">
                    {business.seasonal_closures.map((c, i) => (
                      <li key={i}>
                        Du {c.from} au {c.to}
                        {c.reason ? ` — ${c.reason}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        {/* Contact + zones desservies */}
        <aside className="space-y-6">
          {business.latitude !== null && business.longitude !== null ? (
            <section className="space-y-3">
              <BusinessMiniMap
                latitude={business.latitude}
                longitude={business.longitude}
                label={business.name}
              />
              <BusinessNavActions
                latitude={business.latitude}
                longitude={business.longitude}
                name={business.name}
              />
            </section>
          ) : null}

          <section className="rounded-xl bg-slate-50 p-5 ring-1 ring-slate-200">
            <h2 className="mb-3 font-serif text-lg font-semibold text-slate-900">
              Contact
            </h2>
            <dl className="space-y-2 text-sm">
              <ContactRow
                icon={<MapPin className="h-4 w-4" />}
                label="Adresse"
                value={fullAddress}
              />
              {business.phone ? (
                <ContactRow
                  icon={<Phone className="h-4 w-4" />}
                  label="Téléphone"
                  value={business.phone}
                  href={`tel:${business.phone}`}
                />
              ) : null}
              {business.mobile ? (
                <ContactRow
                  icon={<Phone className="h-4 w-4" />}
                  label="Mobile"
                  value={business.mobile}
                  href={`tel:${business.mobile}`}
                />
              ) : null}
              {business.email ? (
                <ContactRow
                  icon={<Mail className="h-4 w-4" />}
                  label="Email"
                  value={business.email}
                  href={`mailto:${business.email}`}
                />
              ) : null}
              {business.website ? (
                <ContactRow
                  icon={<Globe className="h-4 w-4" />}
                  label="Site web"
                  value={business.website.replace(/^https?:\/\//, "")}
                  href={business.website}
                />
              ) : null}
            </dl>
            {(business.facebook_url ||
              business.instagram_url ||
              business.tiktok_url) && (
              <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-200 pt-3 text-xs">
                {business.facebook_url ? (
                  <a
                    href={business.facebook_url}
                    target="_blank"
                    rel="noopener"
                    className="text-slate-600 hover:text-[#1a4d6e] hover:underline"
                  >
                    Facebook
                  </a>
                ) : null}
                {business.instagram_url ? (
                  <a
                    href={business.instagram_url}
                    target="_blank"
                    rel="noopener"
                    className="text-slate-600 hover:text-[#1a4d6e] hover:underline"
                  >
                    Instagram
                  </a>
                ) : null}
                {business.tiktok_url ? (
                  <a
                    href={business.tiktok_url}
                    target="_blank"
                    rel="noopener"
                    className="text-slate-600 hover:text-[#1a4d6e] hover:underline"
                  >
                    TikTok
                  </a>
                ) : null}
              </div>
            )}
          </section>

          {business.service_areas.length > 0 ? (
            <section className="rounded-xl bg-slate-50 p-5 ring-1 ring-slate-200">
              <h2 className="mb-2 font-serif text-lg font-semibold text-slate-900">
                Zones desservies
              </h2>
              <p className="mb-2 text-xs text-slate-500">
                Intervient également sur :
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {business.service_areas.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-700 ring-1 ring-slate-200"
                  >
                    {c.name}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function ContactRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div>
        <dt className="sr-only">{label}</dt>
        <dd className="text-slate-700">
          {href ? (
            <a
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noopener" : undefined}
              className="hover:text-[#1a4d6e] hover:underline"
            >
              {value}
            </a>
          ) : (
            value
          )}
        </dd>
      </div>
    </div>
  );
}

function hasOpeningHours(
  hours: Record<string, Array<{ open: string; close: string }>>,
): boolean {
  return Object.values(hours).some((slots) => slots && slots.length > 0);
}
