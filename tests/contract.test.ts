import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import ts from "typescript";
import { projectFields } from "../src/content/query";
import { locales } from "../src/lib/locale";
const root = new URL("../", import.meta.url);
const source = (path: string) => readFileSync(new URL(path, root), "utf8");
const model = JSON.parse(source("directus/schema/model.json"));
function ast(path: string) {
  return ts.createSourceFile(
    path,
    source(path),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
}
function copyFields(path: string, variable = "c") {
  const fields = new Set<string>();
  function visit(node: ts.Node) {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === variable
    )
      fields.add(node.name.text);
    ts.forEachChild(node, visit);
  }
  visit(ast(path));
  return fields;
}
function files(directory: string): string[] {
  return readdirSync(new URL(directory, root), { withFileTypes: true }).flatMap(
    (entry) =>
      entry.isDirectory()
        ? files(`${directory}/${entry.name}`)
        : entry.name.endsWith(".tsx")
          ? [`${directory}/${entry.name}`]
          : [],
  );
}
test("canonical schema language codes match route locales", () => {
  assert.deepEqual(locales, ["en", "fi"]);
  assert.deepEqual(
    model.collections.languages.seed.map((row: { code: string }) => row.code),
    locales,
  );
  assert.equal(model.collections.languages.primary_key, "code");
});
test("every consumed site label and case-study copy field exists in the schema", () => {
  const siteFields = new Set([
    ...copyFields("app/[locale]/page.tsx"),
    ...copyFields("src/components/layout/site-shell.tsx"),
    ...copyFields("src/content/get-site.ts"),
  ]);
  for (const prefix of ["experience", "education"])
    for (const suffix of ["section_label", "section_title"])
      siteFields.add(`${prefix}_${suffix}`);
  for (const field of siteFields)
    assert.equal(
      model.collections.site_settings_translations.fields[field],
      "text",
      `site field ${field}`,
    );
  const projectCopy = new Set([
    ...copyFields("app/[locale]/projects/[slug]/page.tsx"),
    ...copyFields("src/content/normalize-project.ts"),
  ]);
  for (const field of [
    "overview",
    "problem",
    "solution",
    "architecture_intro",
    "key_decisions_intro",
    "lessons",
  ]) {
    projectCopy.add(field);
    projectCopy.add(`${field}_heading`);
  }
  for (const field of projectCopy)
    assert.equal(
      model.collections.projects_translations.fields[field],
      "text",
      `project field ${field}`,
    );
  assert.ok(
    !("key_decisions" in model.collections.projects_translations.fields),
  );
  assert.ok(!("repository_url" in model.collections.projects.fields));
  assert.equal(model.collections.site_settings.singleton, true);
});
test("publication permission contracts cover parents, translation rows, junctions and media", () => {
  for (const collection of [
    "projects",
    "technologies",
    "experience",
    "education",
  ]) {
    assert.equal(
      model.collections[collection].fields.status,
      "string draft|published|archived default:draft",
    );
    assert.deepEqual(model.collections[collection].public_read_filter, {
      status: { _eq: "published" },
    });
  }
  for (const collection of [
    "projects_translations",
    "experience_translations",
    "education_translations",
    "projects_technologies",
    "project_media",
    "project_media_translations",
  ])
    assert.ok(model.collections[collection].public_read_filter, collection);
});
test("media/technology query fields resolve against schema relationships", () => {
  for (const selector of projectFields) {
    let collection = "projects";
    for (const segment of selector.split(".")) {
      if (segment === "*") break;
      const current = model.collections[collection];
      const relation = model.relations.find(
        (rel: {
          collection: string;
          field: string;
          related_collection: string;
          reverse_field?: string;
        }) =>
          (rel.collection === collection && rel.field === segment) ||
          (rel.related_collection === collection &&
            rel.reverse_field === segment),
      );
      assert.ok(
        segment in current.fields || segment in (current.aliases || {}),
        `${collection}.${segment}`,
      );
      if (relation)
        collection =
          relation.collection === collection
            ? relation.related_collection
            : relation.collection;
    }
  }
  assert.ok(!model.collections.projects_files);
  assert.deepEqual(model.collections.project_media_translations.unique, [
    "project_media_id",
    "languages_code",
  ]);
  for (const field of ["alt_text", "caption"])
    assert.equal(
      model.collections.project_media_translations.fields[field],
      "text",
    );
  assert.equal(model.editorial_interfaces.body_interface, "input-multiline");
});
test("React source has no HTML injection, CMS queries or visible fallback prose", () => {
  for (const path of [...files("app"), ...files("src/components")]) {
    const text = source(path);
    assert.ok(!text.includes("dangerouslySetInnerHTML"), path);
    assert.ok(!text.includes("@directus/sdk"), path);
    assert.ok(!text.includes("DIRECTUS_TOKEN"), path);
    function visit(node: ts.Node) {
      if (ts.isJsxText(node))
        assert.ok(
          !/[a-z]/i.test(node.text.replace(/&#\d+;/g, "")),
          `${path}: literal JSX copy ${node.text.trim()}`,
        );
      if (
        ts.isJsxExpression(node) &&
        node.parent &&
        ts.isJsxElement(node.parent) &&
        node.expression &&
        ts.isStringLiteral(node.expression)
      )
        assert.ok(!/[a-z]/i.test(node.expression.text), path);
      ts.forEachChild(node, visit);
    }
    visit(ast(path));
  }
  assert.ok(source("src/content/directus.ts").includes('import "server-only"'));
  assert.ok(!source(".env.example").includes("NEXT_PUBLIC_DIRECTUS_TOKEN"));
});
