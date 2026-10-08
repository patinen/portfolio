# PersonaCore draft case study

[content.json](content.json) is the maintainable FI/EN editorial payload. It supplies the summary, repository link, all six technical sections and SEO text. Bodies are plain text, with paragraph breaks; no HTML, invented screenshots or live-demo link. Existing global headings, schema, relation metadata and rendering remain unchanged.

## Offline review

`npm run cms:personacore`

This default validates and prints the payload without reading credentials or making HTTP requests. Technology slugs are unresolved targets, **not evidence of existing CMS records**. Review the content and adjust these slugs to the actual existing records before import: typescript, nextjs, nodejs, fastify, sqlite, docker. The importer requires exactly one published record per slug and never creates technologies. All are implemented technologies, but the CMS's actual names/IDs have not been queried.

## Later owner-run draft import

Use a short-lived, narrowly scoped setup credential supplied only to this shell process as DIRECTUS_SETUP_TOKEN. Do not put it in application configuration or a repository file. It needs schema reads and relevant item reads/create/update, not schema mutation or publishing.

1. Read-only target preflight: `npm run cms:personacore -- --url=https://YOUR-CMS-ORIGIN`
2. Draft import: `npm run cms:personacore -- --url=https://YOUR-CMS-ORIGIN --apply`
3. To deliberately replace nonempty payload-owned translation fields, add `--update-translations` to the reviewed command. Default behavior only fills null/empty fields. Existing nonempty source URLs are preserved.

The target must expose the already-applied v3 fields in projects, projects_translations, technologies and projects_technologies, plus languages en/fi. Preflight reads field definitions and language rows before writes; no schema extension is needed. Missing records/fields, duplicate slugs/translations, or an existing non-draft PersonaCore fail closed. The project is matched by stable slug personacore. New projects are explicitly draft; existing publication status is never changed.

Both complete project translation rows can be created because this package contains the complete active editorial contract for each language. This does not create site_settings translations or merge English fields into Finnish rows. Whole-row fallback remains unchanged. Parent fields outside slug/status/source on creation, existing nonempty source URLs, media and unrelated technology links remain untouched. Junction writes use projects_id/technologies_id directly, preserving the existing relationship metadata.

Writes are sequential and not a cross-request transaction. Run one importer at a time with editors paused. If a request fails partway, inspect the draft and rerun; already-created records/links are recognized. Database uniqueness constraints remain authoritative. Never publish or enable chat as part of import.

## Evidence and maintenance

Reviewed locally on 2026-10-08 against PersonaCore d532f44170e56ce4e4bfe7c25ec705923602c0df and portfolio feat/personacore-chat 57e656787aa200763ce1698d4dedf61ca6e94a6b.

Claims were checked against PersonaCore src/app.ts, src/providers/openai.ts, src/knowledge.ts, src/usage.ts, scripts/github-ingestion.ts and scripts/ingest-projects.ts, instructions and docs/project-ingestion.md; portfolio src/chat/proxy.ts, session.ts, contracts.ts and the inline panel. See the source tree for exact module paths. This is implementation/document review, not an audit, deployment verification or real-model evaluation.

On implementation changes, revise both translations and inspect the dry-run diff before explicit replacement. Do not copy test counts, context-size snapshots, costs, unverified benefits or security guarantees into public copy. Public activation and real-model evaluation are pending. No live CMS reads or writes were needed to prepare this package.

No covers, diagrams, gallery files, global labels or feature flags are imported. Existing CMS global section headings remain prerequisites for labelled sections. The draft stays invisible through the frontend's published-only contract until separately reviewed and published by the owner.

## Local validation (2026-10-08)

Node 22.17.1: lint and typecheck passed; the complete deterministic suite passed (60 tests). After correcting strict typing in the new tests, all five importer regressions were rerun successfully and the production build passed. The existing local-fixture smoke suite passed. The offline import preview passed without credentials or HTTP. Build used a localhost-only unavailable CMS address and chat disabled. No remote preflight/apply, real-model call or deployment was run.
