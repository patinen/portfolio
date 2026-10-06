import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile, readdir } from "node:fs/promises";
import { createServer as createSocketServer } from "node:net";

const requests = [];
let unavailable = false;
const translation = (language, value) => [
  { id: 1, languages_code: language, ...value },
];
const cms = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  requests.push(url);
  res.setHeader("Content-Type", "application/json");
  if (unavailable) {
    res.writeHead(503);
    res.end("{}");
    return;
  }
  assert.equal(req.headers.authorization, "Bearer fixture-private-token");
  const deep = JSON.parse(url.searchParams.get("deep") || "{}");
  const language = deep.translations?._filter?.languages_code?._eq;
  assert.ok(["en", "fi"].includes(language));
  const name = url.pathname.split("/").at(-1);
  const filter = JSON.parse(url.searchParams.get("filter") || "{}");
  let data = [];
  if (name === "site_settings")
    data = {
      id: 1,
      translations: translation(language, {
        site_name: "Fixture identity",
        hero_headline:
          language === "fi"
            ? "Fixture Finnish heading"
            : "Fixture English heading",
        hero_intro: "Fixture introduction",
        seo_title: language === "fi" ? "Fixture FI SEO" : "Fixture EN SEO",
        nav_projects: "Fixture navigation",
        projects_section_title: "Fixture work",
        experience_section_title: "Fixture experience",
        education_section_title: "Fixture education",
        carousel_previous_label: "Fixture previous",
        carousel_next_label: "Fixture next",
        menu_label: "Fixture menu",
        locale_switch_label: "Fixture locale",
      }),
    };
  if (name === "projects") {
    assert.equal(filter.status?._eq, "published");
    if (!filter.slug) assert.equal(filter.featured?._eq, true);
    assert.deepEqual(deep.technologies._filter, {
      technologies_id: { status: { _eq: "published" } },
    });
    assert.equal(deep.media.translations._filter.languages_code._eq, language);
    assert.deepEqual(deep.media._sort, ["sort_order", "id"]);
    const fields = url.searchParams.get("fields");
    assert.ok(fields.includes("media.file"));
    assert.ok(fields.includes("media.translations.*"));
    assert.ok(fields.includes("technologies.technologies_id.status"));
    assert.ok(!fields.includes("gallery."));
    const gallery = [
      {
        id: "m1",
        file: "fi-image",
        sort_order: 1,
        decorative: false,
        translations: translation(language, {
          alt_text: language === "fi" ? "Fixture FI alt" : "Fixture EN alt",
          caption:
            language === "fi" ? "Fixture FI caption" : "Fixture EN caption",
        }),
      },
      {
        id: "m2",
        file: "fallback-image",
        sort_order: 2,
        decorative: false,
        translations:
          language === "fi"
            ? []
            : translation("en", {
                alt_text: "Fixture fallback alt",
                caption: "Fixture fallback caption",
              }),
      },
      {
        id: "m3",
        file: "missing-alt-image",
        sort_order: 3,
        decorative: false,
        translations: [],
      },
      {
        id: "m4",
        file: "decorative-image",
        sort_order: 4,
        decorative: true,
        translations: [],
      },
    ];
    data = Array.from({ length: 6 }, (_, i) => ({
      id: String(i + 1),
      slug: `fixture-${i + 1}`,
      status: "published",
      featured: true,
      translations:
        language === "fi" && i !== 0
          ? []
          : translation(language, {
              title:
                i === 0 && language === "fi"
                  ? "Fixture Finnish project"
                  : "Fixture project " + (i + 1),
              short_description: "Fixture summary",
              overview:
                '<script data-fixture-html="true">fixture()</script>\nPlain fixture copy',
              overview_heading: "Fixture overview heading",
              gallery_heading: "Fixture gallery heading",
              source_label: "Fixture source",
            }),
      technologies: [
        {
          technologies_id: {
            name: "Fixture published technology",
            status: "published",
          },
        },
        {
          technologies_id: {
            name: "Fixture draft technology",
            status: "draft",
          },
        },
        {
          technologies_id: {
            name: "Fixture archived technology",
            status: "archived",
          },
        },
      ],
      media: i === 0 ? gallery : [],
    }));
    // Deliberately return invalid publication rows despite the filter: normalization must fail closed too.
    data.push(
      {
        id: "draft",
        slug: "draft",
        status: "draft",
        translations: translation(language, { title: "Fixture draft project" }),
      },
      {
        id: "archived",
        slug: "archived",
        status: "archived",
        translations: translation(language, {
          title: "Fixture archived project",
        }),
      },
      {
        id: "missing-both",
        slug: "missing-both",
        status: "published",
        translations: [],
      },
    );
    if (filter.slug) data = data.filter((row) => row.slug === filter.slug._eq);
  }
  if (["experience", "education"].includes(name)) {
    assert.equal(filter.status?._eq, "published");
    data = ["published", "draft", "archived"].map((status) => ({
      id: `${name}-${status}`,
      status,
      organization: `Fixture ${status} ${name}`,
      translations: translation(
        language,
        name === "experience"
          ? { role: "Fixture role", summary: "Fixture role summary" }
          : { degree: "Fixture degree", summary: "Fixture degree summary" },
      ),
    }));
  }
  res.end(JSON.stringify({ data }));
});
await new Promise((resolve) => cms.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${cms.address().port}`;
const portProbe = createSocketServer();
await new Promise((resolve) => portProbe.listen(0, "127.0.0.1", resolve));
const port = portProbe.address().port;
await new Promise((resolve) => portProbe.close(resolve));
let logs = "";
function startNext(cmsOrigin) {
  const child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", String(port)],
    {
      env: {
        ...process.env,
        DIRECTUS_URL: cmsOrigin,
        DIRECTUS_TOKEN: "fixture-private-token",
        NEXT_PUBLIC_SITE_URL: "https://portfolio.example",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout.on("data", (chunk) => {
    logs += chunk;
  });
  child.stderr.on("data", (chunk) => {
    logs += chunk;
  });
  return child;
}
let next = startNext(origin);
async function page(path) {
  return fetch(`http://localhost:${port}${path}`, { redirect: "manual" });
}
async function ready() {
  for (let i = 0; i < 80; i++) {
    if (next.exitCode !== null) throw new Error(logs);
    try {
      await page("/");
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error(`Production server did not start: ${logs}`);
}
async function stop() {
  if (next.exitCode === null) {
    const exited = once(next, "exit");
    next.kill();
    await exited;
  }
}
async function checkBundles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await checkBundles(path);
    else if (/\.(js|json|map)$/.test(entry.name)) {
      const content = await readFile(path, "utf8");
      for (const token of [
        "DIRECTUS_TOKEN",
        "fixture-private-token",
        "@directus/sdk",
      ])
        assert.ok(!content.includes(token), `${token} found in ${path}`);
    }
  }
}
try {
  await ready();
  assert.equal((await page("/")).status, 307);
  for (const [locale, heading] of [
    ["en", "Fixture English heading"],
    ["fi", "Fixture Finnish heading"],
  ]) {
    const response = await page(`/${locale}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes(`<html lang="${locale}"`));
    assert.ok(html.includes(heading));
    assert.ok(html.includes("Fixture project 6"));
    assert.ok(html.includes("Fixture published experience"));
    assert.ok(html.includes("Fixture published education"));
    assert.ok(html.includes("Fixture published technology"));
    assert.ok(html.includes(`https://portfolio.example/${locale}`));
    for (const hidden of [
      "Fixture draft",
      "Fixture archived",
      "fixture-private-token",
    ])
      assert.ok(!html.includes(hidden), hidden);
  }
  const response = await page("/fi/projects/fixture-1");
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const visible of [
    "Fixture Finnish project",
    "Fixture overview heading",
    "Fixture FI alt",
    "Fixture FI caption",
    "Fixture fallback alt",
    "Fixture fallback caption",
    "decorative-image",
    "&lt;script",
  ])
    assert.ok(html.includes(visible), visible);
  for (const hidden of [
    "<script data-fixture-html",
    "missing-alt-image",
    "Fixture draft technology",
    "Fixture archived technology",
    "fixture-private-token",
  ])
    assert.ok(!html.includes(hidden), hidden);
  for (const slug of ["draft", "archived", "missing-both", "missing"])
    assert.equal((await page(`/en/projects/${slug}`)).status, 404, slug);
  assert.equal((await page("/sv")).status, 404);
  for (const language of ["en", "fi"])
    assert.ok(
      requests.some(
        (url) =>
          url.pathname.endsWith("/projects") &&
          JSON.parse(url.searchParams.get("deep")).translations._filter
            .languages_code._eq === language,
      ),
    );
  await checkBundles(".next/static");
  unavailable = true;
  assert.equal((await page("/en/projects/unavailable")).status, 404);
  await stop();
  next = startNext(`${origin}/offline`);
  await ready();
  for (const locale of ["en", "fi"]) {
    const response = await page(`/${locale}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(!html.includes("Fixture"));
    assert.ok(!html.includes("fixture-private-token"));
  }
  console.log(
    "PASS: en/fi, server-side English and media fallback, missing translations, publication filters/defensive exclusions, localized gallery, plain-text escaping, metadata, private-token/client-bundle isolation, unknown routes and unavailable CMS.",
  );
} finally {
  await stop();
  await new Promise((resolve) => cms.close(resolve));
}
