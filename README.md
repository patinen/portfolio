# Juho Patinen | Portfolio foundation

An understated dark software engineering portfolio built with Next.js App Router, React, TypeScript, Tailwind CSS and the Directus SDK. **Content is data, layout is code.** All visible editorial copy, labels, accessibility labels and SEO belong to Directus. No sample biography or fabricated project claims ship with the frontend.

## Develop

Requires Node 22. Copy `.env.example` to `.env.local`, run `npm ci`, then `npm run dev`. Open `/en` or `/fi`; `/` redirects to English. `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` validate the foundation. Run `npm run test:smoke` after building to verify production routes against a local test CMS. It never calls the live CMS. Lockfile pins Next.js 16.3.8 and React 19.3.0.

| Variable               | Purpose                                                                       |
| ---------------------- | ----------------------------------------------------------------------------- |
| `DIRECTUS_URL`         | Server-only CMS origin; defaults to `https://cms.pat1.online`                 |
| `DIRECTUS_TOKEN`       | Optional private read-only token; never sent to browser code                  |
| `NEXT_PUBLIC_SITE_URL` | Absolute deployment origin used for canonicals/OG; local default is localhost |

## Architecture

```text
app/
  [locale]/page.tsx                 homepage
  [locale]/layout.tsx               locale HTML, header, footer
  [locale]/projects/[slug]/page.tsx  fixed case-study structure
  globals.css                      charcoal editorial design + reduced motion
src/
  content/                         server-only SDK, validation, normalized models
  components/layout/               CMS-driven site shell
  components/home/                 isolated interactive project deck
  components/ui/                   section presentation
  lib/                             locale, carousel bounds, metadata
directus/schema/model.json         reviewable collection/relation specification
tests/                            finite carousel + content boundary checks
```

Content functions expose `SiteContent`, `ProjectSummary`, `ProjectDetail`, `ExperienceItem` and `EducationItem`; SDK queries never appear in React components. Requests have a five-second timeout and a 60-second revalidation interval. Zod validates the relational boundary; normalizers discard invalid links and slugs. Plain-text case-study fields are escaped by React. No HTML injection or CMS page builder is used.

Route locale selects only the requested translation. English is requested only when a Finnish item or media translation row is missing; fallback stays on the server and matches each record by ID. An existing Finnish row is authoritative; missing fields are not merged from English. Both absent means no invented copy. Unsupported locales and unknown/unpublished projects return an empty 404. Canonical and alternate URLs, translated title/description and locale-aware OpenGraph data derive from content.

## Presentation

Compact sticky navigation, editorial hero, featured project deck, about, experience, education, contact and footer render when CMS data exists. The finite deck supports any record count, partially visible neighbors, arrow controls, region-focused keyboard arrows, touch swipe and neighboring-card activation. No autoplay. Offscreen cards are inert; index updates are announced politely. Controls require CMS labels. Motion uses 300ms CSS transitions and respects reduced motion. Images use Next/Image; only the deck is a client component. Font stacks use installed clean sans and system mono, avoiding external build-time font requests.

Project routes share hero, overview, problem, solution, architecture with diagram support, decisions, gallery, lessons and links. Empty sections are omitted. Gallery media has localized alt text and optional captions, with independent English fallback. Meaningful images without alt are omitted; explicitly decorative media renders empty alt.

## CMS setup and status

Read [Directus setup](directus/README.md). [The model](directus/schema/model.json) is the canonical CMS contract, checked against frontend field usage by tests. Collections: languages, site settings and translations, projects and translations, technologies and project junction, project media and media translations, experience and translations, education and translations. Navigation labels live in site settings; routes remain frontend-owned. Projects, technologies, experience and education all read only published content. Project media inherits publication from its parent, and technology relations exclude unpublished records.

This is the structural foundation. CMS schema application, permissions and real content authoring remain manual. The live CMS is never mutated. Until content is available, the site intentionally renders an empty shell. Production needs a real site origin, published content, accessible public assets and a reviewed CMS setup.

## Validation notes

Unit/contract tests cover carousel bounds, en/fi selection and English fallback, missing translations, publication query/normalization checks, localized media and decorative semantics, safe URLs/slugs, React text escaping and schema coverage of consumed copy fields. Production smoke tests use a local mock CMS to check actual route rendering, draft/archived exclusions, media fallback/captions, token/client-bundle isolation, metadata and empty homepages with an unavailable CMS. No test contacts the live service. Browser interaction and visual QA with real CMS content remain follow-up work.

The installation audit reports five high-severity findings in the development-only ESLint / fast-glob / micromatch / braces chain. The registry currently offers no patched braces release (latest 3.0.3); npm proposes an incompatible Next ESLint downgrade. Runtime dependencies should be checked separately with `npm audit --omit=dev`.
