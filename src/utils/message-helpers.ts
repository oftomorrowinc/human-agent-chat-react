import {
  Message,
  MessageAttachment,
  messageSchema,
  messageMetadataSchema,
  attachmentSchema,
} from '../types';
import { processMessageContent } from './media-helpers';

/**
 * Enhanced message creation with auto-content processing
 *
 * @param params Message parameters
 * @returns Message object with processed content
 */
export function createMessageWithProcessing(params: {
  content: string;
  senderId: string;
  senderName?: string;
  senderRole?: string;
  recipientIds?: string[];
  fromAiAgent?: boolean;
  toAiAgent?: boolean;
  attachments?: MessageAttachment[];
  dataRequest?: string | object;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
  autoProcessContent?: boolean;
}): Message {
  const now = new Date().toISOString();

  let { content, attachments, dataRequest } = params;

  // Auto-process content if enabled (default: true)
  if (params.autoProcessContent !== false) {
    const processed = processMessageContent(params.content);
    content = processed.content;

    // Merge detected attachments with provided ones
    const detectedAttachments = processed.attachments || [];
    const providedAttachments = params.attachments || [];
    attachments = [...providedAttachments, ...detectedAttachments];

    // Use detected data request if not provided
    if (!params.dataRequest && processed.dataRequest) {
      dataRequest = processed.dataRequest;
    }
  }

  // Validate attachments with their schema
  if (attachments && attachments.length > 0) {
    attachments.forEach((item, index) => {
      const result = attachmentSchema.safeParse(item);
      if (!result.success) {
        console.warn(
          `Attachment at index ${index} failed validation:`,
          result.error
        );
      }
    });
  }

  // Validate metadata if provided
  if (params.metadata) {
    const result = messageMetadataSchema.safeParse(params.metadata);
    if (!result.success) {
      console.warn('Message metadata failed validation:', result.error);
    }
  }

  const message: Message = {
    content,
    senderId: params.senderId,
    senderName: params.senderName,
    senderRole: params.senderRole,
    recipientIds: params.recipientIds,
    fromAiAgent: params.fromAiAgent,
    toAiAgent: params.toAiAgent,
    attachments,
    dataRequest,
    metadata: params.metadata,
    createdAt: params.createdAt || now,
    updatedAt: params.updatedAt || now,
    deleted: false,
  };

  // Validate with Zod schema
  const result = messageSchema.safeParse(message);
  if (!result.success) {
    console.warn('Created message does not match schema:', result.error);
  }

  return message;
}

/**
 * Validates if a message matches the expected structure
 *
 * @param message Message to validate
 * @returns Whether the message is valid, or the validation error
 */
export function isValidMessage(
  message: any
): boolean | { success: false; error: any } {
  if (!message) return false;

  // Validate attachments
  if (
    message.attachments &&
    Array.isArray(message.attachments) &&
    message.attachments.length > 0
  ) {
    const validations: string[] = [];

    message.attachments.forEach((attachment: any, index: number) => {
      const attachmentResult = attachmentSchema.safeParse(attachment);
      if (!attachmentResult.success) {
        validations.push(
          `Attachment[${index}]: ${attachmentResult.error.message}`
        );
      }
    });

    if (validations.length > 0) {
      console.warn('Attachment validation errors:', validations);
    }
  }

  // Validate metadata
  if (message.metadata) {
    const metadataResult = messageMetadataSchema.safeParse(message.metadata);
    if (!metadataResult.success) {
      console.warn('Metadata validation error:', metadataResult.error);
    }
  }

  // Use Zod schema for full message validation
  const result = messageSchema.safeParse(message);

  if (!result.success) {
    console.warn('Message validation failed:', result.error);
    return {
      success: false,
      error: result.error,
    };
  }

  return true;
}

/**
 * Extract mentions from message content
 * Uses a regex to find @username patterns in the message
 *
 * @param content Message content
 * @returns Array of mentioned user IDs
 */
export function extractMentions(content: string): string[] {
  if (!content || typeof content !== 'string') return [];

  // Regex that handles mentions at start, middle, or end of content
  // Also handles mentions that are part of sentences with punctuation
  const mentionRegex = /(?:^|\s)@([\w\d._-]+)(?:$|[,;.\s])/g;
  const matches = content.matchAll(mentionRegex);

  // Use a Set to eliminate duplicate mentions
  const mentionSet = new Set<string>();

  for (const match of matches) {
    if (match[1] && match[1].trim()) {
      mentionSet.add(match[1].trim());
    }
  }

  return Array.from(mentionSet);
}

