import { asset, copy, safeUrl, text, validSlug, type Row } from "./normalize";
import type { ProjectDetail } from "./types";

export function normalizeProject(
  row: Row,
  baseUrl: string,
): ProjectDetail | undefined {
  if (row.status !== "published" || !validSlug(row.slug)) return;
  const c = copy(row);
  if (!text(c.title)) return;
  const technologies = Array.isArray(row.technologies)
    ? row.technologies.flatMap((item) => {
        const technology = item?.technologies_id;
        const name = text(technology?.name);
        return technology?.status === "published" && name ? [name] : [];
      })
    : [];
  const gallery = [...(row.media || [])]
    .sort(
      (a, b) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
        String(a.id).localeCompare(String(b.id)),
    )
    .flatMap((item) => {
      const translation = copy(item);
      const alt = item.decorative === true ? "" : text(translation.alt_text);
      // Missing descriptive alt is a content omission, never an invented fallback.
      if (alt === undefined) return [];
      const image = asset(item.file, baseUrl, alt);
      return image
        ? [
            {
              ...image,
              ...(text(translation.caption)
                ? { caption: translation.caption }
                : {}),
            },
          ]
        : [];
    });
  return {
    id: String(row.id),
    slug: row.slug,
    copy: c,
    technologies,
    cover: asset(row.cover_image, baseUrl, c.cover_alt),
    hero: asset(row.hero_image, baseUrl, c.hero_alt),
    architecture: asset(row.architecture_image, baseUrl, c.architecture_alt),
    gallery,
    liveUrl: safeUrl(row.live_url),
    sourceUrl: safeUrl(row.github_url),
  };
}
