import { test } from "node:test";
import assert from "node:assert/strict";
import { quoteValidationError } from "../src/quote/contracts";
import { sendQuoteRequest } from "../src/quote/server";

const input = { locale: "en" as const, name: "A Customer", email: "customer@example.com", company: "Company", existingWebsite: "https://example.com", service: "website" as const, description: "A concise project description.", businessWebsite: "" };
const environment = { SMTP_HOST: "smtp.gmail.com", SMTP_PORT: "465", SMTP_USER: "sender@example.com", SMTP_PASS: "secret", SMTP_FROM: "sender@example.com", QUOTE_TO_EMAIL: "recipient@example.com", QUOTE_RATE_LIMIT_URL: "https://rate.example", QUOTE_RATE_LIMIT_TOKEN: "token", QUOTE_RATE_LIMIT_SECRET: "rate-secret" };

test("quote validation requires safe bounded customer fields and a blank honeypot", () => {
  assert.equal(quoteValidationError(input).ok, true);
  assert.equal(quoteValidationError({ ...input, email: "invalid" }).ok, false);
  assert.equal(quoteValidationError({ ...input, description: "" }).ok, false);
  assert.equal(quoteValidationError({ ...input, service: "unknown" }).ok, false);
  assert.equal(quoteValidationError({ ...input, businessWebsite: "bot" }).ok, true);
});

test("SMTP delivery uses authenticated sender and customer Reply-To after persistent rate limiting", async () => {
  let sent: Record<string, unknown> | undefined;
  const result = await sendQuoteRequest(input, "203.0.113.9", environment, {
    fetch: async () => Response.json([{ result: 1 }, { result: 1 }]),
    createTransport: (() => ({ sendMail: async (message: Record<string, unknown>) => { sent = message; return { accepted: [environment.QUOTE_TO_EMAIL] }; } })) as never,
  });
  assert.deepEqual(result, { ok: true });
  assert.equal(sent?.from, environment.SMTP_FROM);
  assert.equal(sent?.to, environment.QUOTE_TO_EMAIL);
  assert.equal(sent?.replyTo, input.email);
  assert.equal(String(sent?.html).includes("<script"), false);
});

test("missing SMTP/rate-limit configuration and provider failures fail closed", async () => {
  assert.deepEqual(await sendQuoteRequest(input, "ip", {}, {}), { ok: false, status: 503, reason: "configuration" });
  const failedRateLimit = await sendQuoteRequest(input, "ip", environment, { fetch: async () => new Response("no", { status: 503 }) });
  assert.deepEqual(failedRateLimit, { ok: false, status: 502, reason: "delivery" });
  const failedMail = await sendQuoteRequest(input, "ip", environment, { fetch: async () => Response.json([{ result: 1 }]), createTransport: (() => ({ sendMail: async () => { throw new Error("smtp down"); } })) as never });
  assert.deepEqual(failedMail, { ok: false, status: 502, reason: "delivery" });
});
