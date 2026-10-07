import type { ChatCopy } from "@/chat/copy";
import { sourceUrl, type ChatMessage } from "@/chat/contracts";
export function ChatMessageView({ message, copy }: { message: ChatMessage; copy: ChatCopy }) {
  return <article className={"chat-message " + message.role}>
    <p className="chat-role">{message.role === "visitor" ? copy.chat_visitor_label : copy.chat_assistant_label}</p>
    <p className="chat-text">{message.content}</p>
    {!!message.sources?.length && <div className="chat-sources"><span>{copy.chat_sources_label}</span><ul>{message.sources.map(source => <li key={source.id}>{source.url && sourceUrl.safeParse(source.url).success ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a> : <span>{source.title}</span>}</li>)}</ul></div>}
  </article>;
}
