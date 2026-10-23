import { notFound } from "next/navigation";
import { getSite } from "@/content/get-site";
import { contentMetadata } from "@/lib/metadata";
import { PrivacyPolicy } from "@/components/privacy/privacy-policy";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; if (locale !== "en") return {}; const site = await getSite("en"); return contentMetadata("en", site.copy.privacy_seo_title, site.copy.privacy_seo_description, "/privacy", site.ogImage?.url, { fi: "/tietosuoja", en: "/privacy" }); }
export default async function Page({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; if (locale !== "en") notFound(); const c = (await getSite("en")).copy; return <section className="form-page wrap">{c.privacy_page_title && <h1>{c.privacy_page_title}</h1>}{c.privacy_page_body && <PrivacyPolicy body={c.privacy_page_body} />}</section>; }
