import type { Locale } from "@/lib/locale";
import { getProjects } from "./get-projects";
export async function getProject(locale: Locale, slug: string) {
  return (await getProjects(locale, slug))[0];
}
