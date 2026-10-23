# System Index

A technical project and technology index for software systems, architecture and implementation documentation. It intentionally does not function as a CV or personal biography. **Content is data. Layout is code.** The working identity and all visible copy are authored in Directus, not embedded in frontend source.

## Develop

Node 22. Copy `.env.example` to `.env.local`, run `npm ci`, then `npm run dev`. `/` redirects to `/en`. Validate with `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, then `npm run test:smoke`.

| Variable               | Purpose                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `DIRECTUS_URL`         | Server-only CMS origin, default `https://cms.pat1.online`                                  |
| `DIRECTUS_TOKEN`       | Optional private read-only token; never an admin credential or public environment variable |
| `NEXT_PUBLIC_SITE_URL` | Absolute site origin for canonical and alternate metadata                                  |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Server-only authenticated Gmail SMTP settings (`smtp.gmail.com`, `465`, and a Google App Password) |
| `SMTP_FROM` / `QUOTE_TO_EMAIL` | Authenticated sender and inquiry recipient; `SMTP_FROM` must be permitted by the Gmail account |
| `REDIS_URL` / `QUOTE_RATE_LIMIT_SECRET` / `QUOTE_TRUST_PROXY` | Existing persistent Redis connection, a random hashed-IP secret, and explicit trusted-proxy acknowledgement |

## Structure

- `/en`, `/fi`: compact CMS introduction, published project index, published technology index, minimal contact references.
- `/[locale]/projects/[slug]`: overview, architecture, system flow, security/engineering, implementation and interface. Empty sections are omitted; screenshots and diagrams come from CMS assets.
- `/[locale]/stack/[slug]`: technology name/category, localized technical definition and published projects using it.
- `/fi/tarjouspyynto`, `/en/quote-request`: Directus-authored quote request pages; delivery is server-only Gmail SMTP.
- `/fi/tietosuoja`, `/en/privacy`: Directus-authored privacy policy pages.
- `src/content/`: server-only Directus access, validated normalization and whole-row locale fallback; components receive simple typed models.
- `src/components/`: responsive project/technology indexes, metadata rows and semantic document sections. The circular project carousel uses CMS labels, arrow keys and horizontal swipes; inactive slides are inert. Technology cards flip on desktop hover/focus and show definitions directly on touch, narrow screens and reduced motion.
- `directus/schema/model.json`: canonical reviewable CMS specification; it is not a native importable snapshot.

Next.js App Router, React, TypeScript, Tailwind and the Directus SDK retain the charcoal foundation. Images use Next/Image with CMS asset remote patterns; screenshots are contained rather than cropped. Motion is limited to 180ms link-color transitions and respects reduced motion. All editorial fields remain escaped plain text.

## CMS and localization

[Directus setup](directus/README.md) documents the full contract, permissions and safe application workflow. Route language codes remain `en` and `fi`. Missing requested translation rows fall back to English on the server; there is no field-level merging and no invented production copy. Media translations fall back independently. Technology names/categories are structural; definitions and SEO are in `technologies_translations`.

Only published projects/technologies appear, including related technologies and used-in projects. The homepage lists every published project, not only featured records. Technology detail uses a forward projects-junction query and defensive membership validation. It never relies on a `technologies.projects` alias. The M2M metadata must retain null reverse technology alias and null junction sort fields, as documented and tested.

Project documentation uses the migrated v3 bodies: `overview`, `architecture`, `system_flow`, `engineering`, `implementation` and `interface`. All section headings and stack/source/live labels come from site settings translations. Architecture and system-flow diagrams are first-class assets. Supporting media is optional and renders only alongside authored interface documentation. Legacy problem/solution, decisions and lessons are retained in the schema but not rendered or mapped into new sections. Legacy biography, hero, availability, experience, education and CV contracts remain available for migration; active pages neither fetch nor render them.

## Status and validation

The live CMS is already migrated to System Index v3. Repository changes do not apply schemas, execute migration/seed packages or mutate live content. The frontend uses the existing v3 fields and global labels; no further schema migration is required by this change. Deployment still requires a correct site origin, existing public/read-only item permissions and public access to intended diagram/cover files. Missing content stays absent.

Tests cover the technical homepage, project documents, localized technology references, English/media fallback, publication/membership exclusions, M2M invariants, safe URLs/slugs, escaped text, image config and browser-bundle token isolation. The smoke test uses only a local mock CMS. `npm run test:smoke -- --preview` holds the fixture server open for manual browser review; stop it with Ctrl+C. No live CMS content is used for validation. Carousel navigation utilities are tested for circular indices and shortest offsets, keyboard direction and swipe thresholds.

