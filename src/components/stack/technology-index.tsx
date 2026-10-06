import Image from "next/image";
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
        <article
          key={technology.id}
          className={`technology-entry${technology.definition ? " has-definition" : ""}`}
        >
          <Link
            className="technology-card"
            href={`/${locale}/stack/${technology.slug}`}
          >
            <div className="technology-faces">
              <div className="technology-front">
                {technology.icon && (
                  <Image
                    src={technology.icon.url}
                    alt=""
                    width={40}
                    height={40}
                    className="technology-icon"
                  />
                )}
                {technology.category && (
                  <p className="entry-category">{technology.category}</p>
                )}
                <h3>
                  {technology.name}
                  <span aria-hidden="true"> &#8599;</span>
                </h3>
              </div>
              {technology.definition && (
                <div className="technology-back">
                  <p className="prose">{technology.definition}</p>
                </div>
              )}
            </div>
          </Link>
        </article>
      ))}
    </div>
  );
}
