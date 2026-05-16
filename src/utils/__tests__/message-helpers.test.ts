import { describe, expect, it } from 'vitest';

import { containsAgentMentions, extractMentions, formatMentions } from '@/utils/message-helpers';

describe('extractMentions', () => {
  it('returns an empty array for blank input', () => {
    expect(extractMentions('')).toEqual([]);
    expect(extractMentions('   ')).toEqual([]);
  });

  it('returns mentions at the start of a string', () => {
    expect(extractMentions('@alice hello')).toEqual(['alice']);
  });

  it('returns mentions mid-string with trailing punctuation', () => {
    expect(extractMentions('hi @alice, please ping @bob_dev.')).toEqual(['alice', 'bob_dev']);
  });

  it('dedupes repeated mentions', () => {
    expect(extractMentions('@alice ping @alice again')).toEqual(['alice']);
  });

  it('handles handles with dots and dashes', () => {
    expect(extractMentions('@a.b-c thanks')).toEqual(['a.b-c']);
  });

  it('ignores @ inside a word', () => {
    expect(extractMentions('email me at todd@example.com')).toEqual([]);
  });
});

describe('formatMentions', () => {
  it('wraps mention tokens in span.mention', () => {
    const out = formatMentions('hello @alice and @bob!');
    expect(out).toContain('<span class="mention">@alice</span>');
    expect(out).toContain('<span class="mention">@bob</span>');
  });

  it('returns the original string when no mentions exist', () => {
    expect(formatMentions('plain text')).toBe('plain text');
  });
});

describe('containsAgentMentions', () => {
  it('returns true when an agent is mentioned', () => {
    expect(containsAgentMentions('hey @planner', ['planner'])).toBe(true);
  });

  it('returns false when only humans are mentioned', () => {
    expect(containsAgentMentions('hey @alice', ['planner'])).toBe(false);
  });

  it('returns false for empty agent list', () => {
    expect(containsAgentMentions('hey @anyone', [])).toBe(false);
  });
});
