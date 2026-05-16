import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import type { Firestore } from 'firebase/firestore';

const snapshotHandlers: Array<
  (snap: { docs: Array<{ id: string; data: () => unknown }> }) => void
> = [];
const addDocMock = vi.fn<(ref: unknown, data: Record<string, unknown>) => Promise<void>>();

vi.mock('firebase/firestore', () => {
  class Timestamp {
    constructor(public seconds: number) {}
    toMillis() {
      return this.seconds * 1000;
    }
    static fromMillis(ms: number) {
      return new Timestamp(Math.floor(ms / 1000));
    }
  }
  return {
    Timestamp,
    addDoc: (ref: unknown, data: Record<string, unknown>) => addDocMock(ref, data),
    collection: vi.fn<(db: unknown, path: string) => { path: string }>((_db, path) => ({
      path,
    })),
    query: vi.fn<(ref: unknown) => unknown>((ref) => ref),
    orderBy: vi.fn<() => void>(),
    limit: vi.fn<() => void>(),
    serverTimestamp: vi.fn<() => string>(() => '__server_ts__'),
    onSnapshot: (
      _q: unknown,
      next: (snap: { docs: Array<{ id: string; data: () => unknown }> }) => void,
    ) => {
      snapshotHandlers.push(next);
      return () => {
        const idx = snapshotHandlers.indexOf(next);
        if (idx >= 0) snapshotHandlers.splice(idx, 1);
      };
    },
  };
});

import { useFirebaseChat } from '@/firebase/useFirebaseChat';

beforeEach(() => {
  snapshotHandlers.length = 0;
  addDocMock.mockReset();
});

const fakeDb = {} as unknown as Firestore;

const currentAuthor = { id: 'todd', name: 'Todd', type: 'user' as const };

describe('useFirebaseChat', () => {
  it('maps firestore snapshots to library Messages', () => {
    const { result } = renderHook(() =>
      useFirebaseChat({ db: fakeDb, path: 'projects/x', currentAuthor }),
    );

    act(() => {
      const next = snapshotHandlers[0];
      next({
        docs: [
          {
            id: 'm1',
            data: () => ({
              author: { id: 'agent-1', name: 'Planner', type: 'agent' },
              content: 'hi',
              status: 'summary',
              recipient: '@todd',
              createdAt: 1700000000000,
              metadata: { event: 'sent' },
            }),
          },
        ],
      });
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toMatchObject({
      id: 'm1',
      content: 'hi',
      recipient: '@todd',
      author: { id: 'agent-1', type: 'agent' },
      status: 'summary',
    });
  });

  it('writes the draft to the messages subcollection on send', async () => {
    const { result } = renderHook(() =>
      useFirebaseChat({ db: fakeDb, path: 'projects/x', currentAuthor }),
    );

    await act(async () => {
      await result.current.onSend({
        author: currentAuthor,
        content: 'hello',
        recipient: '@planner',
        status: 'request',
      });
    });

    expect(addDocMock).toHaveBeenCalledTimes(1);
    const [ref, payload] = addDocMock.mock.calls[0] as [{ path: string }, Record<string, unknown>];
    expect(ref.path).toBe('projects/x/messages');
    expect(payload).toMatchObject({
      author_id: 'todd',
      author_type: 'user',
      content: 'hello',
      recipient: '@planner',
      status: 'request',
    });
  });
});
