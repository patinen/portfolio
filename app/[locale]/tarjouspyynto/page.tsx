import { notFound } from "next/navigation";
import Link from "next/link";
import { getSite } from "@/content/get-site";
import { QuoteForm, quoteFormReady } from "@/components/quote/quote-form";
import { isLocale } from "@/lib/locale";
import { contentMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; if (!isLocale(locale)) return {}; const site = await getSite(locale); return contentMetadata(locale, site.copy.quote_seo_title, site.copy.quote_seo_description, "/tarjouspyynto", site.ogImage?.url, { fi: "/tarjouspyynto", en: "/quote-request" }); }
export default async function Page({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; if (locale !== "fi") notFound(); const site = await getSite(locale); const c = site.copy; return <section className="form-page wrap">{c.quote_page_title && <h1>{c.quote_page_title}</h1>}{c.quote_page_body && <p className="prose">{c.quote_page_body}</p>}{quoteFormReady(c) && <><p className="privacy-notice">{c.quote_privacy_notice} {c.privacy_link_label && <Link href="/fi/tietosuoja">{c.privacy_link_label}</Link>}</p><QuoteForm locale={locale} copy={c} /></>}</section>; }
