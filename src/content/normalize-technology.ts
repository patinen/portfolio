import { z } from "zod";
import { asset, copy, rowSchema, text, validSlug, type Row } from "./normalize";
import type { TechnologySummary, TechnologyReference } from "./types";
export const technologySchema = rowSchema.extend({
  id: z.string(),
  status: z.string(),
  slug: z.string(),
  name: z.string(),
  category: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  brand_color: z
    .string()
    .length(7)
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullish()
    .catch(undefined),
});
export function normalizeTechnology(
  row: Row,
  baseUrl: string,
): TechnologySummary | undefined {
  const parsed = technologySchema.safeParse(row);
  if (!parsed.success) return;
  const item = parsed.data;
  if (item.status !== "published" || !validSlug(item.slug) || !text(item.name))
    return;
  const c = copy(item);
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    category: text(item.category),
    definition: text(c.definition),
    icon: asset(item.icon, baseUrl, ""),
    brandColor: item.brand_color ?? undefined,
    copy: c,
  };
}
export function projectUsesTechnology(
  project: { stack: TechnologyReference[] },
  id: string,
): boolean {
  return project.stack.some((technology) => technology.id === id);
}
