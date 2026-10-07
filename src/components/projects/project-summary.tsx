import Link from "next/link";
import type { Copy, ProjectSummary } from "@/content/types";
import type { Locale } from "@/lib/locale";
import { groupProjectStack } from "@/lib/project-stack";
type Props = { project: ProjectSummary; labels: Copy; locale: Locale };
export function ProjectActions({ project, labels }: Omit<Props, "locale">) {
  if (
    !(project.sourceUrl && labels.project_source_label) &&
    !(project.liveUrl && labels.project_live_label)
  )
    return null;
  return (
    <div className="case-actions">
      {project.sourceUrl && labels.project_source_label && (
        <a href={project.sourceUrl} target="_blank" rel="noreferrer">
          {labels.project_source_label}
          <span aria-hidden="true">&#8599;</span>
        </a>
      )}
      {project.liveUrl && labels.project_live_label && (
        <a href={project.liveUrl} target="_blank" rel="noreferrer">
          {labels.project_live_label}
          <span aria-hidden="true">&#8599;</span>
        </a>
      )}
    </div>
  );
}
export function ProjectStack({ project, labels, locale }: Props) {
  const entries = groupProjectStack(project).flatMap(
    (group) => group.technologies,
  );
  if (!entries.length) return null;
  return (
    <div className="case-stack">
      {labels.project_stack_label && (
        <p className="eyebrow">{labels.project_stack_label}</p>
      )}
      <ul>
        {entries.map((item, index) => (
          <li key={`${item.name}-${index}`}>
            {item.slug ? (
              <Link href={`/${locale}/stack/${item.slug}`}>{item.name}</Link>
            ) : (
              <span>{item.name}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
export function ProjectTechnicalSnapshot({ project, labels, locale }: Props) {
  const groups = groupProjectStack(project);
  if (!groups.length) return null;
  return (
    <aside className="case-snapshot" aria-label={labels.project_stack_label}>
      {groups.map((group, index) => (
        <div className="case-stack-group" key={group.category || index}>
          {(group.category || labels.project_stack_label) && (
            <h3>{group.category || labels.project_stack_label}</h3>
          )}
          <ul>
            {group.technologies.map((item, index) => (
              <li key={`${item.name}-${index}`}>
                {item.slug ? (
                  <Link href={`/${locale}/stack/${item.slug}`}>
                    {item.name}
                  </Link>
                ) : (
                  <span>{item.name}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
}
