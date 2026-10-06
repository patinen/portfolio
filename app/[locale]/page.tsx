import { notFound } from "next/navigation";
import { isLocale } from "@/lib/locale";
import { contentMetadata } from "@/lib/metadata";
import { getSite } from "@/content/get-site";
import { getProjects } from "@/content/get-projects";
import { getTechnologies } from "@/content/get-technologies";
import { Section } from "@/components/ui/section";
import { ProjectCarousel } from "@/components/projects/project-carousel";
import { TechnologyIndex } from "@/components/stack/technology-index";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const site = await getSite(locale);
  return contentMetadata(
    locale,
    site.copy.seo_title,
    site.copy.seo_description,
    "",
    site.ogImage?.url,
  );
}
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [site, projects, technologies] = await Promise.all([
    getSite(locale),
    getProjects(locale),
    getTechnologies(locale),
  ]);
  const c = site.copy;
  return (
    <>
      {(c.site_name || c.site_intro) && (
        <section className="index-intro wrap">
          {c.site_name && <h1>{c.site_name}</h1>}
          {c.site_intro && <p className="prose">{c.site_intro}</p>}
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
            projects={projects.map((project) => ({
              id: project.id,
              slug: project.slug,
              copy: {
                title: project.copy.title,
                short_description: project.copy.short_description,
              },
              cover: project.cover,
              technologies: project.technologies,
              stack: project.stack,
              sourceUrl: project.sourceUrl,
              liveUrl: project.liveUrl,
            }))}
            locale={locale}
            labels={{
              projects_section_title: c.projects_section_title,
              projects_section_label: c.projects_section_label,
              carousel_previous_label: c.carousel_previous_label,
              carousel_next_label: c.carousel_next_label,
              project_stack_label: c.project_stack_label,
              project_source_label: c.project_source_label,
              project_live_label: c.project_live_label,
            }}
          />
        </Section>
      )}
      {!!technologies.length && (
        <Section
          id="stack"
          index={2}
          label={c.stack_section_label}
          title={c.stack_section_title}
        >
          {c.stack_section_intro && (
            <p className="prose section-intro">{c.stack_section_intro}</p>
          )}
          <TechnologyIndex technologies={technologies} locale={locale} />
        </Section>
      )}
      {(c.contact_section_title ||
        c.contact_section_label ||
        c.contact_body ||
        site.email ||
        site.githubUrl ||
        site.linkedinUrl) && (
        <Section
          id="contact"
          index={3}
          label={c.contact_section_label}
          title={c.contact_section_title}
        >
          {c.contact_body && <p className="prose">{c.contact_body}</p>}
          <div className="link-row">
            {site.githubUrl && c.github_label && (
              <a href={site.githubUrl}>{c.github_label}</a>
            )}
            {site.linkedinUrl && c.linkedin_label && (
              <a href={site.linkedinUrl}>{c.linkedin_label}</a>
            )}
            {site.email && c.email_label && (
              <a href={`mailto:${site.email}`}>{c.email_label}</a>
            )}
          </div>
        </Section>
      )}
    </>
  );
}
