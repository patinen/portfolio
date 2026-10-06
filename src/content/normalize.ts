import { z } from "zod";
import type { Copy } from "./types";
const translationSchema = z.array(z.record(z.string(), z.unknown()));
const idSchema = z.union([z.string(), z.number()]);
export const mediaRowSchema = z
  .object({
    id: idSchema,
    file: z.string().nullable().optional(),
    sort_order: z.number().nullable().optional(),
    decorative: z.boolean().nullable().optional(),
    translations: translationSchema.optional(),
  })
  .catchall(z.unknown());
export type MediaRow = z.infer<typeof mediaRowSchema>;
export const rowSchema = z
  .object({
    id: idSchema.optional(),
    translations: translationSchema.optional(),
    media: z.array(mediaRowSchema).optional(),
  })
  .catchall(z.unknown());
export type Row = z.infer<typeof rowSchema>;
export function copy(row: Pick<Row, "translations">): Copy {
  return Object.fromEntries(
    Object.entries(row.translations?.[0] || {}).filter(
      ([key, value]) =>
        !["id", "languages_code"].includes(key) &&
        !key.endsWith("_id") &&
        typeof value === "string",
    ),
  ) as Copy;
}
export function safeUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value);
    if (["http:", "https:"].includes(url.protocol)) return url.href;
  } catch {}
}
export function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function date(value: unknown): string | undefined {
  const v = text(value);
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))
    ? v
    : undefined;
}

export function validSlug(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
export function asset(value: unknown, baseUrl: string, alt = "") {
  if (typeof value !== "string" || !/^[a-zA-Z0-9-]+$/.test(value)) return;
  return { url: `${baseUrl.replace(/\/$/, "")}/assets/${value}`, alt };
}
