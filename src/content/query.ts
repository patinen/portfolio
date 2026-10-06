import type { Locale } from "../lib/locale";

export const publishedFilter = { status: { _eq: "published" } } as const;
export function contentQuery(
  collection: string,
  locale: Locale,
  singleton: boolean,
  filter: Record<string, unknown>,
  fields: string[],
) {
  const translations = { _filter: { languages_code: { _eq: locale } } };
  return {
    fields,
    ...(singleton
      ? {}
      : {
          filter: { ...filter, ...publishedFilter },
          sort: ["sort_order"],
          limit: -1,
        }),
    deep: {
      translations,
      ...(collection === "projects"
        ? {
            media: { _sort: ["sort_order", "id"], _limit: -1, translations },
            technologies: {
              _limit: -1,
              _filter: { technologies_id: publishedFilter },
            },
          }
        : {}),
    },
  };
}

export const projectFields = [
  "*",
  "translations.*",
  "technologies.technologies_id.name",
  "technologies.technologies_id.status",
  "media.id",
  "media.file",
  "media.sort_order",
  "media.decorative",
  "media.translations.*",
];
