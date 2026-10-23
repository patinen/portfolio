import type { Copy } from "@/content/types";
import type { Locale } from "@/lib/locale";

const messageFor = (copy: Copy, field?: string) =>
  (field && copy[`quote_validation_${field}`]) || copy.quote_error;

export async function submitQuote(
  payload: Record<string, FormDataEntryValue>,
  locale: Locale,
  copy: Copy,
  reset: () => void,
  request: typeof fetch = fetch,
) {
  try {
    const response = await request("/api/quote-request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...payload, locale }),
    });
    const result: { ok?: boolean; field?: string } = await response.json();
    if (!response.ok || !result.ok)
      return { state: "error" as const, message: messageFor(copy, result.field) };
    reset();
    return { state: "success" as const, message: copy.quote_success };
  } catch {
    return { state: "error" as const, message: copy.quote_error };
  }
}
