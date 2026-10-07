import { z } from "zod";
import { chatRequest, limits, publicAnswer, type PublicErrorCode } from "./contracts";
import { visitorSession, InvalidSession } from "./session";
import type { ChatCopy } from "./copy";
export type ProxyConfig = { origin: string; url: string; bearer: string; sessionSecret: string; sessionLifetime: number; timeoutMs: number; production: boolean };
export function proxyConfig(env: Record<string, string | undefined>): ProxyConfig | undefined {
  if (env.PERSONACORE_ENABLED !== "true") return;
  try {
    const origin = new URL(env.PERSONACORE_ORIGIN!);
    const service = new URL(env.PERSONACORE_URL!);
    const production = env.NODE_ENV === "production";
    if (origin.origin !== env.PERSONACORE_ORIGIN || !["http:", "https:"].includes(origin.protocol) || (production && origin.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname))) return;
    if (!["http:", "https:"].includes(service.protocol) || service.username || service.password || service.search || service.hash || service.pathname !== "/") return;
    if (!env.PERSONACORE_BEARER_SECRET || env.PERSONACORE_BEARER_SECRET.length < 32 || !env.PERSONACORE_SESSION_SECRET || env.PERSONACORE_SESSION_SECRET.length < 32 || env.PERSONACORE_BEARER_SECRET === env.PERSONACORE_SESSION_SECRET) return;
    const sessionLifetime = Number(env.PERSONACORE_SESSION_SECONDS ?? 86400), timeoutMs = Number(env.PERSONACORE_TIMEOUT_MS ?? 25000);
    if (!Number.isInteger(sessionLifetime) || sessionLifetime < 300 || sessionLifetime > 604800 || !Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 120000) return;
    return { origin: origin.origin, url: new URL("/v1/chat", service).href, bearer: env.PERSONACORE_BEARER_SECRET, sessionSecret: env.PERSONACORE_SESSION_SECRET, sessionLifetime, timeoutMs, production };
  } catch { return; }
}
export async function readBounded(stream: ReadableStream<Uint8Array> | null, max: number, signal: AbortSignal): Promise<string> {
  if (!stream) throw new Error("Missing body");
  const reader = stream.getReader();
  let bytes = 0; const chunks: Uint8Array[] = [];
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", abort, { once: true });
  try {
    signal.throwIfAborted();
    while (true) {
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > max) throw new Error("Body limit");
      chunks.push(value);
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
  } finally { signal.removeEventListener("abort", abort); await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
const upstreamAnswer = z.object({
  answer: publicAnswer.shape.answer, sources: publicAnswer.shape.sources,
  requestId: z.string().min(1).max(100),
  metadata: z.object({ durationMs: z.number().nonnegative(), knowledgeVersion: z.string().max(80), instructionsVersion: z.string().max(80), provider: z.enum(["openai", "fake"]), simulated: z.boolean(), usage: z.object({ inputTokens: z.number().int().nonnegative(), outputTokens: z.number().int().nonnegative(), totalTokens: z.number().int().nonnegative() }).optional() }).strict(),
}).strict();
const upstreamError = z.object({ error: z.object({ code: z.string().max(100), message: z.string().max(1000) }).strict(), requestId: z.string().max(100) }).strict();
function failure(code: PublicErrorCode, status: number, cookie?: string, retry?: string) {
  return Response.json({ error: { code } }, { status, headers: { "Cache-Control": "no-store", ...(cookie ? { "Set-Cookie": cookie } : {}), ...(retry ? { "Retry-After": retry } : {}) } });
}
export async function proxyChat(request: Request, config: ProxyConfig | undefined, dependencies: { getCopy: (locale: "fi" | "en") => Promise<ChatCopy | undefined>; fetch?: typeof fetch; now?: () => number }) {
  if (!config) return failure("unavailable", 503);
  const site = request.headers.get("sec-fetch-site"), mode = request.headers.get("sec-fetch-mode"), dest = request.headers.get("sec-fetch-dest");
  if (request.headers.get("origin") !== config.origin || (site && site !== "same-origin") || (mode && !["cors", "same-origin"].includes(mode)) || (dest && dest !== "empty")) return failure("invalid_request", 403);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return failure("invalid_request", 400);
  const controller = new AbortController();
  const abort = () => controller.abort();
  request.signal.addEventListener("abort", abort, { once: true });
  if (request.signal.aborted) controller.abort();
  const timeout = setTimeout(abort, config.timeoutMs);
  let setCookie: string | undefined;
  try {
    let input;
    try { input = chatRequest.parse(JSON.parse(await readBounded(request.body, limits.bodyBytes, controller.signal))); } catch {
      return failure(controller.signal.aborted ? "timeout" : "invalid_request", controller.signal.aborted ? 504 : 400);
    }
    // Include CMS lookup in the overall deadline even if its transport ignores cancellation.
    const cancelled = new Promise<never>((_, reject) => {
      if (controller.signal.aborted) reject(new Error("Cancelled"));
      else controller.signal.addEventListener("abort", () => reject(new Error("Cancelled")), { once: true });
    });
    const copy = await Promise.race([dependencies.getCopy(input.locale), cancelled]);
    if (!copy) return failure("unavailable", 503);
    const session = visitorSession(request.headers.get("cookie"), config.sessionSecret, config.sessionLifetime, dependencies.now?.() ?? Math.floor(Date.now() / 1000), config.production);
    setCookie = session.setCookie;
    // No browser headers (including Authorization, forwarding headers or visitor IDs) are forwarded.
    const upstream = await Promise.race([(dependencies.fetch ?? fetch)(config.url, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + config.bearer, "x-personacore-visitor": session.id },
      body: JSON.stringify(input), signal: controller.signal, redirect: "error", cache: "no-store",
    }), cancelled]);
    const data: unknown = JSON.parse(await readBounded(upstream.body, limits.responseBytes, controller.signal));
    if (!upstream.ok) {
      const parsed = upstreamError.safeParse(data);
      if (!parsed.success) return failure("failed", 502, setCookie);
      const code = parsed.data.error.code;
      if (upstream.status === 429) {
        const retry = upstream.headers.get("retry-after");
        return failure(["daily_limit", "visitor_daily_limit"].includes(code) ? "daily_limit" : "rate_limited", 429, setCookie, retry && /^\d{1,6}$/.test(retry) ? retry : undefined);
      }
      if (upstream.status === 503) return failure("unavailable", 503, setCookie);
      if (upstream.status === 504) return failure("timeout", 504, setCookie);
      return failure("failed", 502, setCookie);
    }
    const result = upstreamAnswer.parse(data);
    // A development fake is never presented as AI through the public UI.
    if (result.metadata.simulated || result.metadata.provider !== "openai") return failure("unavailable", 503, setCookie);
    return Response.json({ answer: result.answer, sources: result.sources }, { headers: { "Cache-Control": "no-store", ...(setCookie ? { "Set-Cookie": setCookie } : {}) } });
  } catch (error) {
    if (error instanceof InvalidSession) return failure("session_invalid", 400);
    return failure(controller.signal.aborted ? "timeout" : "failed", controller.signal.aborted ? 504 : 502, setCookie);
  } finally { clearTimeout(timeout); request.signal.removeEventListener("abort", abort); controller.abort(); }
}
