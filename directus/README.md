# Directus content contract

`schema/model.json` is a version-controlled bootstrap **specification**, not an importable Directus snapshot. It lists fields, translation pairs, unique constraints and relationships. Nothing in this repository applies it to the live CMS.

## Collections and relationships

- `languages`: string primary key `code`, seed `en` and `fi`.
- `site_settings`: singleton with structural URLs, email, files and availability. `site_settings_translations` owns all global copy, navigation and accessibility labels.
- `projects`: unique shared slug, draft/published/archived status, featured flag, sort order, dates, URLs, cover/hero/architecture files. `projects_translations` owns descriptions, fixed case-study sections, section headings, link labels, localized image alt and SEO fields.
- `technologies`: names, unique slug, category, sort order and optional icon. `projects_technologies` connects projects to technologies as M2M.
- `projects_files`: M2M junction from project to `directus_files`, reverse alias `gallery`, ordered by `sort_order`. Gallery images are decorative by contract (empty alt); put meaningful information in adjacent case-study copy. Cover, hero and architecture use localized alt fields.
- `experience`: organization, URL, dates, current flag and order; translations hold role, summary and description. Supports Psyches Royale Gaming / ALT Zone without seeded claims.
- `education`: organization, URL, dates, current flag and order; translations hold degree, field and summary.

Every translation collection has an integer ID, parent FK, `languages_code` M2O to languages, and a unique `(parent, languages_code)` pair. Add the parent `translations` O2M alias with the Directus translations interface. Translation body fields are **plain text**, not HTML; React escapes them and preserves line breaks. The frontend owns anchors/routes and the case-study layout. Navigation therefore needs no separate collection.

## Read permissions

Choose either anonymous public reads or a dedicated least-privilege server policy. Grant read only (no create/update/delete) for languages, site settings and translations, technologies, experience/education and translations. Projects must filter `status = published`; project translations and junction permissions must also filter through their parent project's published status. Grant only portfolio-related `directus_files` and asset reads, preferably restricting to a dedicated portfolio folder. Never expose all CMS files. Test both API items and `/assets/:id` anonymously: Next/Image must fetch assets without the private token.

If public item access is inappropriate, set `DIRECTUS_TOKEN` locally or in deployment secrets for a read-only policy with the same publication filters. It is imported through `server-only` modules and never included in `NEXT_PUBLIC_*`. Public asset access is still needed; no token is appended to asset URLs.

## Safe application workflow

1. Inspect the existing live schema read-only and back up the database/files outside this repository. Check collection-name collisions before proceeding.
2. Reproduce the deployed Directus version in an isolated staging instance. Review `model.json`, then create collections, fields, constraints and relationships there through the admin UI or a reviewed staging bootstrap.
3. Set translations interfaces, file interfaces, status default, unique slugs, gallery sorting and validation (valid dates, URL protocols, required project title). Seed only language codes; author real portfolio copy in CMS.
4. Export a **native** snapshot from staging with `npx directus schema snapshot ./snapshot.yaml`. Review against the contract and obtain a live schema diff using the deployed version's documented schema diff workflow. Do not feed `model.json` to schema apply.
5. Review additive and destructive changes, test permissions and localization in staging, and obtain explicit authorization before applying the reviewed native snapshot to production. Configure permissions separately; schema snapshots do not provide content or permission policies.
6. Publish real English and Finnish content. Set all accessibility labels, image alt, SEO and navigation fields. Preview `/en`, `/fi` and project pages before launch.

Missing CMS collections, unavailable requests and missing translations produce omitted sections rather than marketing fallback copy. A Finnish item with no Finnish translation fetches English on the server. Partially completed translations are not merged field by field: an existing Finnish row is authoritative. If neither language exists, absent copy stays absent.
