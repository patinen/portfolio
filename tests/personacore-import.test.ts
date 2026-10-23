import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// Administration package intentionally uses executable ESM, like the chat setup package.
import { planImport, executePlan, validateContent, createApi, preflight, formatImportError, copyFields } from "../directus/personacore/import.mjs";
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

const secret = "sensitive-token-query-body-server-message";
test("HTTP diagnostics include method, pathname and status without reading error bodies", async () => {
  for (const method of ["GET", "POST", "PATCH"]) {
    const api = createApi(new URL("https://fixture.example"), secret, async () => Object.assign(new Response(null, { status: 403 }), { json: async () => { throw new Error(secret); } }));
    await assert.rejects(api("/items/projects?token=" + secret, method, { secret }), (error: unknown) => {
      assert.equal(formatImportError(error), "CMS request failed: " + method + " /items/projects (HTTP 403)");
      return true;
    });
  }
});
test("network, timeout and malformed response diagnostics suppress raw exceptions", async () => {
  for (const [name, expected] of [["TypeError", "network failure"], ["TimeoutError", "timed out"]]) {
    const api = createApi(new URL("https://fixture.example"), secret, async () => { throw Object.assign(new Error(secret), { name }); });
    await assert.rejects(api("/fields/projects?secret=" + secret), (error: unknown) => {
      assert.equal(formatImportError(error), "CMS request " + expected + ": GET /fields/projects");
      return true;
    });
  }
  const api = createApi(new URL("https://fixture.example"), secret, async () => Object.assign(new Response(null, { status: 200 }), { json: async () => { throw new Error(secret); } }));
  await assert.rejects(api("/fields/projects"), (error: unknown) => {
    assert.equal(formatImportError(error), "CMS response could not be read: GET /fields/projects (HTTP 200)");
    return true;
  });
  assert.equal(formatImportError(new Error(secret)), "Unexpected import failure; details suppressed");
  assert.equal(formatImportError({ message: secret }), "Unexpected import failure; details suppressed");
});
const schema: Record<string, string[]> = {
  projects: ["id", "slug", "status", "github_url"],
  projects_translations: ["id", "projects_id", "languages_code", ...copyFields],
  technologies: ["id", "slug", "status"],
  projects_technologies: ["id", "projects_id", "technologies_id"],
  languages: ["code"],
};
test("preflight names only missing schema fields and stops at the failed collection", async () => {
  const calls: string[] = [];
  await assert.rejects(preflight(async (path: string) => {
    calls.push(path);
    return schema[path.split("/").at(-1)!].filter(field => !["overview", "seo_title"].includes(field)).map(field => ({ field }));
  }), (error: unknown) => {
    assert.equal(formatImportError(error), "Required CMS fields missing in projects_translations: overview, seo_title");
    return true;
  });
  assert.deepEqual(calls, ["/fields/projects", "/fields/projects_translations"]);
});
test("preflight reports all missing language codes and performs only reads", async () => {
  for (const present of [[], ["en"], ["fi"], ["en", "fi"]]) {
    const run = preflight(async (path: string, method?: string) => {
      assert.equal(method, undefined);
      return path.startsWith("/fields/") ? schema[path.split("/").at(-1)!].map(field => ({ field })) : present.map(code => ({ code }));
    });
    const missing = ["en", "fi"].filter(code => !present.includes(code));
    if (missing.length) await assert.rejects(run, (error: unknown) => {
      assert.equal(formatImportError(error), "Required languages missing: " + missing.join(", "));
      return true;
    });
    else await run;
  }
});
test("explicit planning failures remain actionable through the CLI formatter", () => {
  const project = { id: "p", slug: "personacore", status: "draft" };
  const row = { id: 1, projects_id: "p", languages_code: "en" };
  for (const [state, expected] of [
    [{ ...empty(), projects: [project, project] }, "Ambiguous project slug"],
    [{ ...empty(), projects: [{ ...project, status: "published" }] }, "Existing project must be a draft; publication is never changed"],
    [{ ...empty(), technologies: [] }, "Missing, ambiguous or unpublished technology: " + content.technology_slugs[0]],
    [{ ...empty(), projects: [project], translations: [row, row] }, "Ambiguous translation"],
  ] as const) {
    assert.throws(() => planImport(content, state), (error: unknown) => {
      assert.equal(formatImportError(error), expected);
      return true;
    });
  }
});
