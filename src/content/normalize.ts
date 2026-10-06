import { z } from "zod";
import type { Copy } from "./types";
export const rowSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    translations: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .catchall(z.unknown());
export type Row = z.infer<typeof rowSchema>;
export function copy(row: Row): Copy {
  return Object.fromEntries(
    Object.entries(row.translations?.[0] || {}).filter(
      ([key, value]) =>
        !["id", "languages_code"].includes(key) && typeof value === "string",
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