/**
 * Format mentions in content for display
 *
 * @param content Message content
 * @returns Content with formatted mentions
 */
export function formatMentions(content: string): string {
  if (!content || typeof content !== 'string') return content;

  // Replace @username with styled spans
  return content.replace(
    /(?:^|\s)@([\w\d._-]+)(?=$|[,;.\s])/g,
    (match, username) => {
      const prefix = match.startsWith(' ') ? ' ' : '';
      return `${prefix}<span class="mention">@${username}</span>`;
    }
  );
}

/**
 * Detect if content contains AI agent mentions
 *
 * @param content Message content
 * @param agentIds Array of known agent IDs
 * @returns Whether the message mentions any AI agents
 */
export function containsAgentMentions(
  content: string,
  agentIds: string[]
): boolean {
  const mentions = extractMentions(content);
  return mentions.some((mention) => agentIds.includes(mention));
}

/**
 * Clean up message content by removing extra whitespace and formatting
 *
 * @param content Message content
 * @returns Cleaned content
 */
export function cleanMessageContent(content: string): string {
  if (!content || typeof content !== 'string') return content;

  return content
    .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with just two
    .replace(/^\s+|\s+$/g, '') // Trim start and end whitespace
    .replace(/\s{2,}/g, ' '); // Replace multiple spaces with single space
}

/**
 * Convert message content to plain text (remove formatting)
 *
 * @param content Message content
 * @returns Plain text version
 */
export function messageToPlainText(content: string): string {
  if (!content || typeof content !== 'string') return content;

  return content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1') // Remove markdown bold
    .replace(/_([^_]+)_/g, '$1') // Remove markdown italic
    .replace(/`([^`]+)`/g, '$1') // Remove markdown code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links, keep text
    .trim();
}

/**
 * Determine if a message should trigger AI agent processing
 *
 * @param message The message to check
 * @param agentIds Array of known agent IDs
 * @returns Whether this message should be processed by AI agents
 */
export function shouldTriggerAIProcessing(
  message: Message,
  agentIds: string[]
): boolean {
  // Check if message is explicitly marked for AI
  if (message.toAiAgent) return true;

  // Check if message mentions any AI agents
  if (
    message.recipientIds &&
    message.recipientIds.some((id) => agentIds.includes(id))
  ) {
    return true;
  }

  // Check content for agent mentions
  return containsAgentMentions(message.content, agentIds);
}

/**
 * Get message summary for notifications
 *
 * @param message The message
 * @param maxLength Maximum length of summary
 * @returns Short summary of the message
 */
export function getMessageSummary(
  message: Message,
  maxLength: number = 100
): string {
  let summary = messageToPlainText(message.content);

  // Add attachment info if present
  if (message.attachments && message.attachments.length > 0) {
    const attachmentTypes = message.attachments.map((a) => a.type).join(', ');
    summary += ` [${attachmentTypes}]`;
  }

  // Add form info if present
  if (message.dataRequest) {
    summary += ' [form request]';
  }

  // Truncate if too long
  if (summary.length > maxLength) {
    summary = summary.substring(0, maxLength - 3) + '...';
  }

  return summary;
}

/**
 * Check if message contains sensitive content that should be flagged
 *
 * @param message The message to check
 * @returns Array of potential issues found
 */
export function checkMessageSafety(message: Message): string[] {
  const issues: string[] = [];
  const content = message.content.toLowerCase();

  // Check for potential sensitive patterns
  const sensitivePatterns = [
    /password/i,
    /api[_\s]?key/i,
    /secret/i,
    /token/i,
    /credit[_\s]?card/i,
    /ssn|social[_\s]?security/i,
  ];

  sensitivePatterns.forEach((pattern) => {
    if (pattern.test(content)) {
      issues.push('Potentially sensitive information detected');
    }
  });

  // Check for unusually long content (potential spam)
  if (content.length > 5000) {
    issues.push('Message is unusually long');
  }

  // Check for excessive URLs (potential spam)
  const urlMatches = content.match(/https?:\/\/[^\s]+/g);
  if (urlMatches && urlMatches.length > 5) {
    issues.push('Message contains many URLs');
  }

  return issues;
}
