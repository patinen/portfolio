import { notFound } from "next/navigation";
import Link from "next/link";
import { isLocale } from "@/lib/locale";
import { contentMetadata } from "@/lib/metadata";
import { getSite } from "@/content/get-site";
import { getProjects } from "@/content/get-projects";
import { getExperience } from "@/content/get-experience";
import { getEducation } from "@/content/get-education";
import { Section } from "@/components/ui/section";
import { ProjectCarousel } from "@/components/home/project-carousel";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const s = await getSite(locale);
  return contentMetadata(
    locale,
    s.copy.seo_title,
    s.copy.seo_description,
    "",
    s.ogImage?.url,
  );
}
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [site, projects, experience, education] = await Promise.all([
    getSite(locale),
    getProjects(locale),
    getExperience(locale),
    getEducation(locale),
  ]);
  const c = site.copy;
  return (
    <>
      {(c.hero_headline || c.hero_intro) && (
        <section className="hero wrap">
          {c.hero_eyebrow && <p className="eyebrow">{c.hero_eyebrow}</p>}
          {c.hero_headline && <h1>{c.hero_headline}</h1>}
          {c.hero_intro && <p className="hero-intro">{c.hero_intro}</p>}
          <div className="link-row">
            {c.hero_primary_cta && (
              <Link className="cta" href={`/${locale}#projects`}>
                {c.hero_primary_cta}
                <span aria-hidden="true">&#8599;</span>
              </Link>
            )}
            {c.hero_secondary_cta && (
              <Link href={`/${locale}#contact`}>{c.hero_secondary_cta}</Link>
            )}
          </div>
          {site.availability && c.availability_label && (
            <p className="availability">
              <i />
              {c.availability_label}
            </p>
          )}
        </section>
      )}
      {!!projects.length && (
        <Section
          id="projects"
          index={1}
          label={c.projects_section_label}
          title={c.projects_section_title}
        >
          <ProjectCarousel
            projects={projects}
            locale={locale}
            label={c.projects_section_title}
            previousLabel={c.carousel_previous_label}
            nextLabel={c.carousel_next_label}
          />
        </Section>
      )}
      {c.about_body && (
        <Section
          id="about"
          index={2}
          label={c.about_section_label}
          title={c.about_section_title}
        >
          <p className="prose lead">{c.about_body}</p>
        </Section>
      )}
      {(
        [
          ["experience", experience, 3],
          ["education", education, 4],
        ] as const
      ).map(
        ([name, items, index]) =>
          items.length > 0 && (
            <Section
              key={name}
              id={name}
              index={index}
              label={c[`${name}_section_label`]}
              title={c[`${name}_section_title`]}
            >
              <div className="timeline">
                {items.map((item) => (
                  <article key={item.id}>
                    <p className="dates">
                      {item.start && (
                        <time dateTime={item.start}>
                          {new Intl.DateTimeFormat(locale, {
                            year: "numeric",
                            month: "short",
                          }).format(new Date(item.start))}
                        </time>
                      )}
                      {(item.end || item.current) && (
                        <>
                          {" "}
                          /{" "}
                          {item.current
                            ? c.current_label
                            : item.end && (
                                <time dateTime={item.end}>
                                  {new Intl.DateTimeFormat(locale, {
                                    year: "numeric",
                                    month: "short",
                                  }).format(new Date(item.end))}
                                </time>
                              )}
                        </>
                      )}
                    </p>
                    <div>
                      <h3>{item.copy.role || item.copy.degree}</h3>
                      {item.url ? (
                        <a href={item.url}>{item.organization}</a>
                      ) : (
                        <p>{item.organization}</p>
                      )}
                      {item.copy.field && <p>{item.copy.field}</p>}
                      {item.copy.summary && (
                        <p className="prose">{item.copy.summary}</p>
                      )}
                      {item.copy.description && (
                        <p className="prose">{item.copy.description}</p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </Section>
          ),
      )}
      {(c.contact_body || c.contact_section_title) && (
        <Section
          id="contact"
          index={5}
          label={c.contact_section_label}
          title={c.contact_section_title}
        >
          {c.contact_body && <p className="prose">{c.contact_body}</p>}
          <div className="link-row">
            {site.email && c.email_label && (
              <a className="cta" href={`mailto:${site.email}`}>
                {c.email_label}
                <span aria-hidden="true">&#8599;</span>
              </a>
            )}
            {site.cvUrl && c.cv_label && <a href={site.cvUrl}>{c.cv_label}</a>}
          </div>
        </Section>
      )}
    </>
  );
}
