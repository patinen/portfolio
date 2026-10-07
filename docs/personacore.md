# PersonaCore portfolio integration (Phase 2)

The System Index homepage adds a compact expandable panel near its introduction, preserving the carousel, technology index, document pages and palette. All editorial text, disclosure, accessibility labels, example questions and error messages comes from the selected Directus site_settings_translations row. See [the proposed CMS package](../directus/chat/README.md). Chat is off by default and absent when configuration or required CMS fields are incomplete; existing pages work against v3 CMS without the new fields.

## Server configuration

See .env.example. No variable below may use NEXT_PUBLIC:
- PERSONACORE_ENABLED=false by default.
- PERSONACORE_URL: private HTTP(S) origin with no credentials/path/query/fragment. Only the constructed /v1/chat endpoint is requested; redirects fail.
- PERSONACORE_ORIGIN: exact canonical browser origin, matching the site's actual URL. Public production origins require HTTPS. HTTP loopback is allowed solely for local production-fixture testing; production cookies remain Secure.
- PERSONACORE_BEARER_SECRET: random >=32 characters, matching PersonaCore CHAT_BEARER_SECRET.
- PERSONACORE_SESSION_SECRET: separate random >=32 characters; must differ from bearer secret.
- PERSONACORE_SESSION_SECONDS: 86400 by default, bounded 300–604800.
- PERSONACORE_TIMEOUT_MS: 25000 by default (service deadline 20000).

The same-origin POST /api/chat validates Origin and Sec-Fetch-* where present before reading/forwarding. These checks prevent cross-site browser use, not forged non-browser requests or session rotation. Neither the app nor the service assumes a trusted proxy/IP configuration or trusts X-Forwarded-For. The service must be network-private and exposed only to the portfolio server. Browser traffic cannot set a service URL, provider configuration, knowledge, system instructions or visitor ID in the request body.

The server bounds actual body bytes while reading (not Content-Length), validates locale/history/message, checks CMS availability, creates/verifies an HMAC-signed anonymous cookie, and constructs exactly Content-Type, Authorization and x-personacore-visitor upstream headers. Browser Authorization/identity/forwarding headers are never forwarded. Cookie identity uses 32 cryptographically random bytes, signed expiry and bounded lifetime; HttpOnly, SameSite=Strict and Secure in production, Path=/, no Domain. Tampered/malformed/duplicate tokens are rejected, never silently trusted. Valid expired tokens rotate. Clearing history does not delete or renew this cookie. An anonymous session is not a unique human.

The proxy uses an overall deadline across input, CMS lookup, fetch and bounded response reading; incoming cancellation aborts upstream. There are no generation retries. Responses must match a bounded shape, sources use credential-free HTTPS destinations, and internal metadata is stripped. Only {answer,sources} reaches the browser; no knowledge versions, tokens, debug metrics, API keys, cookie identity, bearer secret or private URL is returned. Raw provider/configuration errors are never exposed. Public errors contain codes only: rate_limited, daily_limit, unavailable, invalid_request, session_invalid, timeout or failed; visible messages come from CMS. Cache-Control: no-store applies to responses/errors. Development fake responses are refused by the public proxy.

Rotate bearer secrets together on both servers. Rotating the session secret invalidates old cookies, which must be cleared; new sessions can regain per-session allowance but the persistent aggregate limit is unaffected. The cookie secret is never shared with PersonaCore. Do not log tokens/cookies/transcripts. The proxy emits no conversation logs.

## Browser behavior and history

Messages/answers stay in browser component memory only: no localStorage, server transcript storage or navigation page. Opening/closing does not navigate or erase history. Start-new-conversation clears local messages/input only, preserving session usage. Pending requests disable duplicate sends/new-conversation and use a synchronous ref guard; unmount aborts the request. Enter sends; Shift+Enter inserts a newline; IME composition does not accidentally submit.

The rolling request window includes the most recent complete visitor/assistant turns, at most 12 messages and 16000 characters, each message at most 4000 characters. Older turns remain visible and CMS-authored text announces shortening. They are intentionally outside the transmitted window, never promoted into approved facts. A failed send retains the typed question and previous complete history. Source links render separately; answers are escaped plain text with line breaks, never HTML/Markdown.

Controls have labels, visible focus, a disclosure, separate speaker labels, polite live announcements, alert errors, mobile wrapping and reduced-motion styling. Browser visual/accessibility review still needs an available browser; local rendering/unit/smoke tests cannot substitute for that manual review.

## Limits and activation

PersonaCore defaults: aggregate 100 reserved model attempts/day, anonymous session 10/day, visitor rate 5/minute, aggregate private rate 30/minute, concurrency 4. Calendar reset is Europe/Helsinki. One SQLite-backed service instance and a persistent volume are required. Cookie deletion/rotation can evade only the per-session allowance, not the aggregate cap. This is an attempt allowance with bounded token output, not an exact currency cap. Failures/timeouts/disconnects retain reservations because upstream work may have incurred usage. Consult PersonaCore docs/public-demo.md for storage, retention, counters and backup settings.

Proxy/UI limits match PersonaCore default message/history/body/output limits. If you change service defaults, review src/chat/contracts.ts and both deadlines together. No public activation has occurred. First configure private ingress, persistent data volume and secrets, review/apply the CMS fields/copy, verify counters and perform a later explicitly authorized real-model evaluation.

Phase 3: approved owner context, evidence-backed skills, reviewed project-documentation ingestion and PersonaCore case study, expanded real-model/abuse evaluation, and the outstanding desktop/mobile visual and accessibility review. No booking, biography, contact form, CRM or email functionality was added.

The browser measures the exact serialized UTF-8 request, including escaping and the current question. It removes oldest complete turns until count, character and byte budgets fit; visible messages remain intact and the CMS shortening notice is shown. An invalid/unrepresentable current question is rejected locally without sending. Both server byte guards remain in force.
