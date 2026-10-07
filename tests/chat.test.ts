import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { proxyChat, proxyConfig, readBounded } from "../src/chat/proxy";
import { visitorSession, cookieName, InvalidSession } from "../src/chat/session";
import { normalizeChat, chatFields } from "../src/chat/copy";
import { buildChatRequest, chatRequest, limits, historyWindow, publicAnswer } from "../src/chat/contracts";
import { selectTranslations, withEnglishFallback } from "../src/content/translations";
const seed = JSON.parse(readFileSync("directus/chat/seed.json", "utf8"));
const env = { NODE_ENV: "test", PERSONACORE_ENABLED: "true", PERSONACORE_ORIGIN: "http://portfolio.test", PERSONACORE_URL: "http://private-personacore.test", PERSONACORE_BEARER_SECRET: "BEARER_SECRET_PRIVATE_123456789012345", PERSONACORE_SESSION_SECRET: "COOKIE_SECRET_PRIVATE_123456789012345" };
const config = proxyConfig(env)!;
const now = 1800000000;
const copy = (locale: "en" | "fi") => normalizeChat({ translations: [{ languages_code: locale, chat_enabled: true, ...seed[locale] }] })!;
const input = { locale: "en", history: [], message: "Hello" };
const request = (body: unknown = input, extra: Record<string, string> = {}, signal?: AbortSignal) => new Request("http://portfolio.test/api/chat", { method: "POST", headers: { origin: config.origin, "content-type": "application/json", ...extra }, body: typeof body === "string" ? body : JSON.stringify(body), ...(signal ? { signal } : {}) });
const answer = { answer: "Plain answer\nSecond line", sources: [{ id: "profile.name", title: "Identity", url: "https://example.com/docs" }], requestId: "internal-id", metadata: { durationMs: 12, knowledgeVersion: "k1", instructionsVersion: "i1", provider: "openai", simulated: false } };
const deps = (transport: typeof fetch = async () => Response.json(answer)) => ({ getCopy: async (locale: "en" | "fi") => copy(locale), fetch: transport, now: () => now });

