import "server-only";
import type { Locale } from "@/lib/locale";
import { directusUrl, readCollection } from "./directus";
import { normalizeTechnology } from "./normalize-technology";
import { validSlug } from "./normalize";
import { technologyFields } from "./query";
export async function getTechnologies(locale: Locale, slug?: string) {
  if (slug !== undefined && !validSlug(slug)) return [];
  const rows = await readCollection(
    "technologies",
    locale,
    false,
    slug === undefined ? {} : { slug: { _eq: slug } },
    technologyFields,
  );
  return rows.flatMap((row) => {
    const technology = normalizeTechnology(row, directusUrl);
    return technology ? [technology] : [];
  });
}
