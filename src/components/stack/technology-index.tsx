import Link from "next/link";
import type { TechnologySummary } from "@/content/types";
import type { Locale } from "@/lib/locale";
export function TechnologyIndex({
  technologies,
  locale,
}: {
  technologies: TechnologySummary[];
  locale: Locale;
}) {
  return (
    <div className="technology-index">
      {technologies.map((technology) => (
        <article key={technology.id} className="technology-entry">
          {technology.category && (
            <p className="entry-category">{technology.category}</p>
          )}
          <h3>
            <Link href={`/${locale}/stack/${technology.slug}`}>
              {technology.name}
              <span aria-hidden="true"> &#8599;</span>
            </Link>
          </h3>
          {technology.definition && (
            <p className="prose">{technology.definition}</p>
          )}
        </article>
      ))}
    </div>
  );
}
