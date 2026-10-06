import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
const requests = [];
let unavailable = false;
const cms = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  requests.push(url);
  res.setHeader("Content-Type", "application/json");
  if (unavailable) {
    res.writeHead(503);
    res.end("{}");
    return;
  }
  const deep = JSON.parse(url.searchParams.get("deep") || "{}");
  const lang = deep.translations?._filter?.languages_code?._eq || "en";
  const name = url.pathname.split("/").at(-1);
  const filter = JSON.parse(url.searchParams.get("filter") || "{}");
  const translation = (value) => [{ id: 1, languages_code: lang, ...value }];
  let data = [];
  if (name === "site_settings")
    data = {
      id: 1,
      translations: translation({
        site_name: "Fixture identity",
        hero_headline:
          lang === "fi" ? "Fixture Finnish heading" : "Fixture English heading",
        hero_intro: "Fixture introduction",
        seo_title: lang === "fi" ? "Fixture FI SEO" : "Fixture EN SEO",
        nav_projects: "Fixture navigation",
        projects_section_title: "Fixture work",
        carousel_previous_label: "Fixture previous",
        carousel_next_label: "Fixture next",
        menu_label: "Fixture menu",
        locale_switch_label: "Fixture locale",
      }),
    };
  if (name === "projects") {
    assert.equal(filter.status?._eq, "published");
    if (!filter.slug) assert.equal(filter.featured?._eq, true);
    data = Array.from({ length: 6 }, (_, i) => ({
      id: String(i + 1),
      slug: `fixture-${i + 1}`,
      translations:
        lang === "fi"
          ? []
          : translation({
              title: `Fixture project ${i + 1}`,
              short_description: "Fixture summary",
              overview: "Fixture overview",
              overview_heading: "Fixture overview heading",
              source_label: "Fixture source",
            }),
      technologies: [{ technologies_id: { name: "TypeScript" } }],
      gallery: [],
    }));
    if (filter.slug) data = data.filter((row) => row.slug === filter.slug._eq);
  }
  res.end(JSON.stringify({ data }));
});
await new Promise((resolve) => cms.listen(0, "127.0.0.1", resolve));
function startNext(origin) {
  return spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", "3198"],
    {
      env: {
        ...process.env,
        DIRECTUS_URL: origin,
        DIRECTUS_TOKEN: "fixture-private-token",
        NEXT_PUBLIC_SITE_URL: "https://portfolio.example",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}
const origin = `http://127.0.0.1:${cms.address().port}`;
let next = startNext(origin);
let logs = "";
next.stdout.on("data", (chunk) => {
  logs += chunk;
});
next.stderr.on("data", (chunk) => {
  logs += chunk;
});
async function page(path) {
  return fetch(`http://localhost:3198${path}`, { redirect: "manual" });
}
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try {
      await page("/");
      ready = true;
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  assert.ok(ready, logs);
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
    assert.ok(!html.includes("fixture-private-token"));
    assert.ok(html.includes(`https://portfolio.example/${locale}`));
  }
  const project = await page("/fi/projects/fixture-1");
  assert.equal(project.status, 200);
  assert.ok((await project.text()).includes("Fixture overview heading"));
  assert.equal((await page("/en/projects/missing")).status, 404);
  assert.equal((await page("/sv")).status, 404);
  assert.ok(
    requests.some(
      (url) =>
        url.pathname.endsWith("/projects") &&
        url.searchParams.get("deep")?.includes("fi"),
    ),
  );
  assert.ok(
    requests.some(
      (url) =>
        url.pathname.endsWith("/projects") &&
        url.searchParams.get("deep")?.includes("en"),
    ),
  );
  unavailable = true;
  const missing = await page("/en/projects/unavailable");
  assert.equal(missing.status, 404);
  next.kill();
  await once(next, "exit");
  next = startNext(`${origin}/offline`);
  for (let i = 0; i < 80; i++) {
    try {
      await page("/");
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  for (const locale of ["en", "fi"]) {
    const response = await page(`/${locale}`);
    assert.equal(response.status, 200);
    assert.ok(!(await response.text()).includes("Fixture English heading"));
  }
  console.log(
    "PASS: locale routes, English fallback, six projects, published/featured queries, metadata, private-token exclusion, unknown locales/projects, unavailable CMS.",
  );
} finally {
  next.kill();
  await once(next, "exit");
  await new Promise((resolve) => cms.close(resolve));
}
