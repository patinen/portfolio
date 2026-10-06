import "server-only";
import { readCollection, asset } from "./directus";
import { copy, safeUrl, text } from "./normalize";
import type { Locale } from "@/lib/locale";
import type { SiteContent } from "./types";
export async function getSite(locale: Locale): Promise<SiteContent> {
  const row = (await readCollection("site_settings", locale, true))[0];
  if (!row) return { copy: {} };
  const c = copy(row);
  return {
    copy: c,
    githubUrl: safeUrl(row.github_url),
    linkedinUrl: safeUrl(row.linkedin_url),
    email: text(row.email)?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)?.[0],
    ogImage: asset(row.default_og_image, c.og_image_alt),
  };
}
