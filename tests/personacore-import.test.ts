import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// Administration package intentionally uses executable ESM, like the chat setup package.
import { planImport, executePlan, validateContent } from "../directus/personacore/import.mjs";
import { normalizeProject } from "../src/content/normalize-project";
import { getProjectSections } from "../src/content/project-sections";
const content = JSON.parse(readFileSync(new URL("../directus/personacore/content.json", import.meta.url), "utf8"));
const technologies = content.technology_slugs.map((slug: string, i: number) => ({ id: "fixture-" + i, slug, name: slug, status: "published" }));
const empty = () => ({ projects: [], technologies, translations: [], links: [] });
test("complete bilingual content uses the existing plain-text six-section contract", () => {
  validateContent(content);
  for (const locale of ["fi", "en"]) {
    const project = normalizeProject({ id: "fixture-project", slug: content.slug, status: "published", github_url: content.github_url, translations: [content.translations[locale]] }, "https://fixture.example");
    assert.ok(project);
    assert.equal(getProjectSections(project, {}).length, 6);
    assert.equal(project.sourceUrl, content.github_url);
    assert.match(project.copy.overview, /AI/);
  }
});
test("new import creates a draft and complete translations, reusing technology IDs", () => {
  const plan = planImport(content, empty());
  assert.equal(plan.projectValues.status, "draft");
  assert.equal(plan.translations.length, 2);
  assert.deepEqual(plan.addTechnologies.map((row: { id: string }) => row.id), technologies.map((row: { id: string }) => row.id));
  assert.equal("live_url" in plan.projectValues, false);
});
test("existing draft import preserves unrelated fields and nonempty copy; explicit update is selective", () => {
  const state = { ...empty(), projects: [{ id: "p", slug: "personacore", status: "draft", github_url: "https://example.com/custom", sort_order: 42 }], translations: [{ id: 1, projects_id: "p", languages_code: "fi", title: "Editorial title", overview: "" }] };
  const plan = planImport(content, state);
  assert.deepEqual(plan.projectValues, {});
  assert.equal(plan.translations.find((row: { language: string }) => row.language === "fi")?.values.title, undefined);
  assert.equal(plan.translations.find((row: { language: string }) => row.language === "fi")?.values.overview, content.translations.fi.overview);
  assert.equal(planImport(content, state, true).translations.find((row: { language: string }) => row.language === "fi")?.values.title, "PersonaCore");
  assert.equal(state.projects[0].sort_order, 42);
});
test("applied plan is idempotent and never deletes unrelated relationships", async () => {
  const state = empty() as { projects: Record<string, unknown>[]; technologies: typeof technologies; translations: Record<string, unknown>[]; links: Record<string, unknown>[] };
  const writes: string[] = [];
  await executePlan(planImport(content, state), async (path: string, method: string, values: Record<string, unknown>) => {
    writes.push(method + " " + path);
    if (path === "/items/projects") { state.projects.push({ id: "p", ...values }); return { id: "p" }; }
    if (path === "/items/projects_translations") state.translations.push({ id: state.translations.length + 1, ...values });
    if (path === "/items/projects_technologies") state.links.push({ id: state.links.length + 1, ...values });
  });
  state.links.push({ id: 99, projects_id: "p", technologies_id: "unrelated" });
  const again = planImport(content, state);
  assert.deepEqual(again.projectValues, {});
  assert.deepEqual(again.translations, []);
  assert.deepEqual(again.addTechnologies, []);
  assert.ok(writes.every(write => write.startsWith("POST ")));
});
test("ambiguous project/translations and unresolved technologies fail before writes", () => {
  const project = { id: "p", slug: "personacore", status: "draft" };
  assert.throws(() => planImport(content, { ...empty(), projects: [project, project] }), /Ambiguous/);
  assert.throws(() => planImport(content, { ...empty(), projects: [{ ...project, status: "published" }] }), /draft/);
  assert.throws(() => planImport(content, { ...empty(), technologies: technologies.slice(1) }), /technology/);
  assert.throws(() => planImport(content, { ...empty(), technologies: [...technologies, technologies[0]] }), /technology/);
  const row = { id: 1, projects_id: "p", languages_code: "en" };
  assert.throws(() => planImport(content, { ...empty(), projects: [project], translations: [row, row] }), /translation/);
});
