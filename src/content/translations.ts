import type { Locale } from "../lib/locale";
import type { Row, MediaRow } from "./normalize";

type Translated = { translations?: Row["translations"] };
function select<T extends Translated>(row: T, locale: Locale): T {
  return {
    ...row,
    translations: row.translations?.filter(
      (item) => item.languages_code === locale,
    ),
  };
}
// Enforce the requested locale even if an over-broad CMS payload arrives.
export function selectTranslations(rows: Row[], locale: Locale): Row[] {
  return rows.map((row) => ({
    ...select(row, locale),
    ...(row.media
      ? { media: row.media.map((item) => select(item, locale)) }
      : {}),
  }));
}
export function needsEnglishFallback(rows: Row[]): boolean {
  return rows.some(
    (row) =>
      !row.translations?.length ||
      row.media?.some((item) => !item.translations?.length),
  );
}
function fallback<T extends Translated>(row: T, english?: T): T {
  return row.translations?.length
    ? row
    : { ...row, translations: english?.translations || [] };
}
export function withEnglishFallback(rows: Row[], english: Row[]): Row[] {
  const byId = new Map(english.map((row) => [row.id, row]));
  return rows.map((row) => {
    const en = byId.get(row.id);
    const mediaById = new Map(en?.media?.map((item) => [item.id, item]));
    return {
      ...fallback(row, en),
      ...(row.media
        ? {
            media: row.media.map((item: MediaRow) =>
              fallback(item, mediaById.get(item.id)),
            ),
          }
        : {}),
    };
  });
}
