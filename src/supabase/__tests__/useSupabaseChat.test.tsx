import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import { useSupabaseChat } from '@/supabase/useSupabaseChat';
import type { Author } from '@/types';

const currentAuthor: Author = { id: 'todd', name: 'Todd', type: 'user' };

interface PostgresChangePayload {
  new: Record<string, unknown>;
}

type ChannelHandler = (payload: PostgresChangePayload) => void;

interface ChannelRecord {
  name: string;
  handler: ChannelHandler | null;
}

function mockSupabaseClient(initial: Record<string, unknown>[]) {
  const channels: ChannelRecord[] = [];
  const insertCalls: Record<string, unknown>[] = [];

  type Builder = {
    select: () => Builder;
    eq: () => Builder;
    order: () => Builder;
    limit: () => Promise<{ data: Record<string, unknown>[]; error: null }>;
    insert: (
      row: Record<string, unknown>,
    ) => Promise<{ data: Record<string, unknown>; error: null }>;
  };

  const fromBuilder: Builder = {
    select: vi.fn<() => Builder>().mockReturnThis(),
    eq: vi.fn<() => Builder>().mockReturnThis(),
    order: vi.fn<() => Builder>().mockReturnThis(),
    limit: vi
      .fn<() => Promise<{ data: Record<string, unknown>[]; error: null }>>()
      .mockResolvedValue({ data: initial, error: null }),
    insert: vi.fn<Builder['insert']>((row) => {
      insertCalls.push(row);
      return Promise.resolve({ data: row, error: null });
    }),
  };

  interface MockChannel {
    on: (event: string, filter: unknown, handler: ChannelHandler) => MockChannel;
    subscribe: () => MockChannel;
  }

  const client = {
    from: vi.fn<() => Builder>(() => fromBuilder),
    channel: vi.fn<(name: string) => MockChannel>((name: string) => {
      const record: ChannelRecord = { name, handler: null };
      channels.push(record);
      const channel: MockChannel = {
        on: vi.fn<MockChannel['on']>((_event, _filter, handler) => {
          record.handler = handler;
          return channel;
        }),
        subscribe: vi.fn<MockChannel['subscribe']>(() => channel),
      };
      return channel;
    }),
    removeChannel: vi.fn<(channel: unknown) => void>(),
  };

  return { client, channels, insertCalls };
}

beforeEach(() => {
  vi.useRealTimers();
});

describe('useSupabaseChat', () => {
  it('maps initial rows to Message shape', async () => {
    const { client } = mockSupabaseClient([
      {
        id: 'row-1',
        company_id: 'co',
        subject_type: 'job',
        subject_id: 'job-1',
        author_type: 'agent',
        author_id: 'planner',
        status: 'summary',
        recipient: null,
        content: 'hi',
        metadata: null,
        created_at: 1700000000000,
      },
    ]);

    const { result } = renderHook(() =>
      useSupabaseChat({
        client: client as never,
        subjectType: 'job',
        subjectId: 'job-1',
        currentAuthor,
        companyId: 'co',
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toMatchObject({
      id: 'row-1',
      content: 'hi',
      author: { id: 'planner', type: 'agent' },
    });
  });

  it('appends newly-inserted rows from a Realtime payload', async () => {
    const mocks = mockSupabaseClient([]);

    const { result } = renderHook(() =>
      useSupabaseChat({
        client: mocks.client as never,
        subjectType: 'job',
        subjectId: 'job-1',
        currentAuthor,
        companyId: 'co',
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      const channel = mocks.channels[0];
      channel?.handler?.({
        new: {
          id: 'row-2',
          subject_type: 'job',
          subject_id: 'job-1',
          author_type: 'user',
          author_id: 'alice',
          status: 'summary',
          recipient: null,
          content: 'hello',
          metadata: null,
          created_at: 1700000001000,
        },
      });
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].id).toBe('row-2');
  });

  it('inserts via the table on onSend', async () => {
    const mocks = mockSupabaseClient([]);

    const { result } = renderHook(() =>
      useSupabaseChat({
        client: mocks.client as never,
        subjectType: 'job',
        subjectId: 'job-1',
        currentAuthor,
        companyId: 'co',
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.onSend({
        author: currentAuthor,
        content: 'pinging',
        recipient: '@planner',
        status: 'request',
      });
    });

    expect(mocks.insertCalls).toHaveLength(1);
    expect(mocks.insertCalls[0]).toMatchObject({
      company_id: 'co',
      subject_type: 'job',
      subject_id: 'job-1',
      author_id: 'todd',
      author_type: 'user',
      content: 'pinging',
      recipient: '@planner',
      status: 'request',
    });
  });
});
