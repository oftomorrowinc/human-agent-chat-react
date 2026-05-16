/**
 * Pure helpers for mention extraction + formatting.
 *
 * No storage or framework coupling — safe to import anywhere.
 */

const MENTION_TOKEN_RE = /(?:^|\s)@([\w-]+(?:\.[\w-]+)*)/g;

/**
 * Extract @-mention handles from message content.
 *
 * Handles mentions at the start, middle, or end of a line, and tolerates
 * trailing punctuation. Returns unique handles in the order they first appear.
 */
export function extractMentions(content: string): string[] {
  if (!content || typeof content !== 'string') return [];

  const handles = new Set<string>();
  for (const match of content.matchAll(MENTION_TOKEN_RE)) {
    const handle = match[1]?.trim();
    if (handle) handles.add(handle);
  }
  return Array.from(handles);
}

/**
 * Wrap @-mention tokens in `<span class="mention">…</span>` for safe rendering.
 *
 * The output is HTML-fragment safe relative to the input *only when the input
 * itself is plain text*. Callers that splice user content into the DOM must
 * still escape other tokens (the renderer in `MessageItem` only does so for
 * content it controls).
 */
export function formatMentions(content: string): string {
  if (!content || typeof content !== 'string') return content;

  return content.replace(MENTION_TOKEN_RE, (match, username: string) => {
    const prefix = match.startsWith(' ') ? ' ' : '';
    return `${prefix}<span class="mention">@${username}</span>`;
  });
}

/** Returns true when the message mentions any of the given agent handles. */
export function containsAgentMentions(content: string, agentIds: string[]): boolean {
  if (!agentIds?.length) return false;
  const mentions = extractMentions(content);
  return mentions.some((mention) => agentIds.includes(mention));
}
