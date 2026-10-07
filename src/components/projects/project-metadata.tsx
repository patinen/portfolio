import Link from "next/link";
import type { Locale } from "@/lib/locale";
import type { Copy, ProjectSummary } from "@/content/types";
export function ProjectMetadata({
  project,
  labels,
  locale,
  snapshotOnly = false,
}: {
  project: ProjectSummary;
  labels: Copy;
  locale?: Locale;
  snapshotOnly?: boolean;
}) {
  const c = labels;
  if (snapshotOnly && (!project.technologies.length || !c.project_stack_label))
    return null;
  return (
    <dl className="metadata">
      {!!project.technologies.length && c.project_stack_label && (
        <div>
          <dt>{c.project_stack_label}</dt>
          <dd>
            {project.technologies.map((name, index) => {
              const technology = project.stack.find(
                (item) => item.name === name,
              );
              return (
                <span key={`${name}-${index}`}>
                  {index > 0 && <span aria-hidden="true"> / </span>}
                  {locale && technology ? (
                    <Link href={`/${locale}/stack/${technology.slug}`}>
                      {name}
                    </Link>
                  ) : (
                    name
                  )}
                </span>
              );
            })}
          </dd>
        </div>
      )}
      {!snapshotOnly && project.sourceUrl && c.project_source_label && (
        <div>
          <dt>{c.project_source_label}</dt>
          <dd>
            <a href={project.sourceUrl}>
              {new URL(project.sourceUrl).hostname}
              <span aria-hidden="true"> &#8599;</span>
            </a>
          </dd>
        </div>
      )}
      {!snapshotOnly && project.liveUrl && c.project_live_label && (
        <div>
          <dt>{c.project_live_label}</dt>
          <dd>
            <a href={project.liveUrl}>
              {new URL(project.liveUrl).hostname}
              <span aria-hidden="true"> &#8599;</span>
            </a>
          </dd>
        </div>
      )}
    </dl>
  );
}
