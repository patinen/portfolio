import Image from "next/image";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/locale";
import { getProject } from "@/content/get-project";
import { contentMetadata } from "@/lib/metadata";
import { Section } from "@/components/ui/section";
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
        project.hero?.url || project.cover?.url,
      )
    : {};
}
export default async function Page({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const project = await getProject(locale, slug);
  if (!project) notFound();
  const c = project.copy;
  return (
    <>
      <section className="project-hero wrap">
        {c.eyebrow && <p className="eyebrow">{c.eyebrow}</p>}
        <h1>{c.title}</h1>
        {c.short_description && (
          <p className="hero-intro">{c.short_description}</p>
        )}
        <ul className="technologies">
          {project.technologies.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
        {project.hero && (
          <Image
            className="detail-image"
            src={project.hero.url}
            alt={project.hero.alt}
            width={1600}
            height={1000}
            sizes="90vw"
            priority
          />
        )}
      </section>
      {[
        "overview",
        "problem",
        "solution",
        "architecture_intro",
        "key_decisions_intro",
        "lessons",
      ].map(
        (field, index) =>
          (c[field] ||
            (field === "architecture_intro" && project.architecture)) && (
            <Section
              key={field}
              id={field}
              index={index + 1}
              title={c[`${field}_heading`]}
            >
              {c[field] && <p className="prose">{c[field]}</p>}
              {field === "architecture_intro" && project.architecture && (
                <Image
                  className="detail-image"
                  src={project.architecture.url}
                  alt={project.architecture.alt}
                  width={1600}
                  height={1000}
                  sizes="90vw"
                />
              )}
            </Section>
          ),
      )}
      {!!project.gallery.length && (
        <Section id="gallery" index={7} title={c.gallery_heading}>
          <div className="gallery">
            {project.gallery.map((image, index) => (
              <Image
                key={`${image.url}-${index}`}
                className="detail-image"
                src={image.url}
                alt={image.alt}
                width={1200}
                height={800}
                sizes="(max-width:700px) 90vw,45vw"
              />
            ))}
          </div>
        </Section>
      )}
      <div className="wrap project-links link-row">
        {project.liveUrl && c.live_label && (
          <a className="cta" href={project.liveUrl}>
            {c.live_label}
            <span aria-hidden="true">&#8599;</span>
          </a>
        )}
        {project.sourceUrl && c.source_label && (
          <a href={project.sourceUrl}>{c.source_label}</a>
        )}
      </div>
    </>
  );
}
