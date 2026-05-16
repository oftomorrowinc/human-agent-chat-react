import * as React from 'react';
import type { Firestore } from 'firebase/firestore';
import {
  Timestamp,
  addDoc,
  collection,
  limit as limitFn,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';

import type { Author, AuthorType, Message, MessageDraft, MessageStatus } from '@/types';

export interface UseFirebaseChatOptions {
  /** Active Firestore instance. Caller initializes Firebase. */
  db: Firestore;
  /**
   * Conversation path. Messages are stored under `${path}/messages`.
   * Example: `projects/<id>/chats/<id>`.
   */
  path: string;
  /** Author identity for outgoing messages. */
  currentAuthor: Author;
  /** Optional cap on how many recent messages to subscribe to (default 200). */
  limit?: number;
  /**
   * Optional resolver — given the stored `author_id`, return a hydrated
   * Author. When omitted, the hook falls back to the stored snapshot
   * (id + name + type + avatar) on the document itself.
   */
  resolveAuthor?: (authorId: string | null | undefined) => Author | undefined;
  /** Optional error sink. Called for subscription or send failures. */
  onError?: (error: Error) => void;
}

export interface UseFirebaseChatResult {
  messages: Message[];
  currentAuthor: Author;
  onSend: (draft: MessageDraft) => Promise<void>;
  loading: boolean;
}

interface FirestoreMessageDoc {
  content?: unknown;
  author?: unknown;
  author_id?: unknown;
  author_type?: unknown;
  author_name?: unknown;
  author_avatar?: unknown;
  recipient?: unknown;
  status?: unknown;
  metadata?: unknown;
  createdAt?: unknown;
}

const coerceEpochMs = (value: unknown): number => {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? Date.now() : parsed;
  }
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  return Date.now();
};

const coerceAuthor = (
  doc: FirestoreMessageDoc,
  resolveAuthor: UseFirebaseChatOptions['resolveAuthor'],
): Author => {
  if (
    doc.author &&
    typeof doc.author === 'object' &&
    'id' in doc.author &&
    'name' in doc.author &&
    'type' in doc.author
  ) {
    return doc.author as Author;
  }
  const resolved = resolveAuthor?.(typeof doc.author_id === 'string' ? doc.author_id : null);
  if (resolved) return resolved;
  return {
    id: typeof doc.author_id === 'string' ? doc.author_id : 'unknown',
    name: typeof doc.author_name === 'string' ? doc.author_name : 'Unknown',
    type: (typeof doc.author_type === 'string' ? doc.author_type : 'user') as AuthorType,
    avatar: typeof doc.author_avatar === 'string' ? doc.author_avatar : undefined,
  };
};

/**
 * Subscribe to Firestore messages under `${path}/messages` and return the
 * shape `<Chat>` expects. Caller owns the Firestore instance; the hook
 * never reaches for a singleton.
 */
export function useFirebaseChat({
  db,
  path,
  currentAuthor,
  limit = 200,
  resolveAuthor,
  onError,
}: UseFirebaseChatOptions): UseFirebaseChatResult {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const messagesRef = collection(db, `${path}/messages`);
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limitFn(limit));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const next: Message[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as FirestoreMessageDoc;
          return {
            id: docSnap.id,
            author: coerceAuthor(data, resolveAuthor),
            recipient: typeof data.recipient === 'string' ? data.recipient : null,
            content: typeof data.content === 'string' ? data.content : '',
            createdAt: coerceEpochMs(data.createdAt),
            status: (typeof data.status === 'string' ? data.status : undefined) as
              | MessageStatus
              | undefined,
            metadata:
              data.metadata && typeof data.metadata === 'object'
                ? (data.metadata as Record<string, unknown>)
                : undefined,
          };
        });
        setMessages(next);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        onError?.(err);
      },
    );
    return () => unsubscribe();
  }, [db, path, limit, resolveAuthor, onError]);

  const onSend = React.useCallback(
    async (draft: MessageDraft) => {
      const messagesRef = collection(db, `${path}/messages`);
      try {
        await addDoc(messagesRef, {
          author: draft.author,
          author_id: draft.author.id,
          author_type: draft.author.type,
          author_name: draft.author.name,
          author_avatar: draft.author.avatar ?? null,
          recipient: draft.recipient ?? null,
          content: draft.content,
          status: draft.status ?? 'summary',
          metadata: draft.metadata ?? {},
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        onError?.(err as Error);
        throw err;
      }
    },
    [db, path, onError],
  );

  return { messages, currentAuthor, onSend, loading };
}
