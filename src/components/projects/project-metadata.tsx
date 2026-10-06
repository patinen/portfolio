import type { Copy, ProjectSummary } from "@/content/types";
export function ProjectMetadata({
  project,
  labels,
}: {
  project: ProjectSummary;
  labels: Copy;
}) {
  const c = labels;
  return (
    <dl className="metadata">
      {!!project.technologies.length && c.project_stack_label && (
        <div>
          <dt>{c.project_stack_label}</dt>
          <dd>{project.technologies.join(" / ")}</dd>
        </div>
      )}
      {project.sourceUrl && c.project_source_label && (
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
      {project.liveUrl && c.project_live_label && (
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