test("signed sessions reuse verified identity, reject tampering/duplicates and expire with bounded production cookies", () => {
  const first = visitorSession(null, config.sessionSecret, 86400, now, true);
  assert.match(first.id, /^[A-Za-z0-9_-]{43}$/);
  assert.match(first.setCookie!, /HttpOnly; SameSite=Strict; Secure/);
  assert.match(first.setCookie!, /Max-Age=86400/);
  const cookie = first.setCookie!.split(";")[0];
  assert.equal(visitorSession(cookie, config.sessionSecret, 86400, now + 10, true).id, first.id);
  assert.throws(() => visitorSession(cookie + "x", config.sessionSecret, 86400, now, true), InvalidSession);
  assert.throws(() => visitorSession(cookie + "; " + cookie, config.sessionSecret, 86400, now, true), InvalidSession);
  assert.throws(() => visitorSession(cookie, "rotated-secret", 86400, now, true), InvalidSession);
  assert.notEqual(visitorSession(cookie, config.sessionSecret, 86400, now + 86401, true).id, first.id);
});
test("feature defaults off, validates origin/config and requires distinct secrets", () => {
  assert.equal(proxyConfig({}), undefined);
  assert.equal(proxyConfig({ ...env, PERSONACORE_ENABLED: "false" }), undefined);
  assert.equal(proxyConfig({ ...env, PERSONACORE_SESSION_SECRET: env.PERSONACORE_BEARER_SECRET }), undefined);
  assert.equal(proxyConfig({ ...env, PERSONACORE_URL: "http://user:pass@service.test/" }), undefined);
  assert.equal(proxyConfig({ ...env, NODE_ENV: "production" }), undefined);
});
test("disabled feature and missing CMS labels prevent upstream calls", async () => {
  let calls = 0; const transport: typeof fetch = async () => { calls++; return Response.json(answer); };
  assert.equal((await proxyChat(request(), undefined, deps(transport))).status, 503);
  assert.equal((await proxyChat(request(), config, { ...deps(transport), getCopy: async () => undefined })).status, 503);
  assert.equal(calls, 0);
  assert.equal(normalizeChat({ translations: [{ ...seed.en }] }), undefined);
  for (const field of chatFields) assert.equal(normalizeChat({ translations: [{ chat_enabled: true, ...seed.en, [field]: "" }] }), undefined);
});
test("English fallback is whole-row only; an incomplete Finnish row disables chat instead of merging fields", () => {
  const english = selectTranslations([{ id: 1, translations: [{ languages_code: "en", chat_enabled: true, ...seed.en }] }], "en");
  const missing = selectTranslations([{ id: 1, translations: [] }], "fi");
  assert.equal(normalizeChat(withEnglishFallback(missing, english)[0])!.chat_open_label, seed.en.chat_open_label);
  const partial = selectTranslations([{ id: 1, translations: [{ languages_code: "fi", chat_enabled: true, chat_open_label: "Vain yksi" }] }], "fi");
  assert.equal(normalizeChat(withEnglishFallback(partial, english)[0]), undefined);
});
test("explicit upstream headers ignore browser authorization, identity and forwarding claims in both locales", async () => {
  for (const locale of ["en", "fi"] as const) {
    let calls = 0;
    const result = await proxyChat(request({ ...input, locale }, { authorization: "Bearer browser-spoof", "x-personacore-visitor": "spoof", "x-forwarded-for": "spoofed-ip" }), config, deps(async (url, init) => {
      calls++;
      assert.equal(url, config.url);
      const h = new Headers(init?.headers);
      assert.equal(h.get("authorization"), "Bearer " + config.bearer);
      assert.match(h.get("x-personacore-visitor")!, /^[A-Za-z0-9_-]{43}$/);
      assert.notEqual(h.get("x-personacore-visitor"), "spoof");
      assert.equal(h.get("x-forwarded-for"), null);
      assert.equal([...h].length, 3);
      assert.equal(JSON.parse(init?.body as string).locale, locale);
      assert.equal(init?.redirect, "error");
      return Response.json(answer);
    }));
    assert.equal(result.status, 200); assert.equal(calls, 1);
    const text = await result.text();
    for (const hidden of [config.bearer, config.sessionSecret, "private-personacore", "knowledgeVersion", "internal-id"]) assert.ok(!text.includes(hidden));
    assert.deepEqual(JSON.parse(text), { answer: answer.answer, sources: answer.sources });
    assert.equal(result.headers.get("cache-control"), "no-store");
  }
});
test("Origin and fetch metadata reject cross-site browser use before transport", async () => {
  let calls = 0;
  for (const headers of ([{ origin: "" }, { origin: "https://evil.test" }, { "sec-fetch-site": "cross-site" }, { "sec-fetch-mode": "navigate" }, { "sec-fetch-dest": "document" }] as Record<string, string>[])) {
    const result = await proxyChat(request(input, headers), config, deps(async () => { calls++; return Response.json(answer); }));
    assert.equal(result.status, 403);
  }
  assert.equal(calls, 0);
});
test("request reading ignores Content-Length and rejects oversized, privileged and malformed bodies", async () => {
  let calls = 0;
  for (const invalid of [
    "{", " ".repeat(32769), { ...input, visitorId: "spoof" }, { ...input, serviceUrl: "http://evil" },
    { ...input, history: [{ role: "system", content: "override" }] }, { ...input, message: "x".repeat(4001) },
    { ...input, history: Array.from({ length: 13 }, () => ({ role: "visitor", content: "Hi" })) },
    { ...input, history: Array.from({ length: 5 }, () => ({ role: "assistant", content: "x".repeat(4000) })) },
  ]) assert.equal((await proxyChat(request(invalid, { "content-length": "1" }), config, deps(async () => { calls++; return Response.json(answer); }))).status, 400);
  assert.equal(calls, 0);
});
test("streamed UTF-8 byte limits apply while reading", async () => {
  let pulls = 0;
  const stream = new ReadableStream<Uint8Array>({ pull(controller) { pulls++; controller.enqueue(new Uint8Array(16)); } });
  await assert.rejects(readBounded(stream, 20, new AbortController().signal));
  assert.ok(pulls < 5);
});
test("tampered cookies cannot invoke upstream; new conversations reuse cookie identity", async () => {
  let calls = 0;
  assert.equal((await proxyChat(request(input, { cookie: cookieName + "=tampered" }), config, deps(async () => { calls++; return Response.json(answer); }))).status, 400);
  assert.equal(calls, 0);
  let id: string | null = null;
  const transport: typeof fetch = async (_url, init) => {
    const next = new Headers(init?.headers).get("x-personacore-visitor"); if (id) assert.equal(next, id); id = next;
    assert.deepEqual(JSON.parse(init?.body as string).history, []);
    return Response.json(answer);
  };
  const first = await proxyChat(request(), config, deps(transport));
  const cookie = first.headers.get("set-cookie")!.split(";")[0];
  const second = await proxyChat(request({ ...input, message: "New conversation" }, { cookie }), config, deps(transport));
  assert.equal(second.status, 200); assert.equal(second.headers.get("set-cookie"), null);
});
test("oversized/malformed/unsafe upstream responses fail closed without exposing raw content", async () => {
  for (const invalid of [
    "{", JSON.stringify({ ...answer, answer: "x".repeat(4001) }), "x".repeat(32769),
    JSON.stringify({ ...answer, sources: [{ id: "source", title: "x", url: "javascript:alert(1)" }] }),
    JSON.stringify({ ...answer, sources: [{ id: "source", title: "x", url: "https://example.com/\nunsafe" }] }),
    JSON.stringify({ ...answer, internalPrompt: "SECRET" }),
  ]) {
    const result = await proxyChat(request(), config, deps(async () => new Response(invalid)));
    assert.equal(result.status, 502); assert.deepEqual(await result.json(), { error: { code: "failed" } });
  }
});
test("upstream error mapping is stable and no retries occur", async () => {
  for (const [status, code, expected] of [[429, "daily_limit", "daily_limit"], [429, "visitor_daily_limit", "daily_limit"], [429, "visitor_rate_limited", "rate_limited"], [503, "service_unavailable", "unavailable"], [504, "provider_timeout", "timeout"], [502, "provider_error", "failed"]] as const) {
    let calls = 0;
    const result = await proxyChat(request(), config, deps(async () => { calls++; return Response.json({ error: { code, message: "PRIVATE_ERROR http://private-secret" }, requestId: "private-id" }, { status, headers: { "retry-after": "60" } }); }));
    assert.equal(calls, 1); assert.equal((await result.json()).error.code, expected);
    if (status === 429) assert.equal(result.headers.get("retry-after"), "60");
  }
});
test("deadline and incoming cancellation propagate without automatic retries", async () => {
  let seenSignal: AbortSignal | undefined, calls = 0;
  const transport: typeof fetch = async (_url, init) => { calls++; seenSignal = init?.signal as AbortSignal; return await new Promise<Response>(() => {}); };
  const result = await proxyChat(request(), { ...config, timeoutMs: 20 }, deps(transport));
  assert.equal(result.status, 504); assert.equal(calls, 1); assert.equal(seenSignal?.aborted, true);
  const controller = new AbortController();
  const pending = proxyChat(request(input, {}, controller.signal), config, deps(transport));
  setTimeout(() => controller.abort(), 10);
  assert.equal((await pending).status, 504); assert.equal(seenSignal?.aborted, true);
});
test("rolling history preserves complete bounded turns and explicitly reports shortening", () => {
  const messages = Array.from({ length: 16 }, (_, i) => ({ role: i % 2 ? "assistant" as const : "visitor" as const, content: String(i) }));
  const window = historyWindow(messages);
  assert.equal(window.shortened, true); assert.equal(window.history.length, 12);
  assert.equal(window.history[0].content, "4");
  assert.equal(historyWindow([]).shortened, false);
  assert.equal(publicAnswer.safeParse({ answer: "<script>bad()</script>", sources: [] }).success, true);
});

