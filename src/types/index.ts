/**
 * Type definitions for `@oftomorrow/human-agent-chat`.
 *
 * Aligned with Core's `chat_messages` shape — `author_type` enum,
 * dispatch `status`, and `recipient` routing target. The library is
 * structurally compatible; the per-row schema validation happens at
 * the storage boundary, not inside the component.
 */

/** Roles that can author a message. Mirrors Core's chatMessageAuthorTypeSchema. */
export type AuthorType = 'user' | 'agent' | 'runner' | 'effective' | 'coo' | 'chair' | 'system';

/** Dispatch status. Mirrors Core's chatMessageStatusSchema. */
export type MessageStatus = 'summary' | 'request' | 'blocked';

/** A participant — human, agent, runner, system, etc. */
export interface Author {
  id: string;
  name: string;
  type: AuthorType;
  /** Optional avatar URL. When omitted, MessageItem renders initials. */
  avatar?: string;
}

/** A rendered chat message. */
export interface Message {
  id: string;
  author: Author;
  /** Optional routing target: `@<role>` or `@<user>`. Drives mention rendering. */
  recipient?: string | null;
  content: string;
  /** Epoch milliseconds. */
  createdAt: number;
  /** Dispatch status — informational, blocking, or a request. */
  status?: MessageStatus;
  /** Optional per-message metadata. Caller defined. */
  metadata?: Record<string, unknown>;
}

/**
 * The body of a message before persistence. Lacks `id` + `createdAt`;
 * the caller's `onSend` fills those in when writing to storage.
 */
export type MessageDraft = Omit<Message, 'id' | 'createdAt'>;
