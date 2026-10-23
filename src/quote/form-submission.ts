import type { Locale } from "@/lib/locale";
import { quoteFields, quoteRequestSchema, quoteValidationFields, type QuoteField } from "./contracts";

export type QuoteSubmission =
  | { state: "success" }
  | { state: "validation"; fields: QuoteField[] }
  | { state: "error" };

export async function submitQuote(
  payload: Record<string, FormDataEntryValue>,
  locale: Locale,
  reset: () => void,
  request: typeof fetch = fetch,
) : Promise<QuoteSubmission> {
  const input = { ...payload, locale };
  const parsed = quoteRequestSchema.safeParse(input);
  if (!parsed.success) return { state: "validation", fields: quoteValidationFields(input) };
  try {
    const response = await request("/api/quote-request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    const result: { ok?: boolean; field?: string } = await response.json();
    if (!response.ok || !result.ok) {
      return result.field && quoteFields.includes(result.field as QuoteField)
        ? { state: "validation", fields: [result.field as QuoteField] }
        : { state: "error" };
    }
    reset();
    return { state: "success" };
  } catch {
    return { state: "error" };
  }
}
