import type { Copy } from "@/content/types";

export const quoteFormFields = [
  "quote_name_label", "quote_email_label", "quote_company_label",
  "quote_existing_website_label", "quote_service_label",
  "quote_service_placeholder", "quote_service_website",
  "quote_service_redesign", "quote_service_custom", "quote_service_other",
  "quote_description_label", "quote_submit_label", "quote_loading",
  "quote_success", "quote_error", "quote_honeypot_label",
  "quote_privacy_notice", "privacy_link_label",
] as const;

export function quoteFormReady(copy: Copy) {
  return quoteFormFields.every((field) => Boolean(copy[field]));
}