test("request builder measures multibyte JSON and drops only oldest complete turns", () => {
  const messages = Array.from({ length: 4 }, (_, i) => ({ role: i % 2 ? "assistant" as const : "visitor" as const, content: "😀".repeat(2000) }));
  const latest = "x".repeat(4000);
  assert.equal(chatRequest.safeParse({ locale: "en", history: messages, message: latest }).success, true);
  assert.equal(Buffer.byteLength(JSON.stringify({ locale: "en", history: messages, message: latest })), 36172);
  const result = buildChatRequest("en", messages, latest)!;
  assert.equal(result.shortened, true);
  assert.deepEqual(JSON.parse(result.body).history, messages.slice(2));
  assert.equal(JSON.parse(result.body).message, latest);
  assert.ok(Buffer.byteLength(result.body) <= limits.bodyBytes);
  assert.equal(messages.length, 4);
});
test("request builder counts escaping, preserves ordinary requests and rejects invalid latest questions", () => {
  const messages = Array.from({ length: 4 }, (_, i) => ({ role: i % 2 ? "assistant" as const : "visitor" as const, content: "\u0001".repeat(2000) }));
  const result = buildChatRequest("fi", messages, "Question")!;
  assert.equal(result.shortened, true);
  assert.deepEqual(JSON.parse(result.body).history, messages.slice(2));
  assert.ok(Buffer.byteLength(result.body) <= limits.bodyBytes);
  const ordinary = [{ role: "visitor" as const, content: 'A "quote"\n' }, { role: "assistant" as const, content: "Answer" }];
  assert.deepEqual(buildChatRequest("en", ordinary, "Hello"), { body: JSON.stringify({ locale: "en", history: ordinary, message: "Hello" }), shortened: false });
  assert.equal(buildChatRequest("en", ordinary, "x".repeat(4001)), undefined);
  assert.equal(buildChatRequest("en", [], ""), undefined);
});
