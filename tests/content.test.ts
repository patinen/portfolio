import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { clampIndex } from "../src/lib/carousel";
import { copy, rowSchema, safeUrl, validSlug } from "../src/content/normalize";
import { normalizeProject } from "../src/content/normalize-project";
import { contentQuery } from "../src/content/query";
import {
  selectTranslations,
  needsEnglishFallback,
  withEnglishFallback,
} from "../src/content/translations";

const origin = "https://cms.example";
const translation = (locale: string, value: Record<string, string>) => [
  { languages_code: locale, ...value },
];
const project = (value: Record<string, unknown> = {}) =>
  rowSchema.parse({
    id: "project-1",
    status: "published",
    slug: "safe-project",
    translations: translation("en", { title: "Fixture title" }),
    ...value,
  });
const media = (id: string, value: Record<string, unknown> = {}) => ({
  id,
  file: `file-${id}`,
  sort_order: 0,
  decorative: false,
  translations: [],
  ...value,
});

test("finite carousel bounds for 0, 1, 2, 3, 5 and 8 records", () => {
  for (const count of [0, 1, 2, 3, 5, 8]) {
    assert.equal(clampIndex(-1, count), 0);
    assert.equal(clampIndex(count + 1, count), Math.max(0, count - 1));
    for (let i = 0; i < count; i++) assert.equal(clampIndex(i, count), i);
  }
});
test("validated copy excludes relational IDs and never fabricates missing copy", () => {
  assert.deepEqual(
    copy(
      rowSchema.parse({
        id: 1,
        translations: [
          {
            id: 3,
            languages_code: "fi",
            projects_id: "project-1",
            title: "Otsikko",
          },
        ],
      }),
    ),
    { title: "Otsikko" },
  );
  assert.deepEqual(copy(rowSchema.parse({ id: 1 })), {});
  assert.throws(() => rowSchema.parse({ translations: "bad" }));
  assert.throws(() =>
    rowSchema.parse({ media: [{ id: "1", translations: "bad" }] }),
  );
});
test("en and fi select only requested translation rows", () => {
  const rows = [
    project({
      translations: [
        ...translation("en", { title: "English" }),
        ...translation("fi", { title: "Suomi" }),
      ],
    }),
  ];
  assert.equal(copy(selectTranslations(rows, "en")[0]).title, "English");
  assert.equal(copy(selectTranslations(rows, "fi")[0]).title, "Suomi");
  assert.equal(selectTranslations(rows, "fi")[0].translations?.length, 1);
  assert.equal(needsEnglishFallback(selectTranslations(rows, "fi")), false);
});
test("fi falls back to English by record ID, without adding English-only records", () => {
  const requested = selectTranslations([project({ translations: [] })], "fi");
  const english = selectTranslations(
    [
      project(),
      project({
        id: "extra",
        translations: translation("en", { title: "Extra" }),
      }),
    ],
    "en",
  );
  assert.equal(needsEnglishFallback(requested), true);
  const result = withEnglishFallback(requested, english);
  assert.equal(result.length, 1);
  assert.equal(copy(result[0]).title, "Fixture title");
});
test("existing Finnish rows are authoritative, with no field-level English merge", () => {
  const fi = project({ translations: translation("fi", { title: "Suomi" }) });
  const en = project({
    translations: translation("en", {
      title: "English",
      overview: "English overview",
    }),
  });
  assert.deepEqual(copy(withEnglishFallback([fi], [en])[0]), {
    title: "Suomi",
  });
});
test("missing both translations leaves empty copy and omits untitled projects", () => {
  const rows = withEnglishFallback(
    [project({ translations: [] })],
    [project({ translations: [] })],
  );
  assert.deepEqual(copy(rows[0]), {});
  assert.equal(normalizeProject(rows[0], origin), undefined);
  assert.deepEqual(
    copy(withEnglishFallback([project({ translations: [] })], [])[0]),
    {},
  );
});
test("draft and archived projects are excluded defensively", () => {
  for (const status of ["draft", "archived", undefined])
    assert.equal(normalizeProject(project({ status }), origin), undefined);
  assert.ok(normalizeProject(project(), origin));
});
test("project, experience and education queries enforce published status", () => {
  for (const collection of ["projects", "experience", "education"]) {
    const query = contentQuery(
      collection,
      "fi",
      false,
      { status: { _eq: "draft" } },
      ["*"],
    );
    assert.deepEqual(query.filter, { status: { _eq: "published" } });
    assert.equal(query.deep.translations._filter.languages_code._eq, "fi");
  }
  assert.equal(
    contentQuery("site_settings", "en", true, {}, ["*"]).filter,
    undefined,
  );
});
test("technology relation query and normalization exclude unpublished records", () => {
  const query = contentQuery("projects", "en", false, {}, ["*"]);
  assert.deepEqual(query.deep.technologies?._filter, {
    technologies_id: { status: { _eq: "published" } },
  });
  const row = project({
    technologies: [
      { technologies_id: { name: "Public technology", status: "published" } },
      { technologies_id: { name: "Draft technology", status: "draft" } },
      { technologies_id: { name: "Archived technology", status: "archived" } },
      { technologies_id: { name: "Unspecified technology" } },
      { technologies_id: null },
    ],
  });
  assert.deepEqual(normalizeProject(row, origin)?.technologies, [
    "Public technology",
  ]);
});
test("localized media normalizes alt/caption and preserves CMS order", () => {
  const row = project({
    media: [
      media("2", {
        sort_order: 2,
        translations: translation("fi", {
          alt_text: "Toinen",
          caption: "Kuvateksti",
        }),
      }),
      media("1", {
        sort_order: 1,
        translations: translation("fi", { alt_text: "Ensimmainen" }),
      }),
    ],
  });
  assert.deepEqual(normalizeProject(row, origin)?.gallery, [
    { url: `${origin}/assets/file-1`, alt: "Ensimmainen" },
    { url: `${origin}/assets/file-2`, alt: "Toinen", caption: "Kuvateksti" },
  ]);
  const query = contentQuery("projects", "fi", false, {}, ["*"]);
  assert.equal(query.deep.media?.translations._filter.languages_code._eq, "fi");
  assert.deepEqual(query.deep.media?._sort, ["sort_order", "id"]);
});
test("media English fallback works even when the project has Finnish copy", () => {
  const fi = project({
    translations: translation("fi", { title: "Suomi" }),
    media: [
      media("2"),
      media("1", {
        translations: translation("fi", {
          alt_text: "Suomen alt",
          caption: "Suomen caption",
        }),
      }),
    ],
  });
  const en = project({
    media: [
      media("1", {
        translations: translation("en", { alt_text: "English one" }),
      }),
      media("2", {
        translations: translation("en", {
          alt_text: "English two",
          caption: "English caption",
        }),
      }),
    ],
  });
  assert.equal(needsEnglishFallback([fi]), true);
  const row = withEnglishFallback([fi], [en])[0];
  assert.equal(copy(row).title, "Suomi");
  const gallery = normalizeProject(row, origin)?.gallery;
  assert.deepEqual(
    gallery?.map((item) => item.alt),
    ["Suomen alt", "English two"],
  );
  assert.deepEqual(
    gallery?.map((item) => item.caption),
    ["Suomen caption", "English caption"],
  );
});
test("missing media alt is omitted; only explicit decorative images allow empty alt", () => {
  const row = withEnglishFallback(
    [
      project({
        media: [
          media("1"),
          media("2", { decorative: true }),
          media("3", {
            translations: translation("fi", {
              alt_text: "",
              caption: "Caption alone",
            }),
          }),
          media("4", { file: null, decorative: true }),
        ],
      }),
    ],
    [],
  )[0];
  assert.deepEqual(normalizeProject(row, origin)?.gallery, [
    { url: `${origin}/assets/file-2`, alt: "" },
  ]);
});
test("links reject executable/relative URLs and preserve safe HTTP(S) URLs", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,bad",
    "/relative",
    "mailto:a@example.com",
    null,
  ])
    assert.equal(safeUrl(value), undefined);
  assert.equal(safeUrl("https://example.com"), "https://example.com/");
  assert.equal(safeUrl("http://localhost:3000"), "http://localhost:3000/");
  assert.equal(
    normalizeProject(
      project({
        github_url: "javascript:bad",
        repository_url: "https://old.example",
      }),
      origin,
    )?.sourceUrl,
    undefined,
  );
});
test("slug validation accepts only canonical lower-case hyphenated segments", () => {
  for (const value of ["project", "next-project-2"]) {
    assert.ok(validSlug(value));
    assert.ok(normalizeProject(project({ slug: value }), origin));
  }
  for (const value of [
    "",
    " Project",
    "UPPER",
    "../secret",
    "a/b",
    "a--b",
    "a_1",
    "a-",
    null,
  ]) {
    assert.equal(validSlug(value), false);
    assert.equal(normalizeProject(project({ slug: value }), origin), undefined);
  }
});
test("editorial HTML stays plain text and React escapes it", () => {
  const html = "<script>fixture()</script>\n<strong>Plain copy</strong>";
  const row = project({
    translations: translation("en", { title: "Fixture", overview: html }),
  });
  assert.equal(normalizeProject(row, origin)?.copy.overview, html);
  const markup = renderToStaticMarkup(
    createElement("p", null, copy(row).overview),
  );
  assert.ok(markup.includes("&lt;script&gt;"));
  assert.ok(!markup.includes("<script>"));
});
