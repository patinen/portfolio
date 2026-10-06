import "server-only";
import { readCollection, directusUrl } from "./directus";
import { normalizeProject } from "./normalize-project";
import { validSlug } from "./normalize";
import { projectFields } from "./query";
import type { Locale } from "@/lib/locale";

export async function getProjects(locale: Locale, slug?: string) {
  if (slug !== undefined && !validSlug(slug)) return [];
  const rows = await readCollection(
    "projects",
    locale,
    false,
    slug !== undefined ? { slug: { _eq: slug } } : { featured: { _eq: true } },
    projectFields,
  );
  return rows.flatMap((row) => {
    const project = normalizeProject(row, directusUrl);
    return project ? [project] : [];
  });
}
