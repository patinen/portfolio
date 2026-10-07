import type { Row } from "../content/normalize";
import { copy } from "../content/normalize";
export const chatFields = [
  "chat_open_label", "chat_close_label", "chat_title", "chat_disclosure",
  "chat_input_label", "chat_input_placeholder", "chat_send_label", "chat_loading_label",
  "chat_visitor_label", "chat_assistant_label", "chat_new_label", "chat_empty_label",
  "chat_sources_label", "chat_history_notice", "chat_error_rate_limited", "chat_error_daily_limit",
  "chat_error_unavailable", "chat_error_invalid_request", "chat_error_session_invalid",
  "chat_error_timeout", "chat_error_failed", "chat_response_announcement",
] as const;
export type ChatCopy = Record<typeof chatFields[number], string> & { examples: string[] };
export function normalizeChat(row: Row): ChatCopy | undefined {
  const translation = row.translations?.[0];
  if (translation?.chat_enabled !== true) return;
  const c = copy(row);
  if (chatFields.some(field => typeof c[field] !== "string" || !c[field].trim() || c[field].length > 2000)) return;
  const examples = typeof c.chat_example_questions === "string" ? c.chat_example_questions.split("\n").map(v => v.trim()).filter(Boolean).slice(0, 3).filter(v => v.length <= 4000) : [];
  return { ...Object.fromEntries(chatFields.map(field => [field, c[field]])), examples } as ChatCopy;
}
