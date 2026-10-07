import Image from "next/image";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/locale";
import { getProject } from "@/content/get-project";
import { contentMetadata } from "@/lib/metadata";
import { ProjectMetadata } from "@/components/projects/project-metadata";
import { getProjectSections } from "@/content/project-sections";
import { getSite } from "@/content/get-site";
type Props = { params: Promise<{ locale: string; slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const project = await getProject(locale, slug);
  return project
    ? contentMetadata(
        locale,
        project.copy.seo_title || project.copy.title,
        project.copy.seo_description || project.copy.short_description,
        `/projects/${slug}`,
        project.cover?.url,
      )
    : {};
}
export default async function Page({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const project = await getProject(locale, slug);
  if (!project) notFound();
  const site = await getSite(locale);
  const c = project.copy;
  return (
    <article className="project-case">
      <header className="case-hero wrap">
        <h1>{c.title}</h1>
        <div className="case-introduction">
          {c.short_description && (
            <p className="prose case-summary">{c.short_description}</p>
          )}
          <ProjectMetadata
            project={project}
            labels={site.copy}
            locale={locale}
            snapshotOnly
          />
        </div>
        {project.cover && (
          <div className="case-cover">
            <Image
              src={project.cover.url}
              alt={project.cover.alt}
              fill
              sizes="(max-width:700px) 90vw, (max-width:1216px) 92vw, 1120px"
              preload
            />
          </div>
        )}
      </header>
      {getProjectSections(project, site.copy).map((section) => (
        <section
          key={section.id}
          id={section.id}
          className={`case-section wrap case-${section.id}`}
        >
          {section.heading && (
            <h2>
              <span className="heading-index" aria-hidden="true">
                {String(section.index).padStart(2, "0")} /{" "}
              </span>
              {section.heading}
            </h2>
          )}
          <div className="case-section-content">
            {section.body && <p className="prose">{section.body}</p>}
            {section.diagram && (
              <div className="case-diagram">
                <Image
                  className="detail-image diagram"
                  src={section.diagram.url}
                  alt={section.diagram.alt}
                  width={1600}
                  height={1000}
                  sizes="(max-width:700px) 90vw, (max-width:1216px) 92vw, 1120px"
                />
              </div>
            )}
            {!!section.media.length && (
              <div
                className={`gallery case-gallery${section.media.length === 1 ? " single-image" : ""}`}
              >
                {section.media.map((image, index) => (
                  <figure key={`${image.url}-${index}`}>
                    <Image
                      className="detail-image"
                      src={image.url}
                      alt={image.alt}
                      width={1200}
                      height={800}
                      sizes={
                        section.media.length === 1
                          ? "(max-width:700px) 90vw, 1120px"
                          : "(max-width:700px) 90vw, 560px"
                      }
                    />
                    {image.caption && (
                      <figcaption className="prose">{image.caption}</figcaption>
                    )}
                  </figure>
                ))}
              </div>
            )}
          </div>
        </section>
      ))}
      {((project.sourceUrl && site.copy.project_source_label) ||
        (project.liveUrl && site.copy.project_live_label)) && (
        <footer className="case-actions wrap">
          {project.sourceUrl && site.copy.project_source_label && (
            <a href={project.sourceUrl} target="_blank" rel="noreferrer">
              {site.copy.project_source_label}
              <span aria-hidden="true">&#8599;</span>
            </a>
          )}
          {project.liveUrl && site.copy.project_live_label && (
            <a href={project.liveUrl} target="_blank" rel="noreferrer">
              {site.copy.project_live_label}
              <span aria-hidden="true">&#8599;</span>
            </a>
          )}
        </footer>
      )}
    </article>
  );
}
