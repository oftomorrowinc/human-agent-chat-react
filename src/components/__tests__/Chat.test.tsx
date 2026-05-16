import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Chat } from '@/components/Chat';
import type { Author, Message, MessageDraft } from '@/types';

type SendMock = ReturnType<typeof vi.fn<(draft: MessageDraft) => Promise<void>>>;

vi.mock('date-fns', () => ({
  formatDistanceToNow: () => 'a moment ago',
}));

const TODD: Author = { id: 'todd', name: 'Todd Sampson', type: 'user' };
const ALICE: Author = { id: 'alice', name: 'Alice Developer', type: 'user' };
const PLANNER: Author = { id: 'planner', name: 'Planning Agent', type: 'agent' };

const message = (id: string, author: Author, content: string): Message => ({
  id,
  author,
  content,
  createdAt: Date.parse('2026-04-01T00:00:00Z'),
  recipient: null,
});

describe('<Chat>', () => {
  it('renders an empty-state hint when no messages exist', () => {
    render(
      <Chat
        messages={[]}
        currentAuthor={TODD}
        onSend={vi.fn<(draft: MessageDraft) => Promise<void>>()}
        mentionableAuthors={[]}
      />,
    );
    expect(screen.getByText(/no messages yet/i)).toBeInTheDocument();
  });

  it('renders a list of messages', () => {
    render(
      <Chat
        messages={[message('a', ALICE, 'hello team'), message('b', PLANNER, 'on it')]}
        currentAuthor={TODD}
        onSend={vi.fn<(draft: MessageDraft) => Promise<void>>()}
      />,
    );
    expect(screen.getByText('hello team')).toBeInTheDocument();
    expect(screen.getByText('on it')).toBeInTheDocument();
  });

  it('calls onSend with the typed content + parsed recipient', async () => {
    const onSend: SendMock = vi.fn<(draft: MessageDraft) => Promise<void>>(async () => {});
    const user = userEvent.setup();

    render(
      <Chat
        messages={[message('a', ALICE, 'hello')]}
        currentAuthor={TODD}
        onSend={onSend}
        mentionableAuthors={[ALICE, PLANNER]}
      />,
    );

    const textarea = screen.getByLabelText('Message input') as HTMLTextAreaElement;
    await user.click(textarea);
    await user.type(textarea, 'hey @planner please ping me back');
    await user.click(screen.getByLabelText('Send message'));

    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(1));
    expect(onSend.mock.calls[0][0]).toMatchObject({
      author: TODD,
      content: 'hey @planner please ping me back',
      recipient: '@planner',
      status: 'summary',
    });
  });

  it('opens the mention dropdown on @ and lets the user pick a suggestion', async () => {
    const onSend: SendMock = vi.fn<(draft: MessageDraft) => Promise<void>>(async () => {});
    const user = userEvent.setup();

    render(
      <Chat
        messages={[]}
        currentAuthor={TODD}
        onSend={onSend}
        mentionableAuthors={[ALICE, PLANNER]}
      />,
    );

    const textarea = screen.getByLabelText('Message input') as HTMLTextAreaElement;
    await user.click(textarea);
    await user.type(textarea, '@p');

    const listbox = await screen.findByRole('listbox', { name: /mention/i });
    expect(listbox).toBeInTheDocument();

    const option = await screen.findByRole('option', { name: /planning agent/i });
    await user.click(option);

    await waitFor(() => {
      expect(textarea.value).toContain('@planner');
    });
  });

  it('sends on Enter and inserts a newline on Shift+Enter', async () => {
    const onSend: SendMock = vi.fn<(draft: MessageDraft) => Promise<void>>(async () => {});
    const user = userEvent.setup();

    render(
      <Chat messages={[]} currentAuthor={TODD} onSend={onSend} mentionableAuthors={[ALICE]} />,
    );

    const textarea = screen.getByLabelText('Message input') as HTMLTextAreaElement;
    await user.click(textarea);
    await user.type(textarea, 'line one');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    fireEvent.change(textarea, { target: { value: 'line one\nline two' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });

    await waitFor(() => expect(onSend).toHaveBeenCalled());
    const draft = onSend.mock.calls[0]?.[0];
    expect(draft?.content).toContain('line one');
  });

  it('does not submit while readOnly is true', () => {
    render(
      <Chat
        messages={[message('a', ALICE, 'hello')]}
        currentAuthor={TODD}
        onSend={vi.fn<(draft: MessageDraft) => Promise<void>>()}
        readOnly
      />,
    );
    expect(screen.queryByLabelText('Message input')).toBeNull();
    expect(screen.queryByLabelText('Send message')).toBeNull();
  });

  it('scrolls to bottom when a new message is appended', async () => {
    const initial = [message('a', ALICE, 'one')];
    // jsdom lacks Element.scrollTo — stub it so the component can call it.
    const scrollSpy = vi.fn<(opts: ScrollToOptions | number, y?: number) => void>();
    Object.defineProperty(window.HTMLElement.prototype, 'scrollTo', {
      writable: true,
      value: scrollSpy,
      configurable: true,
    });

    const { rerender } = render(
      <Chat
        messages={initial}
        currentAuthor={TODD}
        onSend={vi.fn<(draft: MessageDraft) => Promise<void>>()}
      />,
    );

    rerender(
      <Chat
        messages={[...initial, message('b', PLANNER, 'two')]}
        currentAuthor={TODD}
        onSend={vi.fn<(draft: MessageDraft) => Promise<void>>()}
      />,
    );
    await waitFor(() => expect(scrollSpy).toHaveBeenCalled());
  });
});
