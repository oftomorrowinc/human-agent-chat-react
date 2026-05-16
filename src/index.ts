/**
 * `@oftomorrow/human-agent-chat` — public entry point.
 *
 * The default export surface is storage-free. Backend bindings live behind
 * the optional `./firebase` and `./supabase` entry points.
 */

export { Chat, type ChatProps } from '@/components/Chat';
export { MessageItem, type MessageItemProps } from '@/components/MessageItem';
export type { Author, AuthorType, Message, MessageDraft, MessageStatus } from '@/types';
export { extractMentions, formatMentions, containsAgentMentions } from '@/utils/message-helpers';
export {
  detectMediaInContent,
  processMessageContent,
  type AttachmentType,
  type MediaAttachment,
} from '@/utils/media-helpers';
