import "server-only";
import {
  createDirectus,
  rest,
  staticToken,
  readItems,
  readSingleton,
} from "@directus/sdk";
import { cache } from "react";
import type { Locale } from "@/lib/locale";
import { rowSchema, type Row } from "./normalize";
const url = process.env.DIRECTUS_URL || "https://cms.pat1.online";
const client = createDirectus(url).with(
  rest({
    onRequest: (options) => ({
      ...options,
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 60 },
    }),
  }),
);
const cms = process.env.DIRECTUS_TOKEN
  ? client.with(staticToken(process.env.DIRECTUS_TOKEN))
  : client;
// SDK query boundaries are validated before normalization. No CMS nesting escapes this module.
export const readCollection = cache(
  async (
    collection: string,
    locale: Locale,
    singleton = false,
    filter: Record<string, unknown> = {},
    fields: string[] = ["*", "translations.*"],
  ): Promise<Row[]> => {
    async function request(language: Locale) {
      const query = {
        fields,
        ...(singleton ? {} : { filter, sort: ["sort_order"], limit: -1 }),
        deep: {
          ...(collection === "projects"
            ? {
                gallery: { _sort: ["sort_order"], _limit: -1 },
                technologies: { _limit: -1 },
              }
            : {}),
          translations: { _filter: { languages_code: { _eq: language } } },
        },
      };
      const data: unknown = await cms.request(
        singleton
          ? readSingleton(collection, query)
          : readItems(collection, query),
      );
      return rowSchema.array().parse(singleton ? [data] : data);
    }
    try {
      const rows = await request(locale);
      if (locale === "en" || rows.every((row) => row.translations?.length))
        return rows;
      const fallback = await request("en").catch(() => []);
      return rows.map((row) =>
        row.translations?.length
          ? row
          : {
              ...row,
              translations: fallback.find((item) => item.id === row.id)
                ?.translations,
            },
      );
    } catch (error) {
      if (process.env.NODE_ENV === "development")
        console.warn(
          `[content] ${collection} unavailable`,
          error instanceof Error ? error.message : "Invalid response",
        );
      return [];
    }
  },
);
export function asset(value: unknown, alt: string = "") {
  if (typeof value !== "string" || !/^[a-zA-Z0-9-]+$/.test(value)) return;
  return { url: `${url.replace(/\/$/, "")}/assets/${value}`, alt };
}
