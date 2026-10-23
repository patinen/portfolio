import { createHash } from "node:crypto";
import { createClient } from "redis";
import nodemailer from "nodemailer";
import type { QuoteRequest } from "./contracts";

const timeoutMs = 12_000, maxRequests = 5, windowSeconds = 3_600;
type Environment = Record<string, string | undefined>;
type RedisClient = Pick<ReturnType<typeof createClient>, "connect" | "disconnect" | "multi">;
type QuoteLogEvent = "quote_request_configuration_invalid" | "quote_request_rate_limited" | "quote_request_redis_failure" | "quote_request_smtp_failure";
type Dependencies = { createTransport?: typeof nodemailer.createTransport; createRedisClient?: () => RedisClient; log?: (event: QuoteLogEvent) => void };

function config(environment: Environment = process.env) {
  const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM", "QUOTE_TO_EMAIL", "REDIS_URL", "QUOTE_RATE_LIMIT_SECRET"] as const;
  if (required.some((key) => !environment[key]?.trim())) return undefined;
  const port = Number(environment.SMTP_PORT);
  try { const redis = new URL(environment.REDIS_URL!); if (!["redis:", "rediss:"].includes(redis.protocol) || !redis.hostname) return undefined; } catch { return undefined; }
  if (!Number.isInteger(port) || port < 1 || port > 65535) return undefined;
  return { host: environment.SMTP_HOST!, port, user: environment.SMTP_USER!, pass: environment.SMTP_PASS!, from: environment.SMTP_FROM!, to: environment.QUOTE_TO_EMAIL!, redisUrl: environment.REDIS_URL!, rateSecret: environment.QUOTE_RATE_LIMIT_SECRET! };
}
function plain(value: string) { return value.replace(/[\r\n]+/g, " ").trim(); }
function website(value: string) { if (!value) return ""; try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : ""; } catch { return ""; } }
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!); }
function body(input: QuoteRequest) { const fields = [["Name", plain(input.name)], ["Email", plain(input.email)], ["Company", plain(input.company)], ["Existing website", website(input.existingWebsite)], ["Service", input.service], ["Description", input.description.trim()]].filter(([, value]) => value); return { text: fields.map(([label, value]) => `${label}:\n${value}`).join("\n\n"), html: fields.map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong><br>${escapeHtml(value).replace(/\n/g, "<br>")}</p>`).join("") }; }
async function rateLimit(ip: string, settings: NonNullable<ReturnType<typeof config>>, createRedisClient: () => RedisClient) {
  const key = `quote:${createHash("sha256").update(`${settings.rateSecret}:${ip}`).digest("hex")}`, client = createRedisClient();
  try { await client.connect(); const reply = await client.multi().incr(key).expire(key, windowSeconds, "NX").exec(); const count = Number(reply[0]); if (!Number.isFinite(count)) throw new Error("rate-limit invalid"); return count <= maxRequests; } finally { await client.disconnect().catch(() => undefined); }
}
export async function sendQuoteRequest(input: QuoteRequest, ip: string, environment: Environment = process.env, dependencies: Dependencies = {}) {
  const log = dependencies.log ?? ((event: QuoteLogEvent) => console.error(`[quote] ${event}`));
  const settings = config(environment);
  if (!settings) {
    log("quote_request_configuration_invalid");
    return { ok: false as const, status: 503, reason: "configuration" };
  }
  const createRedisClient = dependencies.createRedisClient ?? (() => createClient({ url: settings.redisUrl, socket: { connectTimeout: timeoutMs } }));
  try {
    if (!(await rateLimit(ip, settings, createRedisClient))) {
      log("quote_request_rate_limited");
      return { ok: false as const, status: 429, reason: "rate" };
    }
  } catch {
    // Do not include the thrown error: transport errors may contain connection details.
    log("quote_request_redis_failure");
    return { ok: false as const, status: 502, reason: "redis" };
  }
  try {
    const transport = (dependencies.createTransport ?? nodemailer.createTransport)({ host: settings.host, port: settings.port, secure: settings.port === 465, requireTLS: settings.port !== 465, auth: { user: settings.user, pass: settings.pass }, connectionTimeout: timeoutMs, greetingTimeout: timeoutMs, socketTimeout: timeoutMs });
    const content = body(input), delivery = await transport.sendMail({ from: settings.from, to: settings.to, replyTo: input.email, subject: "New quote request", text: content.text, html: content.html });
    if (!delivery.accepted?.length) throw new Error("SMTP rejected recipient");
    return { ok: true as const };
  } catch {
    // Do not include the thrown error or message content in logs.
    log("quote_request_smtp_failure");
    return { ok: false as const, status: 502, reason: "smtp" };
  }
}
