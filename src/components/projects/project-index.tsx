import Image from "next/image";
import Link from "next/link";
import type { Copy, ProjectSummary } from "@/content/types";
import type { Locale } from "@/lib/locale";
import { ProjectMetadata } from "./project-metadata";
export function ProjectIndex({
  projects,
  locale,
  labels,
}: {
  projects: ProjectSummary[];
  locale: Locale;
  labels: Copy;
}) {
  return (
    <div className="project-index">
      {projects.map((project, index) => (
        <article key={project.id} className="project-entry">
          <div className="entry-content">
            <p className="entry-number" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </p>
            <h3>
              <Link href={`/${locale}/projects/${project.slug}`}>
                {project.copy.title}
                <span aria-hidden="true"> &#8599;</span>
              </Link>
            </h3>
            {project.copy.short_description && (
              <p className="prose">{project.copy.short_description}</p>
            )}
            <ProjectMetadata project={project} labels={labels} />
          </div>
          {project.cover && (
            <Link
              className="index-cover"
              href={`/${locale}/projects/${project.slug}`}
              tabIndex={-1}
              aria-hidden="true"
            >
              <Image
                src={project.cover.url}
                alt=""
                fill
                sizes="(max-width:700px) 90vw, 280px"
              />
            </Link>
          )}
        </article>
      ))}
    </div>
  );
}
