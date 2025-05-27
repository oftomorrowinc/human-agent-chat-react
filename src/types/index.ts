import { z } from 'zod';

/**
 * Attachment type enum
 */
export const AttachmentTypeEnum = z.enum([
  'youtube',
  'image',
  'audio',
  'video',
  'file',
  'link',
  'document',
]);

export type AttachmentType = z.infer<typeof AttachmentTypeEnum>;

/**
 * Attachment schema for files, media, and links in messages
 */
export const attachmentSchema = z.object({
  id: z.string().optional(),
  type: AttachmentTypeEnum,
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
});

export type MessageAttachment = z.infer<typeof attachmentSchema>;

/**
 * Message metadata schema
 */
export const messageMetadataSchema = z
  .object({
    action: z.string().optional(),
    event: z.string().optional(),
    projectId: z.string().optional(),
    todoId: z.string().optional(),
    documentId: z.string().optional(),
    schemaId: z.string().optional(),
  })
  .catchall(z.any());

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

/**
 * Core message schema used throughout the application
 */
export const messageSchema = z.object({
  // Core fields
  id: z.string().optional(),
  content: z.string(),
  senderId: z.string(),
  senderName: z.string().optional(),
  senderRole: z.string().optional(),
  recipientIds: z.array(z.string()).optional(),

  // AI Agent specific properties
  fromAiAgent: z.boolean().optional(),
  toAiAgent: z.boolean().optional(),

  // Rich content
  attachments: z.array(attachmentSchema).optional(),
  dataRequest: z.union([z.string(), z.object({}).catchall(z.any())]).optional(),

  // Metadata
  metadata: messageMetadataSchema.optional(),

  // Status fields
  deleted: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Message = z.infer<typeof messageSchema>;

/**
 * User schema
 */
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  displayName: z.string().optional(),
  photoURL: z.string().url().optional(),
  isAgent: z.boolean().optional(),
  role: z.enum(['user', 'admin', 'agent', 'system']).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type User = z.infer<typeof userSchema>;

/**
 * Access level enum
 */
export enum AccessLevel {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin',
}

/**
 * Member schema for access control
 */
export const memberSchema = z.object({
  userId: z.string(),
  level: z.nativeEnum(AccessLevel),
  addedBy: z.string().optional(),
  addedAt: z.string(),
  updatedAt: z.string().optional(),
});

export type Member = z.infer<typeof memberSchema>;

/**
 * Chat options interface
 */
export interface ChatOptions {
  containerId?: string;
  firebasePath: string;
  currentUser: User;
  theme?: 'dark' | 'light';
  maxMessages?: number;
  enableReactions?: boolean;
  enableReplies?: boolean;
  enableMultiModal?: boolean;
  enableForms?: boolean;
  agentIds?: string[];
  onNewMessage?: (message: Message) => void;
  onError?: (error: Error) => void;
}

/**
 * Form request schema for data collection
 */
export const formRequestSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  schema: z.any(), // Zod schema object
  required: z.boolean().optional(),
  requesterId: z.string(),
  recipientIds: z.array(z.string()),
  expiresAt: z.string().optional(),
  createdAt: z.string(),
  responses: z
    .array(
      z.object({
        userId: z.string(),
        data: z.any(),
        submittedAt: z.string(),
      })
    )
    .optional(),
});

export type FormRequest = z.infer<typeof formRequestSchema>;

/**
 * Helper function to create a new message object
 */
export function createMessage(params: {
  content: string;
  senderId: string;
  senderName?: string;
  senderRole?: string;
  recipientIds?: string[];
  fromAiAgent?: boolean;
  toAiAgent?: boolean;
  attachments?: MessageAttachment[];
  dataRequest?: string | object;
  metadata?: MessageMetadata;
  createdAt?: string;
  updatedAt?: string;
}): Message {
  const now = new Date().toISOString();

  const message: Message = {
    content: params.content,
    senderId: params.senderId,
    createdAt: params.createdAt || now,
    updatedAt: params.updatedAt || now,
    deleted: false,
  };

  // Add optional fields with safe defaults
  if (params.senderName) message.senderName = params.senderName;
  if (params.senderRole) message.senderRole = params.senderRole;
  message.recipientIds = params.recipientIds || [];
  message.fromAiAgent = params.fromAiAgent || false;
  message.toAiAgent = params.toAiAgent || false;

  if (params.attachments && params.attachments.length > 0) {
    message.attachments = params.attachments;
  }
  if (params.dataRequest) {
    message.dataRequest = params.dataRequest;
  }
  if (params.metadata) {
    message.metadata = params.metadata;
  }

  // Validate with Zod schema
  const validationResult = messageSchema.safeParse(message);
  if (!validationResult.success) {
    console.warn('Message validation failed:', validationResult.error);
  }

  return message;
}

/**
 * Helper function to create a user object
 */
export function createUser(params: {
  id: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  isAgent?: boolean;
  role?: 'user' | 'admin' | 'agent' | 'system';
}): User {
  const now = new Date().toISOString();

  const user: User = {
    id: params.id,
    createdAt: now,
    updatedAt: now,
  };

  if (params.email) user.email = params.email;
  if (params.displayName) user.displayName = params.displayName;
  if (params.photoURL) user.photoURL = params.photoURL;
  if (params.isAgent !== undefined) user.isAgent = params.isAgent;
  if (params.role) user.role = params.role;

  return user;
}

/**
 * Helper function to extract mentions from message content
 */
export function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
}

/**
 * Helper function to format mentions in message content
 */
export function formatMentions(content: string): string {
  return content.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
}

/**
 * Helper function to determine if a user is an AI agent
 */
export function isAIAgent(user: User): boolean {
  return (
    user.isAgent === true ||
    user.role === 'agent' ||
    user.id.toLowerCase().includes('agent') ||
    user.id.toLowerCase().includes('assistant')
  );
}

/**
 * Helper function to determine if a user is a system user
 */
export function isSystemUser(user: User): boolean {
  return user.role === 'system' || user.id.toLowerCase().includes('system');
}

/**
 * Data request helper types for form generation
 */
export interface DataRequestButton {
  label: string;
  schema: any; // Zod schema
  onSubmit: (data: any) => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: React.ReactNode;
}

/**
 * Modal configuration for forms and media
 */
export interface ModalConfig {
  isOpen: boolean;
  type: 'form' | 'media' | 'lightbox' | 'confirmation';
  title?: string;
  content?: React.ReactNode;
  data?: any;
  onClose: () => void;
  onConfirm?: () => void;
}
