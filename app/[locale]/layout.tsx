import { notFound } from "next/navigation";
import { isLocale } from "@/lib/locale";
import { getSite } from "@/content/get-site";
import { Header, Footer } from "@/components/layout/site-shell";
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
