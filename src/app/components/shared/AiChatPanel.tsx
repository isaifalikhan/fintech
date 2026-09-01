import { motion } from 'motion/react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import type { AiChatTurn } from '@/services/types';

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  suggestions?: string[];
}

export interface AiChatPanelProps {
  /** Heading shown at the top of the chat card, e.g. "Ask the assistant" */
  title: string;
  /** Short description shown under the title */
  subtitle: string;
  /** Prompt chips shown in the empty state; clicking one sends it immediately */
  quickPrompts: string[];
  /**
   * Sends the new message plus everything said so far (oldest first, not including the new
   * message) to a real backend and resolves with the assistant's reply. Each caller (org,
   * employee, ...) supplies its own org/surface-scoped call — see `AIFinancialAssistant`'s and
   * `EmployeeAiAssistant`'s `getChatReply`. Throw (or reject with) an Error to surface a message
   * via the panel's built-in error banner.
   */
  getReply: (
    text: string,
    history: AiChatTurn[],
  ) => Promise<{ response: string; suggestions?: string[] }>;
  /** Placeholder text for the composer textarea */
  placeholder?: string;
  /** Helper copy shown in the empty state, above the quick prompts */
  emptyStateHint?: string;
}

/** Imperative handle so callers (e.g. an "ask about this" button elsewhere on the page) can push a message into the chat without lifting its state. */
export interface AiChatPanelHandle {
  sendMessage: (text: string) => void;
}

/** Hard cap (paste + typing); soft threshold shows a calm warning only */
const CHAT_INPUT_MAX = 4000;
const CHAT_SOFT_WARN = 2000;

/**
 * Reusable AI chat panel: message log, quick prompts, composer, and error handling.
 * Extracted from `organization/AIFinancialAssistant.tsx` (ORG-P04) so it can be reused by
 * both the organization workspace and the platform console. This component is intentionally
 * surface-agnostic — it does not call `useOrgServices()` or any org-scoped service. Callers
 * own their own data/settings fetching and pass in demo content via props.
 */
export const AiChatPanel = forwardRef<AiChatPanelHandle, AiChatPanelProps>(function AiChatPanel({
  title,
  subtitle,
  quickPrompts,
  getReply,
  placeholder = 'Ask a question…',
  emptyStateHint = 'Start a conversation.',
}, ref) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatLogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll ONLY the chat log. `chatEndRef.scrollIntoView()` walks every scrollable ancestor,
  // so each new message also yanked the whole page down when you clicked a prompt chip.
  useEffect(() => {
    const log = chatLogRef.current;
    if (!log) return;
    log.scrollTop = log.scrollHeight;
  }, [messages, sending]);

  useEffect(() => {
    // preventScroll: focusing the composer on mount otherwise jumps the page to it.
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const handleSend = useCallback(async (text?: string) => {
    const raw = (text ?? input).trim();
    if (!raw || sending) return;
    if (raw.length > CHAT_INPUT_MAX) return;
    setSendError(null);

    // History sent to getReply is everything said BEFORE this new message — captured from state
    // now, before the user bubble below is added to it.
    const historyBeforeThisMessage: AiChatTurn[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: raw,
    };
    // Commit user bubble before sending=true so the log never briefly shows neither empty hero nor bubbles (BUG-ORG-P04-001).
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const { response, suggestions } = await getReply(raw, historyBeforeThisMessage);
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: response,
        suggestions,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong. Try again.';
      setSendError(msg);
    } finally {
      setSending(false);
    }
  }, [input, sending, messages, getReply]);

  useImperativeHandle(ref, () => ({
    sendMessage: (text: string) => void handleSend(text),
  }), [handleSend]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="rounded-3xl border border-purple-500/25 bg-gradient-to-b from-slate-900/90 to-black/40 p-6 shadow-lg shadow-purple-900/20"
      aria-label="AI chat"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/30 ring-1 ring-purple-400/30">
          <MessageCircle className="h-5 w-5 text-purple-200" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>

      <div
        ref={chatLogRef}
        className="mb-4 max-h-[min(360px,50vh)] min-h-[200px] overflow-y-auto rounded-2xl border border-slate-700/60 bg-black/30 px-4 py-3"
        role="log"
        aria-live="polite"
      >
        {messages.length === 0 && !sending && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <p className="text-sm text-slate-300">No messages yet</p>
            <p className="max-w-md text-xs text-slate-500">{emptyStateHint}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {quickPrompts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void handleSend(q)}
                  disabled={sending}
                  className="rounded-full border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.length === 0 && sending && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400" aria-live="polite">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            <span>Sending your message…</span>
          </div>
        )}

        <ul className="space-y-3">
          {messages.map((m) => (
            <li
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-purple-600/35 text-white ring-1 ring-purple-400/30'
                    : 'border border-slate-600/80 bg-slate-900/80 text-slate-100'
                }`}
              >
                {m.content}
                {m.role === 'assistant' && m.suggestions && m.suggestions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-600/50 pt-3">
                    {m.suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => void handleSend(s)}
                        disabled={sending}
                        className="rounded-full border border-slate-600 bg-transparent px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
        {sending && messages.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <span>Thinking…</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {sendError && (
        <div
          className="mb-3 rounded-xl border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-100"
          role="alert"
        >
          {sendError}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <textarea
            ref={inputRef}
            id="ai-chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder={placeholder}
            disabled={sending}
            rows={3}
            maxLength={CHAT_INPUT_MAX}
            aria-describedby="ai-chat-input-hint"
            className="min-h-[88px] w-full resize-y rounded-xl border border-slate-600 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 disabled:opacity-60"
          />
          <div
            id="ai-chat-input-hint"
            className="flex flex-wrap items-center justify-between gap-2 px-0.5 text-xs text-slate-500"
          >
            <span className={input.length > CHAT_SOFT_WARN ? 'text-amber-200/85' : 'text-slate-600'}>
              {input.length > CHAT_SOFT_WARN
                ? 'Long messages may take a moment to process. Consider shortening.'
                : ' '}
            </span>
            <span
              className={`tabular-nums ${input.length > CHAT_SOFT_WARN ? 'text-amber-200/90' : ''}`}
            >
              {input.length} / {CHAT_INPUT_MAX}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={sending || !input.trim() || input.length > CHAT_INPUT_MAX}
          className="inline-flex h-11 min-w-[100px] shrink-0 items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 text-sm font-medium text-white transition-opacity hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send
        </button>
      </div>
    </motion.section>
  );
});
