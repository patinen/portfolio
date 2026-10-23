"use client";

import { useState } from "react";
import Link from "next/link";
import type { Copy } from "@/content/types";
import type { Locale } from "@/lib/locale";
import { submitQuote } from "@/quote/form-submission";

const fields = ["name", "email", "company", "existing_website", "service", "description"] as const;
type Field = (typeof fields)[number];

export function QuoteForm({ locale, copy }: { locale: Locale; copy: Copy }) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading"); setMessage(undefined);
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    const result = await submitQuote(payload, locale, copy, () => form.reset());
    setState(result.state); setMessage(result.message);
  }
  const required = (field: Field) => field === "name" || field === "email" || field === "description";
  return <form className="quote-form" onSubmit={submit} noValidate>
    <div className="honeypot" aria-hidden="true"><label htmlFor="business-website">{copy.quote_honeypot_label}</label><input id="business-website" name="businessWebsite" tabIndex={-1} autoComplete="off" /></div>
    {fields.slice(0, 4).map((field) => <label className="form-field" key={field} htmlFor={`quote-${field}`}>
      {copy[`quote_${field}_label`]}{required(field) && <span aria-hidden="true"> *</span>}
      <input id={`quote-${field}`} name={field === "existing_website" ? "existingWebsite" : field} type={field === "email" ? "email" : field === "existing_website" ? "url" : "text"} required={required(field)} maxLength={field === "name" ? 120 : field === "email" ? 254 : field === "company" ? 160 : 2048} />
    </label>)}
    <label className="form-field" htmlFor="quote-service">{copy.quote_service_label}
      <select id="quote-service" name="service" required defaultValue=""><option value="" disabled>{copy.quote_service_placeholder}</option><option value="website">{copy.quote_service_website}</option><option value="redesign">{copy.quote_service_redesign}</option><option value="custom">{copy.quote_service_custom}</option><option value="other">{copy.quote_service_other}</option></select>
    </label>
    <label className="form-field" htmlFor="quote-description">{copy.quote_description_label}<span aria-hidden="true"> *</span><textarea id="quote-description" name="description" required maxLength={5000} /></label>
    <div className="form-action"><button className="form-submit" type="submit" disabled={state === "loading"}>{state === "loading" ? copy.quote_loading : copy.quote_submit_label}</button><p className="privacy-notice">{copy.quote_privacy_notice} <Link href={`/${locale}/${locale === "fi" ? "tietosuoja" : "privacy"}`}>{copy.privacy_link_label}</Link></p></div>
    {message && <p className="form-status" data-state={state} role={state === "error" ? "alert" : "status"}>{message}</p>}
  </form>;
}
