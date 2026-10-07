# Proposed PersonaCore chat CMS extension

This package is proposed and NOT applied. schema/model.json remains a v3 review specification, not a native Directus snapshot. Its proposed_extensions.personacore_chat documents pending additions separately; existing v3 collection definitions, relations, permissions and publication rules are preserved.

fields.json adds chat_enabled (boolean, default false) and clearly named chat_* text fields ONLY to site_settings_translations. seed.json contains reviewable Finnish and English copy, including examples, disclosure, accessibility labels and all visitor error states. Example questions are newline-separated text; at most three nonempty questions are normalized. No hardcoded editorial fallback is used. An explicitly enabled, complete translation row is required. Existing Finnish rows are authoritative; only an absent Finnish row falls back to the entire English row. Missing Finnish chat labels disable the panel rather than merging English fields.

## Apply later, never from normal application configuration

1. Review fields.json and both seed rows. Use a staging/local Directus copy first. Identify the actual site_settings singleton ID; do not assume production is ID 1.
2. Offline review (default, no requests or credentials read):
   `npm run cms:chat`
3. To inspect an explicit staging/local instance, supply a short-lived setup credential ONLY to the setup process with schema-field and site-translation read/write permissions:
   `DIRECTUS_SETUP_TOKEN=... npm run cms:chat -- --url=http://localhost:8055 --site-id=1`
   In PowerShell, set $env:DIRECTUS_SETUP_TOKEN for this process and remove it afterward. Do not put admin/setup credentials in .env, application config, NEXT_PUBLIC variables or source control. This agent did not read or use such credentials.
4. Inspect the dry-run plan. Explicit apply:
   `npm run cms:chat -- --url=http://localhost:8055 --site-id=1 --apply`
5. Re-run dry-run: no remaining changes should be planned. Existing nonempty content and previously explicit chat_enabled values are preserved; no relation metadata or existing fields are changed. Conflicting existing field types or duplicate translation rows fail for editorial review. The operation is sequential and not a global schema transaction; rerunning resumes safely after partial completion.
6. Ensure the existing least-privilege public/read-only policy can read these new translation fields ONLY. If the policy lists individual fields, extend that list with this package's fields. The command does not broaden permissions automatically. Preserve all existing parent publication filters, translation relations and asset policies.
7. Keep chat_enabled=false in both translation rows until secrets, private service, persistent limits and later model evaluation are complete. Then explicitly enable the reviewed rows in Directus and PERSONACORE_ENABLED/CHAT_ENABLED on the servers. Allow the existing 60-second content cache to refresh or restart.

Production content/field application remains an owner operation. No live Directus changes were made. Do not import model.json as a snapshot or rerun the already-applied v3 migration.
