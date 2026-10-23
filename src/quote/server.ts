import "server-only";
import { createHash } from "node:crypto";
import nodemailer from "nodemailer";
import type { QuoteRequest } from "./contracts";

const timeoutMs = 12_000;
const maxRequests = 5;
const windowSeconds = 3_600;

type Environment = Record<string, string | undefined>;
type Dependencies = { fetch?: typeof fetch; createTransport?: typeof nodemailer.createTransport };

function config(environment: Environment = process.env) {
  const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM", "QUOTE_TO_EMAIL", "QUOTE_RATE_LIMIT_URL", "QUOTE_RATE_LIMIT_TOKEN", "QUOTE_RATE_LIMIT_SECRET"] as const;
  if (required.some((key) => !environment[key]?.trim())) return undefined;
  const port = Number(environment.SMTP_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return undefined;
  try { new URL(environment.QUOTE_RATE_LIMIT_URL!); } catch { return undefined; }
  return { host: environment.SMTP_HOST!, port, user: environment.SMTP_USER!, pass: environment.SMTP_PASS!, from: environment.SMTP_FROM!, to: environment.QUOTE_TO_EMAIL!, rateUrl: environment.QUOTE_RATE_LIMIT_URL!.replace(/\/$/, ""), rateToken: environment.QUOTE_RATE_LIMIT_TOKEN!, rateSecret: environment.QUOTE_RATE_LIMIT_SECRET! };
}

function plain(value: string) { return value.replace(/[\r\n]+/g, " ").trim(); }
function website(value: string) {
  if (!value) return "";
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:" ? url.href : ""; } catch { return ""; }
}
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!); }
function body(input: QuoteRequest) {
  const fields = [["Name", plain(input.name)], ["Email", plain(input.email)], ["Company", plain(input.company)], ["Existing website", website(input.existingWebsite)], ["Service", input.service], ["Description", input.description.trim()]].filter(([, value]) => value);
  return { text: fields.map(([label, value]) => `${label}:\n${value}`).join("\n\n"), html: fields.map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong><br>${escapeHtml(value).replace(/\n/g, "<br>")}</p>`).join("") };
}

async function rateLimit(ip: string, settings: NonNullable<ReturnType<typeof config>>, fetcher: typeof fetch) {
  const key = `quote:${createHash("sha256").update(`${settings.rateSecret}:${ip}`).digest("hex")}`;
  const response = await fetcher(`${settings.rateUrl}/pipeline`, { method: "POST", headers: { authorization: `Bearer ${settings.rateToken}`, "content-type": "application/json" }, body: JSON.stringify([["incr", key], ["expire", key, windowSeconds, "NX"]]) , signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error("rate-limit unavailable");
  const result: unknown = await response.json();
  const count = Array.isArray(result) && typeof result[0] === "object" && result[0] !== null ? Number((result[0] as { result?: unknown }).result) : NaN;
  if (!Number.isFinite(count)) throw new Error("rate-limit invalid");
  return count <= maxRequests;
}

export async function sendQuoteRequest(input: QuoteRequest, ip: string, environment: Environment = process.env, dependencies: Dependencies = {}) {
  const settings = config(environment);
  if (!settings) return { ok: false as const, status: 503, reason: "configuration" };
  try {
    if (!(await rateLimit(ip, settings, dependencies.fetch ?? fetch))) return { ok: false as const, status: 429, reason: "rate" };
    const transport = (dependencies.createTransport ?? nodemailer.createTransport)({ host: settings.host, port: settings.port, secure: settings.port === 465, requireTLS: settings.port !== 465, auth: { user: settings.user, pass: settings.pass }, connectionTimeout: timeoutMs, greetingTimeout: timeoutMs, socketTimeout: timeoutMs });
    const content = body(input);
    const delivery = await transport.sendMail({ from: settings.from, to: settings.to, replyTo: input.email, subject: "New quote request", text: content.text, html: content.html });
    if (!delivery.accepted?.length) throw new Error("SMTP rejected recipient");
    return { ok: true as const };
  } catch { return { ok: false as const, status: 502, reason: "delivery" }; }
}
