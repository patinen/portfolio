import "server-only";
import { readCollection } from "./directus";
import { publishedFilter } from "./query";
import { copy, safeUrl, text, date } from "./normalize";
import type { Locale } from "@/lib/locale";
import type { EducationItem } from "./types";
export async function getEducation(locale: Locale): Promise<EducationItem[]> {
  return (
    await readCollection("education", locale, false, publishedFilter)
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
