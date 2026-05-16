import * as React from 'react';
import type { SupabaseClient, RealtimePostgresInsertPayload } from '@supabase/supabase-js';

import type { Author, AuthorType, Message, MessageDraft, MessageStatus } from '@/types';

/**
 * Subjects a chat thread can be attached to. Mirrors Core's
 * `chatMessageSubjectTypeSchema`. The library doesn't validate the value
 * — it's a string passed through to Supabase.
 */
export type ChatSubjectType =
  | 'project'
  | 'job'
  | 'signal'
  | 'task'
  | 'task_attempt'
  | 'business'
  | 'user';

export interface UseSupabaseChatOptions {
  /** Active Supabase client. Caller initializes auth + the client. */
  client: SupabaseClient;
  /** Subject the thread belongs to — drives row filtering. */
  subjectType: ChatSubjectType;
  /** ULID of the subject row. */
  subjectId: string;
  /** Author identity for outgoing messages. */
  currentAuthor: Author;
  /** Company ID stamped on outgoing rows. Required by Core's RLS policies. */
  companyId: string;
  /** Cap on how many recent rows to load on first paint (default 200). */
  limit?: number;
  /** Optional table override (default `chat_messages`). */
  table?: string;
  /**
   * Optional Author resolver. The DB row only stores `author_id` +
   * `author_type`; the caller's directory turns those into a display
   * Author. When omitted, the row is rendered with a synthetic Author
   * built from the id and type.
   */
  resolveAuthor?: (authorId: string | null, authorType: AuthorType) => Author | undefined;
  /** Optional error sink. */
  onError?: (error: Error) => void;
}

export interface UseSupabaseChatResult {
  messages: Message[];
  currentAuthor: Author;
  onSend: (draft: MessageDraft) => Promise<void>;
  loading: boolean;
}

interface ChatMessageRow {
  id: string;
  company_id: string;
  subject_type: string;
  subject_id: string;
  author_type: string;
  author_id: string | null;
  status: string;
  recipient: string | null;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: number | string;
}

const epochOf = (value: number | string): number => {
  if (typeof value === 'number') return value;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Date.now() : parsed;
};

const mapRow = (
  row: ChatMessageRow,
  resolveAuthor: UseSupabaseChatOptions['resolveAuthor'],
): Message => {
  const authorType = (row.author_type ?? 'user') as AuthorType;
  const resolved = resolveAuthor?.(row.author_id, authorType);
  const author: Author = resolved ?? {
    id: row.author_id ?? authorType,
    name: row.author_id ?? authorType,
    type: authorType,
  };
  return {
    id: row.id,
    author,
    recipient: row.recipient,
    content: row.content,
    createdAt: epochOf(row.created_at),
    status: (row.status as MessageStatus) ?? 'summary',
    metadata: row.metadata ?? undefined,
  };
};

/**
 * Subscribe to `chat_messages` filtered by subject for the lifetime of the
 * caller's component, and return the shape `<Chat>` expects.
 *
 * Initial state is fetched via `client.from(table).select()`; subsequent
 * inserts are appended via a Realtime channel. The caller owns the
 * Supabase client; the hook does not touch auth or RLS policies.
 */
export function useSupabaseChat({
  client,
  subjectType,
  subjectId,
  currentAuthor,
  companyId,
  limit = 200,
  table = 'chat_messages',
  resolveAuthor,
  onError,
}: UseSupabaseChatOptions): UseSupabaseChatResult {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await client
        .from(table)
        .select('*')
        .eq('subject_type', subjectType)
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (cancelled) return;
      if (error) {
        setLoading(false);
        onError?.(error);
        return;
      }
      setMessages(
        ((data as ChatMessageRow[] | null) ?? []).map((row) => mapRow(row, resolveAuthor)),
      );
      setLoading(false);
    })();

    const channel = client
      .channel(`chat:${subjectType}:${subjectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table,
          filter: `subject_id=eq.${subjectId}`,
        },
        (payload: RealtimePostgresInsertPayload<ChatMessageRow>) => {
          const row = payload.new;
          if (!row || row.subject_type !== subjectType) return;
          const mapped = mapRow(row, resolveAuthor);
          setMessages((prev) => (prev.some((m) => m.id === mapped.id) ? prev : [...prev, mapped]));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void client.removeChannel(channel);
    };
  }, [client, subjectType, subjectId, limit, table, resolveAuthor, onError]);

  const onSend = React.useCallback(
    async (draft: MessageDraft) => {
      const { error } = await client.from(table).insert({
        company_id: companyId,
        subject_type: subjectType,
        subject_id: subjectId,
        author_type: draft.author.type,
        author_id: draft.author.id,
        status: draft.status ?? 'summary',
        recipient: draft.recipient ?? null,
        content: draft.content,
        metadata: draft.metadata ?? {},
      });
      if (error) {
        onError?.(error);
        throw error;
      }
    },
    [client, table, companyId, subjectType, subjectId, onError],
  );

  return { messages, currentAuthor, onSend, loading };
}
