import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/locale";
import { contentMetadata } from "@/lib/metadata";
import { getTechnology } from "@/content/get-technology";
import { getSite } from "@/content/get-site";
import { Section } from "@/components/ui/section";
type Props = { params: Promise<{ locale: string; slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const technology = await getTechnology(locale, slug);
  return technology
    ? contentMetadata(
        locale,
        technology.copy.seo_title || technology.name,
        technology.copy.seo_description || technology.definition,
        `/stack/${slug}`,
      )
    : {};
}
export default async function Page({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const technology = await getTechnology(locale, slug);
  if (!technology) notFound();
  const site = await getSite(locale);
  const c = site.copy;
  return (
    <>
      <section className="document-header wrap">
        <h1>{technology.name}</h1>
        {technology.category && c.technology_category_label && (
          <dl className="metadata">
            <div>
              <dt>{c.technology_category_label}</dt>
              <dd>{technology.category}</dd>
            </div>
          </dl>
        )}
      </section>
      {technology.definition && (
        <Section
          id="definition"
          index={1}
          title={c.technology_definition_label}
          numbered
        >
          <p className="prose reference-definition">{technology.definition}</p>
        </Section>
      )}
      {!!technology.projects.length && (
        <Section
          id="used-in"
          index={2}
          title={c.technology_used_in_label}
          numbered
        >
          <ul className="used-in">
            {technology.projects.map((project) => (
              <li key={project.id}>
                <Link href={`/${locale}/projects/${project.slug}`}>
                  <span>{project.copy.title}</span>
                  <span aria-hidden="true">&#8599;</span>
                </Link>
                {project.copy.short_description && (
                  <p className="prose">{project.copy.short_description}</p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
