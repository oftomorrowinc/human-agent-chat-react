import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { MessageItem } from '@/components/MessageItem';
import type { Author, Message } from '@/types';

vi.mock('date-fns', () => ({
  formatDistanceToNow: () => '5 minutes ago',
}));

const TODD: Author = { id: 'todd', name: 'Todd Sampson', type: 'user' };
const AGENT: Author = { id: 'planner', name: 'Planning Agent', type: 'agent' };
const SYSTEM: Author = { id: 'system', name: 'System', type: 'system' };
const RUNNER: Author = { id: 'runner', name: 'Runner', type: 'runner' };

const baseMessage: Message = {
  id: 'msg-1',
  author: TODD,
  content: 'hello world',
  createdAt: Date.parse('2026-04-01T00:00:00Z'),
  recipient: null,
};

describe('MessageItem', () => {
  it('renders content + author name', () => {
    render(<MessageItem message={baseMessage} currentAuthorId="other" />);
    expect(screen.getByText('Todd Sampson')).toBeInTheDocument();
    expect(screen.getByText('hello world')).toBeInTheDocument();
  });

  it('renders the timestamp via date-fns', () => {
    render(<MessageItem message={baseMessage} currentAuthorId="other" />);
    expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
  });

  it('renders agent badge for agent authors', () => {
    render(<MessageItem message={{ ...baseMessage, author: AGENT }} currentAuthorId="other" />);
    expect(screen.getByText('AI')).toBeInTheDocument();
  });

  it('renders system badge for system authors', () => {
    render(<MessageItem message={{ ...baseMessage, author: SYSTEM }} currentAuthorId="other" />);
    expect(screen.getByText('SYSTEM')).toBeInTheDocument();
  });

  it('renders runner badge for runner authors', () => {
    render(<MessageItem message={{ ...baseMessage, author: RUNNER }} currentAuthorId="other" />);
    expect(screen.getByText('RUNNER')).toBeInTheDocument();
  });

  it('reverses the layout when the author is the current user', () => {
    const { container } = render(<MessageItem message={baseMessage} currentAuthorId="todd" />);
    const region = container.querySelector('[role="region"]')!;
    expect(region.className).toContain('flex-row-reverse');
  });

  it('renders the recipient arrow when set', () => {
    render(
      <MessageItem message={{ ...baseMessage, recipient: '@planner' }} currentAuthorId="other" />,
    );
    expect(screen.getByText('→ @planner')).toBeInTheDocument();
  });

  it('renders the status badge when status is blocked', () => {
    render(<MessageItem message={{ ...baseMessage, status: 'blocked' }} currentAuthorId="other" />);
    expect(screen.getByText('blocked')).toBeInTheDocument();
  });

  it('auto-detects image URLs and renders an inline image', () => {
    render(
      <MessageItem
        message={{ ...baseMessage, content: 'look https://example.com/cat.png' }}
        currentAuthorId="other"
      />,
    );
    expect(screen.getByRole('img', { name: /image/i })).toBeInTheDocument();
  });

  it('formats mentions with span.mention', () => {
    const { container } = render(
      <MessageItem message={{ ...baseMessage, content: 'hi @alice' }} currentAuthorId="other" />,
    );
    expect(container.querySelector('span.mention')).not.toBeNull();
  });

  it('shows the author-type attribute for downstream styling hooks', () => {
    render(<MessageItem message={{ ...baseMessage, author: AGENT }} currentAuthorId="other" />);
    const region = screen.getByRole('region');
    expect(region.getAttribute('data-author-type')).toBe('agent');
  });

  it('renders YouTube attachments with the play overlay link', () => {
    const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    render(
      <MessageItem
        message={{ ...baseMessage, content: `look ${youtubeUrl}` }}
        currentAuthorId="other"
      />,
    );
    const link = screen.getByTestId(/attachment-msg-1-0/);
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe(youtubeUrl);
  });

  it('renders video attachments as a controls element', () => {
    render(
      <MessageItem
        message={{ ...baseMessage, content: 'watch https://example.com/clip.mp4' }}
        currentAuthorId="other"
      />,
    );
    const video = screen.getByTestId(/attachment-msg-1-0/);
    expect(video.tagName.toLowerCase()).toBe('video');
  });

  it('renders audio attachments as a controls element', () => {
    render(
      <MessageItem
        message={{ ...baseMessage, content: 'listen https://example.com/song.mp3' }}
        currentAuthorId="other"
      />,
    );
    const audio = screen.getByTestId(/attachment-msg-1-0/);
    expect(audio.tagName.toLowerCase()).toBe('audio');
  });

  it('renders document attachments as a link', () => {
    render(
      <MessageItem
        message={{ ...baseMessage, content: 'read https://example.com/spec.pdf' }}
        currentAuthorId="other"
      />,
    );
    const link = screen.getByTestId(/attachment-msg-1-0/);
    expect(link.tagName.toLowerCase()).toBe('a');
    expect(link.getAttribute('href')).toBe('https://example.com/spec.pdf');
  });

  it('renders link attachments for plain URLs', () => {
    render(
      <MessageItem
        message={{ ...baseMessage, content: 'check https://example.com/blog' }}
        currentAuthorId="other"
      />,
    );
    expect(screen.getByTestId(/attachment-msg-1-0/)).toBeInTheDocument();
  });

  it('falls back to "unknown time" when createdAt is invalid', async () => {
    vi.resetModules();
    vi.doMock('date-fns', () => ({
      formatDistanceToNow: () => {
        throw new Error('invalid date');
      },
    }));
    const { MessageItem: Reloaded } = await import('@/components/MessageItem');
    render(<Reloaded message={baseMessage} currentAuthorId="other" />);
    expect(screen.getByText(/unknown time/i)).toBeInTheDocument();
    vi.doUnmock('date-fns');
    vi.resetModules();
  });
});
