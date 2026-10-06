# System Index

A technical project and technology index for software systems, architecture and implementation documentation. It intentionally does not function as a CV or personal biography. **Content is data. Layout is code.** The working identity and all visible copy are authored in Directus, not embedded in frontend source.

## Develop

Node 22 or newer. Copy `.env.example` to `.env.local`, run `npm ci`, then `npm run dev`. `/` redirects to `/en`. Validate with `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, then `npm run test:smoke`.

| Variable               | Purpose                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `DIRECTUS_URL`         | Server-only CMS origin, default `https://cms.pat1.online`                                  |
| `DIRECTUS_TOKEN`       | Optional private read-only token; never an admin credential or public environment variable |
| `NEXT_PUBLIC_SITE_URL` | Absolute site origin for canonical and alternate metadata                                  |

## Structure

- `/en`, `/fi`: compact CMS introduction, published project index, published technology index, minimal contact references.
- `/[locale]/projects/[slug]`: overview, architecture, system flow, security/engineering, implementation and interface. Empty sections are omitted; screenshots and diagrams come from CMS assets.
- `/[locale]/stack/[slug]`: technology name/category, localized technical definition and published projects using it.
- `src/content/`: server-only Directus access, validated normalization and whole-row locale fallback; components receive simple typed models.
- `src/components/`: responsive project/technology indexes, metadata rows and semantic document sections. No custom client component or carousel is used.
- `directus/schema/model.json`: canonical reviewable CMS specification; it is not a native importable snapshot.

Next.js App Router, React, TypeScript, Tailwind and the Directus SDK retain the charcoal foundation. Images use Next/Image with CMS asset remote patterns; screenshots are contained rather than cropped. Motion is limited to 180ms link-color transitions and respects reduced motion. All editorial fields remain escaped plain text.

## CMS and localization

[Directus setup](directus/README.md) documents the full contract, permissions and safe application workflow. Route language codes remain `en` and `fi`. Missing requested translation rows fall back to English on the server; there is no field-level merging and no invented production copy. Media translations fall back independently. Technology names/categories are structural; definitions and SEO are in `technologies_translations`.

Only published projects/technologies appear, including related technologies and used-in projects. The homepage lists every published project, not only featured records. Technology detail uses a forward projects-junction query and defensive membership validation. It never relies on a `technologies.projects` alias. The M2M metadata must retain null reverse technology alias and null junction sort fields, as documented and tested.

Project documentation uses the migrated v3 bodies: `overview`, `architecture`, `system_flow`, `engineering`, `implementation` and `interface`. All section headings and stack/source/live labels come from site settings translations. Architecture and system-flow diagrams are first-class assets. Supporting media is optional and renders only alongside authored interface documentation. Legacy problem/solution, decisions and lessons are retained in the schema but not rendered or mapped into new sections. Legacy biography, hero, availability, experience, education and CV contracts remain available for migration; active pages neither fetch nor render them.

## Status and validation

The live CMS is already migrated to System Index v3. Repository changes do not apply schemas, execute migration/seed packages or mutate live content. The frontend uses the existing v3 fields and global labels; no further schema migration is required by this change. Deployment still requires a correct site origin, existing public/read-only item permissions and public access to intended diagram/cover files. Missing content stays absent.

Tests cover the technical homepage, project documents, localized technology references, English/media fallback, publication/membership exclusions, M2M invariants, safe URLs/slugs, escaped text, image config and browser-bundle token isolation. The smoke test uses only a local mock CMS. `npm run test:smoke -- --preview` holds the fixture server open for manual browser review; stop it with Ctrl+C. No live CMS content is used for validation. The unused carousel component and utility have been removed.

The existing development dependency audit findings are outside this refactor; dependency versions and lockfile remain unchanged.
