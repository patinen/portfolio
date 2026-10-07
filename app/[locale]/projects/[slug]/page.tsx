import Image from "next/image";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/locale";
import { getProject } from "@/content/get-project";
import { contentMetadata } from "@/lib/metadata";
import {
  ProjectActions,
  ProjectStack,
  ProjectTechnicalSnapshot,
} from "@/components/projects/project-summary";
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
      <header
        className={`case-hero case-wrap${project.cover ? "" : " without-cover"}`}
      >
        <div className="case-identity">
          <h1>{c.title}</h1>
          <div className="case-introduction">
            {c.short_description && (
              <p className="prose case-summary">{c.short_description}</p>
            )}
            <ProjectActions project={project} labels={site.copy} />
            <ProjectStack
              project={project}
              labels={site.copy}
              locale={locale}
            />
          </div>
        </div>
        {project.cover && (
          <div className="case-cover">
            <Image
              src={project.cover.url}
              alt={project.cover.alt}
              fill
              sizes="(max-width:900px) 90vw, (max-width:1376px) 54vw, 720px"
              preload
            />
          </div>
        )}
      </header>
      {getProjectSections(project, site.copy).map((section) => (
        <section
          key={section.id}
          id={section.id}
          className={`case-section case-wrap case-${section.id}`}
        >
          {section.id !== "overview" && section.heading && (
            <h2>
              <span className="heading-index" aria-hidden="true">
                {String(section.index).padStart(2, "0")} /{" "}
              </span>
              {section.heading}
            </h2>
          )}
          <div className="case-section-content">
            {section.id === "overview" && section.heading && (
              <h2>
                <span className="heading-index" aria-hidden="true">
                  {String(section.index).padStart(2, "0")} /{" "}
                </span>
                {section.heading}
              </h2>
            )}
            {section.body && <p className="prose">{section.body}</p>}
            {section.diagram && (
              <div className="case-diagram">
                <Image
                  className="detail-image diagram"
                  src={section.diagram.url}
                  alt={section.diagram.alt}
                  width={1600}
                  height={1000}
                  sizes="(max-width:700px) 90vw, (max-width:1216px) 92vw, 1280px"
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
                          ? "(max-width:700px) 90vw, 1280px"
                          : "(max-width:700px) 90vw, 640px"
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
          {section.id === "overview" && (
            <ProjectTechnicalSnapshot
              project={project}
              labels={site.copy}
              locale={locale}
            />
          )}
        </section>
      ))}
    </article>
  );
}
