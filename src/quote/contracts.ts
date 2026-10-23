import { z } from "zod";

const trimmed = (maximum: number) => z.string().trim().min(1).max(maximum);
export const quoteFields = ["name", "email", "company", "existingWebsite", "service", "description"] as const;
export type QuoteField = (typeof quoteFields)[number];

export function normalizeWebsite(value: string) {
  const input = value.trim();
  if (!input) return "";
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(input) ? input : `https://${input}`;
  try {
    const url = new URL(candidate);
    return ["https:", "http:"].includes(url.protocol) && url.hostname ? url.href : undefined;
  } catch { return undefined; }
}
const website = z.string().trim().max(2048).refine(
  (value) => value === "" || normalizeWebsite(value) !== undefined,
).transform((value) => value === "" ? "" : normalizeWebsite(value)!);

export const quoteRequestSchema = z.object({
  locale: z.enum(["fi", "en"]),
  name: trimmed(120),
  email: trimmed(254).email().max(254),
  company: z.string().trim().max(160).optional().default(""),
  existingWebsite: website.optional().default(""),
  service: z.enum(["website", "redesign", "custom", "other"]),
  description: trimmed(5000),
  businessWebsite: z.string().max(200).optional().default(""),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

export function quoteValidationError(
  input: unknown,
): { ok: true; value: QuoteRequest } | { ok: false; field?: string } {
  const parsed = quoteRequestSchema.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data };
  return { ok: false, field: parsed.error.issues[0]?.path[0]?.toString() };
}

export function quoteValidationFields(input: unknown): QuoteField[] {
  const parsed = quoteRequestSchema.safeParse(input);
  if (parsed.success) return [];
  return [...new Set(parsed.error.issues.map((issue) => issue.path[0]).filter(
    (field): field is QuoteField => typeof field === "string" && quoteFields.includes(field as QuoteField),
  ))];
}
