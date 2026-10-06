import { text } from "./normalize";
import type { Copy, ProjectDetail } from "./types";
export const projectSections = [
  { id: "overview", body: "overview", heading: "project_overview_heading" },
  {
    id: "architecture",
    body: "architecture",
    heading: "project_architecture_heading",
    diagram: "architecture",
  },
  {
    id: "system-flow",
    body: "system_flow",
    heading: "project_system_flow_heading",
    diagram: "systemFlow",
  },
  {
    id: "engineering",
    body: "engineering",
    heading: "project_engineering_heading",
  },
  {
    id: "implementation",
    body: "implementation",
    heading: "project_implementation_heading",
  },
  { id: "interface", body: "interface", heading: "project_interface_heading" },
] as const;
export function getProjectSections(project: ProjectDetail, siteCopy: Copy) {
  return projectSections.flatMap((section) => {
    const body = text(project.copy[section.body]);
    const diagram = "diagram" in section ? project[section.diagram] : undefined;
    if (!body && !diagram) return [];
    return [
      {
        id: section.id,
        index: projectSections.indexOf(section) + 1,
        body,
        heading: siteCopy[section.heading],
        diagram,
        media: section.id === "interface" && body ? project.gallery : [],
      },
    ];
  });
}
