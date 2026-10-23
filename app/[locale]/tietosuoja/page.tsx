import { notFound } from "next/navigation";
import { getSite } from "@/content/get-site";
import { contentMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; if (locale !== "fi") return {}; const site = await getSite("fi"); return contentMetadata("fi", site.copy.privacy_seo_title, site.copy.privacy_seo_description, "/tietosuoja", site.ogImage?.url, { fi: "/tietosuoja", en: "/privacy" }); }
export default async function Page({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; if (locale !== "fi") notFound(); const c = (await getSite("fi")).copy; return <section className="form-page wrap">{c.privacy_page_title && <h1>{c.privacy_page_title}</h1>}{c.privacy_page_body && <div className="privacy-body">{c.privacy_page_body}</div>}</section>; }
