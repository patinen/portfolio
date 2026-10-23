"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Copy } from "@/content/types";
import type { Locale } from "@/lib/locale";
import type { QuoteField } from "@/quote/contracts";
import { submitQuote } from "@/quote/form-submission";
import { quoteValidationMessage } from "@/quote/form-copy";

const fields = ["name", "email", "company", "existingWebsite", "service", "description"] as const;
const labelKey: Record<QuoteField, string> = { name: "quote_name_label", email: "quote_email_label", company: "quote_company_label", existingWebsite: "quote_existing_website_label", service: "quote_service_label", description: "quote_description_label" };
const required = new Set<QuoteField>(["name", "email", "service", "description"]);

export function QuoteForm({ locale, copy }: { locale: Locale; copy: Copy }) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errors, setErrors] = useState<Partial<Record<QuoteField, string>>>({});
  const refs = useRef<Partial<Record<QuoteField, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>>>({});
  useEffect(() => { const field = fields.find((item) => errors[item]); if (field) refs.current[field]?.focus(); }, [errors]);
  const errorFor = (field: QuoteField) => quoteValidationMessage(copy, field);
  const clear = (field: QuoteField) => setErrors((current) => { if (!current[field]) return current; const next = { ...current }; delete next[field]; return next; });
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    const form = event.currentTarget;
    const result = await submitQuote(Object.fromEntries(new FormData(form).entries()), locale, () => form.reset());
    if (result.state === "validation") {
      setErrors(Object.fromEntries(result.fields.map((field) => [field, errorFor(field)])));
      setState("idle");
    } else if (result.state === "success") {
      setErrors({}); setState("success");
    } else setState("error");
  }
  const input = (field: Exclude<QuoteField, "service" | "description">) => <label className="form-field" key={field} htmlFor={`quote-${field}`}>
    {copy[labelKey[field]]}{required.has(field) && <span aria-hidden="true"> *</span>}
    <input ref={(element) => { refs.current[field] = element; }} id={`quote-${field}`} name={field} type={field === "email" ? "email" : field === "existingWebsite" ? "url" : "text"} required={required.has(field)} maxLength={field === "name" ? 120 : field === "email" ? 254 : field === "company" ? 160 : 2048} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `quote-${field}-error` : undefined} onChange={() => clear(field)} />
    {errors[field] && <span className="field-error" id={`quote-${field}-error`} role="alert">{errors[field]}</span>}
  </label>;
  return <form className="quote-form" onSubmit={submit} noValidate>
    <div className="honeypot" aria-hidden="true"><label htmlFor="business-website">{copy.quote_honeypot_label}</label><input id="business-website" name="businessWebsite" tabIndex={-1} autoComplete="off" /></div>
    {input("name")}{input("email")}{input("company")}{input("existingWebsite")}
    <label className="form-field" htmlFor="quote-service">{copy.quote_service_label}<span aria-hidden="true"> *</span><select ref={(element) => { refs.current.service = element; }} id="quote-service" name="service" required defaultValue="" aria-invalid={Boolean(errors.service)} aria-describedby={errors.service ? "quote-service-error" : undefined} onChange={() => clear("service")}><option value="" disabled>{copy.quote_service_placeholder}</option><option value="website">{copy.quote_service_website}</option><option value="redesign">{copy.quote_service_redesign}</option><option value="custom">{copy.quote_service_custom}</option><option value="other">{copy.quote_service_other}</option></select>{errors.service && <span className="field-error" id="quote-service-error" role="alert">{errors.service}</span>}</label>
    <label className="form-field" htmlFor="quote-description">{copy.quote_description_label}<span aria-hidden="true"> *</span><textarea ref={(element) => { refs.current.description = element; }} id="quote-description" name="description" required maxLength={5000} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "quote-description-error" : undefined} onChange={() => clear("description")} />{errors.description && <span className="field-error" id="quote-description-error" role="alert">{errors.description}</span>}</label>
    <div className="form-action"><button className="form-submit" type="submit" disabled={state === "loading"}>{state === "loading" ? copy.quote_loading : copy.quote_submit_label}</button><p className="privacy-notice">{copy.quote_privacy_notice} <Link href={`/${locale}/${locale === "fi" ? "tietosuoja" : "privacy"}`}>{copy.privacy_link_label}</Link></p></div>
    {state === "success" && <p className="form-status" data-state="success" role="status">{copy.quote_success}</p>}
    {state === "error" && <p className="form-status" data-state="error" role="alert">{copy.quote_error}</p>}
  </form>;
}
