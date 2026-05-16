import { describe, expect, it } from 'vitest';

import { detectMediaInContent, processMessageContent } from '@/utils/media-helpers';

describe('detectMediaInContent', () => {
  it('detects YouTube URLs and produces a thumbnail', () => {
    const attachments = detectMediaInContent(
      'check this https://www.youtube.com/watch?v=dQw4w9WgXcQ thanks',
    );
    expect(attachments).toHaveLength(1);
    expect(attachments[0].type).toBe('youtube');
    expect(attachments[0].thumbnailUrl).toContain('dQw4w9WgXcQ');
  });

  it('detects image URLs', () => {
    const attachments = detectMediaInContent('look https://example.com/cat.png cute');
    expect(attachments.map((a) => a.type)).toContain('image');
  });

  it('detects document URLs with the correct mime type', () => {
    const attachments = detectMediaInContent('see https://example.com/spec.pdf');
    expect(attachments[0].type).toBe('document');
    expect(attachments[0].mimeType).toBe('application/pdf');
  });

  it('detects bare links and ignores youtube under link', () => {
    const attachments = detectMediaInContent(
      'see https://example.com/article and https://www.youtube.com/watch?v=abcdef12345',
    );
    expect(attachments.map((a) => a.type).sort()).toEqual(['link', 'youtube']);
  });

  it('returns no attachments for empty content', () => {
    expect(detectMediaInContent('')).toEqual([]);
    expect(detectMediaInContent('   ')).toEqual([]);
  });
});

describe('processMessageContent', () => {
  it('strips detected URLs from the displayed content', () => {
    const { content, attachments } = processMessageContent('hello https://example.com/cat.png');
    expect(attachments).toHaveLength(1);
    expect(content).toBe('hello');
  });

  it('returns input unchanged when no media is present', () => {
    const { content, attachments } = processMessageContent('plain text');
    expect(content).toBe('plain text');
    expect(attachments).toEqual([]);
  });
});
