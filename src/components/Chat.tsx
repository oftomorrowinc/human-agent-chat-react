import * as React from 'react';
import { Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Author, Message, MessageDraft } from '@/types';
import { MessageItem } from '@/components/MessageItem';

export interface ChatProps {
  /** The full message list to render. Caller owns subscription/state. */
  messages: Message[];
  /** Author identity used for self-styling + outgoing-draft attribution. */
  currentAuthor: Author;
  /**
   * Called when the composer submits. Caller persists the message — the
   * library does not write to any backend.
   *
   * The returned promise gates the "sending" UI; resolve when the write
   * has been queued (caller decides exactly what that means).
   */
  onSend: (draft: MessageDraft) => Promise<void>;
  /**
   * People + agents that the user can `@`-mention. When omitted the
   * autocomplete is suppressed but the user can still type raw `@name`
   * tokens manually.
   */
  mentionableAuthors?: Author[];
  /** Composer placeholder text. */
  placeholder?: string;
  /** Container className. Composes with the library's layout classes. */
  className?: string;
  /** Disable composer input (e.g., read-only view). */
  readOnly?: boolean;
}

interface MentionState {
  active: boolean;
  startPos: number;
  selectedIndex: number;
  query: string;
  candidates: Author[];
}

const EMPTY_MENTION: MentionState = {
  active: false,
  startPos: -1,
  selectedIndex: 0,
  query: '',
  candidates: [],
};

const ROLE_LABEL: Record<Author['type'], string> = {
  user: '',
  agent: 'AI Agent',
  runner: 'Runner',
  effective: 'Effective',
  coo: 'COO',
  chair: 'Chair',
  system: 'System',
};

export const Chat: React.FC<ChatProps> = ({
  messages,
  currentAuthor,
  onSend,
  mentionableAuthors = [],
  placeholder = 'Type a message… (use @ to mention)',
  className,
  readOnly = false,
}) => {
  const [inputValue, setInputValue] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [mention, setMention] = React.useState<MentionState>(EMPTY_MENTION);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const lastMessageId = messages[messages.length - 1]?.id;

  React.useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    // Guard against jsdom which lacks Element.scrollTo.
    if (typeof node.scrollTo === 'function') {
      node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
    } else {
      node.scrollTop = node.scrollHeight;
    }
  }, [lastMessageId, messages.length]);

  const refreshMentionFromValue = React.useCallback(
    (value: string, cursorPos: number) => {
      let atPos = -1;
      for (let i = cursorPos - 1; i >= 0; i--) {
        const ch = value[i];
        if (ch === '@') {
          atPos = i;
          break;
        }
        if (ch === ' ' || ch === '\n') break;
      }

      if (atPos < 0 || mentionableAuthors.length === 0) {
        setMention(EMPTY_MENTION);
        return;
      }

      const query = value.slice(atPos + 1, cursorPos).toLowerCase();
      const candidates = mentionableAuthors.filter(
        (author) =>
          author.id !== currentAuthor.id &&
          (author.name.toLowerCase().includes(query) || author.id.toLowerCase().includes(query)),
      );

      if (candidates.length === 0) {
        setMention(EMPTY_MENTION);
        return;
      }

      setMention({ active: true, startPos: atPos, selectedIndex: 0, query, candidates });
    },
    [currentAuthor.id, mentionableAuthors],
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);
    refreshMentionFromValue(value, e.target.selectionStart ?? value.length);
  };

  const acceptMention = React.useCallback(
    (index: number) => {
      const target = textareaRef.current;
      if (!target || !mention.active) return;
      const chosen = mention.candidates[index];
      if (!chosen) return;

      const before = inputValue.slice(0, mention.startPos);
      const after = inputValue.slice(target.selectionStart ?? inputValue.length);
      const handle = chosen.id;
      const next = `${before}@${handle} ${after}`;
      setInputValue(next);
      setMention(EMPTY_MENTION);

      setTimeout(() => {
        if (!textareaRef.current) return;
        const caret = before.length + handle.length + 2;
        textareaRef.current.setSelectionRange(caret, caret);
        textareaRef.current.focus();
      }, 0);
    },
    [inputValue, mention.active, mention.candidates, mention.startPos],
  );

  const firstMention = (text: string): string | null => {
    const match = text.match(/(?:^|\s)@([\w-]+(?:\.[\w-]+)*)/);
    return match?.[1] ?? null;
  };

  const submit = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isSubmitting || readOnly) return;
    setIsSubmitting(true);
    const recipientHandle = firstMention(trimmed);
    const draft: MessageDraft = {
      author: currentAuthor,
      content: trimmed,
      recipient: recipientHandle ? `@${recipientHandle}` : null,
      status: 'summary',
    };
    try {
      await onSend(draft);
      setInputValue('');
      setMention(EMPTY_MENTION);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention.active) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMention((prev) => ({
          ...prev,
          selectedIndex: Math.min(prev.candidates.length - 1, prev.selectedIndex + 1),
        }));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMention((prev) => ({
          ...prev,
          selectedIndex: Math.max(0, prev.selectedIndex - 1),
        }));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        acceptMention(mention.selectedIndex);
        return;
      }
      if (e.key === 'Escape') {
        setMention(EMPTY_MENTION);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-background',
        className,
      )}
    >
      <div
        ref={scrollRef}
        data-testid="chat-scroll"
        className="flex-1 space-y-4 overflow-y-auto p-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No messages yet — say hello.
          </div>
        ) : (
          messages.map((message) => (
            <MessageItem key={message.id} message={message} currentAuthorId={currentAuthor.id} />
          ))
        )}
      </div>

      {readOnly ? null : (
        <form
          className="relative border-t border-border bg-card p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isSubmitting}
              rows={1}
              className="max-h-32 min-h-[40px] flex-1 resize-none"
              aria-label="Message input"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!inputValue.trim() || isSubmitting}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {mention.active ? (
            <div
              role="listbox"
              aria-label="Mention suggestions"
              className="absolute bottom-full left-3 right-12 mb-2 max-h-56 overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-lg"
            >
              {mention.candidates.map((candidate, index) => {
                const selected = index === mention.selectedIndex;
                const roleLabel = ROLE_LABEL[candidate.type];
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => acceptMention(index)}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                      selected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
                    )}
                  >
                    <span className="font-medium">{candidate.name}</span>
                    <span className="text-xs text-muted-foreground">@{candidate.id}</span>
                    {roleLabel ? (
                      <span className="ml-auto text-xs uppercase text-primary">{roleLabel}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </form>
      )}
    </div>
  );
};

export default Chat;
