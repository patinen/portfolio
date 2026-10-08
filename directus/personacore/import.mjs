import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const copyFields = ["title", "short_description", "overview", "architecture", "system_flow", "engineering", "implementation", "interface", "seo_title", "seo_description"];
export function validateContent(content) {
  if (content.slug !== "personacore" || content.github_url !== "https://github.com/patinen/personacore") throw new Error("Unexpected project identity");
  if (!Array.isArray(content.technology_slugs) || new Set(content.technology_slugs).size !== content.technology_slugs.length || content.technology_slugs.some(slug => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))) throw new Error("Invalid technology selection");
  if (Object.keys(content.translations).sort().join(",") !== "en,fi") throw new Error("Complete FI and EN rows required");
  for (const copy of Object.values(content.translations)) {
    if (Object.keys(copy).sort().join(",") !== [...copyFields].sort().join(",") || copyFields.some(key => typeof copy[key] !== "string" || !copy[key].trim())) throw new Error("Incomplete or unexpected editorial fields");
  }
}
export function planImport(content, state, updateTranslations = false) {
  validateContent(content);
  const matches = state.projects.filter(row => row.slug === content.slug);
  if (matches.length > 1) throw new Error("Ambiguous project slug");
  const project = matches[0];
  if (project && project.status !== "draft") throw new Error("Existing project must be a draft; publication is never changed");
  const technologies = content.technology_slugs.map(slug => {
    const matches = state.technologies.filter(row => row.slug === slug);
    if (matches.length !== 1 || !matches[0].id || matches[0].status !== "published") throw new Error("Missing, ambiguous or unpublished technology: " + slug);
    return matches[0];
  });
  const translations = [];
  for (const [language, copy] of Object.entries(content.translations)) {
    const rows = project ? state.translations.filter(row => String(row.projects_id) === String(project.id) && row.languages_code === language) : [];
    if (rows.length > 1) throw new Error("Ambiguous translation");
    const row = rows[0];
    const values = Object.fromEntries(Object.entries(copy).filter(([key, value]) => !row || ((updateTranslations || row[key] == null || row[key] === "") && row[key] !== value)));
    if (Object.keys(values).length) translations.push({ ...(row ? { id: row.id } : {}), language, values });
  }
  const links = project ? state.links.filter(row => String(row.projects_id) === String(project.id)) : [];
  const addTechnologies = technologies.filter(tech => !links.some(row => String(row.technologies_id) === String(tech.id))).map(tech => ({ id: tech.id, slug: tech.slug }));
  const projectValues = !project ? { slug: content.slug, status: "draft", github_url: content.github_url } : (project.github_url == null || project.github_url === "" ? { github_url: content.github_url } : {});
  return { projectId: project?.id, projectValues, translations, addTechnologies };
}

export async function executePlan(plan, api) {
  let id = plan.projectId;
  if (!id) id = (await api("/items/projects", "POST", plan.projectValues)).id;
  else if (Object.keys(plan.projectValues).length) await api("/items/projects/" + encodeURIComponent(id), "PATCH", plan.projectValues);
  if (!id) throw new Error("CMS did not return project identity");
  for (const row of plan.translations) {
    if (row.id != null) await api("/items/projects_translations/" + encodeURIComponent(row.id), "PATCH", row.values);
    else await api("/items/projects_translations", "POST", { projects_id: id, languages_code: row.language, ...row.values });
  }
  for (const tech of plan.addTechnologies) await api("/items/projects_technologies", "POST", { projects_id: id, technologies_id: tech.id });
}

async function main() {
  const content = JSON.parse(await readFile(new URL("./content.json", import.meta.url), "utf8"));
  validateContent(content);
  const args = process.argv.slice(2);
  if (args.some(arg => !["--apply", "--update-translations"].includes(arg) && !arg.startsWith("--url="))) throw new Error("Unknown option");
  const apply = args.includes("--apply");
  const target = args.find(arg => arg.startsWith("--url="))?.slice(6);
  if (!target) {
    if (apply) throw new Error("Apply requires explicit URL");
    console.log(JSON.stringify({ mode: "offline-dry-run", content, unresolvedTechnologySlugs: content.technology_slugs, note: "No credentials read or network requests made. Target schema, language rows and existing published technology IDs require remote preflight. New project will be draft. Nonempty translations are preserved unless --update-translations is explicit." }, null, 2));
    return;
  }
  const base = new URL(target);
  if (!["https:", "http:"].includes(base.protocol) || base.username || base.password || base.search || base.hash || base.pathname !== "/") throw new Error("Invalid CMS origin");
  const token = process.env.DIRECTUS_SETUP_TOKEN;
  if (!token) throw new Error("Missing process-only setup token");
  const api = async (path, method = "GET", data) => {
    const response = await fetch(new URL(path, base), { method, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, ...(data ? { body: JSON.stringify(data) } : {}), signal: AbortSignal.timeout(10000), redirect: "error" });
    if (!response.ok) throw new Error("CMS request failed");
    return response.status === 204 ? undefined : (await response.json()).data;
  };
  for (const [collection, required] of Object.entries({
    projects: ["id", "slug", "status", "github_url"],
    projects_translations: ["id", "projects_id", "languages_code", ...copyFields],
    technologies: ["id", "slug", "status"],
    projects_technologies: ["id", "projects_id", "technologies_id"],
    languages: ["code"],
  })) {
    const fields = await api("/fields/" + collection);
    if (required.some(field => !fields.some(value => value.field === field))) throw new Error("Required CMS fields missing");
  }
  const languages = await api("/items/languages?limit=-1&fields=code");
  if (["en", "fi"].some(code => !languages.some(row => row.code === code))) throw new Error("Required language missing");
  const projects = await api("/items/projects?limit=-1&fields=id,slug,status,github_url&filter[slug][_eq]=" + content.slug);
  if (projects.length > 1) throw new Error("Ambiguous project");
  const id = projects[0]?.id;
  const technologies = await api("/items/technologies?limit=-1&fields=id,slug,status&filter[slug][_in]=" + content.technology_slugs.join(","));
  const translations = id ? await api("/items/projects_translations?limit=-1&filter[projects_id][_eq]=" + encodeURIComponent(id)) : [];
  const links = id ? await api("/items/projects_technologies?limit=-1&fields=id,projects_id,technologies_id&filter[projects_id][_eq]=" + encodeURIComponent(id)) : [];
  const plan = planImport(content, { projects, technologies, translations, links }, args.includes("--update-translations"));
  console.log(JSON.stringify({ mode: apply ? "apply-draft" : "remote-read-only-dry-run", plan }, null, 2));
  if (apply) await executePlan(plan, api);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(() => {
  console.error("PersonaCore draft import failed. Check target, required schema/languages, unique draft slug, technology slugs and setup permissions. Details and credentials suppressed; after a partial write, inspect the draft and rerun.");
  process.exitCode = 1;
});
