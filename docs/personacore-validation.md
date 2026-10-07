# PersonaCore Phase 2 validation — 2026-10-08

Started from clean reviewed baseline 4f28faa0f0af8f8c9b457df80f870c3338b539bb. No applicable AGENTS.md was found. Existing carousel, technology index and documentation layout remain in place.

| Check | Actual result |
| --- | --- |
| Node / npm | v22.17.1 / 10.9.2 |
| npm run lint | Passed |
| npm run typecheck | Passed |
| npm test | 52 passed, 0 failed |
| Production build | Passed with feature disabled and a local unreachable CMS URL; no production CMS requests |
| Existing and extended local-fixture smoke | Passed |
| npm run cms:chat | Passed in default offline dry-run mode; no credentials read or HTTP requests |
| Browser visual/accessibility review | Unavailable: enabled-surface inventory contained no browsers; Chrome and in-app browser creation were unavailable |
| Paid model calls / production CMS changes | None |

Tests cover signed sessions and tampering, identity/header spoofing, production configuration, strict input and streamed byte limits, origin/fetch metadata checks, cancellation/deadlines, upstream size/schema/source checks, sanitization, feature-off and incomplete CMS labels, whole-row English fallback, bounded history, escaped answer rendering, source links and Finnish/English copy. CMS planning checks idempotence and preservation of existing content.

The production-server smoke suite uses local CMS and upstream fixtures only. It runs the existing portfolio checks, verifies disabled chat, enables complete fixture content, exercises Finnish and English chat, validates the server bearer/visitor headers, confirms the same cookie retains allowance after an empty-history new conversation, rejects foreign Origin, checks missing labels hide the panel, and searches rendered pages/browser assets for synthetic secrets. Its upstream responses are deterministic fixtures, not real AI.

Accessible labels, focus styles, live announcements, plain-text rendering, reduced-motion and mobile styles were implemented and covered where practical by deterministic rendering checks. Desktop/mobile visual layout, keyboard interaction and screen-reader review still need a usable browser before activation; those checks are not claimed as passed.

The CMS package is a proposed extension, not an applied schema or an importable native snapshot. Feature enablement, CMS application, secrets, persistent service volume and real-model evaluation remain operator tasks. No commit, push or deployment occurred.
