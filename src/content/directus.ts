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
import { rowSchema, asset as normalizeAsset, type Row } from "./normalize";
import { contentQuery } from "./query";
import {
  needsEnglishFallback,
  selectTranslations,
  withEnglishFallback,
} from "./translations";
export const directusUrl =
  process.env.DIRECTUS_URL || "https://cms.pat1.online";
const client = createDirectus(directusUrl).with(
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
      const query = contentQuery(
        collection,
        language,
        singleton,
        filter,
        fields,
      );
      const data: unknown = await cms.request(
        singleton
          ? readSingleton(collection, query)
          : readItems(collection, query),
      );
      const rows = rowSchema.array().parse(singleton ? [data] : data);
      return selectTranslations(
        singleton ? rows : rows.filter((row) => row.status === "published"),
        language,
      );
    }
    try {
      const rows = await request(locale);
      if (locale === "en" || !needsEnglishFallback(rows)) return rows;
      const english = await request("en").catch(() => []);
      return withEnglishFallback(rows, english);
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
export function asset(value: unknown, alt = "") {
  return normalizeAsset(value, directusUrl, alt);
}
