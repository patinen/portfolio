import "server-only";
import type { Locale } from "@/lib/locale";
import type { TechnologyDetail } from "./types";
import { getTechnologies } from "./get-technologies";
import { getProjects } from "./get-projects";
import { projectUsesTechnology } from "./normalize-technology";
import { usedInFilter } from "./query";
export async function getTechnology(
  locale: Locale,
  slug: string,
): Promise<TechnologyDetail | undefined> {
  const technology = (await getTechnologies(locale, slug))[0];
  if (!technology) return;
  const projects = await getProjects(
    locale,
    undefined,
    usedInFilter(technology.id),
  );
  return {
    ...technology,
    projects: projects.filter((project) =>
      projectUsesTechnology(project, technology.id),
    ),
  };
}
