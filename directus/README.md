# Directus content contract

**Content is data. Layout is code.** [schema/model.json](schema/model.json) is the canonical, version-controlled contract for collection names, fields, aliases, unique constraints, relations, interfaces and publication permission predicates. It is a reviewable declarative model, **not** an importable Directus snapshot. Repository runtime code uses read operations only; no live schema application or admin credentials are involved.

## Collections and relations

| Collection                   | Contract                                                                                                                                                                                                  |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `languages`                  | String primary key `code`; only `en` and `fi` are seeded.                                                                                                                                                 |
| `site_settings`              | Singleton with GitHub/LinkedIn URLs, email, CV file, availability flag and default OG image. All labels, navigation, hero/section text, accessibility labels and SEO are in `site_settings_translations`. |
| `projects`                   | Unique shared slug, publication status, featured flag, sort order, cover/hero/architecture files, `github_url` as canonical source URL, live URL, start/completion dates and ongoing flag.                |
| `projects_translations`      | Title, eyebrow, summary, fixed case-study body fields and matching headings; live/source labels; cover/hero/architecture alt; SEO. `key_decisions_intro` is the sole decisions body field.                |
| `technologies`               | Publication status, name, unique slug, category, sort order and optional `icon` file relation to `directus_files`. Structural and non-localized.                                                          |
| `projects_technologies`      | M2M junction; unique `(projects_id, technologies_id)`; projects reverse alias `technologies`.                                                                                                             |
| `project_media`              | O2M from `projects.media` through `project_id`; `file` M2O to `directus_files`, sort order and `decorative` flag defaulting to false. Inherits publication from its parent project.                       |
| `project_media_translations` | Parent `project_media_id`, language, localized `alt_text` and optional plain-text `caption`.                                                                                                              |
| `experience`                 | Publication status, organization, URL, start/end dates, current flag and sort order. Translations hold role, summary and description.                                                                     |
| `education`                  | Publication status, organization, URL, start/end dates, current flag and sort order. Translations hold degree, field and summary.                                                                         |

Experience and education have their own translation collections. No arbitrary navigation/page-builder collection exists: CMS labels use frontend-owned routes and anchors. Optional organization logos are not part of this phase's rendered contract.

## Translation and text semantics

Every translation collection has an integer primary key, parent FK, `languages_code` M2O to `languages`, and a unique `(parent, languages_code)` constraint. Parents expose the `translations` O2M alias using the Directus translations interface. Language codes remain `en` / `fi`, matching `/en`, `/fi` and their project routes; OG metadata uses regional locale identifiers separately.

Server queries request only the route language using [Directus deep parameters](https://docs.directus.io/reference/query). If a requested translation row is missing, the server fetches English and matches parent records by ID. Gallery media translates independently: missing Finnish media rows fall back by media ID even when the project already has Finnish copy. An existing requested row remains authoritative, without field-level English merging. Missing both rows leaves missing copy; untitled projects are omitted. English-only records are never added to the requested structural result. A failed English fallback preserves valid requested rows.

All editorial fields are **plain text**: use Directus `text` storage with `input` for short labels or `input-multiline` (textarea) for body/summary fields. Do not use HTML/WYSIWYG interfaces for about/contact body, case-study body fields, experience description or summaries. React escapes content; prose CSS preserves line breaks. Captions use the same safe plain-text rendering. CMS HTML is displayed literally, never interpreted.

## Localized project media

The API selection is `media.id`, `media.file`, `media.sort_order`, `media.decorative`, `media.translations.*`. The content layer sorts by `sort_order`, then ID, and emits only `{ url, alt, caption? }` into `ProjectDetail.gallery`. Components see no Directus nesting. Captions render in semantic figure/figcaption markup within the existing gallery layout.

For a meaningful image (`decorative = false`), provide nonblank translated `alt_text`, or an English media translation for fallback. If neither supplies alt, the image is omitted instead of inventing alt or silently treating it as decorative. Set `decorative = true` deliberately to render empty alt; no translation is required, and a translated caption may still render. Missing captions remain absent. Cover, hero, architecture and OG alt fields retain their existing project/site translation ownership.

## Publication and read permissions

`projects`, `technologies`, `experience` and `education` all use `draft | published | archived`, defaulting to `draft`. Public frontend reads require `status = published`. Featured work additionally requires `featured = true`; detail reads require the requested shared slug. Technology junctions use a deep filter through `technologies_id.status`; normalization also discards anything not explicitly published. Top-level response validation excludes non-published records defensively, even if a server ignores the query filter. A project's media has no separate status and inherits its parent's publication.

Use anonymous reads or a dedicated least-privilege server policy, with **read only**, and mirror the model's `public_read_filter` predicates:

- Site singleton, site translations and language codes: read the required fields. These have no publication status; write access itself is their publication boundary.
- Projects, technologies, experience and education: only `status = published`.
- Project/experience/education translations: constrain through their parent's status, including direct translation-collection reads.
- Technology junction: both project and technology must be published.
- Media: `project_id.status = published`; media translations: `project_media_id.project_id.status = published`. Protect direct media reads as well as nested relations.
- `directus_files` and `/assets/:id`: permit only intentionally public portfolio files. A folder allowlist alone is not enough if drafts/private files share that folder; curate published assets or enforce an equivalent file policy. File URLs bypass frontend item filtering, so never grant blanket CMS-file reads.

If item reads require a token, set private `DIRECTUS_TOKEN` for that same read-only policy. `server-only` imports protect it from the client bundle; never use an admin token or `NEXT_PUBLIC_DIRECTUS_TOKEN`. Browser code makes no CMS requests. Next/Image still needs anonymous access to public assets; tokens are never appended to asset URLs.

## Safe schema application workflow

1. Review the canonical model, check collection collisions and back up the CMS separately. No repository command applies this model or performs a live mutation.
2. Create the model in an isolated staging instance matching the deployed Directus version, through the admin UI or a separately reviewed bootstrap/template. Configure the explicit aliases, translation interfaces, multiline text interfaces, status defaults, unique constraints and file relations.
3. If replacing a previous gallery/source contract, migrate file references and author media translations in staging before retiring old fields or collections. Do not automatically delete live data. Existing technologies, experience and education need an editorial status review; new status fields default to draft.
4. Export a native staging snapshot with `npx directus schema snapshot ./snapshot.yaml`; review the deployed version's native schema diff. Never feed `model.json` to schema apply. Generate/apply the actual import/template separately.
5. Review the schema diff and permission policies explicitly before any production application. Native schema snapshots do not seed content or install permission policies. Test anonymous item/asset reads and a least-privilege server policy in staging, including draft/archived parent and relation exclusions.
6. Seed `en` / `fi`, author real labels/case studies/media metadata, publish approved records and preview both route locales. Run repository validation and the local mock-CMS smoke test before launch.

Schema application, data migration, permission setup and editorial publishing remain manual. This alignment pass does not contact or mutate the live Directus instance.
