import type { Metadata } from "next";
import type { Locale } from "./locale";
export function contentMetadata(
  locale: Locale,
  socialTitle?: string,
  description?: string,
  path = "",
  image?: string,
  localizedPaths?: Partial<Record<Locale, string>>,
): Metadata {
  const base = new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  );
  const pathFor = (language: Locale) => localizedPaths?.[language] ?? path;
  const canonical = new URL(`/${locale}${pathFor(locale)}`, base).href;
  return {
    description,
    alternates: {
      canonical,
      languages: {
        en: new URL(`/en${pathFor("en")}`, base).href,
        fi: new URL(`/fi${pathFor("fi")}`, base).href,
      },
    },
    openGraph: {
      title: socialTitle,
      description,
      url: canonical,
      locale: locale === "fi" ? "fi_FI" : "en_US",
      alternateLocale: locale === "fi" ? "en_US" : "fi_FI",
      type: "website",
      ...(image ? { images: [image] } : {}),
    },
  };
}
