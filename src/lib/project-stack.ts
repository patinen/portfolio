import type { ProjectSummary } from "@/content/types";
export function groupProjectStack(
  project: Pick<ProjectSummary, "stack" | "technologies">,
) {
  const entries = [
    ...project.stack,
    ...project.technologies
      .filter((name) => !project.stack.some((item) => item.name === name))
      .map((name) => ({ name, category: undefined, slug: undefined })),
  ];
  const groups = new Map<string | undefined, typeof entries>();
  for (const entry of entries) {
    const category = entry.category?.trim() || undefined;
    groups.set(category, [...(groups.get(category) || []), entry]);
  }
  return [...groups].map(([category, technologies]) => ({
    category,
    technologies,
  }));
}
