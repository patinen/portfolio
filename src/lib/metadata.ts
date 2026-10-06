import type { Metadata } from "next";
import type { Locale } from "./locale";
export function contentMetadata(
  locale: Locale,
  title?: string,
  description?: string,
  path = "",
  image?: string,
): Metadata {
  const base = new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  );
  const canonical = new URL(`/${locale}${path}`, base).href;
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        en: new URL(`/en${path}`, base).href,
        fi: new URL(`/fi${path}`, base).href,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      locale: locale === "fi" ? "fi_FI" : "en_US",
      alternateLocale: locale === "fi" ? "en_US" : "fi_FI",
      type: "website",
      ...(image ? { images: [image] } : {}),
    },
  };
}
