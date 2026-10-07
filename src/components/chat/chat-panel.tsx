"use client";
import { useEffect, useRef, useState } from "react";
import { ChatMessageView } from "./chat-message";
import type { ChatCopy } from "@/chat/copy";
import { historyWindow, limits, publicAnswer, publicErrorCodes, type ChatMessage, type PublicErrorCode } from "@/chat/contracts";
export function ChatPanel({ locale, copy }: { locale: "fi" | "en"; copy: ChatCopy }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<PublicErrorCode>();
  const [shortened, setShortened] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const active = useRef<AbortController | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => () => { active.current?.abort(); }, []);
  async function send() {
    if (active.current || !input.trim()) return;
    if (input.trim().length > limits.message) { setError("invalid_request"); return; }
    const controller = new AbortController(); active.current = controller;
    const latest = input.trim(), window = historyWindow(messages);
    setPending(true); setError(undefined); setShortened(window.shortened);
    setAnnouncement(copy.chat_loading_label);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale, history: window.history, message: latest }), signal: controller.signal });
      const data = await response.json();
      if (!response.ok) {
        const code: PublicErrorCode = publicErrorCodes.includes(data?.error?.code) ? data.error.code : "failed";
        setError(code); setAnnouncement(copy[("chat_error_" + code) as keyof ChatCopy] as string);
        return;
      }
      const result = publicAnswer.parse(data);
      setMessages(previous => [...previous, { role: "visitor", content: latest }, { role: "assistant", content: result.answer, sources: result.sources }]);
      setInput(""); setAnnouncement(copy.chat_response_announcement);
    } catch {
      if (!controller.signal.aborted) { setError("failed"); setAnnouncement(copy.chat_error_failed); }
    } finally {
      if (active.current === controller) { active.current = null; setPending(false); field.current?.focus(); }
    }
  }
  function clear() {
    if (active.current) return;
    setMessages([]); setInput(""); setError(undefined); setShortened(false); setAnnouncement(copy.chat_empty_label); field.current?.focus();
    // No network request, cookie deletion, session rotation or usage reset.
  }
  return <div className="chat">
    <button className="chat-toggle" type="button" aria-expanded={open} aria-controls="personacore-panel" onClick={() => setOpen(!open)}>
      {open ? copy.chat_close_label : copy.chat_open_label}<span aria-hidden="true">{open ? "−" : "+"}</span>
    </button>
    <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    {open && <section id="personacore-panel" className="chat-panel" aria-labelledby="personacore-heading">
      <div className="chat-heading"><h2 id="personacore-heading">{copy.chat_title}</h2><button type="button" disabled={pending} onClick={clear}>{copy.chat_new_label}</button></div>
      <p className="chat-disclosure">{copy.chat_disclosure}</p>
      <div className="chat-conversation" aria-label={copy.chat_title}>
        {!messages.length && <div className="chat-empty"><p>{copy.chat_empty_label}</p><div className="chat-examples">{copy.examples.map(example => <button key={example} type="button" disabled={pending} onClick={() => { setInput(example); field.current?.focus(); }}>{example}</button>)}</div></div>}
        {messages.map((message, index) => <ChatMessageView key={index} message={message} copy={copy} />)}
      </div>
      {(shortened || historyWindow(messages).shortened) && <p className="chat-notice">{copy.chat_history_notice}</p>}
      {error && <p className="chat-error" role="alert">{copy[("chat_error_" + error) as keyof ChatCopy]}</p>}
      <form aria-busy={pending} onSubmit={event => { event.preventDefault(); void send(); }}>
        <label htmlFor="personacore-input">{copy.chat_input_label}</label>
        <textarea id="personacore-input" ref={field} value={input} maxLength={limits.message} placeholder={copy.chat_input_placeholder} disabled={pending} rows={3} onChange={event => setInput(event.target.value)}
          onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} />
        <button type="submit" disabled={pending || !input.trim()}>{pending ? copy.chat_loading_label : copy.chat_send_label}</button>
      </form>
    </section>}
  </div>;
}