The existing development dependency audit findings are outside this refactor; dependency versions and lockfile remain unchanged.

## Coolify deployment

Use one Node.js web service with **Coolify / Nixpacks**, repository base directory `/` (the portfolio repository root). Node selection is constrained to `>=22 <23` in `package.json`; no Dockerfile or custom Nixpacks configuration is required.

| Setting         | Value                                                    |
| --------------- | -------------------------------------------------------- |
| Install command | `npm ci`                                                 |
| Build command   | `npm run build`                                          |
| Start command   | `npm run start`                                          |
| Health check    | HTTP `GET /health`, expected status `200`                |
| Service port    | Match the platform-supplied `PORT`, or `3000` when unset |

`next start` binds to `0.0.0.0` and honors `PORT` from the process environment. Configure the same internal port for Coolify routing and health checks. Use the Node web service rather than a static-site deployment; no standalone output is needed. `/` redirects to `/en`.

Configure these environment variables in Coolify:

- `DIRECTUS_URL=https://cms.pat1.online`: available **at build time and runtime**. Next/Image remote patterns are generated from this URL during the build. Use the public HTTPS CMS origin without credentials.
- `NEXT_PUBLIC_SITE_URL`: the final **HTTPS portfolio origin**, available **at build time and runtime**. It supplies canonical, alternate and OpenGraph URLs; the local development fallback must not be used in production. Set the actual deployment origin rather than copying a placeholder domain.
- `DIRECTUS_TOKEN`: optional, **runtime/server-only**. Normally leave it unset when public reads suffice. If needed, use a narrowly scoped read-only token, never an admin credential and never a `NEXT_PUBLIC_` variable. Do not put secrets in repository files.
- `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` and `QUOTE_TO_EMAIL`: server-only Gmail SMTP. Create a Google App Password for the account (with 2-Step Verification enabled), store it only in Coolify, set `SMTP_FROM` to the authenticated/permitted sender, and set the visitor's address only as Reply-To.
- `REDIS_URL`, `QUOTE_RATE_LIMIT_SECRET`, `QUOTE_TRUST_PROXY=true`: connect to an existing Coolify Redis service for shared, persistent rate limiting. Prefer a TLS `rediss://` URL; a private `redis://` service-network URL is acceptable only when it is not publicly reachable. The request IP is hashed with the secret and permits at most five requests per hour. Configure Coolify/the ingress proxy to strip user-provided forwarding headers before adding its own, then explicitly set `QUOTE_TRUST_PROXY=true`. Submission is refused when Redis, proxy trust, or another required configuration is unavailable; there is no process-memory fallback.

The quote-request API never stores submissions. It validates every field with Zod, bounds its raw body, includes an inaccessible-to-users honeypot, sends over authenticated TLS SMTP with bounded connection/socket timeouts, and returns success only after Nodemailer accepts the message. Do not set any of these values with a `NEXT_PUBLIC_` prefix.

## Directus addition required before release

The feature branch updates `directus/schema/model.json` only; it does not call or change the live CMS. Add the documented `site_settings_translations` fields in both languages, using plain text/multiline inputs. Populate the service section, three service cards, quote form labels/options/messages, quote/privacy SEO, footer privacy link, and the full privacy policy body. Leave fields blank to hide their optional corresponding content safely.

Before publishing the policy, the owner must review and provide the actual controller identity/contact, processing purposes/legal bases, SMTP/Google and Upstash processor details, retention/deletion period, applicable transfer information, data-subject rights and supervisory authority, plus confirmation of cookies/third-party integrations. These facts are intentionally not invented in this repository.

Production Directus CORS must allow the final portfolio origin: technology SVG masks are fetched by the browser directly from `cms.pat1.online`. Intended mask, cover and diagram assets must be publicly readable; private server tokens are never added to asset URLs.

`/health` returns only `{ "status": "ok" }` with `Cache-Control: no-store`. It checks the Next.js process/router without querying Directus. CMS reads retain a five-second timeout, 60-second revalidation and graceful empty-content fallback. A healthy process does not guarantee that the CMS permissions, CORS or final domain are configured correctly.

References: [Nixpacks Node selection](https://nixpacks.com/docs/providers/node), [Next.js server CLI](https://nextjs.org/docs/app/api-reference/cli/next), [Coolify Nixpacks deployment](https://coolify.io/docs/applications/builds/nixpacks/deploy).
