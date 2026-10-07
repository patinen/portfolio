import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/locale";
import { getSite } from "@/content/get-site";
import { Header, Footer } from "@/components/layout/site-shell";
// Pages inherit one CMS-owned document title; social titles remain page-specific.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const site = await getSite(locale);
  return { title: site.copy.site_name || undefined };
}
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const site = await getSite(locale);
  return (
    <html lang={locale}>
      <body>
        <Header site={site} locale={locale} />
        <main id="main">{children}</main>
        <Footer site={site} />
      </body>
    </html>
  );
}
