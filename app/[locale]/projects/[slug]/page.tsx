import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/locale";
import { getProject } from "@/content/get-project";
import { contentMetadata } from "@/lib/metadata";
import { Section } from "@/components/ui/section";
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
    <>
      <section className="document-header wrap">
        <h1>{c.title}</h1>
        {c.short_description && <p className="prose">{c.short_description}</p>}
        <ProjectMetadata project={project} labels={site.copy} />
        {!!project.stack.length && (
          <ul className="reference-links">
            {project.stack.map((technology) => (
              <li key={technology.id}>
                <Link href={`/${locale}/stack/${technology.slug}`}>
                  {technology.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      {getProjectSections(project, site.copy).map((section) => {
        const body = section.body;
        const diagram = section.diagram;
        const gallery = section.media;
        return (
          <Section
            key={section.id}
            id={section.id}
            index={section.index}
            title={section.heading}
            numbered
          >
            {body && <p className="prose">{body}</p>}
            {diagram && (
              <Image
                className="detail-image diagram"
                src={diagram.url}
                alt={diagram.alt}
                width={1600}
                height={1000}
                sizes="90vw"
              />
            )}
            {!!gallery.length && (
              <div className="gallery">
                {gallery.map((image, i) => (
                  <figure key={`${image.url}-${i}`}>
                    <Image
                      className="detail-image"
                      src={image.url}
                      alt={image.alt}
                      width={1200}
                      height={800}
                      sizes="(max-width:700px) 90vw,45vw"
                    />
                    {image.caption && (
                      <figcaption className="prose">{image.caption}</figcaption>
                    )}
                  </figure>
                ))}
              </div>
            )}
          </Section>
        );
      })}
    </>
  );
}
