# System Index: CMS contract

The live CMS has already been migrated to System Index v3. This document describes the read contract consumed by the frontend. The site is a technical project and technology index. It intentionally does not function as a CV or personal biography. **Content is data. Layout is code.** [schema/model.json](schema/model.json) owns collection/field names, aliases, unique constraints, relationship metadata, interfaces and public permission predicates. It is a reviewable declarative specification, **not** an importable native snapshot. Application code performs server-side reads only.

## Active model

| Collection                   | Contract                                                                                                                                                                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `languages`                  | String primary key `code`, seeded only with `en` and `fi`.                                                                                                                                                                                |
| `site_settings`              | Singleton with GitHub/LinkedIn URLs, email and default OG image. Existing CV/availability fields remain migration-only.                                                                                                                   |
| `site_settings_translations` | Site identity/intro; Projects/Stack/Contact navigation and section labels; stack intro; contact/footer copy; global link/accessibility labels; technology category/definition/used-in labels; SEO/OG alt. No frontend label is hardcoded. |
| `projects`                   | Published status, unique shared slug, sort order, ongoing flag/dates, source/live URLs and cover/hero/architecture files. `featured` remains structural but no longer limits the homepage index.                                          |
| `projects_translations`      | Title/technical summary, technical document fields/headings, status/stack/source/live labels, localized image alt and SEO.                                                                                                                |
| `technologies`               | UUID ID, status, name, unique slug, category, sort order, optional file icon. Names/categories/icons remain structural.                                                                                                                   |
| `technologies_translations`  | Integer ID, `technologies_id` UUID, `languages_code` string, plain-text `definition`, `seo_title`, `seo_description`; unique `(technologies_id, languages_code)`.                                                                         |
| `projects_technologies`      | M2M junction with project/technology IDs and a unique pair; exact relation metadata below.                                                                                                                                                |
| `project_media`              | `project_id`, `file`, sort order and explicit decorative flag; O2M alias `projects.media`. Publication is inherited from its project.                                                                                                     |
| `project_media_translations` | Localized alt/caption through `project_media_id` and `languages_code`.                                                                                                                                                                    |

`technologies_translations.technologies_id` relates to `technologies.id`, with the reverse `translations` alias and Directus translations interface. `languages_code` relates to `languages.code`. Other translation collections follow the same parent/language pattern. Every translation pair is unique.

## Exact projects / technologies M2M metadata

These values preserve the manually debugged live relation. Do not add a technology reverse project alias or use `sort_order` as a junction sort field; the earlier configurations caused item-detail reads to return 403.

| Relation field                          | one_collection | one_field      | junction_field    | sort_field |
| --------------------------------------- | -------------- | -------------- | ----------------- | ---------- |
| `projects_technologies.projects_id`     | `projects`     | `technologies` | `technologies_id` | `null`     |
| `projects_technologies.technologies_id` | `technologies` | `null`         | `projects_id`     | `null`     |

The project alias is `technologies`. There is **no** `technologies.projects` alias. Used-in projects are read via an explicit published-project filter through `projects.technologies.technologies_id.id`, then checked against normalized published technology membership. Item ordering uses parent collection `sort_order`, separately from relation metadata.

## Fixed technical documents and media

All headings and metadata labels are global fields in `site_settings_translations`; per-project heading/link labels are deprecated and never rendered.

| Section position          | Project body     | Global heading                   |
| ------------------------- | ---------------- | -------------------------------- |
| 01 Overview               | `overview`       | `project_overview_heading`       |
| 02 Architecture           | `architecture`   | `project_architecture_heading`   |
| 03 System flow            | `system_flow`    | `project_system_flow_heading`    |
| 04 Security / engineering | `engineering`    | `project_engineering_heading`    |
| 05 Implementation         | `implementation` | `project_implementation_heading` |
| 06 Interface              | `interface`      | `project_interface_heading`      |

