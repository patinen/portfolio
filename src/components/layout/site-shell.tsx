import Link from "next/link";
import type { SiteContent } from "@/content/types";
import type { Locale } from "@/lib/locale";
export function Header({
  site,
  locale,
}: {
  site: SiteContent;
  locale: Locale;
}) {
  const c = site.copy;
  const links = [
    ["projects", c.nav_projects],
    ["about", c.nav_about],
    ["experience", c.nav_experience],
    ["contact", c.nav_contact],
  ].filter(([, label]) => label);
  return (
    <header className="header">
      <div className="header-inner">
        {c.skip_label && (
          <a className="skip" href="#main">
            {c.skip_label}
          </a>
        )}
        {c.site_name && (
          <Link className="identity" href={`/${locale}`}>
            {c.site_name}
          </Link>
        )}
        <nav className="desktop-nav">
          {links.map(([id, label]) => (
            <Link key={id} href={`/${locale}#${id}`}>
              {label}
            </Link>
          ))}
          {c.locale_switch_label && (
            <Link
              href={locale === "en" ? "/fi" : "/en"}
              hrefLang={locale === "en" ? "fi" : "en"}
            >
              {c.locale_switch_label}
            </Link>
          )}
        </nav>
        {c.menu_label && (
          <details className="mobile-menu">
            <summary>{c.menu_label}</summary>
            <nav>
              {links.map(([id, label]) => (
                <Link key={id} href={`/${locale}#${id}`}>
                  {label}
                </Link>
              ))}
              {c.locale_switch_label && (
                <Link href={locale === "en" ? "/fi" : "/en"}>
                  {c.locale_switch_label}
                </Link>
              )}
            </nav>
          </details>
        )}
      </div>
    </header>
  );
}
export function Footer({ site }: { site: SiteContent }) {
  const c = site.copy;
  return (
    <footer className="footer wrap">
      {c.footer_text && <p>{c.footer_text}</p>}
      <div className="link-row">
        {site.githubUrl && c.github_label && (
          <a href={site.githubUrl}>{c.github_label}</a>
        )}
        {site.linkedinUrl && c.linkedin_label && (
          <a href={site.linkedinUrl}>{c.linkedin_label}</a>
        )}
      </div>
    </footer>
  );
}
