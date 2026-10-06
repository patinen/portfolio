import "server-only";
import { readCollection, asset } from "./directus";
import { copy, safeUrl, text, type Row } from "./normalize";
import type { Locale } from "@/lib/locale";
import type { ProjectDetail } from "./types";
export function normalizeProject(row: Row): ProjectDetail | undefined {
  const slug = text(row.slug);
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return;
  const c = copy(row);
  const technologies = Array.isArray(row.technologies)
    ? row.technologies.flatMap((item) => {
        const name = item?.technologies_id?.name;
        return typeof name === "string" ? [name] : [];
      })
    : [];
  const gallery = Array.isArray(row.gallery)
    ? row.gallery.flatMap((item) => {
        const media = asset(item?.directus_files_id, "");
        return media ? [media] : [];
      })
    : [];
  return {
    id: String(row.id),
    slug,
    copy: c,
    technologies,
    cover: asset(row.cover_image, c.cover_alt),
    hero: asset(row.hero_image, c.hero_alt),
    architecture: asset(row.architecture_image, c.architecture_alt),
    gallery,
    liveUrl: safeUrl(row.live_url),
    sourceUrl: safeUrl(row.github_url) || safeUrl(row.repository_url),
  };
}
export async function getProjects(locale: Locale, slug?: string) {
  const rows = await readCollection(
    "projects",
    locale,
    false,
    {
      status: { _eq: "published" },
      ...(slug ? { slug: { _eq: slug } } : { featured: { _eq: true } }),
    },
    [
      "*",
      "translations.*",
      "technologies.technologies_id.name",
      "gallery.directus_files_id",
    ],
  );
  return rows.flatMap((row) => {
    const project = normalizeProject(row);
    return project && project.copy.title ? [project] : [];
  });
}