Stack/source/live metadata uses `project_stack_label`, `project_source_label`, `project_live_label`. Technology reference labels use `technology_category_label`, `technology_definition_label`, `technology_used_in_label`. Missing labels never trigger frontend fallback copy.

Sections render only when their body or semantic diagram exists. Architecture uses `architecture_image`; system flow uses `system_flow_image`, each with localized `architecture_alt` / `system_flow_alt`. Diagrams can render without text and use full-width contained image presentation. Covers remain secondary index artwork. Hero images are no longer rendered.

`project_media` remains optional: records alone never cause a gallery/interface section. Media renders only as supporting figures when the v3 `interface` body exists. Screenshots are not required for any route. Media normalizes into `{ url, alt, caption? }`, sorted by media order then ID. Meaningful images need localized alt or English fallback; otherwise they are omitted. Explicit decorative images permit empty alt. Captions remain escaped plain text. No substitute images are generated.

Legacy problem/solution, `architecture_intro`, key decisions, lessons, `interface_intro` and all per-project headings are not mapped into the new document. CMS authors retain full ownership of technical prose.

## Locale and text behavior

Canonical routes use `/en`, `/fi`, their project detail routes and `/[locale]/stack/[slug]`. Queries select only the requested language. Missing translation rows trigger a server-side English request and merge by record ID; an existing requested row remains authoritative with no field-level merging. Media fallback works independently. Missing both translations never invents copy: technologies retain structural names/categories but omit definitions; untitled projects are omitted. Invalid locales/slugs and unpublished/missing detail records return 404.

Store editorial fields as `text`, using short-text input or `input-multiline`/textarea. Do not use HTML/WYSIWYG for definitions, intros, technical document body or captions. React escapes content and prose CSS preserves line breaks; CMS HTML is displayed literally. SEO remains CMS-derived with locale-aware canonical/alternate metadata.

## Public reads and private tokens

Projects and technologies must have `status = published`, using draft/published/archived with draft default. Queries and normalization enforce publication defensively. Retained experience/education collections still have their existing publication contract, although active pages do not request them.

Read-only permissions must also constrain direct relation reads:

- Project and technology translations: through their parent's published status, including `technologies_translations.technologies_id.status = published`.
- Project/technology junction: both parent records must be published.
- Project media and translations: through `project_id.status` or `project_media_id.project_id.status`.
- Singleton, singleton translations and languages: read only the intended public fields.
- `directus_files` and `/assets/:id`: allow only intentionally public files. Draft/private assets must not be accessible merely because they share a portfolio folder. Asset URL access is separate from item publication filters.

Use public item reads or private `DIRECTUS_TOKEN` with the same least-privilege read-only policy. Never use admin credentials or a public token variable. SDK access remains server-only; browser code receives normalized models. Next/Image requires anonymous public asset access; tokens are never put in image URLs or client bundles.

## Existing migration and operational setup

The v3 migration has already been applied. This frontend update does not re-run migration scripts, inspect admin credentials, apply schemas or write live content. The repository model documents active fields and retains deprecated field/collection definitions for historical compatibility; it is not a native schema snapshot.

Experience/education, old hero/about/CV/availability fields and per-project headings remain in CMS. Active pages do not query/render personal collections or legacy sections. The carousel component and its unused utility are removed.

No new manual schema application is required for this frontend change. Verify existing read policies for projects, technologies, translations, the forward technology junction and optional media. Ensure intended covers/diagrams are anonymously accessible to Next/Image, configure the public deployment origin, and verify that the migrated global labels and definitions exist in both languages. Existing migration/seed packages are left untouched.

Technology logo color is structural: `technologies.brand_color` is a nullable string containing exactly `#RRGGBB`. The frontend accepts uppercase/lowercase hex digits and treats missing or invalid values as the site accent. Monochrome icons use the existing normalized Directus asset URL as a CSS alpha mask; no SVG markup is fetched or injected by JavaScript. Browser mask requests require anonymously readable assets and cross-origin access from the portfolio origin. The local review model documents this field; this frontend change does not apply migrations or mutate live content.
