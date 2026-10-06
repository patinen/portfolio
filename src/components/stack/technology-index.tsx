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
                <div className="technology-logo" aria-hidden="true">
                  {technology.icon ? (
                    <Image
                      src={technology.icon.url}
                      alt=""
                      width={52}
                      height={52}
                      className="technology-icon"
                    />
                  ) : (
                    <span className="technology-placeholder" />
                  )}
                </div>
                <h3>{technology.name}</h3>
                <div className="technology-foot">
                  {technology.category && (
                    <p className="entry-category">{technology.category}</p>
                  )}
                  <span className="technology-direction" aria-hidden="true">
                    &#8599;
                  </span>
                </div>
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
