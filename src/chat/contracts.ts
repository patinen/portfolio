import { z } from "zod";
export const limits = { message: 4000, historyMessages: 12, historyChars: 16000, bodyBytes: 32768, outputChars: 4000, responseBytes: 32768 };
const message = z.string().trim().min(1).max(limits.message);
export const chatRequest = z.object({
  locale: z.enum(["fi", "en"]),
  history: z.array(z.object({ role: z.enum(["visitor", "assistant"]), content: message }).strict()).max(limits.historyMessages).default([]),
  message,
}).strict().refine(r => r.history.reduce((n, m) => n + m.content.length, 0) <= limits.historyChars);
export type ChatRequest = z.infer<typeof chatRequest>;
export const sourceUrl = z.string().max(2048).refine(value => {
  try { const u = new URL(value); return value.startsWith("https://") && !u.username && !u.password && !/[\u0000-\u0020\u007f]/.test(value); } catch { return false; }
});
export const publicAnswer = z.object({
  answer: z.string().trim().min(1).max(limits.outputChars),
  sources: z.array(z.object({ id: z.string().regex(/^[a-z][a-z0-9._-]{0,79}$/), title: z.string().min(1).max(200), url: sourceUrl.optional() }).strict()).max(20),
}).strict();
export type PublicAnswer = z.infer<typeof publicAnswer>;
export type ChatMessage = { role: "visitor" | "assistant"; content: string; sources?: PublicAnswer["sources"] };
export const publicErrorCodes = ["rate_limited", "daily_limit", "unavailable", "invalid_request", "session_invalid", "timeout", "failed"] as const;
export type PublicErrorCode = typeof publicErrorCodes[number];
// History is an explicit rolling window of complete turns, never trusted owner evidence.
export function historyWindow(messages: ChatMessage[]) {
  let start = messages.length;
  let chars = 0;
  for (let i = messages.length - 2; i >= 0; i -= 2) {
    const turn = messages.slice(i, i + 2);
    const size = turn.reduce((sum, m) => sum + m.content.length, 0);
    if (messages.length - i > limits.historyMessages || chars + size > limits.historyChars) break;
    start = i; chars += size;
  }
  return { history: messages.slice(start).map(({ role, content }) => ({ role, content })), shortened: start > 0 };
}

 // Serialize exactly what fetch sends; UTF-8 and JSON escaping count toward the budget.
export function buildChatRequest(locale: "fi" | "en", messages: ChatMessage[], message: string) {
  const window = historyWindow(messages);
  let history = window.history;
  let shortened = window.shortened;
  while (true) {
    const request = { locale, history, message };
    const body = JSON.stringify(request);
    if (chatRequest.safeParse(request).success && new TextEncoder().encode(body).byteLength <= limits.bodyBytes) {
      return { body, shortened };
    }
    if (!history.length) return undefined;
    history = history.slice(2);
    shortened = true;
  }
}
