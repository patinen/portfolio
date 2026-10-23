import { test } from "node:test";
import assert from "node:assert/strict";
import { quoteRequestSchema, quoteValidationError } from "../src/quote/contracts";
import { quoteFormReady, quoteValidationMessage } from "../src/quote/form-copy";
import { submitQuote } from "../src/quote/form-submission";
import { readLimitedRequestText, trustedClientIp } from "../src/quote/request";
import { sendQuoteRequest } from "../src/quote/server-core";

const input = { locale: "en" as const, name: "A Customer", email: "customer@example.com", company: "Company", existingWebsite: "https://example.com", service: "website" as const, description: "A concise project description.", businessWebsite: "" };
const environment = { SMTP_HOST: "smtp.gmail.com", SMTP_PORT: "465", SMTP_USER: "sender@example.com", SMTP_PASS: "secret", SMTP_FROM: "sender@example.com", QUOTE_TO_EMAIL: "recipient@example.com", REDIS_URL: "rediss://redis.example:6380", QUOTE_RATE_LIMIT_SECRET: "rate-secret" };
const copy = Object.fromEntries(["quote_name_label", "quote_email_label", "quote_company_label", "quote_existing_website_label", "quote_service_label", "quote_service_placeholder", "quote_service_website", "quote_service_redesign", "quote_service_custom", "quote_service_other", "quote_description_label", "quote_submit_label", "quote_loading", "quote_success", "quote_error", "quote_rate_limited", "quote_honeypot_label", "quote_validation_name", "quote_validation_email", "quote_validation_company", "quote_validation_existing_website", "quote_validation_service", "quote_validation_description", "quote_privacy_notice", "privacy_link_label"].map((key) => [key, key])) as Record<string, string>;
const redis = (count = 1) => () => ({ connect: async () => undefined, disconnect: async () => undefined, multi: () => ({ incr: () => ({ expire: () => ({ exec: async () => [count, 1] }) }) }) }) as never;

test("quote validation accepts optional websites and normalizes valid domains", async () => {
  const empty = quoteRequestSchema.safeParse({ ...input, existingWebsite: "" });
  assert.equal(empty.success, true);
  assert.equal(empty.data?.existingWebsite, "");
  const omitted = { ...input }; delete (omitted as Partial<typeof input>).existingWebsite;
  assert.equal(quoteRequestSchema.safeParse(omitted).success, true);
  assert.equal(quoteRequestSchema.safeParse({ ...input, existingWebsite: "example.com" }).data?.existingWebsite, "https://example.com/");
  assert.equal(quoteRequestSchema.safeParse({ ...input, existingWebsite: "not a website" }).success, false);
  assert.equal(quoteValidationError(input).ok, true);
  assert.equal(quoteValidationError({ ...input, email: "invalid" }).ok, false);
  assert.equal(quoteValidationError({ ...input, description: "" }).ok, false);
  assert.equal(quoteValidationError({ ...input, service: "unknown" }).ok, false);
  assert.equal(quoteValidationError({ ...input, businessWebsite: "bot" }).ok, true);
  assert.equal(quoteFormReady(copy), true);
  const withoutValidation = { ...copy }; delete withoutValidation.quote_validation_email;
  assert.equal(quoteFormReady(withoutValidation), true);
  assert.equal(quoteValidationMessage({ ...copy, quote_validation_email: "Please enter a valid email address." }, "email"), "Please enter a valid email address.");
  assert.equal(quoteValidationMessage({ ...copy, quote_validation_email: "Anna kelvollinen sähköpostiosoite." }, "email"), "Anna kelvollinen sähköpostiosoite.");
  assert.equal(quoteFormReady({}), false);
  assert.equal(await readLimitedRequestText(new Request("https://example.test", { method: "POST", body: "12345" }), 4), undefined);
  assert.equal(await readLimitedRequestText(new Request("https://example.test", { method: "POST", headers: { "content-length": "999" }, body: "x" }), 4), undefined);
});

test("client validation reports fields without dropping values and successful submission resets", async () => {
  let resets = 0;
  const clientInvalid = await submitQuote({ ...input, email: "bad" }, "en", () => { resets += 1; });
  assert.deepEqual(clientInvalid, { state: "validation", fields: ["email"] });
  assert.equal(resets, 0);
  const result = await submitQuote(input, "en", () => { resets += 1; }, async () => Response.json({ ok: true }));
  assert.deepEqual(result, { state: "success" });
  assert.equal(resets, 1);
  const serverInvalid = await submitQuote(input, "en", () => { resets += 1; }, async () => Response.json({ ok: false, field: "existingWebsite" }, { status: 400 }));
  assert.deepEqual(serverInvalid, { state: "validation", fields: ["existingWebsite"] });
  const failure = await submitQuote(input, "en", () => { resets += 1; }, async () => new Response("bad", { status: 500 }));
  assert.equal(failure.state, "error");
  const rateLimited = await submitQuote(input, "en", () => { resets += 1; }, async () => Response.json({ ok: false, error: "rate_limited" }, { status: 429 }));
  assert.deepEqual(rateLimited, { state: "rate" });
  assert.equal(resets, 1);
});

test("SMTP delivery uses authenticated sender and persistent Redis rate limiting", async () => {
  let sent: Record<string, unknown> | undefined;
  const result = await sendQuoteRequest(input, "203.0.113.9", environment, { createRedisClient: redis(), createTransport: (() => ({ sendMail: async (message: Record<string, unknown>) => { sent = message; return { accepted: [environment.QUOTE_TO_EMAIL] }; } })) as never });
  assert.deepEqual(result, { ok: true });
  assert.equal(sent?.from, environment.SMTP_FROM); assert.equal(sent?.to, environment.QUOTE_TO_EMAIL); assert.equal(sent?.replyTo, input.email); assert.equal(String(sent?.html).includes("<script"), false);
  const events: string[] = [];
  assert.deepEqual(await sendQuoteRequest(input, "ip", environment, { createRedisClient: redis(6), log: (event) => events.push(event) }), { ok: false, status: 429, reason: "rate" });
  assert.deepEqual(await sendQuoteRequest(input, "ip", {}, { log: (event) => events.push(event) }), { ok: false, status: 503, reason: "configuration" });
  assert.deepEqual(await sendQuoteRequest(input, "ip", environment, { createRedisClient: () => ({ connect: async () => { throw new Error("redis credentials: secret"); }, disconnect: async () => undefined, multi: () => ({}) }) as never, log: (event) => events.push(event) }), { ok: false, status: 502, reason: "redis" });
  assert.deepEqual(await sendQuoteRequest(input, "ip", environment, { createRedisClient: redis(), createTransport: (() => ({ sendMail: async () => { throw new Error("smtp credentials: secret"); } })) as never, log: (event) => events.push(event) }), { ok: false, status: 502, reason: "smtp" });
  assert.deepEqual(events, ["quote_request_rate_limited", "quote_request_configuration_invalid", "quote_request_redis_failure", "quote_request_smtp_failure"]);
});

test("only explicitly trusted proxy headers provide a bounded client IP", () => {
  const request = new Request("https://example.test", { headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" } });
  assert.equal(trustedClientIp(request, true), "203.0.113.1");
  assert.equal(trustedClientIp(request, false), undefined);
  assert.equal(trustedClientIp(new Request("https://example.test", { headers: { "x-forwarded-for": "not-an-ip" } }), true), undefined);
});
