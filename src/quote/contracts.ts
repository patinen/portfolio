import { z } from "zod";

const trimmed = (maximum: number) => z.string().trim().min(1).max(maximum);

export const quoteRequestSchema = z.object({
  locale: z.enum(["fi", "en"]),
  name: trimmed(120),
  email: trimmed(254).email().max(254),
  company: z.string().trim().max(160).optional().default(""),
  existingWebsite: z.string().trim().max(2048).refine((value) => {
    if (!value) return true;
    try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; }
  }).optional().default(""),
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
