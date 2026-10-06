import "server-only";
import { readCollection } from "./directus";
import { publishedFilter } from "./query";
import { copy, safeUrl, text, date } from "./normalize";
import type { Locale } from "@/lib/locale";
import type { ExperienceItem } from "./types";
export async function getExperience(locale: Locale): Promise<ExperienceItem[]> {
  return (
    await readCollection("experience", locale, false, publishedFilter)
  ).map((row) => ({
    id: String(row.id),
    organization: text(row.organization) || "",
    url: safeUrl(row.url),
    start: date(row.start_date),
    end: date(row.end_date),
    current: row.current === true,
    copy: copy(row),
  }));
}
