import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile, readdir } from "node:fs/promises";
import { createServer as createSocketServer } from "node:net";

const requests = [];
let unavailable = false;
let projectCount = 6;
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
        site_intro:
          language === "fi" ? "Fixture Finnish index" : "Fixture English index",
        nav_stack: "Fixture stack navigation",
        stack_section_label: "Fixture stack label",
        stack_section_title: "Fixture stack index",
        stack_section_intro: "Fixture stack intro",
        technology_category_label: "Fixture category label",
        technology_used_in_label: "Fixture used in heading",
        technology_definition_label: "Fixture definition label",
        project_overview_heading: "Fixture global overview heading",
        project_architecture_heading: "Fixture global architecture heading",
        project_system_flow_heading: "Fixture global system flow heading",
        project_engineering_heading: "Fixture global engineering heading",
        project_implementation_heading: "Fixture global implementation heading",
        project_interface_heading: "Fixture global interface heading",
        project_stack_label: "Fixture global stack label",
        project_source_label: "Fixture global source label",
        project_live_label: "Fixture global deployment label",
        projects_section_label: "Fixture project label",
        contact_section_label: "Fixture contact label",
        contact_section_title: "Fixture contact title",
        about_body: "Fixture forbidden biography",
        availability_label: "Fixture forbidden availability",
        cv_label: "Fixture forbidden CV",
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
    assert.equal(filter.featured, undefined);
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
    data = Array.from({ length: projectCount }, (_, i) => ({
      id: String(i + 1),
      slug: `fixture-${i + 1}`,
      status: "published",
      featured: false,
      ongoing: i === 0,
      cover_image: i === 0 ? "project-cover" : null,
      architecture_image: i === 0 ? "architecture-diagram" : null,
      system_flow_image: i === 0 ? "flow-diagram" : null,
      github_url: "https://github.com/fixture/project",
      live_url: "https://project.example",
      translations:
        language === "fi" && i !== 0
          ? []
          : translation(language, {
              title:
                i === 0 && language === "fi"
                  ? "Fixture Finnish project"
                  : "Fixture project " + (i + 1),
              short_description: "Fixture summary",
              cover_alt:
                language === "fi"
                  ? "Fixture Finnish cover"
                  : "Fixture English cover",
              overview:
                '<script data-fixture-html="true">fixture()</script>\nPlain fixture copy',
              overview_heading: "Fixture forbidden per-project heading",
              architecture: "Fixture v3 architecture body",
              architecture_alt: "Fixture architecture diagram alt",
              system_flow_alt: "Fixture flow diagram alt",
              interface: i === 0 ? "Fixture v3 interface body" : "",
              architecture_intro: "Fixture forbidden legacy architecture",
              interface_intro: "Fixture forbidden legacy interface",
              gallery_heading: "Fixture gallery heading",
              source_label: "Fixture source",
              live_label: "Fixture deployment",
              status_heading: "Fixture status label",
              status_published_label: "Fixture public status",
              status_development_label: "Fixture forbidden legacy status",
              stack_heading: "Fixture project stack label",
              system_flow: "Fixture system flow body",
              system_flow_heading: "Fixture forbidden per-project flow heading",
              engineering: "Fixture engineering body",
              engineering_heading:
                "Fixture forbidden per-project engineering heading",
              implementation: "Fixture implementation body",
              implementation_heading:
                "Fixture forbidden per-project implementation heading",
              interface_heading: "Fixture interface heading",
              lessons: "Fixture forbidden lessons",
              key_decisions_intro: "Fixture forbidden personal decisions",
            }),
      technologies: [
        {
          technologies_id: {
            id: i === 5 ? "tech-2" : "tech-1",
            slug: i === 5 ? "fallback-tech" : "fixture-tech",
            category: "Fixture category",
            name:
              i === 5
                ? "Fixture fallback technology"
                : "Fixture published technology",
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
      media: i < 2 ? gallery : [],
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
  if (["experience", "education"].includes(name))
    assert.fail("Personal collections must never be requested");
  if (name === "technologies") {
    assert.equal(filter.status?._eq, "published");
    data = [
      {
        id: "tech-1",
        icon: "fixture-tech-icon",
        brand_color: "#F03C2E",
        status: "published",
        name: "Fixture published technology",
        slug: "fixture-tech",
        category: "Fixture category",
        official_url: "https://reference.example",
        translations: translation(language, {
          definition:
            language === "fi"
              ? "Fixture Finnish definition"
              : "Fixture English definition",
          seo_title:
            language === "fi"
              ? "Fixture FI reference SEO"
              : "Fixture EN reference SEO",
        }),
      },
      {
        id: "tech-2",
        icon: "fixture-fallback-mask",
        brand_color: language === "fi" ? null : "red; color:lime",
        status: "published",
        name: "Fixture fallback technology",
        slug: "fallback-tech",
        translations:
          language === "fi"
            ? []
            : translation("en", { definition: "Fixture fallback definition" }),
      },
      {
        id: "tech-3",
        icon: null,
        brand_color: null,
        status: "published",
        name: "Fixture unnamed definition",
        slug: "blank-tech",
        translations: [],
      },
      {
        id: "draft-tech",
        status: "draft",
        name: "Fixture draft technology",
        slug: "draft-tech",
        translations: translation(language, {
          definition: "Fixture draft definition",
        }),
      },
      {
        id: "archived-tech",
        status: "archived",
        name: "Fixture archived technology",
        slug: "archived-tech",
        translations: [],
      },
    ];
    if (filter.slug) data = data.filter((row) => row.slug === filter.slug._eq);
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
  if (process.argv.includes("--preview")) {
    console.log(
      `Local fixture preview: http://localhost:${port}/en (mock CMS only)`,
    );
    await new Promise((resolve) => {
      process.once("SIGINT", resolve);
      process.once("SIGTERM", resolve);
    });
  } else {
    assert.equal((await page("/")).status, 307);
    for (const [locale, heading] of [
      ["en", "Fixture English index"],
      ["fi", "Fixture Finnish index"],
    ]) {
      const response = await page(`/${locale}`);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes(`<html lang="${locale}"`));
      assert.ok(html.includes(heading));
      assert.ok(html.includes("Fixture project 6"));
      assert.ok(html.includes("Fixture stack index"));
      assert.ok(html.includes("Fixture fallback definition"));
      assert.ok(html.includes("Fixture unnamed definition"));
      assert.ok(html.includes('class="carousel"'));
      assert.ok(html.includes('class="carousel-neighbor previous"'));
      assert.ok(html.includes('class="carousel-neighbor next"'));
      assert.ok(!html.includes('disabled=""'));
      assert.ok(html.includes("--offset:-1"));
      assert.ok(html.includes('class="technology-icon"'));
      assert.ok(html.includes("fixture-tech-icon"));
      const icon = html.match(/<span[^>]*class="technology-icon"[^>]*>/)?.[0];
      assert.ok(icon, "CMS icon is rendered as a decorative mask");
      assert.ok(icon.includes(`${origin}/assets/fixture-tech-icon`));
      assert.ok(icon.includes("mask-image:url(&quot;"));
      assert.ok(icon.includes("-webkit-mask-image:url(&quot;"));
      assert.ok(icon.includes("background-color:#F03C2E"));
      assert.ok(icon.includes('aria-hidden="true"'));
      const icons = [
        ...html.matchAll(/<span[^>]*class="technology-icon"[^>]*>/g),
      ].map((match) => match[0]);
      assert.equal(icons.length, 2);
      assert.ok(icons[1].includes(`${origin}/assets/fixture-fallback-mask`));
      assert.ok(icons[1].includes("background-color:var(--accent)"));
      assert.ok(!html.includes("red; color:lime"));
      assert.ok(!html.match(/<img[^>]*class="technology-icon"/));
      assert.ok(html.includes('class="technology-logo" aria-hidden="true"'));

      assert.equal(
        (html.match(/class="technology-placeholder"/g) || []).length,
        1,
      );

      const slides = [
        ...html.matchAll(/<article[^>]*class="carousel-slide"[^>]*>/g),
      ].map((match) => match[0]);
      assert.equal(slides.length, 6);
      assert.equal(
        slides.filter((slide) => slide.includes('inert=""')).length,
        5,
      );
      assert.equal(
        slides.filter((slide) => slide.includes('aria-hidden="false"')).length,
        1,
      );
      assert.ok(
        html.includes(
          locale === "fi"
            ? 'alt="Fixture Finnish cover"'
            : 'alt="Fixture English cover"',
        ),
      );
      assert.ok(html.includes('href="https://github.com/fixture/project"'));
      assert.ok(html.includes('href="https://project.example/"'));
      assert.equal((html.match(/class="technology-card"/g) || []).length, 3);
      assert.ok(!html.includes("Fixture v3 architecture body"));

      assert.ok(html.includes('aria-label="Fixture previous"'));
      assert.ok(html.includes('aria-label="Fixture next"'));
      for (let i = 1; i <= 6; i++)
        assert.ok(html.includes(`href="/${locale}/projects/fixture-${i}"`));
      for (const slug of ["fixture-tech", "fallback-tech", "blank-tech"])
        assert.ok(html.includes(`href="/${locale}/stack/${slug}"`));
      assert.ok(
        html.includes(
          locale === "fi"
            ? "Fixture Finnish definition"
            : "Fixture English definition",
        ),
      );
      assert.ok(!html.includes('class="hero wrap"'));
      for (const hidden of [
        "Fixture forbidden",
        "Fixture English heading",
        "Fixture Finnish heading",
        "Fixture experience",
        "Fixture education",
      ])
        assert.ok(!html.includes(hidden), hidden);
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
      "Fixture global overview heading",
      "Fixture FI alt",
      "Fixture FI caption",
      "Fixture global system flow heading",
      "Fixture global engineering heading",
      "Fixture global implementation heading",
      "Fixture global stack label",
      "Fixture v3 architecture body",
      "Fixture v3 interface body",
      "Fixture architecture diagram alt",
      "Fixture flow diagram alt",
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
      "Fixture forbidden",
    ])
      assert.ok(!html.includes(hidden), hidden);
    const noInterface = await page("/en/projects/fixture-2");
    const noInterfaceHtml = await noInterface.text();
    assert.ok(!noInterfaceHtml.includes('class="gallery"'));
    assert.ok(!noInterfaceHtml.includes("Fixture EN caption"));
    for (const slug of ["draft", "archived", "missing-both", "missing"])
      assert.equal((await page(`/en/projects/${slug}`)).status, 404, slug);
    for (const locale of ["en", "fi"]) {
      const response = await page(`/${locale}/stack/fixture-tech`);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(
        html.includes(
          locale === "fi"
            ? "Fixture Finnish definition"
            : "Fixture English definition",
        ),
      );
      assert.ok(
        html.includes(`https://portfolio.example/${locale}/stack/fixture-tech`),
      );
      assert.ok(html.includes("Fixture category label"));
      assert.ok(html.includes("Fixture definition label"));
      assert.ok(html.includes("Fixture used in heading"));
      assert.ok(html.includes("Fixture project 5"));
      assert.ok(!html.includes("Fixture project 6"));
      assert.ok(!html.includes("Fixture draft"));
      assert.ok(!html.includes("Fixture archived"));
      const fallback = await page(`/${locale}/stack/fallback-tech`);
      assert.equal(fallback.status, 200);
      assert.ok(
        (await fallback.text()).includes("Fixture fallback definition"),
      );
      assert.equal((await page(`/${locale}/stack/blank-tech`)).status, 200);
      for (const slug of [
        "missing",
        "draft-tech",
        "archived-tech",
        "BAD",
        "bad--slug",
      ])
        assert.equal(
          (await page(`/${locale}/stack/${slug}`)).status,
          404,
          slug,
        );
    }
    assert.ok(
      !requests.some((url) =>
        ["experience", "education"].some((name) =>
          url.pathname.endsWith(`/${name}`),
        ),
      ),
    );
    assert.ok(
      requests.some(
        (url) =>
          url.pathname.endsWith("/projects") &&
          JSON.parse(url.searchParams.get("filter")).technologies
            ?.technologies_id?.id?._eq === "tech-1",
      ),
    );
    assert.equal((await page("/sv/stack/fixture-tech")).status, 404);
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
    for (const count of [1, 2, 3]) {
      projectCount = count;
      // Give each fixture a fresh CMS origin path to preserve production caching.
      await stop();
      next = startNext(`${origin}/count-${count}`);
      await ready();
      const html = await (await page("/en")).text();
      assert.equal((html.match(/class="carousel-slide"/g) || []).length, count);
      assert.equal(
        (html.match(/class="carousel-neighbor /g) || []).length,
        count > 1 ? 2 : 0,
      );
      assert.equal(html.includes('aria-label="Fixture previous"'), count > 1);
      assert.equal(html.includes('aria-label="Fixture next"'), count > 1);
      assert.ok(!html.includes('disabled=""'));
      assert.equal((html.match(/inert=""/g) || []).length, count - 1);
    }
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
      "PASS: technical homepage without CV/biography requests, project documents, en/fi stack routes and definitions, technology fallback, published used-in membership, media, metadata, plain-text escaping, token isolation, invalid routes and unavailable CMS.",
    );
  }
} finally {
  await stop();
  await new Promise((resolve) => cms.close(resolve));
}
